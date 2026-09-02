import type { Editor as TiptapEditor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { tableCommands } from "../../editor/commands";

export interface TableMenuProps {
  editor: TiptapEditor | null;
}

/** Contextual table editing controls (spec §33): shown only while the selection is inside a table. */
export function TableMenu({ editor }: TableMenuProps) {
  const isInTable = useEditorState({
    editor,
    selector: (ctx) => ctx.editor?.isActive("table") ?? false,
  });

  if (!editor || !isInTable) return null;

  return (
    <div className="table-menu" role="toolbar" aria-label="Table editing">
      <button type="button" aria-label="Add row" onClick={() => tableCommands.addRowAfter(editor)}>
        Add row
      </button>
      <button type="button" aria-label="Delete row" onClick={() => tableCommands.deleteRow(editor)}>
        Delete row
      </button>
      <button type="button" aria-label="Add column" onClick={() => tableCommands.addColumnAfter(editor)}>
        Add column
      </button>
      <button type="button" aria-label="Delete column" onClick={() => tableCommands.deleteColumn(editor)}>
        Delete column
      </button>
      <button type="button" aria-label="Delete table" onClick={() => tableCommands.deleteTable(editor)}>
        Delete table
      </button>
    </div>
  );
}

export default TableMenu;
