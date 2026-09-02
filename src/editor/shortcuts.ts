import { Extension } from "@tiptap/core";

/**
 * Keyboard shortcuts (spec §38). Bold/Italic/Underline/Undo/Redo are
 * already provided by the corresponding Tiptap node/mark extensions
 * (Mod-b, Mod-i, Mod-u, Mod-z, Mod-Shift-z / Mod-y); this extension adds
 * the one Draftly-specific binding: Mod-k to open the link dialog.
 */
export function createLinkShortcutExtension(onOpenLinkDialog: () => void) {
  return Extension.create({
    name: "linkShortcut",
    addKeyboardShortcuts() {
      return {
        "Mod-k": () => {
          onOpenLinkDialog();
          return true;
        },
      };
    },
  });
}

export const SHORTCUT_DESCRIPTIONS = [
  { keys: "Mod-b", action: "Bold" },
  { keys: "Mod-i", action: "Italic" },
  { keys: "Mod-u", action: "Underline" },
  { keys: "Mod-z", action: "Undo" },
  { keys: "Mod-Shift-z", action: "Redo" },
  { keys: "Mod-k", action: "Insert link" },
] as const;
