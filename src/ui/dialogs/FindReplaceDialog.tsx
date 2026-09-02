import type { Editor as TiptapEditor } from "@tiptap/react";
import { Dialog } from "../components/Dialog";
import { useFindReplace } from "../../editor/find-replace/useFindReplace";

export interface FindReplaceDialogProps {
  open: boolean;
  onClose: () => void;
  editor: TiptapEditor | null;
}

export function FindReplaceDialog({ open, onClose, editor }: FindReplaceDialogProps) {
  const { query, setQuery, replacement, setReplacement, matches, findNext, replaceCurrent, replaceAll } = useFindReplace(editor);

  return (
    <Dialog open={open} title="Find and replace" onClose={onClose}>
      <label htmlFor="find-query">Find</label>
      <input id="find-query" aria-label="Find" value={query} onChange={(event) => setQuery(event.target.value)} />

      <label htmlFor="find-replacement">Replace with</label>
      <input id="find-replacement" aria-label="Replace with" value={replacement} onChange={(event) => setReplacement(event.target.value)} />

      <p aria-live="polite">{matches.length} match{matches.length === 1 ? "" : "es"}</p>

      <div className="dialog-actions">
        <button type="button" disabled={matches.length === 0} onClick={findNext}>
          Find next
        </button>
        <button type="button" disabled={matches.length === 0} onClick={replaceCurrent}>
          Replace
        </button>
        <button type="button" disabled={matches.length === 0} onClick={replaceAll}>
          Replace all
        </button>
      </div>
    </Dialog>
  );
}

export default FindReplaceDialog;
