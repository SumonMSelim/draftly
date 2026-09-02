import { z } from "zod";
import type { JSONContent } from "@tiptap/core";

export const PROJECT_FORMAT = "draftly";
export const CURRENT_VERSION = 1;
export const PROJECT_FILE_EXTENSION = ".draftly.json";

const markSchema = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

const jsonContentSchema: z.ZodType<JSONContent> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(jsonContentSchema).optional(),
    marks: z.array(markSchema).optional(),
    text: z.string().optional(),
  }),
);

/**
 * Draftly's native project format (spec §27/§55): versioned from the
 * start. Stores only the canonical document — never derived Markdown or
 * DokuWiki text, which would go stale the moment the document changes.
 */
export const draftlyProjectSchema = z.object({
  format: z.literal(PROJECT_FORMAT),
  version: z.literal(CURRENT_VERSION),
  document: z.object({
    id: z.string(),
    title: z.string(),
    content: jsonContentSchema,
  }),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export type DraftlyProjectFile = z.infer<typeof draftlyProjectSchema>;

export interface ExportProjectInput {
  id: string;
  title: string;
  content: JSONContent;
  createdAt: string;
  updatedAt: string;
}

export function exportProject(input: ExportProjectInput): string {
  const project: DraftlyProjectFile = {
    format: PROJECT_FORMAT,
    version: CURRENT_VERSION,
    document: { id: input.id, title: input.title, content: input.content },
    metadata: { createdAt: input.createdAt, updatedAt: input.updatedAt },
  };
  return `${JSON.stringify(project, null, 2)}\n`;
}

export type ImportProjectResult = { success: true; project: DraftlyProjectFile } | { success: false; error: string };

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
}

export function importProject(source: string): ImportProjectResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { success: false, error: "This file is not valid JSON." };
  }

  const result = draftlyProjectSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: `This is not a valid ${PROJECT_FILE_EXTENSION} project file: ${formatZodError(result.error)}` };
  }

  return { success: true, project: result.data };
}
