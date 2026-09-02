import { describe, expect, it } from "vitest";
import { MarkdownSerializer } from "../../../../src/formats/markdown/serializer/MarkdownSerializer";
import type { JSONContent } from "@tiptap/core";

const serializer = new MarkdownSerializer();

function text(value: string, marks?: { type: string; attrs?: Record<string, unknown> }[]): JSONContent {
  return marks ? { type: "text", text: value, marks } : { type: "text", text: value };
}

describe("MarkdownSerializer", () => {
  it("serializes a paragraph", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [text("Hello world")] }] };
    expect(serializer.serialize(doc).output).toBe("Hello world\n");
  });

  it("serializes headings 1 through 6", () => {
    for (let level = 1; level <= 6; level++) {
      const doc: JSONContent = { type: "doc", content: [{ type: "heading", attrs: { level }, content: [text("Title")] }] };
      expect(serializer.serialize(doc).output).toBe(`${"#".repeat(level)} Title\n`);
    }
  });

  it("serializes bold, italic, strike, and inline code", () => {
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
            text("strike", [{ type: "strike" }]),
            text(" "),
            text("code", [{ type: "code" }]),
          ],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("**bold** *italic* ~~strike~~ `code`\n");
  });

  it("serializes links and images", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [text("Example", [{ type: "link", attrs: { href: "https://example.com" } }])] },
        { type: "image", attrs: { src: "https://example.com/a.png", alt: "A" } },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("[Example](https://example.com)\n\n![A](https://example.com/a.png)\n");
  });

  it("wraps link destinations containing spaces or parens in angle brackets", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [text("Example", [{ type: "link", attrs: { href: "https://example.com/a (b).png" } }])],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("[Example](<https://example.com/a (b).png>)\n");
  });

  it("merges adjacent runs sharing marks into properly nested formatting", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            text("bold with ", [{ type: "bold" }]),
            text("italic", [{ type: "bold" }, { type: "italic" }]),
            text(" inside", [{ type: "bold" }]),
          ],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("**bold with *italic* inside**\n");
  });

  it("merges consecutive identical-mark runs without re-opening markers", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [text("foo", [{ type: "bold" }]), text("bar", [{ type: "bold" }])] }],
    };
    expect(serializer.serialize(doc).output).toBe("**foobar**\n");
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
                { type: "paragraph", content: [text("First")] },
                { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("Nested")] }] }] },
              ],
            },
            { type: "listItem", content: [{ type: "paragraph", content: [text("Second")] }] },
          ],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("- First\n    - Nested\n- Second\n");
  });

  it("serializes ordered lists", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [text("One")] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [text("Two")] }] },
          ],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("1. One\n2. Two\n");
  });

  it("serializes blockquotes", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "blockquote", content: [{ type: "paragraph", content: [text("Quoted")] }] }] };
    expect(serializer.serialize(doc).output).toBe("> Quoted\n");
  });

  it("serializes fenced code blocks with a language", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "codeBlock", attrs: { language: "bash" }, content: [{ type: "text", text: "sudo iptables -L" }] }],
    };
    expect(serializer.serialize(doc).output).toBe("```bash\nsudo iptables -L\n```\n");
  });

  it("serializes tables", () => {
    const cell = (value: string) => ({ type: "tableCell", content: [{ type: "paragraph", content: [text(value)] }] });
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            { type: "tableRow", content: [cell("A"), cell("B")] },
            { type: "tableRow", content: [cell("1"), cell("2")] },
          ],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("| A | B |\n| --- | --- |\n| 1 | 2 |\n");
  });

  it("pads rows with fewer cells than the header to keep the table valid GFM", () => {
    const cell = (value: string) => ({ type: "tableCell", content: [{ type: "paragraph", content: [text(value)] }] });
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            { type: "tableRow", content: [cell("A"), cell("B"), cell("C")] },
            { type: "tableRow", content: [cell("1")] },
          ],
        },
      ],
    };
    expect(serializer.serialize(doc).output).toBe("| A | B | C |\n| --- | --- | --- |\n| 1 |  |  |\n");
  });

  it("serializes a horizontal rule", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "horizontalRule" }] };
    expect(serializer.serialize(doc).output).toBe("---\n");
  });

  it("produces an empty string for an empty document", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
    expect(serializer.serialize(doc).output).toBe("");
  });

  it("escapes markdown-special characters", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [text("1 * 2 = [2] not *bold*")] }] };
    expect(serializer.serialize(doc).output).toBe("1 \\* 2 = \\[2\\] not \\*bold\\*\n");
  });

  it("is deterministic across repeated calls", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [text("Same input, same output")] }] };
    const first = serializer.serialize(doc).output;
    const second = serializer.serialize(doc).output;
    expect(first).toBe(second);
  });

  it("preserves unicode text", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [text("বাংলা Nederlands English 😀")] }] };
    expect(serializer.serialize(doc).output).toBe("বাংলা Nederlands English 😀\n");
  });

  it("emits a warning and preserves source for unsupportedMarkup", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "unsupportedMarkup", attrs: { format: "markdown", source: "<custom/>" } }] };
    const result = serializer.serialize(doc);
    expect(result.output).toBe("<custom/>\n");
    expect(result.warnings).toHaveLength(1);
  });
});
