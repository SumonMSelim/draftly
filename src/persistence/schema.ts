import type { JSONContent } from "@tiptap/core";

export interface DocumentRow {
  id: string;
  title: string;
  content: JSONContent;
  createdAt: number;
  updatedAt: number;
}

export interface SettingRow {
  key: string;
  value: unknown;
}
