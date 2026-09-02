import type { Editor as TiptapEditor } from "@tiptap/react";
import { isSafeUrl, normalizeUrl } from "../../utils/url";

export interface InsertLinkInput {
  url: string;
  text?: string;
}

export function insertLink(editor: TiptapEditor, input: InsertLinkInput): boolean {
  const url = normalizeUrl(input.url);
  if (!isSafeUrl(url)) return false;

  const chain = editor.chain().focus();
  if (input.text && input.text.length > 0) {
    chain.insertContent({ type: "text", text: input.text, marks: [{ type: "link", attrs: { href: url } }] });
  } else {
    chain.extendMarkRange("link").setLink({ href: url });
  }
  return chain.run();
}

export interface InsertImageInput {
  src: string;
  alt?: string;
}

export function insertImage(editor: TiptapEditor, input: InsertImageInput): boolean {
  const src = normalizeUrl(input.src);
  if (!isSafeUrl(src) && !src.startsWith("data:image/")) return false;

  return editor.chain().focus().setImage({ src, alt: input.alt ?? "" }).run();
}

export function insertTable(editor: TiptapEditor, rows = 3, cols = 3, withHeaderRow = true): boolean {
  return editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
}

export const tableCommands = {
  addRowAfter: (editor: TiptapEditor) => editor.chain().focus().addRowAfter().run(),
  deleteRow: (editor: TiptapEditor) => editor.chain().focus().deleteRow().run(),
  addColumnAfter: (editor: TiptapEditor) => editor.chain().focus().addColumnAfter().run(),
  deleteColumn: (editor: TiptapEditor) => editor.chain().focus().deleteColumn().run(),
  deleteTable: (editor: TiptapEditor) => editor.chain().focus().deleteTable().run(),
};
