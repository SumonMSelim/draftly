import { describe, expect, it } from "vitest";
import { createHeadlessEditor } from "../../../src/editor/schema/schema";
import { normalize } from "../../../src/document/normalization/normalize";

describe("canonical schema", () => {
  it("creates an editor with a paragraph, code block, and table available", () => {
    const editor = createHeadlessEditor();
    expect(editor.schema.nodes.paragraph).toBeDefined();
    expect(editor.schema.nodes.codeBlock).toBeDefined();
    expect(editor.schema.nodes.table).toBeDefined();
    expect(editor.schema.nodes.unsupportedMarkup).toBeDefined();
    editor.destroy();
  });

  it("preserves arbitrary code block languages", () => {
    const editor = createHeadlessEditor({
      type: "doc",
      content: [{ type: "codeBlock", attrs: { language: "terraform" }, content: [{ type: "text", text: "resource {}" }] }],
    });
    expect(editor.getJSON().content?.[0].attrs?.language).toBe("terraform");
    editor.destroy();
  });

  it("round-trips an unsupportedMarkup node through the editor", () => {
    const source = "{{someplugin>something}}";
    const editor = createHeadlessEditor({
      type: "doc",
      content: [{ type: "unsupportedMarkup", attrs: { format: "dokuwiki", source } }],
    });
    const json = editor.getJSON();
    expect(json.content?.[0].type).toBe("unsupportedMarkup");
    expect(json.content?.[0].attrs?.source).toBe(source);
    editor.destroy();
  });
});

describe("normalize", () => {
  it("merges adjacent text nodes with identical marks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello ", marks: [{ type: "bold" }] },
            { type: "text", text: "world", marks: [{ type: "bold" }] },
          ],
        },
      ],
    };
    const result = normalize(doc);
    expect(result.content?.[0].content).toHaveLength(1);
    expect(result.content?.[0].content?.[0].text).toBe("Hello world");
  });

  it("drops empty text nodes and treats mark order as insignificant", () => {
    const a = {
      type: "paragraph",
      content: [
        { type: "text", text: "" },
        { type: "text", text: "x", marks: [{ type: "italic" }, { type: "bold" }] },
      ],
    };
    const b = {
      type: "paragraph",
      content: [{ type: "text", text: "x", marks: [{ type: "bold" }, { type: "italic" }] }],
    };
    expect(normalize(a)).toEqual(normalize(b));
  });
});
