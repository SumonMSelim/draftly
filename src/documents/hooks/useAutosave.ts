import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "unsaved" | "saving" | "saved";

export interface UseAutosaveResult {
  status: AutosaveStatus;
  /**
   * Cancels any pending debounced save and runs it immediately.
   * Callers that are about to change what `save`'s deps refer to (e.g.
   * switching the active document) must await this first — otherwise a
   * still-pending timer either fires after the switch (writing the old
   * content to the new document's id) or gets silently cleared by the next
   * debounce cycle (losing the edit entirely). No-op if nothing is pending.
   */
  flush: () => Promise<void>;
}

/**
 * Debounces `save` (spec §26: ~500-1000ms after changes stop) and never
 * blocks the editor — saving happens fire-and-forget in the background.
 * `deps` must have a stable length across renders (typically [title, content]);
 * a change in any dependency restarts the debounce timer.
 */
export function useAutosave(save: () => Promise<unknown>, deps: unknown[], delay = 750): UseAutosaveResult {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const isFirstRun = useRef(true);

  const runSave = useCallback(() => {
    setStatus("saving");
    return saveRef.current()
      .then(() => setStatus("saved"))
      .catch(() => setStatus("unsaved"));
  }, []);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    setStatus("unsaved");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Debounce: wait for changes to stop before triggering a save.
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      runSave();
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveRef.current();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      return runSave();
    }
    return Promise.resolve();
  }, [runSave]);

  return { status, flush };
}
