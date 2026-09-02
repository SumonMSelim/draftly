/** Structured metadata only — primitives, never raw blobs of user content. */
export interface LogMeta {
  [key: string]: string | number | boolean | undefined;
}

const isDev = Boolean(import.meta.env?.DEV);

/**
 * Dev-only structured logger (spec §53/§54). Draftly is privacy-oriented:
 * never log document bodies, imported source, clipboard contents, or image
 * data. The `meta` parameter only accepts primitive values by design so
 * accidentally attaching a whole document object is a type error, not a
 * silent privacy leak.
 */
export const logger = {
  debug(event: string, meta?: LogMeta): void {
    if (isDev) console.debug(`[Draftly] ${event}`, meta ?? "");
  },
  warn(event: string, meta?: LogMeta): void {
    if (isDev) console.warn(`[Draftly] ${event}`, meta ?? "");
  },
  error(event: string, meta?: LogMeta): void {
    console.error(`[Draftly] ${event}`, meta ?? "");
  },
};
