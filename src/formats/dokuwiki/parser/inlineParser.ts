import type { JSONContent } from "@tiptap/core";
import type { ParseWarning } from "../../core/Parser";

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

const AUTOLINK = /^https?:\/\/[^\s[\]]+/;

function applyMark(nodes: JSONContent[], mark: Mark): JSONContent[] {
  return nodes.map((node) => (node.type === "text" ? { ...node, marks: [...(node.marks ?? []), mark] } : node));
}

/**
 * Recursive-descent inline scanner (stage 2, spec §14). Handles nested
 * emphasis correctly and never throws: unterminated constructs fall back to
 * literal text with a warning instead of consuming the rest of the input.
 */
class InlineScanner {
  private pos = 0;

  constructor(
    private readonly text: string,
    private readonly warnings: ParseWarning[],
    private readonly line: number,
  ) {}

  private peek(length = 1): string {
    return this.text.slice(this.pos, this.pos + length);
  }

  private eof(): boolean {
    return this.pos >= this.text.length;
  }

  parse(): JSONContent[] {
    return this.parseUntil(null).nodes;
  }

  private parseUntil(closer: string | null): { nodes: JSONContent[]; closed: boolean } {
    const nodes: JSONContent[] = [];
    let buffer = "";

    const flush = () => {
      if (buffer.length > 0) {
        nodes.push({ type: "text", text: buffer });
        buffer = "";
      }
    };

    while (!this.eof()) {
      if (closer && this.peek(closer.length) === closer) {
        this.pos += closer.length;
        flush();
        return { nodes, closed: true };
      }

      const autolink = AUTOLINK.exec(this.text.slice(this.pos));
      if (autolink) {
        let url = autolink[0];
        while (/[.,;:!?)]$/.test(url)) url = url.slice(0, -1);
        flush();
        nodes.push({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] });
        this.pos += url.length;
        continue;
      }

      if (this.text.slice(this.pos, this.pos + 8).toLowerCase() === "<nowiki>") {
        flush();
        this.pos += 8;
        const end = this.text.toLowerCase().indexOf("</nowiki>", this.pos);
        const content = end === -1 ? this.text.slice(this.pos) : this.text.slice(this.pos, end);
        this.pos = end === -1 ? this.text.length : end + 9;
        if (content.length > 0) nodes.push({ type: "text", text: content });
        continue;
      }

      if (this.peek(2) === "%%") {
        flush();
        this.pos += 2;
        const end = this.text.indexOf("%%", this.pos);
        const content = end === -1 ? this.text.slice(this.pos) : this.text.slice(this.pos, end);
        this.pos = end === -1 ? this.text.length : end + 2;
        if (content.length > 0) nodes.push({ type: "text", text: content });
        continue;
      }

      if (this.peek(2) === "''") {
        flush();
        this.pos += 2;
        const end = this.text.indexOf("''", this.pos);
        const content = end === -1 ? this.text.slice(this.pos) : this.text.slice(this.pos, end);
        this.pos = end === -1 ? this.text.length : end + 2;
        if (content.length > 0) nodes.push({ type: "text", text: content, marks: [{ type: "code" }] });
        continue;
      }

      if (this.peek(2) === "\\\\") {
        flush();
        this.pos += 2;
        if (this.peek(1) === " ") this.pos += 1;
        nodes.push({ type: "hardBreak" });
        continue;
      }

      if (this.peek(2) === "[[") {
        const link = this.tryParseLink();
        if (link) {
          flush();
          nodes.push(link);
          continue;
        }
      }

      if (this.peek(2) === "{{") {
        const image = this.tryParseImage();
        if (image) {
          flush();
          nodes.push(image);
          continue;
        }
      }

      if (this.peek(2) === "**") {
        this.pos += 2;
        const inner = this.parseUntil("**");
        if (inner.closed) {
          flush();
          nodes.push(...applyMark(inner.nodes, { type: "bold" }));
        } else {
          this.warnings.push({ line: this.line, message: "Unterminated ** (bold) treated as literal text." });
          flush();
          nodes.push({ type: "text", text: "**" });
          nodes.push(...inner.nodes);
        }
        continue;
      }

      if (this.peek(2) === "//" && this.text[this.pos - 1] !== ":") {
        this.pos += 2;
        const inner = this.parseUntil("//");
        if (inner.closed) {
          flush();
          nodes.push(...applyMark(inner.nodes, { type: "italic" }));
        } else {
          this.warnings.push({ line: this.line, message: "Unterminated // (italic) treated as literal text." });
          flush();
          nodes.push({ type: "text", text: "//" });
          nodes.push(...inner.nodes);
        }
        continue;
      }

      if (this.peek(2) === "__") {
        this.pos += 2;
        const inner = this.parseUntil("__");
        if (inner.closed) {
          flush();
          nodes.push(...applyMark(inner.nodes, { type: "underline" }));
        } else {
          this.warnings.push({ line: this.line, message: "Unterminated __ (underline) treated as literal text." });
          flush();
          nodes.push({ type: "text", text: "__" });
          nodes.push(...inner.nodes);
        }
        continue;
      }

      if (this.peek(5) === "<del>") {
        this.pos += 5;
        const inner = this.parseUntil("</del>");
        if (inner.closed) {
          flush();
          nodes.push(...applyMark(inner.nodes, { type: "strike" }));
        } else {
          this.warnings.push({ line: this.line, message: "Unterminated <del> treated as literal text." });
          flush();
          nodes.push({ type: "text", text: "<del>" });
          nodes.push(...inner.nodes);
        }
        continue;
      }

      buffer += this.text[this.pos];
      this.pos += 1;
    }

    flush();
    return { nodes, closed: closer === null };
  }

  private tryParseLink(): JSONContent | null {
    const closeIndex = this.text.indexOf("]]", this.pos + 2);
    if (closeIndex === -1) {
      this.warnings.push({ line: this.line, message: "Unterminated [[ link treated as literal text." });
      return null;
    }
    const inner = this.text.slice(this.pos + 2, closeIndex);
    this.pos = closeIndex + 2;
    const pipeIndex = inner.indexOf("|");
    const target = (pipeIndex === -1 ? inner : inner.slice(0, pipeIndex)).trim();
    const label = pipeIndex === -1 ? target : inner.slice(pipeIndex + 1).trim();
    return { type: "text", text: label, marks: [{ type: "link", attrs: { href: target } }] };
  }

  private tryParseImage(): JSONContent | null {
    const closeIndex = this.text.indexOf("}}", this.pos + 2);
    if (closeIndex === -1) {
      this.warnings.push({ line: this.line, message: "Unterminated {{ construct treated as literal text." });
      return null;
    }
    const inner = this.text.slice(this.pos + 2, closeIndex);
    this.pos = closeIndex + 2;

    if (inner.includes(">")) {
      this.warnings.push({ line: this.line, message: `Unsupported DokuWiki macro "{{${inner}}}" preserved as text.` });
      return { type: "text", text: `{{${inner}}}` };
    }

    const pipeIndex = inner.indexOf("|");
    const src = (pipeIndex === -1 ? inner : inner.slice(0, pipeIndex)).trim();
    const alt = pipeIndex === -1 ? "" : inner.slice(pipeIndex + 1).trim();
    return { type: "image", attrs: { src, alt } };
  }
}

export function parseInline(text: string, warnings: ParseWarning[], line = 0): JSONContent[] {
  return new InlineScanner(text, warnings, line).parse();
}

/**
 * Splits a run of inline nodes into sibling blocks whenever a block-level
 * `image` node appears (Draftly images can't be inline, spec §31), mirroring
 * the same accommodation made by the Markdown parser.
 */
export function splitInlineIntoBlocks(nodes: JSONContent[]): JSONContent[] {
  const blocks: JSONContent[] = [];
  let buffer: JSONContent[] = [];

  const flush = () => {
    if (buffer.length > 0) {
      blocks.push({ type: "paragraph", content: buffer });
      buffer = [];
    }
  };

  for (const node of nodes) {
    if (node.type === "image") {
      flush();
      blocks.push(node);
    } else {
      buffer.push(node);
    }
  }
  flush();

  return blocks.length > 0 ? blocks : [{ type: "paragraph" }];
}
