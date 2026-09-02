import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import DOMPurify from "dompurify";
import type { JSONContent } from "@tiptap/core";
import { isSafeUrl } from "../../../src/utils/url";
import { RenderedPreview } from "../../../src/preview/RenderedPreview";
import { DokuWikiParser } from "../../../src/formats/dokuwiki/parser/DokuWikiParser";
import { MarkdownParser } from "../../../src/formats/markdown/parser/MarkdownParser";

describe("URL safety", () => {
  it("blocks javascript:, vbscript:, and data: URL schemes", () => {
    expect(isSafeUrl("javascript:alert(document.cookie)")).toBe(false);
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("allows the http(s)/mailto schemes needed for links and images", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("http://example.com")).toBe(true);
    expect(isSafeUrl("mailto:security@example.com")).toBe(true);
  });
});

describe("DOMPurify sanitization", () => {
  it("strips <script> tags and inline event handler attributes", () => {
    const dirty = '<img src="x" onerror="window.__pwned = true"><script>window.__pwned = true</script>';
    const clean = DOMPurify.sanitize(dirty);
    expect(clean).not.toContain("onerror");
    expect(clean.toLowerCase()).not.toContain("<script");
  });
});

describe("RenderedPreview never injects unsafe HTML", () => {
  it("never renders a <script> element into the DOM", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "unsupportedMarkup", attrs: { format: "dokuwiki", source: "<script>window.__pwned2 = true</script>" } }],
    };
    const { container } = render(createElement(RenderedPreview, { document: doc }));
    expect(container.querySelector("script")).toBeNull();
    expect((window as unknown as Record<string, unknown>).__pwned2).toBeUndefined();
  });

  it("strips javascript: URLs from rendered link hrefs", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Click", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
        },
      ],
    };
    const { container } = render(createElement(RenderedPreview, { document: doc }));
    const link = container.querySelector("a");
    expect(link?.getAttribute("href") ?? "").not.toContain("javascript:");
  });
});

describe("DokuWiki/Markdown macros are never executed", () => {
  it("preserves an unknown DokuWiki plugin macro as inert markup instead of interpreting it", () => {
    const parser = new DokuWikiParser();
    const { document } = parser.parse("{{page>foo}}\n");
    expect(document.content?.[0]).toMatchObject({ type: "unsupportedMarkup", attrs: { format: "dokuwiki", source: "{{page>foo}}" } });
  });

  it("never executes raw HTML blocks found in imported markdown", () => {
    const parser = new MarkdownParser();
    const { document } = parser.parse("<script>window.__pwned3 = true</script>\n");
    expect((window as unknown as Record<string, unknown>).__pwned3).toBeUndefined();
    expect(document.content?.[0].type).toBe("unsupportedMarkup");
  });
});
