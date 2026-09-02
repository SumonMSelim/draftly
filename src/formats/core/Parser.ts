import type { JSONContent } from "@tiptap/core";

export interface ParseWarning {
  line: number;
  column?: number;
  message: string;
  source?: string;
}

export interface ParseResult {
  document: JSONContent;
  warnings: ParseWarning[];
}

/**
 * A parser converts source text in a given format into the canonical
 * Tiptap/ProseMirror document. Parsers must never throw on malformed input
 * (spec §14/Rule 7) — unsupported or broken constructs are reported as
 * warnings and preserved where possible instead.
 */
export interface DocumentParser {
  readonly format: string;
  parse(source: string): ParseResult;
}
