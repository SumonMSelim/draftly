import { beforeEach, describe, expect, it, vi } from "vitest";
import { importDocument, detectFormatFromFilename } from "../../../src/import-export/importDocument";
import { exportDocument, exportNativeProject, copyToClipboard } from "../../../src/import-export/exportDocument";
import { EMPTY_DOCUMENT } from "../../../src/editor/schema/schema";

describe("detectFormatFromFilename", () => {
  it("detects markdown, dokuwiki, and draftly project extensions", () => {
    expect(detectFormatFromFilename("notes.md")).toBe("markdown");
    expect(detectFormatFromFilename("notes.markdown")).toBe("markdown");
    expect(detectFormatFromFilename("notes.dokuwiki")).toBe("dokuwiki");
    expect(detectFormatFromFilename("notes.draftly.json")).toBe("draftly");
  });
});

describe("importDocument", () => {
  it("imports markdown source", () => {
    const result = importDocument("markdown", "# Title\n\nBody text.\n");
    expect(result.success).toBe(true);
    expect(result.document?.content?.[0]).toMatchObject({ type: "heading" });
  });

  it("imports dokuwiki source", () => {
    const result = importDocument("dokuwiki", "====== Title ======\n\nBody text.\n");
    expect(result.success).toBe(true);
    expect(result.document?.content?.[0]).toMatchObject({ type: "heading" });
  });

  it("imports a draftly project and recovers its title", () => {
    const project = JSON.stringify({
      format: "draftly",
      version: 1,
      document: { id: "abc", title: "My Doc", content: EMPTY_DOCUMENT },
      metadata: { createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z" },
    });
    const result = importDocument("draftly", project);
    expect(result.success).toBe(true);
    expect(result.title).toBe("My Doc");
  });

  it("reports a human-readable error for an invalid draftly project", () => {
    const result = importDocument("draftly", "not json");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("exportDocument", () => {
  it("exports markdown with a .md filename", () => {
    const result = exportDocument("markdown", { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] }, "report");
    expect(result.filename).toBe("report.md");
    expect(result.output).toContain("Hi");
  });

  it("exports dokuwiki with a .txt filename", () => {
    const result = exportDocument("dokuwiki", { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] }, "report");
    expect(result.filename).toBe("report.txt");
    expect(result.output).toContain("Hi");
  });

  it("exports a native project file", () => {
    const result = exportNativeProject({
      id: "abc",
      title: "report",
      content: EMPTY_DOCUMENT,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    expect(result.filename).toBe("report.draftly.json");
    expect(JSON.parse(result.output).format).toBe("draftly");
  });
});

describe("copyToClipboard", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: undefined });
  });

  it("succeeds when the clipboard API works", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const result = await copyToClipboard("hello");
    expect(result.success).toBe(true);
  });

  it("fails gracefully when the clipboard API rejects", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    const result = await copyToClipboard("hello");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
