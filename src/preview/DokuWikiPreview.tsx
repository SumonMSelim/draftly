import { useState } from "react";

export interface DokuWikiPreviewProps {
  source: string;
  filename?: string;
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Read-only DokuWiki source viewer with Copy/Download (spec §23). */
export function DokuWikiPreview({ source, filename = "document.dokuwiki.txt" }: DokuWikiPreviewProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  return (
    <div className="source-preview" aria-label="DokuWiki source">
      <div className="source-preview-actions">
        <button type="button" aria-label="Copy DokuWiki markup to clipboard" onClick={handleCopy}>
          Copy
        </button>
        <button type="button" aria-label="Download DokuWiki markup" onClick={() => downloadText(filename, source, "text/plain")}>
          Download
        </button>
        <span role="status">
          {copyStatus === "copied" && "✓ Copied to clipboard"}
          {copyStatus === "failed" && "Could not access the clipboard."}
        </span>
      </div>
      <pre>
        <code>{source}</code>
      </pre>
    </div>
  );
}

export default DokuWikiPreview;
