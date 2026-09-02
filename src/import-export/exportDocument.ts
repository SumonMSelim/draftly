import type { JSONContent } from "@tiptap/core";
import { MarkdownSerializer } from "../formats/markdown/serializer/MarkdownSerializer";
import { DokuWikiSerializer } from "../formats/dokuwiki/serializer/DokuWikiSerializer";
import { exportProject, PROJECT_FILE_EXTENSION, type ExportProjectInput } from "./nativeProjectFormat";
import type { SerializationWarning } from "../formats/core/Serializer";

export type ExportFormat = "markdown" | "dokuwiki";

const markdownSerializer = new MarkdownSerializer();
const dokuwikiSerializer = new DokuWikiSerializer();

export interface ExportDocumentResult {
  output: string;
  warnings: SerializationWarning[];
  filename: string;
  mimeType: string;
}

export function exportDocument(format: ExportFormat, document: JSONContent, title = "document"): ExportDocumentResult {
  const serializer = format === "markdown" ? markdownSerializer : dokuwikiSerializer;
  const result = serializer.serialize(document);
  return {
    output: result.output,
    warnings: result.warnings,
    filename: format === "markdown" ? `${title}.md` : `${title}.txt`,
    mimeType: format === "markdown" ? "text/markdown" : "text/plain",
  };
}

export function exportNativeProject(input: ExportProjectInput): { output: string; filename: string; mimeType: string } {
  return {
    output: exportProject(input),
    filename: `${input.title}${PROJECT_FILE_EXTENSION}`,
    mimeType: "application/json",
  };
}

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/** Copies to the clipboard, gracefully handling permission failures (spec §30). */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true };
  } catch {
    return { success: false, error: "Clipboard access was denied. Try downloading the file instead." };
  }
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
