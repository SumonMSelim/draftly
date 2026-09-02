import { describe, expect, it } from "vitest";
import { defaultAdapters, dokuWikiAdapter, markdownAdapter } from "../../../src/formats/adapters";

describe("FormatAdapter", () => {
  it("exposes id, name and extensions for the markdown adapter", () => {
    expect(markdownAdapter.id).toBe("markdown");
    expect(markdownAdapter.name).toBe("Markdown");
    expect(markdownAdapter.extensions).toContain(".md");
  });

  it("exposes id, name and extensions for the dokuwiki adapter", () => {
    expect(dokuWikiAdapter.id).toBe("dokuwiki");
    expect(dokuWikiAdapter.name).toBe("DokuWiki");
    expect(dokuWikiAdapter.extensions).toContain(".dokuwiki");
  });

  it("registers exactly the markdown and dokuwiki adapters by default", () => {
    expect(defaultAdapters.map((adapter) => adapter.id).sort()).toEqual(["dokuwiki", "markdown"]);
  });

  it("parses and serializes through the same adapter", () => {
    const parsed = markdownAdapter.parse("# Title\n\nHello world\n");
    expect(parsed.document.type).toBe("doc");
    const result = markdownAdapter.serialize(parsed.document);
    expect(result.output).toContain("# Title");
    expect(result.output).toContain("Hello world");
  });

  it("round-trips a simple document through the dokuwiki adapter", () => {
    const parsed = dokuWikiAdapter.parse("====== Security ======\n\nThis is **important**.\n");
    const result = dokuWikiAdapter.serialize(parsed.document);
    expect(result.output).toContain("Security");
    expect(result.output).toContain("**important**");
  });
});
