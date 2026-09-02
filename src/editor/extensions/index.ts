import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { CodeBlockLanguage } from "./CodeBlockLanguage";
import { UnsupportedMarkup } from "./UnsupportedMarkup";

/**
 * The canonical Draftly schema (spec §7/§8): only nodes/marks with a
 * well-defined representation in both Markdown and DokuWiki are enabled.
 */
export function createExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow" },
      },
    }),
    CodeBlockLanguage,
    Image.configure({ inline: false, allowBase64: true }),
    TableKit.configure({
      table: { resizable: false },
    }),
    UnsupportedMarkup,
  ];
}

export { CodeBlockLanguage } from "./CodeBlockLanguage";
export { UnsupportedMarkup } from "./UnsupportedMarkup";
export type { UnsupportedMarkupAttrs } from "./UnsupportedMarkup";
