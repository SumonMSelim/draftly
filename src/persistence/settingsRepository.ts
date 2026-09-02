import { db as defaultDb, type DraftlyDatabase } from "./db";

/** Key/value settings persistence backed by the Dexie `settings` table (spec §25). */
export class SettingsRepository {
  constructor(private readonly database: DraftlyDatabase = defaultDb) {}

  async get<T>(key: string): Promise<T | undefined> {
    const row = await this.database.settings.get(key);
    return row?.value as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.database.settings.put({ key, value });
  }
}

export const settingsRepository = new SettingsRepository();
