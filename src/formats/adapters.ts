import type { JSONContent } from "@tiptap/core";
import type { FormatAdapter } from "./core/FormatAdapter";
import type { ParseResult } from "./core/Parser";
import type { SerializationResult } from "./core/Serializer";
import { MarkdownParser } from "./markdown/parser/MarkdownParser";
import { MarkdownSerializer } from "./markdown/serializer/MarkdownSerializer";
import { DokuWikiParser } from "./dokuwiki/parser/DokuWikiParser";
import { DokuWikiSerializer } from "./dokuwiki/serializer/DokuWikiSerializer";

function toAdapter(
  id: string,
  name: string,
  extensions: string[],
  parser: { parse(source: string): ParseResult },
  serializer: { serialize(document: JSONContent): SerializationResult },
): FormatAdapter {
  return {
    id,
    name,
    extensions,
    parse: (source) => parser.parse(source),
    serialize: (document) => serializer.serialize(document),
  };
}

export const markdownAdapter: FormatAdapter = toAdapter(
  "markdown",
  "Markdown",
  [".md", ".markdown"],
  new MarkdownParser(),
  new MarkdownSerializer(),
);

export const dokuWikiAdapter: FormatAdapter = toAdapter(
  "dokuwiki",
  "DokuWiki",
  [".txt", ".dokuwiki"],
  new DokuWikiParser(),
  new DokuWikiSerializer(),
);

export const defaultAdapters: FormatAdapter[] = [markdownAdapter, dokuWikiAdapter];
