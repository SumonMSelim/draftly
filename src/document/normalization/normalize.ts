import type { JSONContent } from "@tiptap/core";

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

function sortMarks(marks?: Mark[]): Mark[] | undefined {
  if (!marks || marks.length === 0) return undefined;
  return [...marks]
    .map((mark) => ({ type: mark.type, attrs: mark.attrs && Object.keys(mark.attrs).length ? mark.attrs : undefined }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

function marksEqual(a?: Mark[], b?: Mark[]): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every((mark, index) => JSON.stringify(mark) === JSON.stringify(right[index]));
}

function normalizeAttrs(attrs?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!attrs) return undefined;
  const entries = Object.entries(attrs).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) return undefined;
  entries.sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

function normalizeNodes(nodes: JSONContent[] | undefined, trimBoundaries: boolean): JSONContent[] | undefined {
  if (!nodes) return undefined;

  const normalized = nodes
    .map(normalizeNode)
    .filter((node) => node.type !== "text" || (node.text ?? "").length > 0);

  const merged: JSONContent[] = [];
  for (const node of normalized) {
    const previous = merged[merged.length - 1];
    if (node.type === "text" && previous?.type === "text" && marksEqual(previous.marks, node.marks)) {
      previous.text = (previous.text ?? "") + (node.text ?? "");
      continue;
    }
    merged.push(node);
  }

  // Leading/trailing whitespace directly adjacent to a container boundary is
  // insignificant prose spacing (e.g. a space before text got split into its
  // own sibling block because an inline image forced a block break). Verbatim
  // content (codeBlock) opts out via `trimBoundaries`.
  if (trimBoundaries) {
    const first = merged[0];
    if (first?.type === "text" && typeof first.text === "string") {
      first.text = first.text.replace(/^\s+/, "");
    }
    const last = merged[merged.length - 1];
    if (last?.type === "text" && typeof last.text === "string") {
      last.text = last.text.replace(/\s+$/, "");
    }
  }

  const cleaned = merged.filter((node) => node.type !== "text" || (node.text ?? "").length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Produces a canonical form of a ProseMirror document so two documents that
 * differ only in incidental structure (empty text nodes, split text runs,
 * mark/attr ordering) compare equal. Used by round-trip tests to assert
 * semantic equivalence rather than byte-for-byte identity (spec §18).
 */
export function normalize(node: JSONContent): JSONContent {
  return normalizeNode(node);
}

function normalizeNode(node: JSONContent): JSONContent {
  const result: JSONContent = { type: node.type };

  const attrs = normalizeAttrs(node.attrs as Record<string, unknown> | undefined);
  if (attrs) result.attrs = attrs;

  const marks = sortMarks(node.marks as Mark[] | undefined);
  if (marks) result.marks = marks;

  if (typeof node.text === "string") {
    result.text = node.text;
  }

  const content = normalizeNodes(node.content, node.type !== "codeBlock");
  if (content) result.content = content;

  return result;
}
