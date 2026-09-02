import type { Editor as TiptapEditor } from "@tiptap/react";
import type { ReactNode } from "react";
import { useEditorState } from "@tiptap/react";

export interface ToolbarProps {
  editor: TiptapEditor | null;
  onInsertLink?: () => void;
  onInsertImage?: () => void;
  onInsertTable?: () => void;
  sourceControls?: ReactNode;
}

function useToolbarState(editor: TiptapEditor | null) {
  return useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      if (!e) return null;
      return {
        canUndo: e.can().chain().undo().run(),
        canRedo: e.can().chain().redo().run(),
        isBold: e.isActive("bold"),
        isItalic: e.isActive("italic"),
        isUnderline: e.isActive("underline"),
        isStrike: e.isActive("strike"),
        isCode: e.isActive("code"),
        isBulletList: e.isActive("bulletList"),
        isOrderedList: e.isActive("orderedList"),
        isBlockquote: e.isActive("blockquote"),
        isCodeBlock: e.isActive("codeBlock"),
        headingLevel: [1, 2, 3, 4, 5, 6].find((level) => e.isActive("heading", { level })) ?? 0,
      };
    },
  });
}

export function Toolbar({ editor, onInsertLink, onInsertImage, onInsertTable, sourceControls }: ToolbarProps) {
  const state = useToolbarState(editor);
  const disabled = !editor;

  if (!state) {
    return <div className="toolbar" role="toolbar" aria-label="Formatting toolbar" />;
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting toolbar">
      <div className="toolbar-row toolbar-primary">
      <div className="toolbar-group" role="group" aria-label="History">
        <button type="button" aria-label="Undo" disabled={disabled || !state.canUndo} onClick={() => editor?.chain().focus().undo().run()}>
          Undo
        </button>
        <button type="button" aria-label="Redo" disabled={disabled || !state.canRedo} onClick={() => editor?.chain().focus().redo().run()}>
          Redo
        </button>
      </div>

      <div className="toolbar-group" role="group" aria-label="Text">
        <select
          aria-label="Paragraph style"
          disabled={disabled}
          value={state.headingLevel}
          onChange={(event) => {
            const level = Number(event.target.value);
            if (!editor) return;
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
            }
          }}
        >
          <option value={0}>Paragraph</option>
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <option key={level} value={level}>
              Heading {level}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Bold"
          aria-pressed={state.isBold}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          aria-label="Italic"
          aria-pressed={state.isItalic}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          aria-label="Underline"
          aria-pressed={state.isUnderline}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          U
        </button>
        <button
          type="button"
          aria-label="Strikethrough"
          aria-pressed={state.isStrike}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          S
        </button>
        <button
          type="button"
          aria-label="Inline code"
          aria-pressed={state.isCode}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          {"</>"}
        </button>
      </div>

      <div className="toolbar-group" role="group" aria-label="Structure">
        <button
          type="button"
          aria-label="Bullet list"
          aria-pressed={state.isBulletList}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          type="button"
          aria-label="Ordered list"
          aria-pressed={state.isOrderedList}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
        <button
          type="button"
          aria-label="Blockquote"
          aria-pressed={state.isBlockquote}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          Quote
        </button>
        <button type="button" aria-label="Horizontal rule" disabled={disabled} onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
          HR
        </button>
      </div>

      </div>

      <div className="toolbar-row toolbar-secondary">
        <div className="toolbar-group" role="group" aria-label="Insert">
          <button type="button" aria-label="Insert link" disabled={disabled} onClick={onInsertLink}>
            Link
          </button>
          <button type="button" aria-label="Insert image" disabled={disabled} onClick={onInsertImage}>
            Image
          </button>
          <button type="button" aria-label="Insert table" disabled={disabled} onClick={onInsertTable}>
            Table
          </button>
          <button
            type="button"
            aria-label="Code block"
            aria-pressed={state.isCodeBlock}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            Code block
          </button>
        </div>
      </div>

      {sourceControls && <div className="toolbar-row toolbar-source">{sourceControls}</div>}
    </div>
  );
}

export default Toolbar;
