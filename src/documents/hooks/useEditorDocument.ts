import { useCallback, useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { IndexedDbDocumentRepository } from "../repository/IndexedDbDocumentRepository";
import type { DocumentRecord, DocumentRepository } from "../repository/types";

const defaultRepository = new IndexedDbDocumentRepository();

/** Loads and holds the document currently open in the editor (spec §24/§26). */
export function useEditorDocument(id: string | null, repository: DocumentRepository = defaultRepository) {
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<JSONContent | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setDocument(null);
      setContent(null);
      setTitle("");
      return;
    }

    repository.get(id).then((record) => {
      if (cancelled || !record) return;
      setDocument(record);
      setTitle(record.title);
      setContent(record.content);
    });

    return () => {
      cancelled = true;
    };
  }, [id, repository]);

  const save = useCallback(async () => {
    if (!id || content === null) return undefined;
    const updated = await repository.update(id, { title, content });
    setDocument(updated);
    return updated;
  }, [id, title, content, repository]);

  return { document, title, setTitle, content, setContent, save };
}
