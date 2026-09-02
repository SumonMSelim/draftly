import { useState } from "react";
import { Dialog } from "../components/Dialog";
import { isSafeUrl } from "../../utils/url";

export interface ImageDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { src: string; alt: string }) => void;
}

export function ImageDialog({ open, onClose, onSubmit }: ImageDialogProps) {
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSafeUrl(src) && !src.startsWith("data:image/")) {
      setError("Enter a valid image URL.");
      return;
    }
    onSubmit({ src, alt });
    setSrc("");
    setAlt("");
    setError(null);
  };

  return (
    <Dialog open={open} title="Insert image" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label htmlFor="image-src">Image URL</label>
        <input
          id="image-src"
          aria-label="Image URL"
          value={src}
          onChange={(event) => setSrc(event.target.value)}
          placeholder="https://example.com/image.png"
        />

        <label htmlFor="image-alt">Description (alt text)</label>
        <input id="image-alt" aria-label="Image description" value={alt} onChange={(event) => setAlt(event.target.value)} />

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

export default ImageDialog;
