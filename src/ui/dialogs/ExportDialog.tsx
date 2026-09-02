import { useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { Dialog } from "../components/Dialog";
import { copyToClipboard, downloadFile, exportDocument, exportNativeProject, type ExportFormat } from "../../import-export/exportDocument";
import type { SerializationWarning } from "../../formats/core/Serializer";

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  document: JSONContent;
  title: string;
  projectMeta: { id: string; createdAt: string; updatedAt: string };
  onWarnings?: (warnings: SerializationWarning[]) => void;
}

/** Export workflow (spec §29/§30): per-format copy/download, Draftly project download. */
export function ExportDialog({ open, onClose, document, title, projectMeta, onWarnings }: ExportDialogProps) {
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat, action: "copy" | "download") => {
    const result = exportDocument(format, document, title);
    if (result.warnings.length > 0) onWarnings?.(result.warnings);

    if (action === "copy") {
      const copyResult = await copyToClipboard(result.output);
      setStatus(copyResult.success ? "✓ Copied to clipboard" : (copyResult.error ?? "Copy failed"));
    } else {
      downloadFile(result.filename, result.output, result.mimeType);
    }
  };

  const handleExportProject = () => {
    const result = exportNativeProject({
      id: projectMeta.id,
      title,
      content: document,
      createdAt: projectMeta.createdAt,
      updatedAt: projectMeta.updatedAt,
    });
    downloadFile(result.filename, result.output, result.mimeType);
  };

  return (
    <Dialog open={open} title="Export" onClose={onClose}>
      <section>
        <h3>DokuWiki</h3>
        <button type="button" onClick={() => handleExport("dokuwiki", "copy")}>
          Copy to clipboard
        </button>
        <button type="button" onClick={() => handleExport("dokuwiki", "download")}>
          Download .txt
        </button>
      </section>

      <section>
        <h3>Markdown</h3>
        <button type="button" onClick={() => handleExport("markdown", "copy")}>
          Copy to clipboard
        </button>
        <button type="button" onClick={() => handleExport("markdown", "download")}>
          Download .md
        </button>
      </section>

      <section>
        <h3>Draftly Project</h3>
        <button type="button" onClick={handleExportProject}>
          Download .draftly.json
        </button>
      </section>

      {status && <p role="status">{status}</p>}
    </Dialog>
  );
}

export default ExportDialog;
