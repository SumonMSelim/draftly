# Draftly

Draftly is a browser-based WYSIWYG document editor for people who don't know
Markdown or DokuWiki syntax. It runs entirely client-side: no backend, no
accounts, no server-side storage. It targets academic/technical documents —
headings, lists, tables, links, images, code blocks, and quotations.

## Architecture

The canonical document representation is the Tiptap/ProseMirror JSON
document — **never** Markdown or DokuWiki text. Markdown and DokuWiki are
derived, disposable representations produced by dedicated parsers and
serializers:

```
                 User
                  │
                  ▼
           Tiptap Editor
                  │
                  ▼
       Canonical Document Model
           (ProseMirror JSON)
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
  DokuWiki     Markdown      HTML
  Serializer   Serializer   Renderer
      ▲           ▲
      │           │
  DokuWiki     Markdown
   Parser       Parser
```

Conversions always go through the canonical document — direct text-to-text
conversion between Markdown and DokuWiki is never implemented. Changing the
export format only changes which serializer runs; it never mutates the
document.

Key modules:

- `src/editor/` — the Tiptap schema, extensions, toolbar, and commands.
- `src/formats/core/` — the `DocumentSerializer`/`DocumentParser` interfaces,
  `SerializerRegistry`/`ParserRegistry`, `FormatError`, and the
  `DokuWikiProfile` used to adapt output to different DokuWiki installations.
- `src/formats/markdown/` and `src/formats/dokuwiki/` — one parser and one
  serializer per format. The DokuWiki side is a real lexer → block parser →
  inline parser pipeline (spec §13), not a pile of regular expressions.
- `src/document/normalization/` — a `normalize()` function used by tests to
  compare documents for *semantic* equivalence rather than byte-for-byte
  identity (whitespace, mark order, and split text runs are insignificant).
- `src/persistence/` + `src/documents/repository/` — a Dexie-backed
  `DocumentRepository`, so a future remote backend could implement the same
  interface without touching editor code.
- `src/import-export/` — the native `.draftly.json` project format (Zod
  v4-validated, versioned from day one) and the import/export workflows.

Unknown or unsupported syntax (an unrecognized DokuWiki macro, a raw HTML
block in Markdown) is preserved as an `unsupportedMarkup` node or literal
text with a warning — it is never silently discarded, and DokuWiki macros
are never executed. See `docs/compatibility-matrix.md` for exactly which
features round-trip between the editor, Markdown, and DokuWiki.

## Privacy

**Your documents stay in your browser.** This application does not upload
your documents anywhere — all persistence uses IndexedDB via Dexie, there is
no backend to send data to, and the logger (`src/utils/logger.ts`) never
logs document bodies, imported source, clipboard contents, or image data.

## Security

- Link and image URLs are restricted to `http:`, `https:`, and `mailto:`
  (`src/utils/url.ts`); `javascript:`/`data:`/other schemes are rejected.
- The rendered preview goes through `generateHTML` (from the canonical
  model) and then DOMPurify before touching the DOM — untrusted markup is
  never injected directly.
- Imported DokuWiki macros and Markdown raw-HTML blocks are treated as
  inert markup, never executed.

## Setup

```bash
npm install
npm run dev         # start the dev server
npm run build       # typecheck + production build
npm test            # run unit/integration tests (Vitest)
npx playwright install chromium   # one-time browser download for e2e tests
npm run e2e         # run end-to-end tests (Playwright)
```

## Definition of Done

A user can, entirely offline after the first load:

- **Create**: open the app, start a new document, write rich text with the
  toolbar (headings, formatting, lists, links, images, code blocks, tables).
- **Save**: close the browser, reopen it, and find the document unchanged —
  autosave persists to IndexedDB ~750ms after typing stops.
- **DokuWiki**: write a document, export it as DokuWiki, and paste the
  output into a real DokuWiki installation.
- **Markdown**: write a document, export it as Markdown, and open the `.md`
  file in any Markdown renderer.
- **Import**: open an existing DokuWiki or Markdown file, edit it, and
  export it again.
- **Native project**: export a `.draftly.json` project file, delete the
  document, import the project file back, and keep editing.

## Status

This is an actively developed MVP. See `docs/compatibility-matrix.md` for
feature scope and the project specification for the full phased plan.
