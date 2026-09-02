import { marked } from "marked";
import type { JSONContent } from "@tiptap/core";
import type { DocumentParser, ParseResult, ParseWarning } from "../../core/Parser";

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToken = any;

function convertInline(tokens: AnyToken[] | undefined, warnings: ParseWarning[]): JSONContent[] {
  const result: JSONContent[] = [];

  const pushText = (text: string, marks: Mark[]) => {
    if (text.length === 0) return;
    result.push(marks.length > 0 ? { type: "text", text, marks } : { type: "text", text });
  };

  const walk = (list: AnyToken[], baseMarks: Mark[]) => {
    let activeMarks = [...baseMarks];

    for (const token of list) {
      switch (token.type) {
        case "text":
        case "escape":
          pushText(token.text ?? token.raw ?? "", activeMarks);
          break;

        case "strong":
          walk(token.tokens ?? [{ type: "text", text: token.text }], [...activeMarks, { type: "bold" }]);
          break;

        case "em":
          walk(token.tokens ?? [{ type: "text", text: token.text }], [...activeMarks, { type: "italic" }]);
          break;

        case "del":
          walk(token.tokens ?? [{ type: "text", text: token.text }], [...activeMarks, { type: "strike" }]);
          break;

        case "codespan":
          pushText(token.text, [...activeMarks, { type: "code" }]);
          break;

        case "link":
          walk(token.tokens ?? [{ type: "text", text: token.text }], [
            ...activeMarks,
            { type: "link", attrs: { href: token.href } },
          ]);
          break;

        case "br":
          result.push({ type: "hardBreak" });
          break;

        case "image":
          // Only reached for images nested inside another inline mark (e.g. a
          // linked image); top-level paragraph images are split out as
          // block-level nodes by convertParagraphTokens before reaching here.
          warnings.push({ line: 0, message: `Nested image "${token.href}" flattened to text; images must be block-level.` });
          pushText(`![${token.text ?? ""}](${token.href})`, activeMarks);
          break;

        case "html":
        case "tag": {
          const raw = String(token.text ?? token.raw ?? "").trim().toLowerCase();
          if (raw === "<u>") {
            activeMarks = [...activeMarks, { type: "underline" }];
          } else if (raw === "</u>") {
            activeMarks = activeMarks.filter((mark) => mark.type !== "underline");
          } else {
            warnings.push({ line: 0, message: `Unsupported inline HTML "${token.raw}" preserved as plain text.` });
            pushText(token.raw ?? "", activeMarks);
          }
          break;
        }

        default:
          pushText(token.raw ?? token.text ?? "", activeMarks);
      }
    }
  };

  walk(tokens ?? [], []);
  return result;
}

/**
 * Draftly images are block-level, but Markdown allows `![]()` anywhere
 * inline. Splits a paragraph's tokens on top-level image tokens so each
 * image becomes its own sibling block instead of being dropped or nested
 * illegally inside a paragraph.
 */
function convertParagraphTokens(tokens: AnyToken[] | undefined, warnings: ParseWarning[]): JSONContent[] {
  const blocks: JSONContent[] = [];
  let buffer: AnyToken[] = [];

  const flush = () => {
    const content = convertInline(buffer, warnings);
    if (content.length > 0) blocks.push({ type: "paragraph", content });
    buffer = [];
  };

  for (const token of tokens ?? []) {
    if (token.type === "image") {
      flush();
      blocks.push({ type: "image", attrs: { src: token.href, alt: token.text ?? "" } });
    } else {
      buffer.push(token);
    }
  }
  flush();

  return blocks.length > 0 ? blocks : [{ type: "paragraph" }];
}

function convertListItem(item: AnyToken, warnings: ParseWarning[]): JSONContent {
  const blocks: JSONContent[] = [];

  for (const token of item.tokens ?? []) {
    if (token.type === "text" || token.type === "paragraph") {
      blocks.push(...convertParagraphTokens(token.tokens, warnings));
    } else if (token.type === "list") {
      blocks.push(convertList(token, warnings));
    } else {
      blocks.push(...convertBlock(token, warnings));
    }
  }

  return { type: "listItem", content: blocks.length > 0 ? blocks : [{ type: "paragraph" }] };
}

function convertList(token: AnyToken, warnings: ParseWarning[]): JSONContent {
  const attrs =
    token.ordered && token.start && token.start !== 1 && token.start !== ""
      ? { start: Number(token.start) }
      : undefined;
  return {
    type: token.ordered ? "orderedList" : "bulletList",
    ...(attrs ? { attrs } : {}),
    content: (token.items ?? []).map((item: AnyToken) => convertListItem(item, warnings)),
  };
}

function convertTable(token: AnyToken, warnings: ParseWarning[]): JSONContent {
  const headerRow: JSONContent = {
    type: "tableRow",
    content: (token.header ?? []).map((cell: AnyToken) => ({
      type: "tableHeader",
      content: [{ type: "paragraph", content: convertInline(cell.tokens, warnings) }],
    })),
  };
  const rows: JSONContent[] = (token.rows ?? []).map((row: AnyToken[]) => ({
    type: "tableRow",
    content: row.map((cell) => ({
      type: "tableCell",
      content: [{ type: "paragraph", content: convertInline(cell.tokens, warnings) }],
    })),
  }));
  return { type: "table", content: [headerRow, ...rows] };
}

function convertBlock(token: AnyToken, warnings: ParseWarning[]): JSONContent[] {
  switch (token.type) {
    case "paragraph":
      return convertParagraphTokens(token.tokens, warnings);

    case "heading":
      return [{ type: "heading", attrs: { level: token.depth }, content: convertInline(token.tokens, warnings) }];

    case "blockquote":
      return [
        {
          type: "blockquote",
          content: (token.tokens ?? []).flatMap((child: AnyToken) => convertBlock(child, warnings)),
        },
      ];

    case "code":
      return [
        {
          type: "codeBlock",
          attrs: { language: token.lang || null },
          content: token.text.length > 0 ? [{ type: "text", text: token.text }] : [],
        },
      ];

    case "hr":
      return [{ type: "horizontalRule" }];

    case "list":
      return [convertList(token, warnings)];

    case "table":
      return [convertTable(token, warnings)];

    case "space":
    case "def":
      return [];

    default:
      warnings.push({ line: 0, message: `Unsupported Markdown construct "${token.type}" preserved as-is.` });
      return [{ type: "unsupportedMarkup", attrs: { format: "markdown", source: token.raw ?? "" } }];
  }
}

/**
 * Markdown parser (spec §12): tokenizes with `marked`'s lexer and maps
 * tokens onto the canonical schema. Never throws on malformed input —
 * unrecognized constructs become `unsupportedMarkup` nodes with a warning.
 */
export class MarkdownParser implements DocumentParser {
  readonly format = "markdown";

  parse(source: string): ParseResult {
    const warnings: ParseWarning[] = [];

    try {
      const tokens = marked.lexer(source, { gfm: true });
      const content = tokens.flatMap((token) => convertBlock(token, warnings));

      return {
        document: { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] },
        warnings,
      };
    } catch (error) {
      return {
        document: {
          type: "doc",
          content: [{ type: "unsupportedMarkup", attrs: { format: "markdown", source } }],
        },
        warnings: [{ line: 0, message: `Failed to parse Markdown: ${(error as Error).message}` }],
      };
    }
  }
}

export default MarkdownParser;
