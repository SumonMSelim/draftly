import { useState } from "react";
import { Dialog } from "../components/Dialog";
import { isSafeUrl } from "../../utils/url";

export interface LinkDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { url: string; text: string }) => void;
}

export function LinkDialog({ open, onClose, onSubmit }: LinkDialogProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSafeUrl(url)) {
      setError("Enter a valid http(s):// or mailto: URL.");
      return;
    }
    onSubmit({ url, text });
    setUrl("");
    setText("");
    setError(null);
  };

  return (
    <Dialog open={open} title="Insert link" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label htmlFor="link-url">URL</label>
        <input
          id="link-url"
          aria-label="URL"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
        />

        <label htmlFor="link-text">Text</label>
        <input id="link-text" aria-label="Link text" value={text} onChange={(event) => setText(event.target.value)} />

        {error && (
          <p role="alert" className="dialog-error">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Insert</button>
        </div>
      </form>
    </Dialog>
  );
}

export default LinkDialog;
