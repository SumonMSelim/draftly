import { useCallback, useMemo, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";

interface Match {
  from: number;
  to: number;
}

function findMatches(editor: TiptapEditor, query: string): Match[] {
  if (!query) return [];
  const needle = query.toLowerCase();
  const results: Match[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = (node.text ?? "").toLowerCase();
    let index = text.indexOf(needle);
    while (index !== -1) {
      results.push({ from: pos + index, to: pos + index + query.length });
      index = text.indexOf(needle, index + 1);
    }
  });

  return results;
}

/** Find & replace over the canonical document (spec §42), operating directly on ProseMirror positions. */
export function useFindReplace(editor: TiptapEditor | null) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const matches = useMemo(() => (editor ? findMatches(editor, query) : []), [editor, query, editor?.state.doc]);

  const findNext = useCallback(() => {
    if (!editor || matches.length === 0) return;
    const next = (currentIndex + 1) % matches.length;
    setCurrentIndex(next);
    const match = matches[next];
    editor.chain().focus().setTextSelection({ from: match.from, to: match.to }).scrollIntoView().run();
  }, [editor, matches, currentIndex]);

  const replaceCurrent = useCallback(() => {
    if (!editor || matches.length === 0) return;
    const match = matches[currentIndex % matches.length];
    editor.chain().focus().insertContentAt({ from: match.from, to: match.to }, replacement).run();
  }, [editor, matches, currentIndex, replacement]);

  const replaceAll = useCallback(() => {
    if (!editor || matches.length === 0) return;
    const chain = editor.chain().focus();
    // Replace back-to-front so earlier match positions stay valid as later ones shrink/grow the doc.
    [...matches].reverse().forEach((match) => {
      chain.insertContentAt({ from: match.from, to: match.to }, replacement);
    });
    chain.run();
    setCurrentIndex(0);
  }, [editor, matches, replacement]);

  return { query, setQuery, replacement, setReplacement, matches, currentIndex, findNext, replaceCurrent, replaceAll };
}
