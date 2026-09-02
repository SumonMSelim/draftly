import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { MarkdownSerializer } from "../../src/formats/markdown/serializer/MarkdownSerializer";
import { MarkdownParser } from "../../src/formats/markdown/parser/MarkdownParser";
import { DokuWikiSerializer } from "../../src/formats/dokuwiki/serializer/DokuWikiSerializer";
import { DokuWikiParser } from "../../src/formats/dokuwiki/parser/DokuWikiParser";
import { normalize } from "../../src/document/normalization/normalize";

/** Deterministic PRNG (mulberry32) so property tests are seeded and reproducible. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  "network",
  "security",
  "firewall",
  "packet",
  "router",
  "encryption",
  "protocol",
  "system",
  "analysis",
  "report",
  "বাংলা",
  "Nederlands",
  "café",
  "naïve",
  "résumé",
];

type Rng = () => number;

function pick<T>(rng: Rng, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function randomWords(rng: Rng, count: number): string {
  return Array.from({ length: count }, () => pick(rng, WORDS)).join(" ");
}

function randomRun(rng: Rng): JSONContent {
  const text = randomWords(rng, 1 + Math.floor(rng() * 2));
  const choice = Math.floor(rng() * 6);
  switch (choice) {
    case 1:
      return { type: "text", text, marks: [{ type: "bold" }] };
    case 2:
      return { type: "text", text, marks: [{ type: "italic" }] };
    case 3:
      return { type: "text", text, marks: [{ type: "underline" }] };
    case 4:
      return { type: "text", text, marks: [{ type: "strike" }] };
    case 5:
      return { type: "text", text, marks: [{ type: "link", attrs: { href: "https://example.com" } }] };
    default:
      return { type: "text", text };
  }
}

function randomParagraph(rng: Rng): JSONContent {
  const numRuns = 1 + Math.floor(rng() * 3);
  const content: JSONContent[] = [];
  for (let i = 0; i < numRuns; i++) {
    if (i > 0) content.push({ type: "text", text: " " });
    content.push(randomRun(rng));
  }
  return { type: "paragraph", content };
}

function randomListItem(rng: Rng, depth: number): JSONContent {
  const blocks: JSONContent[] = [randomParagraph(rng)];
  if (depth < 1 && rng() < 0.3) {
    blocks.push(randomList(rng, depth + 1));
  }
  return { type: "listItem", content: blocks };
}

function randomList(rng: Rng, depth = 0): JSONContent {
  const ordered = rng() < 0.5;
  const count = 2 + Math.floor(rng() * 2);
  return {
    type: ordered ? "orderedList" : "bulletList",
    content: Array.from({ length: count }, () => randomListItem(rng, depth)),
  };
}

function randomTable(rng: Rng): JSONContent {
  const cell = (type: string): JSONContent => ({
    type,
    content: [{ type: "paragraph", content: [{ type: "text", text: randomWords(rng, 1) }] }],
  });
  return {
    type: "table",
    content: [
      { type: "tableRow", content: [cell("tableHeader"), cell("tableHeader")] },
      { type: "tableRow", content: [cell("tableCell"), cell("tableCell")] },
    ],
  };
}

function randomCodeBlock(rng: Rng): JSONContent {
  return { type: "codeBlock", attrs: { language: "bash" }, content: [{ type: "text", text: `echo ${randomWords(rng, 2)}` }] };
}

const BLOCK_GENERATORS: ((rng: Rng) => JSONContent)[] = [
  randomParagraph,
  randomList,
  randomTable,
  randomCodeBlock,
  () => ({ type: "horizontalRule" }),
  (rng) => ({ type: "blockquote", content: [randomParagraph(rng)] }),
];

function randomDocument(rng: Rng): JSONContent {
  const blocks: JSONContent[] = [
    { type: "heading", attrs: { level: 1 + Math.floor(rng() * 3) }, content: [{ type: "text", text: randomWords(rng, 3) }] },
  ];
  const numBlocks = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < numBlocks; i++) {
    blocks.push(pick(rng, BLOCK_GENERATORS)(rng));
  }
  return { type: "doc", content: blocks };
}

const SEEDS = Array.from({ length: 15 }, (_, i) => i + 1);

describe("property: parse(serialize(document)) preserves semantics", () => {
  const markdownSerializer = new MarkdownSerializer();
  const markdownParser = new MarkdownParser();
  const dokuwikiSerializer = new DokuWikiSerializer();
  const dokuwikiParser = new DokuWikiParser();

  it.each(SEEDS)("markdown round-trip is semantically stable for seed %i", (seed) => {
    const doc = randomDocument(mulberry32(seed));
    const output = markdownSerializer.serialize(doc).output;
    let reparsed;
    expect(() => (reparsed = markdownParser.parse(output))).not.toThrow();
    expect(normalize(reparsed!.document)).toEqual(normalize(doc));
  });

  it.each(SEEDS)("dokuwiki round-trip is semantically stable for seed %i", (seed) => {
    const doc = randomDocument(mulberry32(seed + 1000));
    const output = dokuwikiSerializer.serialize(doc).output;
    let reparsed;
    expect(() => (reparsed = dokuwikiParser.parse(output))).not.toThrow();
    expect(normalize(reparsed!.document)).toEqual(normalize(doc));
  });

  it("never throws regardless of which random blocks are combined", () => {
    for (const seed of SEEDS) {
      const doc = randomDocument(mulberry32(seed * 7));
      expect(() => markdownParser.parse(markdownSerializer.serialize(doc).output)).not.toThrow();
      expect(() => dokuwikiParser.parse(dokuwikiSerializer.serialize(doc).output)).not.toThrow();
    }
  });
});
