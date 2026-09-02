import { useEffect, useId, type KeyboardEvent, type ReactNode } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Accessible modal shell: focus trap, focus restore, Escape to close, aria-modal (spec §35). */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  const containerRef = useFocusTrap<HTMLDivElement>(open);
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose} onKeyDown={handleOverlayKeyDown} role="presentation">
      <div
        ref={containerRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <h2 id={headingId}>{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}

export default Dialog;
