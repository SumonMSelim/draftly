import Dexie, { type Table } from "dexie";
import type { DocumentRow, SettingRow } from "./schema";

/** Local-only IndexedDB database (spec §25): no backend, no accounts. */
export class DraftlyDatabase extends Dexie {
  documents!: Table<DocumentRow, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super("draftly");
    this.version(1).stores({
      documents: "id, title, createdAt, updatedAt",
      settings: "key",
    });
  }
}

export const db = new DraftlyDatabase();
