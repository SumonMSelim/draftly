import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JSONContent } from "@tiptap/core";
import { MarkdownPreview } from "../../../src/preview/MarkdownPreview";
import { DokuWikiPreview } from "../../../src/preview/DokuWikiPreview";
import { RenderedPreview } from "../../../src/preview/RenderedPreview";

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe("MarkdownPreview", () => {
  it("renders the source and copies it to the clipboard", async () => {
    render(<MarkdownPreview source="# Hello" />);
    expect(screen.getByText("# Hello")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("# Hello");
  });

  it("has a download button", () => {
    render(<MarkdownPreview source="# Hello" />);
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
  });
});

describe("DokuWikiPreview", () => {
  it("renders the dokuwiki source and copies it to the clipboard", async () => {
    render(<DokuWikiPreview source="====== Hello ======" />);
    expect(screen.getByText("====== Hello ======")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("====== Hello ======");
  });
});

describe("RenderedPreview", () => {
  it("renders paragraph text", () => {
    const doc: JSONContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }] };
    render(<RenderedPreview document={doc} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("sanitizes dangerous javascript: URLs out of link hrefs", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Click me", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
        },
      ],
    };
    const { container } = render(<RenderedPreview document={doc} />);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).not.toContain("javascript:");
  });
});
