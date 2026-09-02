import { describe, expect, it } from "vitest";
import { DokuWikiParser } from "../../../../src/formats/dokuwiki/parser/DokuWikiParser";

const parser = new DokuWikiParser();

describe("DokuWikiParser", () => {
  it("parses a heading and bold paragraph", () => {
    const { document, warnings } = parser.parse("====== Security ======\n\nThis is **important**.\n");
    expect(warnings).toHaveLength(0);
    expect(document.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(document.content?.[0].content?.[0].text).toBe("Security");
    const paragraph = document.content?.[1];
    expect(paragraph?.type).toBe("paragraph");
    expect(paragraph?.content).toEqual([
      { type: "text", text: "This is " },
      { type: "text", text: "important", marks: [{ type: "bold" }] },
      { type: "text", text: "." },
    ]);
  });

  it("parses nested bullet lists", () => {
    const { document } = parser.parse("  * First\n    * Nested\n  * Second\n");
    const list = document.content?.[0];
    expect(list?.type).toBe("bulletList");
    expect(list?.content).toHaveLength(2);
    expect(list?.content?.[0].content?.[1]).toMatchObject({ type: "bulletList" });
  });

  it("parses ordered lists", () => {
    const { document } = parser.parse("  - One\n  - Two\n");
    expect(document.content?.[0].type).toBe("orderedList");
  });

  it("parses a code block, ignoring markup inside", () => {
    const { document } = parser.parse("<code bash>\nsudo iptables -L\n**not bold**\n</code>\n");
    expect(document.content?.[0]).toMatchObject({ type: "codeBlock", attrs: { language: "bash" } });
    expect(document.content?.[0].content?.[0].text).toBe("sudo iptables -L\n**not bold**");
  });

  it("parses tables with header and body rows", () => {
    const { document } = parser.parse("^ A ^ B ^\n| 1 | 2 |\n");
    const table = document.content?.[0];
    expect(table?.content?.[0].content?.[0].type).toBe("tableHeader");
    expect(table?.content?.[1].content?.[0].type).toBe("tableCell");
  });

  it("parses links and images", () => {
    const { document } = parser.parse("[[https://example.com|Example]]\n\n{{image.png|A description}}\n");
    expect(document.content?.[0].content?.[0]).toMatchObject({
      text: "Example",
      marks: [{ type: "link", attrs: { href: "https://example.com" } }],
    });
    expect(document.content?.[1]).toMatchObject({ type: "image", attrs: { src: "image.png", alt: "A description" } });
  });

  it("preserves an unknown plugin macro as unsupportedMarkup with a warning", () => {
    const { document, warnings } = parser.parse("{{someplugin>something}}\n");
    expect(document.content?.[0]).toMatchObject({ type: "unsupportedMarkup", attrs: { format: "dokuwiki" } });
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("never throws on malformed input", () => {
    expect(() => parser.parse("<code bash>\nunterminated")).not.toThrow();
    expect(() => parser.parse("**unterminated bold")).not.toThrow();
    expect(() => parser.parse("[[unterminated link")).not.toThrow();
    expect(() => parser.parse("")).not.toThrow();
  });

  it("treats an unterminated bold marker as literal text with a warning", () => {
    const { document, warnings } = parser.parse("**unterminated bold\n");
    const text = (document.content?.[0].content ?? []).map((node) => node.text).join("");
    expect(text).toBe("**unterminated bold");
    expect((document.content?.[0].content ?? []).every((node) => !node.marks)).toBe(true);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("does not execute macros — they are preserved as inert text/markup", () => {
    const { document } = parser.parse("{{page>foo}}\n");
    expect(document.content?.[0].type).toBe("unsupportedMarkup");
    expect(document.content?.[0].attrs?.source).toBe("{{page>foo}}");
  });

  it("preserves unicode content", () => {
    const { document } = parser.parse("বাংলা Nederlands English 😀\n");
    expect(document.content?.[0].content?.[0].text).toContain("😀");
  });

  it("parses a table cell containing a link without splitting on the link's own pipe", () => {
    const { document, warnings } = parser.parse("| [[https://example.com|Example]] | Bob |\n");
    expect(warnings).toHaveLength(0);
    const row = document.content?.[0].content?.[0];
    expect(row?.content).toHaveLength(2);
    const linkCell = row?.content?.[0].content?.[0].content?.[0];
    expect(linkCell).toMatchObject({ text: "Example", marks: [{ type: "link", attrs: { href: "https://example.com" } }] });
    expect(row?.content?.[1].content?.[0].content?.[0].text).toBe("Bob");
  });

  it("parses a table cell containing an image without splitting on the image's own pipe", () => {
    const { document } = parser.parse("| {{image.png|A description}} | Next |\n");
    const row = document.content?.[0].content?.[0];
    expect(row?.content).toHaveLength(2);
    expect(row?.content?.[0].content?.[0].content?.[0]).toMatchObject({
      type: "image",
      attrs: { src: "image.png", alt: "A description" },
    });
  });
});
