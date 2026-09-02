import type { JSONContent } from "@tiptap/core";
import type { DocumentSerializer, SerializationResult, SerializationWarning } from "../../core/Serializer";
import { defaultProfile, type DokuWikiProfile } from "../../core/profiles";

interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}

const NEEDS_ESCAPE = /\*\*|\/\/|__|''|\[\[|\{\{|\^|\||%%/;

function escapeText(text: string): string {
  if (!NEEDS_ESCAPE.test(text)) return text;
  // %% is the nowiki delimiter itself; wrapping it in another %%...%% pair
  // would just terminate early, so fall back to <nowiki> tags instead.
  return text.includes("%%") ? `<nowiki>${text}</nowiki>` : `%%${text}%%`;
}

// A raw "]]"/"|" inside a link target would prematurely close the `[[...]]`
// construct or be confused with the `href|label` separator, so encode them.
function escapeLinkHref(href: string): string {
  return href.replace(/\]\]/g, "%5D%5D").replace(/\|/g, "%7C");
}

// Same hazard for image sources: a raw "}}"/"|" would break `{{src|alt}}`.
function escapeImageAttr(value: string): string {
  return value.replace(/\}\}/g, "%7D%7D").replace(/\|/g, "%7C");
}

function wrapCode(text: string): string {
  return `''${text}''`;
}

function indent(depth: number): string {
  return "  ".repeat(depth + 1);
}

export class DokuWikiSerializer implements DocumentSerializer {
  readonly format = "dokuwiki";
  private readonly profile: DokuWikiProfile;

  constructor(profile: DokuWikiProfile = defaultProfile) {
    this.profile = profile;
  }

  serialize(document: JSONContent): SerializationResult {
    const warnings: SerializationWarning[] = [];
    const blocks = (document.content ?? [])
      .map((node) => this.blockToLines(node, warnings, 0).join("\n"))
      .filter((block) => block.trim().length > 0);

    const output = blocks.length > 0 ? `${blocks.join("\n\n")}\n` : "";
    return { output, warnings };
  }

  private applyMarks(rawText: string, marks: Mark[]): string {
    const types = new Set(marks.map((mark) => mark.type));

    if (types.has("code")) {
      return wrapCode(rawText);
    }

    const link = marks.find((mark) => mark.type === "link");
    const href = typeof link?.attrs?.href === "string" ? link.attrs.href : undefined;
    const isBareLink = href !== undefined && rawText === href;

    // A bare autolink's label is the URL itself; it needs no escaping (and
    // must not be mangled) since it's compared against `href` verbatim below.
    let text = isBareLink ? rawText : escapeText(rawText);

    if (types.has("italic")) {
      text = `//${text}//`;
    }
    if (types.has("bold")) {
      text = `**${text}**`;
    }
    if (types.has("strike")) {
      text = `<del>${text}</del>`;
    }
    if (types.has("underline")) {
      if (this.profile.supportsUnderline) {
        text = `__${text}__`;
      }
    }

    if (link && href !== undefined) {
      const safeHref = escapeLinkHref(href);
      text = isBareLink ? `[[${safeHref}]]` : `[[${safeHref}|${text}]]`;
    }

    return text;
  }

  private serializeInline(nodes: JSONContent[] | undefined): string {
    if (!nodes) return "";
    return nodes
      .map((node) => {
        if (node.type === "text") {
          return this.applyMarks(node.text ?? "", (node.marks as Mark[] | undefined) ?? []);
        }
        if (node.type === "hardBreak") {
          return "\\\\ \n";
        }
        return "";
      })
      .join("");
  }

  private renderList(node: JSONContent, warnings: SerializationWarning[], depth: number, ordered: boolean): string[] {
    const lines: string[] = [];
    const marker = ordered ? "-" : "*";
    const items = node.content ?? [];

    items.forEach((item) => {
      const itemBlocks = item.content ?? [];
      const [first, ...rest] = itemBlocks;
      const firstText = first ? this.serializeInline(first.content) : "";
      lines.push(`${indent(depth)}${marker} ${firstText}`.trimEnd());

      rest.forEach((child) => {
        if (child.type === "bulletList") {
          lines.push(...this.renderList(child, warnings, depth + 1, false));
        } else if (child.type === "orderedList") {
          lines.push(...this.renderList(child, warnings, depth + 1, true));
        } else if (child.type === "paragraph") {
          lines.push(`${indent(depth)}${this.serializeInline(child.content)}`);
        } else {
          lines.push(...this.blockToLines(child, warnings, depth + 1));
        }
      });
    });

    return lines;
  }

  private renderTable(node: JSONContent): string[] {
    const rows = node.content ?? [];
    if (rows.length === 0) return [];

    const renderRow = (row: JSONContent) => {
      const cells = row.content ?? [];
      // Each cell's own leading delimiter (not the whole row) marks it as a
      // header (^) or data (|) cell, so DokuWiki's "row header" style with a
      // mix of both on one line round-trips instead of being downgraded.
      let line = "";
      let lastDelimiter = "|";
      cells.forEach((cell) => {
        lastDelimiter = cell.type === "tableHeader" ? "^" : "|";
        const value = this.serializeInline(cell.content?.[0]?.content);
        line += `${lastDelimiter} ${value} `;
      });
      return `${line}${lastDelimiter}`;
    };

    return rows.map(renderRow);
  }

  private blockToLines(node: JSONContent, warnings: SerializationWarning[], depth = 0): string[] {
    switch (node.type) {
      case "paragraph":
        return [this.serializeInline(node.content)];

      case "heading": {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
        const equals = "=".repeat(7 - level);
        return [`${equals} ${this.serializeInline(node.content)} ${equals}`.trimEnd()];
      }

      case "bulletList":
        return this.renderList(node, warnings, depth, false);

      case "orderedList":
        return this.renderList(node, warnings, depth, true);

      case "blockquote": {
        const inner = (node.content ?? []).flatMap((child) => this.blockToLines(child, warnings, 0));
        return inner.map((line) => (line.length ? `> ${line}` : ">"));
      }

      case "codeBlock": {
        const text = (node.content ?? []).map((child) => child.text ?? "").join("");
        const language = typeof node.attrs?.language === "string" && node.attrs.language ? ` ${node.attrs.language}` : "";
        return [`<code${language}>`, ...text.split("\n"), "</code>"];
      }

      case "horizontalRule":
        return ["----"];

      case "table":
        return this.renderTable(node);

      case "image": {
        const src = escapeImageAttr(typeof node.attrs?.src === "string" ? node.attrs.src : "");
        const alt = escapeImageAttr(typeof node.attrs?.alt === "string" ? node.attrs.alt : "");
        return [alt ? `{{${src}|${alt}}}` : `{{${src}}}`];
      }

      case "unsupportedMarkup": {
        warnings.push({ nodeType: node.type, message: "Unsupported markup preserved verbatim; it may not render as intended." });
        return String(node.attrs?.source ?? "").split("\n");
      }

      default:
        if (node.content) {
          return (node.content ?? []).flatMap((child) => this.blockToLines(child, warnings, depth));
        }
        return [];
    }
  }
}

export default DokuWikiSerializer;
