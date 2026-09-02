import { describe, expect, it } from "vitest";
import { lex } from "../../../../src/formats/dokuwiki/lexer/Lexer";

describe("DokuWiki lexer", () => {
  it("tokenizes a heading with line and column", () => {
    const { tokens } = lex("====== Security ======");
    expect(tokens[0]).toMatchObject({ type: "heading", level: 1, text: "Security", line: 1, column: 1 });
  });

  it("tokenizes nested list items by indentation depth", () => {
    const { tokens } = lex("  * First\n    * Nested\n  * Second");
    expect(tokens.filter((t) => t.type === "listItem")).toEqual([
      expect.objectContaining({ ordered: false, depth: 0, text: "First" }),
      expect.objectContaining({ ordered: false, depth: 1, text: "Nested" }),
      expect.objectContaining({ ordered: false, depth: 0, text: "Second" }),
    ]);
  });

  it("tokenizes a code block, preserving verbatim lines and ignoring markup inside", () => {
    const { tokens } = lex("<code bash>\n**not bold**\n</code>");
    expect(tokens[0]).toMatchObject({ type: "codeOpen", language: "bash" });
    expect(tokens[1]).toMatchObject({ type: "codeLine", text: "**not bold**" });
    expect(tokens[2]).toMatchObject({ type: "codeClose" });
  });

  it("tokenizes table rows distinguishing header (^) from body (|) cells", () => {
    const { tokens } = lex("^ A ^ B ^\n| 1 | 2 |");
    expect(tokens[0]).toMatchObject({ type: "tableRow", cells: [{ header: true, text: "A" }, { header: true, text: "B" }] });
    expect(tokens[1]).toMatchObject({ type: "tableRow", cells: [{ header: false, text: "1" }, { header: false, text: "2" }] });
  });

  it("emits a warning for an unterminated code block instead of throwing", () => {
    const { tokens, warnings } = lex("<code bash>\nsudo iptables -L");
    expect(() => lex("<code bash>\nsudo iptables -L")).not.toThrow();
    expect(tokens.some((t) => t.type === "codeLine")).toBe(true);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("tokenizes a horizontal rule and blockquote", () => {
    const { tokens } = lex("----\n> Quoted text");
    expect(tokens[0]).toMatchObject({ type: "horizontalRule" });
    expect(tokens[1]).toMatchObject({ type: "blockquote", depth: 0, text: "Quoted text" });
  });

  it("falls back to a text token for unrecognized lines", () => {
    const { tokens } = lex("Just a plain paragraph.");
    expect(tokens[0]).toMatchObject({ type: "text", text: "Just a plain paragraph." });
  });

  it("does not split a table cell on a link's own unescaped pipe", () => {
    const { tokens } = lex("| [[https://example.com|Example]] | Bob |");
    expect(tokens[0]).toMatchObject({
      type: "tableRow",
      cells: [{ header: false, text: "[[https://example.com|Example]]" }, { header: false, text: "Bob" }],
    });
  });

  it("does not split a table cell on an image's own unescaped pipe", () => {
    const { tokens } = lex("| {{image.png|A description}} | Next |");
    expect(tokens[0]).toMatchObject({
      type: "tableRow",
      cells: [{ header: false, text: "{{image.png|A description}}" }, { header: false, text: "Next" }],
    });
  });
});
