import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { DokuWikiSerializer } from "../../../../src/formats/dokuwiki/serializer/DokuWikiSerializer";
import { DokuWikiParser } from "../../../../src/formats/dokuwiki/parser/DokuWikiParser";

const serializer = new DokuWikiSerializer();
const parser = new DokuWikiParser();

function text(value: string, marks?: { type: string; attrs?: Record<string, unknown> }[]): JSONContent {
  return marks ? { type: "text", text: value, marks } : { type: "text", text: value };
}

describe("DokuWikiSerializer", () => {
  it("serializes headings 1 through 6 with the correct equals-sign count", () => {
    const expected: Record<number, string> = {
      1: "====== Title ======",
      2: "===== Title =====",
      3: "==== Title ====",
      4: "=== Title ===",
      5: "== Title ==",
      6: "= Title =",
    };
    for (let level = 1; level <= 6; level++) {
      const doc: JSONContent = { type: "doc", content: [{ type: "heading", attrs: { level }, content: [text("Title")] }] };
      expect(serializer.serialize(doc).output).toBe(`${expected[level]}\n`);
    }
  });

  it("serializes bold, italic, underline, strike, and inline code", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            text("bold", [{ type: "bold" }]),
            text(" "),
            text("italic", [{ type: "italic" }]),
            text(" "),
            text("underline", [{ type: "underline" }]),
            text(" "),
            text("strike", [{ type: "strike" }]),
            text(" "),
            text("code", [{ type: "code" }]),
          ],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("**bold** //italic// __underline__ <del>strike</del> ''code''\n");
  });

  it("respects a profile with underline disabled", () => {
    const noUnderline = new DokuWikiSerializer({
      supportsUnderline: false,
      supportsMath: false,
      supportsFootnotes: false,
      supportsTaskLists: false,
    });
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [text("plain", [{ type: "underline" }])] }] };
    expect(noUnderline.serialize(doc).output).toBe("plain\n");
  });

  it("serializes links", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [text("Example", [{ type: "link", attrs: { href: "https://example.com" } }])] }],
    };
    expect(serializer.serialize(doc).output).toBe("[[https://example.com|Example]]\n");
  });

  it("serializes images", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "image", attrs: { src: "image.png", alt: "Description" } }] };
    expect(serializer.serialize(doc).output).toBe("{{image.png|Description}}\n");
  });

  it("serializes nested bullet lists", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [text("Item")] },
                { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("Nested item")] }] }] },
              ],
            },
          ],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("  * Item\n    * Nested item\n");
  });

  it("serializes ordered lists", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [text("Item")] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [text("Item 2")] }] },
          ],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("  - Item\n  - Item 2\n");
  });

  it("serializes a code block with language", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "codeBlock", attrs: { language: "bash" }, content: [{ type: "text", text: "sudo iptables -L" }] }],
    };
    expect(serializer.serialize(doc).output).toBe("<code bash>\nsudo iptables -L\n</code>\n");
  });

  it("serializes tables with a header row", () => {
    const cell = (type: string, value: string) => ({ type, content: [{ type: "paragraph", content: [text(value)] }] });
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            { type: "tableRow", content: [cell("tableHeader", "A"), cell("tableHeader", "B")] },
            { type: "tableRow", content: [cell("tableCell", "1"), cell("tableCell", "2")] },
          ],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("^ A ^ B ^\n| 1 | 2 |\n");
  });

  it("serializes a horizontal rule", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "horizontalRule" }] };
    expect(serializer.serialize(doc).output).toBe("----\n");
  });

  it("serializes blockquotes", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "blockquote", content: [{ type: "paragraph", content: [text("Quoted")] }] }] };
    expect(serializer.serialize(doc).output).toBe("> Quoted\n");
  });

  it("is deterministic", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [text("Stable output")] }] };
    expect(serializer.serialize(doc).output).toBe(serializer.serialize(doc).output);
  });

  it("preserves unicode text", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [text("বাংলা Nederlands English 😀")] }] };
    expect(serializer.serialize(doc).output).toBe("বাংলা Nederlands English 😀\n");
  });

  it("escapes a link href containing ]] or | instead of corrupting the markup", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [text("Example", [{ type: "link", attrs: { href: "https://example.com/a]]b|c" } }])] }],
    };
    const { output } = serializer.serialize(doc);
    expect(output).toBe("[[https://example.com/a%5D%5Db%7Cc|Example]]\n");
    // The dangerous characters are percent-encoded rather than left raw, so
    // re-parsing sees one well-formed link instead of truncated/leaked text.
    const reparsed = parser.parse(output);
    const link = reparsed.document.content?.[0].content?.[0];
    expect(link).toMatchObject({ text: "Example", marks: [{ type: "link", attrs: { href: "https://example.com/a%5D%5Db%7Cc" } }] });
  });

  it("escapes image src/alt containing }} or | instead of corrupting the markup", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "image", attrs: { src: "a}}b|c.png", alt: "d}}e|f" } }] };
    const { output } = serializer.serialize(doc);
    expect(output).toBe("{{a%7D%7Db%7Cc.png|d%7D%7De%7Cf}}\n");
    const reparsed = parser.parse(output);
    expect(reparsed.document.content?.[0]).toMatchObject({ type: "image", attrs: { src: "a%7D%7Db%7Cc.png", alt: "d%7D%7De%7Cf" } });
  });

  it("keeps a linked table cell intact instead of splitting on the link's pipe", () => {
    const cell = (type: string, content: JSONContent[]) => ({ type, content: [{ type: "paragraph", content }] });
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            { type: "tableRow", content: [cell("tableHeader", [text("Link")])] },
            {
              type: "tableRow",
              content: [cell("tableCell", [text("Example", [{ type: "link", attrs: { href: "https://example.com" } }])])],
            },
          ],
        },
      ],
    };
    const { output } = serializer.serialize(doc);
    // Standard DokuWiki syntax — no invented backslash-escape a real
    // DokuWiki install wouldn't understand (spec §63 Definition of Done).
    expect(output).toContain("[[https://example.com|Example]]");
    const reparsed = parser.parse(output);
    const dataRow = reparsed.document.content?.[0].content?.[1];
    expect(dataRow?.content?.[0].content?.[0].content?.[0]).toMatchObject({
      text: "Example",
      marks: [{ type: "link", attrs: { href: "https://example.com" } }],
    });
  });

  it("preserves a mixed header/data row instead of downgrading header cells to data cells", () => {
    const cell = (type: string, value: string) => ({ type, content: [{ type: "paragraph", content: [text(value)] }] });
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "table", content: [{ type: "tableRow", content: [cell("tableHeader", "Apple"), cell("tableCell", "1.00")] }] },
      ],
    };
    const { output } = serializer.serialize(doc);
    expect(output).toBe("^ Apple | 1.00 |\n");
    const reparsed = parser.parse(output);
    const row = reparsed.document.content?.[0].content?.[0];
    expect(row?.content?.[0].type).toBe("tableHeader");
    expect(row?.content?.[1].type).toBe("tableCell");
  });

  it("preserves a literal %% in plain text through <nowiki> escaping", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [text("50%% off today")] }] };
    const { output } = serializer.serialize(doc);
    const reparsed = parser.parse(output);
    expect(reparsed.document.content?.[0].content?.[0].text).toBe("50%% off today");
  });

  it("emits a warning and preserves source for unsupportedMarkup", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "unsupportedMarkup", attrs: { format: "dokuwiki", source: "{{someplugin>x}}" } }] };
    const result = serializer.serialize(doc);
    expect(result.output).toBe("{{someplugin>x}}\n");
    expect(result.warnings).toHaveLength(1);
  });
});
