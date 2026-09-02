import type { JSONContent } from "@tiptap/core";
import type { ParseWarning } from "../../core/Parser";
import type {
  BlockquoteToken,
  CodeFenceOpenToken,
  CodeLineToken,
  HeadingToken,
  ListItemToken,
  TableRowToken,
  TextToken,
  Token,
} from "../lexer/tokens";
import { parseInline, splitInlineIntoBlocks } from "./inlineParser";

const MACRO_LINE = /^\{\{[^{}]*>[^{}]*\}\}$/;

interface ListFrame {
  node: JSONContent;
  depth: number;
  ordered: boolean;
}

function parseList(tokens: Token[], startIndex: number, warnings: ParseWarning[]): { node: JSONContent; nextIndex: number } {
  const first = tokens[startIndex] as ListItemToken;
  const root: JSONContent = { type: first.ordered ? "orderedList" : "bulletList", content: [] };
  const stack: ListFrame[] = [{ node: root, depth: first.depth, ordered: first.ordered }];

  let i = startIndex;
  while (i < tokens.length && tokens[i].type === "listItem") {
    const token = tokens[i] as ListItemToken;

    while (stack.length > 1 && token.depth < stack[stack.length - 1].depth) {
      stack.pop();
    }

    let top = stack[stack.length - 1];

    if (token.depth > top.depth) {
      const parentList = top.node.content ?? [];
      const lastItem = parentList[parentList.length - 1];
      if (lastItem) {
        let nestedList = (lastItem.content ?? []).find(
          (child) => child.type === "bulletList" || child.type === "orderedList",
        );
        if (!nestedList) {
          nestedList = { type: token.ordered ? "orderedList" : "bulletList", content: [] };
          lastItem.content = [...(lastItem.content ?? []), nestedList];
        }
        stack.push({ node: nestedList, depth: token.depth, ordered: token.ordered });
        top = stack[stack.length - 1];
      }
    }

    const itemNode: JSONContent = {
      type: "listItem",
      content: splitInlineIntoBlocks(parseInline(token.text, warnings, token.line)),
    };
    top.node.content = [...(top.node.content ?? []), itemNode];
    i++;
  }

  return { node: root, nextIndex: i };
}

/**
 * Assembles the flat lexer token stream into block-level document nodes
 * (stage 1, spec §14), delegating inline text spans to the inline scanner
 * (stage 2). Unknown token sequences degrade to paragraphs rather than
 * throwing.
 */
export function parseBlocks(tokens: Token[], warnings: ParseWarning[]): JSONContent[] {
  const blocks: JSONContent[] = [];
  const paragraphLines: TextToken[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.map((line) => line.text.trim()).join(" ");
    const inline = parseInline(text, warnings, paragraphLines[0].line);
    blocks.push(...splitInlineIntoBlocks(inline));
    paragraphLines.length = 0;
  };

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    switch (token.type) {
      case "blank":
        flushParagraph();
        i++;
        break;

      case "heading": {
        flushParagraph();
        const heading = token as HeadingToken;
        blocks.push({ type: "heading", attrs: { level: heading.level }, content: parseInline(heading.text, warnings, heading.line) });
        i++;
        break;
      }

      case "horizontalRule":
        flushParagraph();
        blocks.push({ type: "horizontalRule" });
        i++;
        break;

      case "codeOpen": {
        flushParagraph();
        const open = token as CodeFenceOpenToken;
        const lines: string[] = [];
        i++;
        while (i < tokens.length && tokens[i].type === "codeLine") {
          lines.push((tokens[i] as CodeLineToken).text);
          i++;
        }
        if (i < tokens.length && tokens[i].type === "codeClose") i++;
        const text = lines.join("\n");
        blocks.push({
          type: "codeBlock",
          attrs: { language: open.language },
          content: text.length > 0 ? [{ type: "text", text }] : [],
        });
        break;
      }

      case "blockquote": {
        flushParagraph();
        const quoteLines: BlockquoteToken[] = [];
        while (i < tokens.length && tokens[i].type === "blockquote") {
          quoteLines.push(tokens[i] as BlockquoteToken);
          i++;
        }
        const text = quoteLines.map((line) => line.text).join(" ");
        blocks.push({
          type: "blockquote",
          content: splitInlineIntoBlocks(parseInline(text, warnings, quoteLines[0].line)),
        });
        break;
      }

      case "tableRow": {
        flushParagraph();
        const rows: JSONContent[] = [];
        while (i < tokens.length && tokens[i].type === "tableRow") {
          const row = tokens[i] as TableRowToken;
          rows.push({
            type: "tableRow",
            content: row.cells.map((cell) => ({
              type: cell.header ? "tableHeader" : "tableCell",
              content: [{ type: "paragraph", content: parseInline(cell.text, warnings, row.line) }],
            })),
          });
          i++;
        }
        blocks.push({ type: "table", content: rows });
        break;
      }

      case "listItem": {
        flushParagraph();
        const { node, nextIndex } = parseList(tokens, i, warnings);
        blocks.push(node);
        i = nextIndex;
        break;
      }

      case "text": {
        const textToken = token as TextToken;
        const trimmed = textToken.text.trim();
        if (MACRO_LINE.test(trimmed)) {
          flushParagraph();
          warnings.push({ line: textToken.line, message: `Unsupported DokuWiki macro "${trimmed}" preserved as-is.` });
          blocks.push({ type: "unsupportedMarkup", attrs: { format: "dokuwiki", source: trimmed } });
        } else {
          paragraphLines.push(textToken);
        }
        i++;
        break;
      }

      default:
        i++;
    }
  }

  flushParagraph();
  return blocks;
}
