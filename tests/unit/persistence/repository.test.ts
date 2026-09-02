import { beforeEach, describe, expect, it } from "vitest";
import { DraftlyDatabase } from "../../../src/persistence/db";
import { IndexedDbDocumentRepository } from "../../../src/documents/repository/IndexedDbDocumentRepository";
import { EMPTY_DOCUMENT } from "../../../src/editor/schema/schema";

describe("IndexedDbDocumentRepository", () => {
  let database: DraftlyDatabase;
  let repository: IndexedDbDocumentRepository;

  beforeEach(async () => {
    database = new DraftlyDatabase();
    await database.documents.clear();
    repository = new IndexedDbDocumentRepository(database);
  });

  it("creates a document with a generated id and timestamps", async () => {
    const record = await repository.create({ title: "Network Security", content: EMPTY_DOCUMENT });
    expect(record.id).toBeTruthy();
    expect(record.title).toBe("Network Security");
    expect(record.createdAt).toBe(record.updatedAt);
  });

  it("lists documents ordered by most recently updated", async () => {
    const first = await repository.create({ title: "First", content: EMPTY_DOCUMENT });
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await repository.create({ title: "Second", content: EMPTY_DOCUMENT });

    const list = await repository.list();
    expect(list.map((doc) => doc.id)).toEqual([second.id, first.id]);
  });

  it("gets a document by id", async () => {
    const record = await repository.create({ title: "Doc", content: EMPTY_DOCUMENT });
    const fetched = await repository.get(record.id);
    expect(fetched?.title).toBe("Doc");
  });

  it("returns undefined for a missing document", async () => {
    expect(await repository.get("missing-id")).toBeUndefined();
  });

  it("updates a document's title and bumps updatedAt", async () => {
    const record = await repository.create({ title: "Original", content: EMPTY_DOCUMENT });
    const updated = await repository.update(record.id, { title: "Renamed" });
    expect(updated.title).toBe("Renamed");
    expect(updated.updatedAt).toBeGreaterThanOrEqual(record.updatedAt);
  });

  it("throws when updating a document that does not exist", async () => {
    await expect(repository.update("missing-id", { title: "x" })).rejects.toThrow();
  });

  it("deletes a document", async () => {
    const record = await repository.create({ title: "To delete", content: EMPTY_DOCUMENT });
    await repository.delete(record.id);
    expect(await repository.get(record.id)).toBeUndefined();
  });
});
