import { useMemo } from "react";
import { generateHTML, type JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";
import { createExtensions } from "../editor/extensions";

export interface RenderedPreviewProps {
  document: JSONContent;
}

/**
 * Renders the canonical document as read-only HTML (spec §21/§40). The
 * document is never treated as trusted HTML: it's generated from the
 * ProseMirror schema, then sanitized with DOMPurify before being inserted
 * into the DOM, stripping any javascript: URLs or unexpected markup.
 */
export function RenderedPreview({ document }: RenderedPreviewProps) {
  const html = useMemo(() => {
    const raw = generateHTML(document, createExtensions());
    return DOMPurify.sanitize(raw);
  }, [document]);

  // eslint-disable-next-line react/no-danger
  return <div className="rendered-preview" aria-label="Rendered preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default RenderedPreview;
