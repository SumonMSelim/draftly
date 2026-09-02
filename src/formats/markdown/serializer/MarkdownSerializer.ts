import type { JSONContent } from "@tiptap/core";
import type { DocumentSerializer, SerializationResult, SerializationWarning } from "../../core/Serializer";

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/([`*_[\]<>])/g, "\\$1");
}

function escapeLeadingMarker(line: string): string {
  return line.replace(/^(\s*)([#>+*-]|\d+\.)(\s)/, "$1\\$2$3");
}

function wrapCode(text: string): string {
  const runs = text.match(/`+/g) ?? [];
  const longest = runs.reduce((max, run) => Math.max(max, run.length), 0);
  const fence = "`".repeat(longest + 1);
  const pad = text.startsWith("`") || text.endsWith("`") || text === "" ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

/** Escapes a Markdown link destination, wrapping it in `<...>` when it contains characters that would otherwise break `(url)` syntax. */
function escapeLinkDestination(href: string): string {
  if (/[\s()]/.test(href)) {
    return `<${href.replace(/[<>]/g, (char) => `\\${char}`)}>`;
  }
  return href;
}

// Outer-to-inner nesting order for marks that can legally wrap one another.
const NESTABLE_MARK_ORDER = ["bold", "italic", "strike", "underline"] as const;
type NestableMark = (typeof NESTABLE_MARK_ORDER)[number];

const MARK_OPEN: Record<NestableMark, string> = { bold: "**", italic: "*", strike: "~~", underline: "<u>" };
const MARK_CLOSE: Record<NestableMark, string> = { bold: "**", italic: "*", strike: "~~", underline: "</u>" };

function nestableMarksOf(marks: Mark[]): NestableMark[] {
  const types = new Set(marks.map((mark) => mark.type));
  return NESTABLE_MARK_ORDER.filter((type) => types.has(type));
}

function wrapNestable(text: string, marks: NestableMark[]): string {
  let wrapped = text;
  for (let i = marks.length - 1; i >= 0; i--) {
    wrapped = `${MARK_OPEN[marks[i]]}${wrapped}${MARK_CLOSE[marks[i]]}`;
  }
  return wrapped;
}

/**
 * Serializes a run of inline text nodes, merging adjacent runs that share
 * marks into properly nested Markdown (e.g. `**bold with *italic* inside**`)
 * instead of re-opening/closing markers for every text node (spec §11).
 */
function serializeInline(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";

  let result = "";
  let openMarks: NestableMark[] = [];

  const closeTo = (count: number) => {
    result += openMarks
      .slice(count)
      .reverse()
      .map((mark) => MARK_CLOSE[mark])
      .join("");
  };

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      closeTo(0);
      openMarks = [];
      result += "  \n";
      continue;
    }
    if (node.type !== "text") continue;

    const marks = (node.marks as Mark[] | undefined) ?? [];
    const rawText = node.text ?? "";

    if (marks.some((mark) => mark.type === "code")) {
      closeTo(0);
      openMarks = [];
      result += wrapCode(rawText);
      continue;
    }

    const link = marks.find((mark) => mark.type === "link");
    if (link) {
      closeTo(0);
      openMarks = [];
      const href = typeof link.attrs?.href === "string" ? link.attrs.href : "";
      const linkText = wrapNestable(escapeText(rawText), nestableMarksOf(marks));
      result += `[${linkText}](${escapeLinkDestination(href)})`;
      continue;
    }

    const desired = nestableMarksOf(marks);
    let common = 0;
    while (common < openMarks.length && common < desired.length && openMarks[common] === desired[common]) {
      common++;
    }
    closeTo(common);
    result += desired
      .slice(common)
      .map((mark) => MARK_OPEN[mark])
      .join("");
    openMarks = desired;
    result += escapeText(rawText);
  }

  closeTo(0);
  return result;
}

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function indent(depth: number): string {
  // 4 spaces per level: enough to nest under both "- " (2 cols) and
  // ordered markers like "1. "/"10. " (3-4 cols) per CommonMark.
  return "    ".repeat(depth);
}

function renderList(node: JSONContent, warnings: SerializationWarning[], depth: number, ordered: boolean): string[] {
  const lines: string[] = [];
  const items = node.content ?? [];

  items.forEach((item, index) => {
    const marker = ordered ? `${index + 1}.` : "-";
    const itemBlocks = item.content ?? [];
    const [first, ...rest] = itemBlocks;
    const firstText = first ? serializeInline(first.content) : "";
    lines.push(`${indent(depth)}${marker} ${firstText}`.trimEnd());

    rest.forEach((child) => {
      if (child.type === "bulletList") {
        lines.push(...renderList(child, warnings, depth + 1, false));
      } else if (child.type === "orderedList") {
        lines.push(...renderList(child, warnings, depth + 1, true));
      } else if (child.type === "paragraph") {
        lines.push(`${indent(depth + 1)}${serializeInline(child.content)}`);
      } else {
        lines.push(...blockToLines(child, warnings, depth + 1).map((line) => (line.length ? `${indent(depth + 1)}${line}` : line)));
      }
    });
  });

  return lines;
}

function renderTable(node: JSONContent, warnings: SerializationWarning[]): string[] {
  const rows = node.content ?? [];
  if (rows.length === 0) return [];

  const cellsOf = (row: JSONContent) =>
    (row.content ?? []).map((cell) => escapeTableCell(serializeInline(cell.content?.[0]?.content)));

  const header = cellsOf(rows[0]);
  const columnCount = header.length;
  // GFM requires every row to have the same column count as the header —
  // pad short rows and drop extra cells so a mismatched row can't produce
  // an invalid table.
  const normalize = (cells: string[]) => {
    const row = cells.slice(0, columnCount);
    while (row.length < columnCount) row.push("");
    return row;
  };

  const lines = [`| ${normalize(header).join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`];

  rows.slice(1).forEach((row) => {
    lines.push(`| ${normalize(cellsOf(row)).join(" | ")} |`);
  });

  return lines;
}

function blockToLines(node: JSONContent, warnings: SerializationWarning[], depth = 0): string[] {
  switch (node.type) {
    case "paragraph":
      return [escapeLeadingMarker(serializeInline(node.content))];

    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
      return [`${"#".repeat(level)} ${serializeInline(node.content)}`.trimEnd()];
    }

    case "bulletList":
      return renderList(node, warnings, depth, false);

    case "orderedList":
      return renderList(node, warnings, depth, true);

    case "blockquote": {
      const inner = (node.content ?? []).flatMap((child) => blockToLines(child, warnings, 0));
      return inner.map((line) => (line.length ? `> ${line}` : ">"));
    }

    case "codeBlock": {
      const text = (node.content ?? []).map((child) => child.text ?? "").join("");
      const runs = text.match(/`+/g) ?? [];
      const longest = runs.reduce((max, run) => Math.max(max, run.length), 3);
      const fence = "`".repeat(Math.max(3, longest + (runs.length ? 1 : 0)));
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      return [`${fence}${language}`, ...text.split("\n"), fence];
    }

    case "horizontalRule":
      return ["---"];

    case "table":
      return renderTable(node, warnings);

    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      return [`![${alt}](${src})`];
    }

    case "unsupportedMarkup": {
      warnings.push({ nodeType: node.type, message: "Unsupported markup preserved verbatim; it may not render as intended." });
      return String(node.attrs?.source ?? "").split("\n");
    }

    default:
      if (node.content) {
        return (node.content ?? []).flatMap((child) => blockToLines(child, warnings, depth));
      }
      return [];
  }
}

/**
 * Deterministic Markdown serializer (spec §11). Produces predictable,
 * readable output rather than minimizing character count.
 */
export class MarkdownSerializer implements DocumentSerializer {
  readonly format = "markdown";

  serialize(document: JSONContent): SerializationResult {
    const warnings: SerializationWarning[] = [];
    const blocks = (document.content ?? [])
      .map((node) => blockToLines(node, warnings, 0).join("\n"))
      .filter((block) => block.trim().length > 0);

    const output = blocks.length > 0 ? `${blocks.join("\n\n")}\n` : "";
    return { output, warnings };
  }
}

export default MarkdownSerializer;
