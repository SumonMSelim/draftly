import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "../../../src/ui/components/Dialog";
import { ThemeProvider, useTheme } from "../../../src/app/providers/ThemeProvider";

describe("Dialog", () => {
  it("renders with aria-modal and a focus trap", () => {
    render(
      <Dialog open title="Test dialog" onClose={() => {}}>
        <button>First</button>
        <button>Second</button>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Test dialog" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Test dialog" onClose={onClose}>
        <button>Only button</button>
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    render(
      <Dialog open={false} title="Hidden" onClose={() => {}}>
        <button>Hidden button</button>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

function ThemeConsumer() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme("dark")}>Use dark</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("defaults to system and lets the user override it", async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("system");

    await userEvent.click(screen.getByRole("button", { name: "Use dark" }));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });
});
