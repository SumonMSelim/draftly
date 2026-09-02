import type { JSONContent } from "@tiptap/core";

export interface SerializationWarning {
  nodeType: string;
  message: string;
}

export interface SerializationResult {
  output: string;
  warnings: SerializationWarning[];
}

/**
 * A serializer converts the canonical Tiptap/ProseMirror document into a
 * target text format. Serializers must be deterministic: the same document
 * always produces the same output (spec §11, Rule 6).
 */
export interface DocumentSerializer {
  readonly format: string;
  serialize(document: JSONContent): SerializationResult;
}
