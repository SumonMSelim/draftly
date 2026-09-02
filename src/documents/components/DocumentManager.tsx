import type { AutosaveStatus } from "../hooks/useAutosave";
import type { DocumentRecord } from "../repository/types";

export interface DocumentManagerProps {
  documents: DocumentRecord[];
  activeId: string | null;
  status: AutosaveStatus;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const STATUS_LABEL: Record<AutosaveStatus, string> = {
  idle: "",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
};

/** Document list / manager sidebar (spec §24): new, open, delete, and autosave status. */
export function DocumentManager({ documents, activeId, status, onOpen, onCreate, onDelete, collapsed, onToggle }: DocumentManagerProps) {
  return (
    <nav className={`document-manager${collapsed ? " is-collapsed" : ""}`} aria-label="Documents">
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={collapsed ? "Expand documents sidebar" : "Collapse documents sidebar"}
        title={collapsed ? "Expand documents sidebar" : "Collapse documents sidebar"}
        onClick={onToggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 3v18" />
          {collapsed ? <path d="m13 9 3 3-3 3" /> : <path d="m16 9-3 3 3 3" />}
        </svg>
      </button>
      <button type="button" className="new-document-button" onClick={onCreate}>
        + New Document
      </button>
      <p aria-live="polite" className="autosave-status">
        {STATUS_LABEL[status]}
      </p>
      <ul>
        {documents.map((document) => (
          <li key={document.id}>
            <button
              type="button"
              aria-current={document.id === activeId ? "true" : undefined}
              onClick={() => onOpen(document.id)}
            >
              {document.title || "Untitled document"}
            </button>
            <button type="button" aria-label={`Delete ${document.title}`} onClick={() => onDelete(document.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <a className="github-link" href="https://github.com/SumonMSelim/draftly" target="_blank" rel="noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 2.5a9.5 9.5 0 0 0-3 18.51c.48.09.65-.21.65-.46v-1.67c-2.65.58-3.21-1.12-3.21-1.12-.44-1.1-1.06-1.39-1.06-1.39-.87-.6.07-.59.07-.59.96.07 1.47.99 1.47.99.86 1.47 2.25 1.05 2.8.8.09-.62.34-1.05.61-1.29-2.12-.24-4.35-1.06-4.35-4.72 0-1.04.37-1.89.98-2.56-.1-.24-.43-1.21.09-2.52 0 0 .8-.26 2.62.98a9.1 9.1 0 0 1 4.77 0c1.82-1.24 2.62-.98 2.62-.98.52 1.31.19 2.28.09 2.52.61.67.98 1.52.98 2.56 0 3.67-2.23 4.48-4.36 4.72.35.3.65.88.65 1.78v2.64c0 .25.17.55.66.46A9.5 9.5 0 0 0 12 2.5Z" />
        </svg>
        <span>View on GitHub</span>
      </a>
    </nav>
  );
}

export default DocumentManager;
