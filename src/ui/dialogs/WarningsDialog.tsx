import { Dialog } from "../components/Dialog";

export interface WarningItem {
  message: string;
  line?: number;
}

export interface WarningsDialogProps {
  open: boolean;
  onClose: () => void;
  warnings: WarningItem[];
}

/** Shows import/export warnings with line numbers where available (spec §15/§59). */
export function WarningsDialog({ open, onClose, warnings }: WarningsDialogProps) {
  return (
    <Dialog open={open} title={`${warnings.length} warning${warnings.length === 1 ? "" : "s"}`} onClose={onClose}>
      <ul className="warnings-list">
        {warnings.map((warning, index) => (
          <li key={index}>
            {typeof warning.line === "number" && warning.line > 0 && <strong>Line {warning.line}: </strong>}
            {warning.message}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

export default WarningsDialog;
