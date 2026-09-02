import { describe, expect, it } from "vitest";
import { MarkdownParser } from "../../../../src/formats/markdown/parser/MarkdownParser";

const parser = new MarkdownParser();

describe("MarkdownParser", () => {
  it("parses a heading and paragraph", () => {
    const { document, warnings } = parser.parse("# Security\n\nThis is **important**.\n");
    expect(warnings).toHaveLength(0);
    expect(document.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(document.content?.[1].type).toBe("paragraph");
    const runs = document.content?.[1].content;
    expect(runs?.[1]).toMatchObject({ text: "important", marks: [{ type: "bold" }] });
  });

  it("parses nested bullet lists", () => {
    const { document } = parser.parse("- First\n  - Nested\n- Second\n");
    const list = document.content?.[0];
    expect(list?.type).toBe("bulletList");
    expect(list?.content).toHaveLength(2);
    expect(list?.content?.[0].content?.[1].type).toBe("bulletList");
  });

  it("parses tables into tableHeader/tableCell nodes", () => {
    const { document } = parser.parse("| A | B |\n| --- | --- |\n| 1 | 2 |\n");
    const table = document.content?.[0];
    expect(table?.type).toBe("table");
    expect(table?.content?.[0].content?.[0].type).toBe("tableHeader");
    expect(table?.content?.[1].content?.[0].type).toBe("tableCell");
  });

  it("parses fenced code blocks with language", () => {
    const { document } = parser.parse("```bash\nsudo iptables -L\n```\n");
    expect(document.content?.[0]).toMatchObject({ type: "codeBlock", attrs: { language: "bash" } });
  });

  it("parses links and images", () => {
    const { document } = parser.parse("[Example](https://example.com)\n\n![Alt text](https://example.com/a.png)\n");
    expect(document.content?.[0].content?.[0]).toMatchObject({
      text: "Example",
      marks: [{ type: "link", attrs: { href: "https://example.com" } }],
    });
    expect(document.content?.[1]).toMatchObject({ type: "image", attrs: { src: "https://example.com/a.png", alt: "Alt text" } });
  });

  it("preserves unknown block-level HTML as unsupportedMarkup with a warning", () => {
    const { document, warnings } = parser.parse("<div>\nfoo\n</div>\n");
    expect(document.content?.[0].type).toBe("unsupportedMarkup");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("preserves unsupported inline HTML as text with a warning", () => {
    const { document, warnings } = parser.parse('<custom-widget data-x="1"></custom-widget>\n');
    expect(document.content?.[0].type).toBe("paragraph");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("never throws on malformed input", () => {
    expect(() => parser.parse("```unterminated fence\nno closing")).not.toThrow();
    expect(() => parser.parse("[[[[[unbalanced")).not.toThrow();
    expect(() => parser.parse("")).not.toThrow();
  });

  it("preserves unicode content", () => {
    const { document } = parser.parse("বাংলা Nederlands English 😀\n");
    expect(document.content?.[0].content?.[0].text).toContain("😀");
  });
});
