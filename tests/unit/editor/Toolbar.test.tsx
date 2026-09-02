import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEditor } from "@tiptap/react";
import { createExtensions } from "../../../src/editor/extensions";
import { Toolbar } from "../../../src/editor/toolbar/Toolbar";

function ToolbarHarness() {
  const editor = useEditor({ extensions: createExtensions(), content: "<p>Hello</p>" });
  return <Toolbar editor={editor} />;
}

describe("Toolbar", () => {
  it("renders grouped, labeled controls", () => {
    render(<ToolbarHarness />);
    expect(screen.getByRole("toolbar", { name: "Formatting toolbar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Insert link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editor mode" })).not.toBeInTheDocument();
  });
});
