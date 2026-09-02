import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { JSONContent } from "@tiptap/core";
import { MarkdownSerializer } from "../../src/formats/markdown/serializer/MarkdownSerializer";
import { DokuWikiSerializer } from "../../src/formats/dokuwiki/serializer/DokuWikiSerializer";
import { MarkdownParser } from "../../src/formats/markdown/parser/MarkdownParser";
import { computeStats } from "../../src/document/stats";
import { useDebouncedValue } from "../../src/utils/useDebouncedValue";

const WORDS = ["network", "security", "firewall", "packet", "router", "protocol", "encryption", "analysis"];

function buildLargeDocument(targetWords: number): JSONContent {
  const content: JSONContent[] = [];
  let wordCount = 0;
  let paraIndex = 0;

  while (wordCount < targetWords) {
    const paraWords = Array.from({ length: 20 }, (_, i) => WORDS[(paraIndex + i) % WORDS.length]);
    content.push({ type: "paragraph", content: [{ type: "text", text: paraWords.join(" ") }] });
    wordCount += paraWords.length;
    paraIndex++;
  }

  return { type: "doc", content };
}

describe("performance: 10,000-word document", () => {
  const doc = buildLargeDocument(10_000);

  it("computes word/character stats quickly", () => {
    const start = performance.now();
    const stats = computeStats(doc);
    const elapsed = performance.now() - start;

    expect(stats.words).toBeGreaterThanOrEqual(10_000);
    expect(elapsed).toBeLessThan(500);
  });

  it("serializes a 10,000-word document to markdown and dokuwiki within budget", () => {
    const markdownSerializer = new MarkdownSerializer();
    const dokuwikiSerializer = new DokuWikiSerializer();

    const startMd = performance.now();
    const markdownOutput = markdownSerializer.serialize(doc).output;
    const markdownElapsed = performance.now() - startMd;

    const startDw = performance.now();
    const dokuwikiOutput = dokuwikiSerializer.serialize(doc).output;
    const dokuwikiElapsed = performance.now() - startDw;

    expect(markdownOutput.length).toBeGreaterThan(0);
    expect(dokuwikiOutput.length).toBeGreaterThan(0);
    expect(markdownElapsed).toBeLessThan(2000);
    expect(dokuwikiElapsed).toBeLessThan(2000);
  });

  it("parses a serialized 10,000-word document back within budget", () => {
    const markdownSerializer = new MarkdownSerializer();
    const markdownParser = new MarkdownParser();
    const output = markdownSerializer.serialize(doc).output;

    const start = performance.now();
    const result = markdownParser.parse(output);
    const elapsed = performance.now() - start;

    expect(result.document.content?.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  });

  it("debounces rapid document changes instead of recomputing the preview on every keystroke (spec §48)", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(({ value }: { value: number }) => useDebouncedValue(value, 500), {
        initialProps: { value: 0 },
      });

      // Simulate 50 rapid keystrokes; each one restarts the debounce timer.
      for (let i = 1; i <= 50; i++) {
        rerender({ value: i });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current).toBe(0);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Only the final value ever gets used for serialization — one recompute, not fifty.
      expect(result.current).toBe(50);
    } finally {
      vi.useRealTimers();
    }
  });
});
