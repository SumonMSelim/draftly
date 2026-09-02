import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAutosave } from "../../../src/documents/hooks/useAutosave";

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not save on initial mount", () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(({ deps }) => useAutosave(save, deps), { initialProps: { deps: ["title", "content"] } });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("debounces saves until changes stop for the configured delay", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ deps }) => useAutosave(save, deps, 750), {
      initialProps: { deps: ["title", "v1"] },
    });

    rerender({ deps: ["title", "v2"] });
    expect(result.current.status).toBe("unsaved");
    act(() => {
      vi.advanceTimersByTime(400);
    });
    rerender({ deps: ["title", "v3"] });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(750);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("saves on beforeunload", () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(({ deps }) => useAutosave(save, deps), { initialProps: { deps: ["a"] } });
    act(() => {
      window.dispatchEvent(new Event("beforeunload"));
    });
    expect(save).toHaveBeenCalled();
  });

  it("flush immediately runs a pending debounced save and cancels the timer", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ deps }) => useAutosave(save, deps, 750), {
      initialProps: { deps: ["title", "v1"] },
    });

    rerender({ deps: ["title", "v2"] });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.flush();
    });
    expect(save).toHaveBeenCalledTimes(1);

    // The debounce timer that would have re-run the save must have been cancelled by flush.
    act(() => {
      vi.advanceTimersByTime(750);
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush is a no-op when no save is pending", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(({ deps }) => useAutosave(save, deps, 750), {
      initialProps: { deps: ["title", "v1"] },
    });

    await act(async () => {
      await result.current.flush();
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("switching what save() is bound to before flush() resolves does not misattribute the save", async () => {
    // Regression test for a document-switch data-loss/corruption bug: `save` must be
    // invoked with the closure in effect at the moment flush() is called, not whatever
    // state it captures if invoked later.
    let boundTo = "documentA";
    const save = vi.fn(() => Promise.resolve(boundTo));
    const { result, rerender } = renderHook(({ deps }) => useAutosave(save, deps, 750), {
      initialProps: { deps: ["title", "v1"] },
    });

    rerender({ deps: ["title", "v2"] });

    const flushPromise = result.current.flush();
    expect(save).toHaveBeenCalledTimes(1);
    const resolvedValue = await save.mock.results[0].value;
    // Simulate switching the active document immediately after flush() is invoked,
    // before its internal save() call has resolved.
    boundTo = "documentB";
    await act(async () => {
      await flushPromise;
    });

    expect(resolvedValue).toBe("documentA");
  });
});
