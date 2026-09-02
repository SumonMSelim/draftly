import type { JSONContent } from "@tiptap/core";
import type { ParseResult } from "./Parser";
import type { SerializationResult } from "./Serializer";

/**
 * Combines a parser, a serializer, and format metadata behind one plugin
 * surface (spec §51). Adding a new format means implementing this interface
 * — the editor and import/export UI never need to change.
 */
export interface FormatAdapter {
  readonly id: string;
  readonly name: string;
  readonly extensions: string[];

  parse(source: string): ParseResult;
  serialize(document: JSONContent): SerializationResult;
}
