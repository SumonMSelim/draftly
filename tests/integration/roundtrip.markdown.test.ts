import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MarkdownParser } from "../../src/formats/markdown/parser/MarkdownParser";
import { MarkdownSerializer } from "../../src/formats/markdown/serializer/MarkdownSerializer";
import { normalize } from "../../src/document/normalization/normalize";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "markdown");
const parser = new MarkdownParser();
const serializer = new MarkdownSerializer();

const fixtureNames = readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe("Markdown fixtures round-trip", () => {
  for (const name of fixtureNames) {
    it(`${name}: parse matches expected.json (semantically)`, () => {
      const input = readFileSync(path.join(FIXTURES_DIR, name, "input.md"), "utf-8");
      const expected = JSON.parse(readFileSync(path.join(FIXTURES_DIR, name, "expected.json"), "utf-8"));
      const result = parser.parse(input);
      expect(normalize(result.document)).toEqual(normalize(expected.document));
    });

    it(`${name}: serialize(parse(input)) round-trips to a semantically equivalent document`, () => {
      const input = readFileSync(path.join(FIXTURES_DIR, name, "input.md"), "utf-8");
      const parsed = parser.parse(input);
      const serialized = serializer.serialize(parsed.document).output;
      const reparsed = parser.parse(serialized);
      expect(normalize(reparsed.document)).toEqual(normalize(parsed.document));
    });
  }
});
