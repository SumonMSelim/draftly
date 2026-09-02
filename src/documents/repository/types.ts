import type { JSONContent } from "@tiptap/core";

export interface DocumentRecord {
  id: string;
  title: string;
  content: JSONContent;
  createdAt: number;
  updatedAt: number;
}

export interface CreateDocumentInput {
  title: string;
  content: JSONContent;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: JSONContent;
}

/** Persistence abstraction (spec §50): a future remote repository can implement this without touching editor code. */
export interface DocumentRepository {
  list(): Promise<DocumentRecord[]>;
  get(id: string): Promise<DocumentRecord | undefined>;
  create(document: CreateDocumentInput): Promise<DocumentRecord>;
  update(id: string, update: UpdateDocumentInput): Promise<DocumentRecord>;
  delete(id: string): Promise<void>;
}
