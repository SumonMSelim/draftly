import type {
  BlankToken,
  BlockquoteToken,
  CodeFenceCloseToken,
  CodeFenceOpenToken,
  CodeLineToken,
  HeadingToken,
  HorizontalRuleToken,
  LexerWarning,
  ListItemToken,
  TableRowToken,
  TextToken,
  Token,
} from "./tokens";

const HEADING = /^(={1,6})\s*(.*?)\s*=*\s*$/;
const LIST_ITEM = /^(\s*)([*-])\s+(.*)$/;
const BLOCKQUOTE = /^(>+)\s?(.*)$/;
const CODE_OPEN = /^<code(?:\s+([^\s>]+))?\s*>$/i;
const CODE_CLOSE = /^<\/code>$/i;
const HORIZONTAL_RULE = /^-{4,}$/;

function splitTableRow(line: string): { header: boolean; text: string }[] {
  const cells: { header: boolean; text: string }[] = [];
  let i = 0;

  while (i < line.length) {
    const delimiter = line[i];
    if (delimiter !== "|" && delimiter !== "^") break;
    i++;
    if (i >= line.length) break;

    const start = i;
    while (i < line.length) {
      // A link or image's own "|" (e.g. [[url|label]]) is not a cell
      // boundary; skip over the whole span so it isn't split apart.
      if (line[i] === "[" && line[i + 1] === "[") {
        const close = line.indexOf("]]", i + 2);
        i = close === -1 ? line.length : close + 2;
        continue;
      }
      if (line[i] === "{" && line[i + 1] === "{") {
        const close = line.indexOf("}}", i + 2);
        i = close === -1 ? line.length : close + 2;
        continue;
      }
      if ((line[i] === "|" || line[i] === "^") && line[i - 1] !== "\\") break;
      i++;
    }
    cells.push({ header: delimiter === "^", text: line.slice(start, i).trim() });
  }

  return cells;
}

export interface LexResult {
  tokens: Token[];
  warnings: LexerWarning[];
}

/**
 * Tokenizes DokuWiki source into a flat stream of line-level tokens
 * (spec §13/§14, stage 1 of the parsing pipeline). Never throws: any line
 * that matches no known block syntax becomes a plain `text` token so
 * malformed input degrades to a paragraph instead of crashing.
 */
export function lex(source: string): LexResult {
  const warnings: LexerWarning[] = [];
  const tokens: Token[] = [];
  const lines = source.split(/\r\n|\r|\n/);

  let inCode = false;
  let codeLanguage: string | null = null;
  let codeOpenLine = 0;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const firstNonSpace = line.search(/\S/);
    const column = firstNonSpace === -1 ? 1 : firstNonSpace + 1;
    const trimmed = line.trim();

    if (inCode) {
      if (CODE_CLOSE.test(trimmed)) {
        tokens.push({ type: "codeClose", line: lineNumber, column } satisfies CodeFenceCloseToken);
        inCode = false;
        codeLanguage = null;
      } else {
        tokens.push({ type: "codeLine", line: lineNumber, column: 1, text: line } satisfies CodeLineToken);
      }
      return;
    }

    let match: RegExpMatchArray | null;

    if ((match = CODE_OPEN.exec(trimmed))) {
      inCode = true;
      codeLanguage = match[1] ?? null;
      codeOpenLine = lineNumber;
      tokens.push({ type: "codeOpen", line: lineNumber, column, language: codeLanguage } satisfies CodeFenceOpenToken);
      return;
    }

    if (trimmed === "") {
      tokens.push({ type: "blank", line: lineNumber, column: 1 } satisfies BlankToken);
      return;
    }

    if (HORIZONTAL_RULE.test(trimmed)) {
      tokens.push({ type: "horizontalRule", line: lineNumber, column } satisfies HorizontalRuleToken);
      return;
    }

    if ((match = HEADING.exec(trimmed))) {
      const level = Math.max(1, Math.min(6, 7 - match[1].length));
      tokens.push({ type: "heading", line: lineNumber, column, level, text: match[2] } satisfies HeadingToken);
      return;
    }

    if ((match = LIST_ITEM.exec(line))) {
      const depth = Math.max(0, Math.floor(match[1].length / 2) - 1);
      tokens.push({
        type: "listItem",
        line: lineNumber,
        column,
        ordered: match[2] === "-",
        depth,
        text: match[3],
      } satisfies ListItemToken);
      return;
    }

    if ((match = BLOCKQUOTE.exec(trimmed))) {
      tokens.push({
        type: "blockquote",
        line: lineNumber,
        column,
        depth: match[1].length - 1,
        text: match[2],
      } satisfies BlockquoteToken);
      return;
    }

    if (trimmed[0] === "|" || trimmed[0] === "^") {
      const cells = splitTableRow(trimmed);
      if (cells.length > 0) {
        tokens.push({ type: "tableRow", line: lineNumber, column, cells } satisfies TableRowToken);
        return;
      }
    }

    tokens.push({ type: "text", line: lineNumber, column, text: line } satisfies TextToken);
  });

  if (inCode) {
    warnings.push({ line: codeOpenLine, message: `Unterminated <code> block starting at line ${codeOpenLine}.` });
  }

  return { tokens, warnings };
}
