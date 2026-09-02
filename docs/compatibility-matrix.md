# Feature compatibility matrix

Draftly exposes only features with a well-defined representation in the
editor, Markdown, and DokuWiki (spec §9). This matrix is the source of truth
for what the toolbar shows and what the serializers/parsers implement.

| Feature         | Editor |            Markdown |         DokuWiki |
| --------------- | -----: | -------------------: | ----------------: |
| Paragraph       |      ✓ |                    ✓ |                 ✓ |
| H1–H6           |      ✓ |                    ✓ |                 ✓ |
| Bold            |      ✓ |                    ✓ |                 ✓ |
| Italic          |      ✓ |                    ✓ |                 ✓ |
| Underline       |      ✓ |      Limited (`<u>`) |    ✓ (profile-gated) |
| Strike          |      ✓ |                    ✓ |    ✓ (`<del>`) |
| Inline code     |      ✓ |                    ✓ |                 ✓ |
| Links           |      ✓ |                    ✓ |                 ✓ |
| Images          |      ✓ |    ✓ (block-level)   |    ✓ (block-level) |
| Bullet list     |      ✓ |                    ✓ |                 ✓ |
| Ordered list    |      ✓ |                    ✓ |                 ✓ |
| Nested lists    |      ✓ |                    ✓ |                 ✓ |
| Blockquote      |      ✓ |                    ✓ |                 ✓ |
| Code block      |      ✓ |                    ✓ |                 ✓ |
| Tables          |      ✓ | ✓ (no row/col span)  | ✓ (no row/col span) |
| Horizontal rule |      ✓ |                    ✓ |                 ✓ |
| Task list       |  Later |                    ✓ | Plugin-dependent |
| Footnotes       |  Later |  Extension-dependent | Plugin-dependent |
| Math            |  Later |  Extension-dependent | Plugin-dependent |

## Notes

- **Underline**: Markdown has no native underline syntax; Draftly falls
  back to the `<u>...</u>` HTML tag, which most Markdown renderers pass
  through. DokuWiki underline (`__text__`) is gated by
  `DokuWikiProfile.supportsUnderline` (default `true`) since not every
  installation renders it the same way.
- **Images**: Draftly's canonical schema treats images as block-level
  nodes (spec §31). An image embedded mid-sentence in imported Markdown or
  DokuWiki is split into its own block; the surrounding text becomes
  sibling paragraphs.
- **Tables**: only a single header row plus body rows are supported.
  Row/column spanning and per-cell alignment are intentionally out of scope
  until the simpler model round-trips reliably (spec §33).
- **Unsupported syntax**: unknown DokuWiki macros (e.g. `{{plugin>...}}`)
  and unrecognized Markdown/HTML constructs are preserved as an
  `unsupportedMarkup` node (or, for isolated inline HTML, as literal text)
  rather than silently discarded (spec §16, Rule 5). They are never
  interpreted or executed (Rule: DokuWiki macros are never executed).
- Rows marked "Later" are intentionally excluded from the editor's UI in
  this MVP even where one or both text formats already support them,
  per spec §9: "The UI should initially expose only features with stable
  cross-format semantics."
