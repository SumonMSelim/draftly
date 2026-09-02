import type { DocumentParser, ParseResult, ParseWarning } from "../../core/Parser";
import { lex } from "../lexer/Lexer";
import { parseBlocks } from "./blockParser";

/**
 * DokuWiki parser (spec §13-15): lexer → block parser → inline parser
 * pipeline, never regex-soup text replacement. Malformed input never
 * throws — it degrades to paragraphs or `unsupportedMarkup` nodes with
 * warnings so the user can still edit what was imported (Rule 7).
 */
export class DokuWikiParser implements DocumentParser {
  readonly format = "dokuwiki";

  parse(source: string): ParseResult {
    try {
      const { tokens, warnings: lexWarnings } = lex(source);
      const warnings: ParseWarning[] = [...lexWarnings];
      const content = parseBlocks(tokens, warnings);

      return {
        document: { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] },
        warnings,
      };
    } catch (error) {
      return {
        document: {
          type: "doc",
          content: [{ type: "unsupportedMarkup", attrs: { format: "dokuwiki", source } }],
        },
        warnings: [{ line: 0, message: `Failed to parse DokuWiki: ${(error as Error).message}` }],
      };
    }
  }
}

export default DokuWikiParser;
