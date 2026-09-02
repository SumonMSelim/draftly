import type { JSONContent } from "@tiptap/core";
import { MarkdownParser } from "../formats/markdown/parser/MarkdownParser";
import { DokuWikiParser } from "../formats/dokuwiki/parser/DokuWikiParser";
import { importProject } from "./nativeProjectFormat";
import type { ParseWarning } from "../formats/core/Parser";

export type ImportFormat = "markdown" | "dokuwiki" | "draftly";

export interface ImportDocumentResult {
  success: boolean;
  document?: JSONContent;
  title?: string;
  warnings: ParseWarning[];
  error?: string;
}

const markdownParser = new MarkdownParser();
const dokuwikiParser = new DokuWikiParser();

/** Picks a default import format from a file extension (spec §28); the user can still override it explicitly. */
export function detectFormatFromFilename(filename: string): ImportFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".draftly.json")) return "draftly";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".dokuwiki")) return "dokuwiki";
  return "markdown";
}

export function importDocument(format: ImportFormat, source: string): ImportDocumentResult {
  if (format === "draftly") {
    const result = importProject(source);
    if (!result.success) {
      return { success: false, warnings: [], error: result.error };
    }
    return {
      success: true,
      document: result.project.document.content,
      title: result.project.document.title,
      warnings: [],
    };
  }

  const parser = format === "markdown" ? markdownParser : dokuwikiParser;
  const result = parser.parse(source);
  return { success: true, document: result.document, warnings: result.warnings };
}
