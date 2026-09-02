import { Editor, type JSONContent } from "@tiptap/core";
import { createExtensions } from "../extensions";

export type { JSONContent };

/** Block node type names supported by the canonical schema (spec §7). */
export const BLOCK_NODES = [
  "doc",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "image",
  "unsupportedMarkup",
] as const;

/** Mark type names supported by the canonical schema (spec §8). */
export const MARKS = ["bold", "italic", "underline", "strike", "code", "link"] as const;

export const EMPTY_DOCUMENT: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * Creates a detached (non-rendered) Tiptap editor instance backed by the
 * canonical schema. Used by format parsers/serializers and tests that need
 * to build or inspect ProseMirror JSON without mounting React.
 */
export function createHeadlessEditor(content: JSONContent = EMPTY_DOCUMENT): Editor {
  return new Editor({
    extensions: createExtensions(),
    content,
  });
}
