import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DokuWikiParser } from "../../src/formats/dokuwiki/parser/DokuWikiParser";
import { DokuWikiSerializer } from "../../src/formats/dokuwiki/serializer/DokuWikiSerializer";
import { normalize } from "../../src/document/normalization/normalize";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "dokuwiki");
const parser = new DokuWikiParser();
const serializer = new DokuWikiSerializer();

const fixtureNames = readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe("DokuWiki fixtures round-trip", () => {
  for (const name of fixtureNames) {
    it(`${name}: parse matches expected.json (semantically)`, () => {
      const input = readFileSync(path.join(FIXTURES_DIR, name, "input.dokuwiki"), "utf-8");
      const expected = JSON.parse(readFileSync(path.join(FIXTURES_DIR, name, "expected.json"), "utf-8"));
      const result = parser.parse(input);
      expect(normalize(result.document)).toEqual(normalize(expected.document));
    });

    const expectedDokuwikiPath = path.join(FIXTURES_DIR, name, "expected.dokuwiki");

    if (existsSync(expectedDokuwikiPath)) {
      it(`${name}: serialize(parse(input)) is semantically stable`, () => {
        const input = readFileSync(path.join(FIXTURES_DIR, name, "input.dokuwiki"), "utf-8");
        const expectedOutput = readFileSync(expectedDokuwikiPath, "utf-8");
        const parsed = parser.parse(input);
        const serialized = serializer.serialize(parsed.document).output;
        expect(serialized).toBe(expectedOutput);

        // Full round trip: reparsing the serialized output must be semantically
        // equivalent to the original parse, even if the raw text differs.
        const reparsed = parser.parse(serialized);
        expect(normalize(reparsed.document)).toEqual(normalize(parsed.document));
      });
    }
  }

  it("never throws on the malformed fixture", () => {
    const input = readFileSync(path.join(FIXTURES_DIR, "malformed", "input.dokuwiki"), "utf-8");
    expect(() => parser.parse(input)).not.toThrow();
    const result = parser.parse(input);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
