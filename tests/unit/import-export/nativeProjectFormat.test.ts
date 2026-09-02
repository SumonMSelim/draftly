import { describe, expect, it } from "vitest";
import { exportProject, importProject, PROJECT_FORMAT, CURRENT_VERSION } from "../../../src/import-export/nativeProjectFormat";
import { EMPTY_DOCUMENT } from "../../../src/editor/schema/schema";

describe("nativeProjectFormat", () => {
  it("exports a versioned project file with only the canonical document", () => {
    const output = exportProject({
      id: "abc-123",
      title: "Network Security",
      content: EMPTY_DOCUMENT,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    const parsed = JSON.parse(output);
    expect(parsed.format).toBe(PROJECT_FORMAT);
    expect(parsed.version).toBe(CURRENT_VERSION);
    expect(parsed.document.title).toBe("Network Security");
    expect(parsed.document.content).toEqual(EMPTY_DOCUMENT);
    expect(parsed).not.toHaveProperty("markdown");
    expect(parsed).not.toHaveProperty("dokuwiki");
  });

  it("round-trips export -> import", () => {
    const output = exportProject({
      id: "abc-123",
      title: "Doc",
      content: EMPTY_DOCUMENT,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    const result = importProject(output);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.project.document.id).toBe("abc-123");
      expect(result.project.document.title).toBe("Doc");
    }
  });

  it("rejects invalid JSON with a readable error", () => {
    const result = importProject("{not json");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("JSON");
  });

  it("rejects a project with the wrong format identifier", () => {
    const result = importProject(JSON.stringify({ format: "other", version: 1, document: {}, metadata: {} }));
    expect(result.success).toBe(false);
  });

  it("rejects a project missing required document fields", () => {
    const result = importProject(
      JSON.stringify({ format: "draftly", version: 1, document: { id: "x" }, metadata: { createdAt: "x", updatedAt: "x" } }),
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.length).toBeGreaterThan(0);
  });
});
