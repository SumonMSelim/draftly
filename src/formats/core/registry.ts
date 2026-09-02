import type { JSONContent } from "@tiptap/core";
import type { DocumentSerializer, SerializationResult } from "./Serializer";
import type { DocumentParser, ParseResult } from "./Parser";
import { FormatError } from "./FormatError";

/** Plugin registry for output serializers (spec §10). Adding a format never touches editor code. */
export class SerializerRegistry {
  private readonly serializers = new Map<string, DocumentSerializer>();

  register(serializer: DocumentSerializer): void {
    this.serializers.set(serializer.format, serializer);
  }

  get(format: string): DocumentSerializer {
    const serializer = this.serializers.get(format);
    if (!serializer) {
      throw new FormatError(`Unknown output format: "${format}"`);
    }
    return serializer;
  }

  has(format: string): boolean {
    return this.serializers.has(format);
  }

  serialize(format: string, document: JSONContent): SerializationResult {
    return this.get(format).serialize(document);
  }
}

/** Plugin registry for input parsers (spec §51). */
export class ParserRegistry {
  private readonly parsers = new Map<string, DocumentParser>();

  register(parser: DocumentParser): void {
    this.parsers.set(parser.format, parser);
  }

  get(format: string): DocumentParser {
    const parser = this.parsers.get(format);
    if (!parser) {
      throw new FormatError(`Unknown input format: "${format}"`);
    }
    return parser;
  }

  has(format: string): boolean {
    return this.parsers.has(format);
  }

  parse(format: string, source: string): ParseResult {
    return this.get(format).parse(source);
  }
}
