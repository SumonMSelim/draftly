import { db as defaultDb, type DraftlyDatabase } from "../../persistence/db";
import type { CreateDocumentInput, DocumentRecord, DocumentRepository, UpdateDocumentInput } from "./types";

export class IndexedDbDocumentRepository implements DocumentRepository {
  constructor(private readonly database: DraftlyDatabase = defaultDb) {}

  async list(): Promise<DocumentRecord[]> {
    return this.database.documents.orderBy("updatedAt").reverse().toArray();
  }

  async get(id: string): Promise<DocumentRecord | undefined> {
    return this.database.documents.get(id);
  }

  async create(input: CreateDocumentInput): Promise<DocumentRecord> {
    const now = Date.now();
    const record: DocumentRecord = {
      id: crypto.randomUUID(),
      title: input.title,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    };
    await this.database.documents.add(record);
    return record;
  }

  async update(id: string, update: UpdateDocumentInput): Promise<DocumentRecord> {
    return this.database.transaction("rw", this.database.documents, async () => {
      const existing = await this.database.documents.get(id);
      if (!existing) {
        throw new Error(`Document not found: ${id}`);
      }
      const updated: DocumentRecord = { ...existing, ...update, updatedAt: Date.now() };
      await this.database.documents.put(updated);
      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    await this.database.documents.delete(id);
  }
}

export default IndexedDbDocumentRepository;
