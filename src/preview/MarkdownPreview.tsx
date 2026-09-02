import { useState } from "react";

export interface MarkdownPreviewProps {
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

/** Read-only Markdown source viewer with Copy/Download (spec §23). */
export function MarkdownPreview({ source, filename = "document.md" }: MarkdownPreviewProps) {
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
    <div className="source-preview" aria-label="Markdown source">
      <div className="source-preview-actions">
        <button type="button" aria-label="Copy Markdown to clipboard" onClick={handleCopy}>
          Copy
        </button>
        <button type="button" aria-label="Download Markdown" onClick={() => downloadText(filename, source, "text/markdown")}>
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

export default MarkdownPreview;
