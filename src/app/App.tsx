import { useEffect, useMemo, useState } from "react";
import { useEditor } from "@tiptap/react";
import { createExtensions } from "../editor/extensions";
import { EMPTY_DOCUMENT } from "../editor/schema/schema";
import { Editor } from "../editor/Editor";
import { Toolbar } from "../editor/toolbar/Toolbar";
import { AppLayout } from "../ui/layout/AppLayout";
import { SplitView } from "../ui/layout/SplitView";
import { computeStats } from "../document/stats";
import { createLinkShortcutExtension } from "../editor/shortcuts";
import { insertLink, insertImage, insertTable } from "../editor/commands";
import { LinkDialog } from "../ui/dialogs/LinkDialog";
import { ImageDialog } from "../ui/dialogs/ImageDialog";
import { TableMenu } from "../ui/menus/TableMenu";
import { DocumentManager } from "../documents/components/DocumentManager";
import { useDocuments } from "../documents/hooks/useDocuments";
import { useEditorDocument } from "../documents/hooks/useEditorDocument";
import { useAutosave } from "../documents/hooks/useAutosave";
import { MarkdownPreview } from "../preview/MarkdownPreview";
import { DokuWikiPreview } from "../preview/DokuWikiPreview";
import { ImportDialog } from "../ui/dialogs/ImportDialog";
import { ExportDialog } from "../ui/dialogs/ExportDialog";
import { WarningsDialog, type WarningItem } from "../ui/dialogs/WarningsDialog";
import { FindReplaceDialog } from "../ui/dialogs/FindReplaceDialog";
import { PrivacyNotice } from "../ui/components/PrivacyNotice";
import { importDocument } from "../import-export/importDocument";
import { exportDocument } from "../import-export/exportDocument";
import { useDebouncedValue } from "../utils/useDebouncedValue";

type SourceFormat = "markdown" | "dokuwiki";

export function App() {
  const { documents, loading: documentsLoading, createDocument, deleteDocument } = useDocuments();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sourceFormat, setSourceFormat] = useState<SourceFormat>("dokuwiki");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [warnings, setWarnings] = useState<WarningItem[] | null>(null);

  useEffect(() => {
    // Wait for IndexedDB before deciding whether the workspace is empty. On a
    // refresh, the initial empty state must not race the persisted document
    // list and create a duplicate document.
    if (documentsLoading) return;

    if (documents.length === 0) {
      createDocument().then((record) => setActiveId(record.id));
    } else if (!activeId) {
      setActiveId(documents[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents.length, documentsLoading]);

  const { document: activeDocument, title, setTitle, content, setContent, save } = useEditorDocument(activeId);

  const extensions = useMemo(
    () => [...createExtensions(), createLinkShortcutExtension(() => setLinkDialogOpen(true))],
    [],
  );

  const editor = useEditor({
    extensions,
    content: EMPTY_DOCUMENT,
    editable: true,
    onUpdate: ({ editor: currentEditor }) => setContent(currentEditor.getJSON()),
  });

  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, activeDocument?.id]);

  const { status, flush } = useAutosave(save, [title, content]);
  const debouncedContent = useDebouncedValue(content, 500);

  const stats = editor ? computeStats(editor.getJSON()) : { words: 0, characters: 0, charactersWithoutSpaces: 0 };

  const sourceOutput = useMemo(() => {
    if (!debouncedContent) return "";
    return exportDocument(sourceFormat, debouncedContent, title || "document").output;
  }, [debouncedContent, sourceFormat, title]);

  const handleOpen = (id: string) => {
    void flush();
    setActiveId(id);
  };

  const handleCreate = async () => {
    await flush();
    const record = await createDocument();
    setActiveId(record.id);
  };

  const handleDelete = async (id: string) => {
    if (id === activeId) await flush();
    await deleteDocument(id);
    if (id === activeId) setActiveId(null);
  };

  const handleImport = (format: Parameters<typeof importDocument>[0], source: string, _filename: string) => {
    const result = importDocument(format, source);
    setImportDialogOpen(false);
    if (!result.success) {
      setWarnings([{ message: result.error ?? "Import failed." }]);
      return;
    }
    if (result.title) setTitle(result.title);
    if (result.document) setContent(result.document);
    if (result.warnings.length > 0) {
      setWarnings(result.warnings.map((warning) => ({ message: warning.message, line: warning.line })));
    }
  };

  const handleSourceChange = (source: string) => {
    const result = importDocument(sourceFormat, source);
    if (result.success && result.document) setContent(result.document);
  };

  return (
    <div className="app-root">
      <div className="app-body">
        <DocumentManager
          documents={documents}
          activeId={activeId}
          status={status}
          onOpen={handleOpen}
          onCreate={handleCreate}
          onDelete={handleDelete}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
        />
        <AppLayout
          header={
            <>
              <span className="app-name">Draftly</span>
              <input
                aria-label="Document title"
                className="document-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <button type="button" onClick={() => setImportDialogOpen(true)}>
                Import
              </button>
              <button type="button" onClick={() => setExportDialogOpen(true)}>
                Export
              </button>
              <button type="button" aria-label="Find and replace" onClick={() => setFindReplaceOpen(true)}>
                Find &amp; Replace
              </button>
            </>
          }
          toolbar={
            <>
              <Toolbar
                editor={editor}
                onInsertLink={() => setLinkDialogOpen(true)}
                onInsertImage={() => setImageDialogOpen(true)}
                onInsertTable={() => editor && insertTable(editor)}
                sourceControls={
                  <div className="source-format-controls" role="group" aria-label="Source format">
                    <button type="button" aria-pressed={sourceFormat === "markdown"} onClick={() => setSourceFormat("markdown")}>
                      Markdown
                    </button>
                    <button type="button" aria-pressed={sourceFormat === "dokuwiki"} onClick={() => setSourceFormat("dokuwiki")}>
                      DokuWiki
                    </button>
                  </div>
                }
              />
              <TableMenu editor={editor} />
            </>
          }
          statusBar={
            <>
              <span>{stats.words.toLocaleString()} words</span>
              <span>
                {status === "idle" && "Saved locally"}
                {status === "unsaved" && "Unsaved changes"}
                {status === "saving" && "Saving…"}
                {status === "saved" && "Saved"}
              </span>
            </>
          }
        >
          {documentsLoading && <div className="workspace-loading" role="status">Loading your latest document…</div>}
          {!documentsLoading && content && (
            <SplitView
              leftLabel="Editor"
              rightLabel={sourceFormat === "markdown" ? "Markdown" : "DokuWiki"}
              left={
                <Editor editor={editor} />
              }
              right={
                sourceFormat === "markdown" ? (
                  <MarkdownPreview
                    source={sourceOutput}
                    filename={`${title || "document"}.md`}
                    onSourceChange={handleSourceChange}
                  />
                ) : (
                  <DokuWikiPreview
                    source={sourceOutput}
                    filename={`${title || "document"}.dokuwiki.txt`}
                    onSourceChange={handleSourceChange}
                  />
                )
              }
            />
          )}
        </AppLayout>
      </div>
      <PrivacyNotice />

      <LinkDialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        onSubmit={(input) => {
          if (editor) insertLink(editor, input);
          setLinkDialogOpen(false);
        }}
      />
      <ImageDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onSubmit={(input) => {
          if (editor) insertImage(editor, input);
          setImageDialogOpen(false);
        }}
      />
      <ImportDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} onImport={handleImport} />
      {content && activeDocument && (
        <ExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          document={content}
          title={title || "document"}
          projectMeta={{
            id: activeDocument.id,
            createdAt: new Date(activeDocument.createdAt).toISOString(),
            updatedAt: new Date(activeDocument.updatedAt).toISOString(),
          }}
          onWarnings={(serializationWarnings) => setWarnings(serializationWarnings.map((warning) => ({ message: warning.message })))}
        />
      )}
      <WarningsDialog open={warnings !== null} onClose={() => setWarnings(null)} warnings={warnings ?? []} />
      <FindReplaceDialog open={findReplaceOpen} onClose={() => setFindReplaceOpen(false)} editor={editor} />
    </div>
  );
}

export default App;
