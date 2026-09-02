import type { JSONContent } from "@tiptap/core";

// Field names below: words, characters, and characters withoutSpaces (whitespace stripped).
export interface DocumentStats {
  words: number;
  characters: number;
  charactersWithoutSpaces: number;
}

/**
 * Computes word/character counts directly from the ProseMirror document
 * model (spec §39) so markup, image URLs, and node attrs never leak into
 * the count — only actual text-node content is considered.
 */
export function computeStats(doc: JSONContent): DocumentStats {
  const textRun: string[] = [];
  const wordSource: string[] = [];

  const walk = (node: JSONContent) => {
    if (node.type === "text") {
      const text = node.text ?? "";
      textRun.push(text);
      wordSource.push(text);
      return;
    }
    if (node.content) {
      node.content.forEach(walk);
      wordSource.push("\n");
    }
  };

  walk(doc);

  const characters = textRun.join("");
  const words = wordSource
    .join("")
    .split(/\s+/)
    .filter((word) => word.length > 0);

  return {
    words: words.length,
    characters: characters.length,
    charactersWithoutSpaces: characters.replace(/\s/g, "").length,
  };
}
