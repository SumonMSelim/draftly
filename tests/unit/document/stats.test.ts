import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { computeStats } from "../../../src/document/stats";

describe("computeStats", () => {
  it("counts words and characters from a simple paragraph", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }] };
    const stats = computeStats(doc);
    expect(stats.words).toBe(2);
    expect(stats.characters).toBe(11);
    expect(stats.charactersWithoutSpaces).toBe(10);
  });

  it("does not merge words across separate blocks", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First" }] },
        { type: "paragraph", content: [{ type: "text", text: "Second" }] },
      ],
    };
    expect(computeStats(doc).words).toBe(2);
  });

  it("ignores node attrs such as image URLs and code block language", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "image", attrs: { src: "https://example.com/very-long-image-name.png", alt: "" } },
        { type: "codeBlock", attrs: { language: "bash" }, content: [{ type: "text", text: "echo hi" }] },
      ],
    };
    const stats = computeStats(doc);
    expect(stats.words).toBe(2);
  });

  it("ignores unsupportedMarkup source text", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "unsupportedMarkup", attrs: { format: "dokuwiki", source: "{{plugin>x y z}}" } }] };
    expect(computeStats(doc).words).toBe(0);
  });

  it("returns zero counts for an empty document", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
    const stats = computeStats(doc);
    expect(stats).toEqual({ words: 0, characters: 0, charactersWithoutSpaces: 0 });
  });
});
