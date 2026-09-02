import { useState, type ChangeEvent } from "react";
import { Dialog } from "../components/Dialog";
import { detectFormatFromFilename, type ImportFormat } from "../../import-export/importDocument";

export interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (format: ImportFormat, source: string, filename: string) => void;
}

/** Import workflow (spec §28): explicit format selection, defaulted from the chosen file's extension. */
export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  const [format, setFormat] = useState<ImportFormat>("dokuwiki");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) setFormat(detectFormatFromFilename(selected.name));
  };

  const handleImport = async () => {
    if (!file) return;
    const text = await file.text();
    onImport(format, text, file.name);
  };

  return (
    <Dialog open={open} title="Import document" onClose={onClose}>
      <fieldset>
        <legend>Format</legend>
        <label>
          <input type="radio" name="import-format" checked={format === "markdown"} onChange={() => setFormat("markdown")} />
          Markdown
        </label>
        <label>
          <input type="radio" name="import-format" checked={format === "dokuwiki"} onChange={() => setFormat("dokuwiki")} />
          DokuWiki
        </label>
        <label>
          <input type="radio" name="import-format" checked={format === "draftly"} onChange={() => setFormat("draftly")} />
          Draftly project
        </label>
      </fieldset>

      <label htmlFor="import-file">Choose file</label>
      <input id="import-file" type="file" aria-label="Choose file" accept=".md,.markdown,.dokuwiki,.txt,.json" onChange={handleFileChange} />

      <div className="dialog-actions">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" disabled={!file} onClick={handleImport}>
          Import
        </button>
      </div>
    </Dialog>
  );
}

export default ImportDialog;
