import { EditorContent, type Editor as TiptapEditor } from "@tiptap/react";

export interface EditorProps {
  editor: TiptapEditor | null;
}

/** Renders the Tiptap document. All editing logic lives in the editor instance itself. */
export function Editor({ editor }: EditorProps) {
  return (
    <div className="draftly-editor" role="textbox" aria-label="Document editor" aria-multiline="true">
      <EditorContent editor={editor} />
    </div>
  );
}

export default Editor;
