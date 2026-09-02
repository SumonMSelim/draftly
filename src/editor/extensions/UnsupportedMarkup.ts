import { Node, mergeAttributes } from "@tiptap/core";

export interface UnsupportedMarkupAttrs {
  format: "markdown" | "dokuwiki";
  source: string;
}

/**
 * Placeholder for markup that importers cannot faithfully represent in the
 * canonical schema (unknown DokuWiki plugin syntax, raw HTML blocks, ...).
 * Preserves the original source losslessly (spec §16) instead of silently
 * discarding it. Never rendered in the toolbar and never executed/interpreted.
 */
export const UnsupportedMarkup = Node.create({
  name: "unsupportedMarkup",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      format: { default: "markdown" },
      source: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="unsupported-markup"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "unsupported-markup",
        "data-format": node.attrs.format,
        class: "unsupported-markup",
        title: "Unsupported markup preserved as-is; it will not be rendered or edited as rich text.",
      }),
      ["pre", {}, node.attrs.source],
    ];
  },

  addCommands() {
    return {
      insertUnsupportedMarkup:
        (attrs: UnsupportedMarkupAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    unsupportedMarkup: {
      insertUnsupportedMarkup: (attrs: UnsupportedMarkupAttrs) => ReturnType;
    };
  }
}

export default UnsupportedMarkup;
