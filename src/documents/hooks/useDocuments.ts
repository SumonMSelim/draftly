import { useCallback, useEffect, useState } from "react";
import { IndexedDbDocumentRepository } from "../repository/IndexedDbDocumentRepository";
import type { DocumentRecord, DocumentRepository } from "../repository/types";
import { EMPTY_DOCUMENT } from "../../editor/schema/schema";

const defaultRepository = new IndexedDbDocumentRepository();

/** Lists and manages the set of locally stored documents (spec §24). */
export function useDocuments(repository: DocumentRepository = defaultRepository) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await repository.list();
    setDocuments(list);
    setLoading(false);
  }, [repository]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createDocument = useCallback(
    async (title = "Untitled document") => {
      const record = await repository.create({ title, content: EMPTY_DOCUMENT });
      await refresh();
      return record;
    },
    [repository, refresh],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      await repository.delete(id);
      await refresh();
    },
    [repository, refresh],
  );

  return { documents, loading, refresh, createDocument, deleteDocument };
}
