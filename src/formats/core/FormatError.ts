export interface FormatErrorContext {
  line?: number;
  column?: number;
  source?: string;
}

/**
 * Raised for fatal, non-recoverable format failures (e.g. an unknown format
 * id requested from a registry). Recoverable per-construct issues should be
 * reported as ParseWarning/SerializationWarning entries instead of thrown.
 */
export class FormatError extends Error {
  readonly context?: FormatErrorContext;

  constructor(message: string, context?: FormatErrorContext) {
    super(message);
    this.name = "FormatError";
    this.context = context;
  }
}
