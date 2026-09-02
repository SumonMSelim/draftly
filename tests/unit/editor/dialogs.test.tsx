import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkDialog } from "../../../src/ui/dialogs/LinkDialog";
import { ImageDialog } from "../../../src/ui/dialogs/ImageDialog";
import { isSafeUrl } from "../../../src/utils/url";

describe("isSafeUrl", () => {
  it("allows http, https and mailto URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("http://example.com")).toBe(true);
    expect(isSafeUrl("mailto:person@example.com")).toBe(true);
  });

  it("allows relative URLs", () => {
    expect(isSafeUrl("/docs/page")).toBe(true);
  });

  it("blocks javascript: and other dangerous schemes", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });
});

describe("LinkDialog", () => {
  it("rejects unsafe URLs and does not submit", async () => {
    const onSubmit = vi.fn();
    render(<LinkDialog open onClose={() => {}} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("URL"), "javascript:alert(1)");
    await userEvent.click(screen.getByRole("button", { name: "Insert" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("submits a valid link", async () => {
    const onSubmit = vi.fn();
    render(<LinkDialog open onClose={() => {}} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("URL"), "https://example.com");
    await userEvent.click(screen.getByRole("button", { name: "Insert" }));
    expect(onSubmit).toHaveBeenCalledWith({ url: "https://example.com", text: "" });
  });
});

describe("ImageDialog", () => {
  it("renders fields and submits", async () => {
    const onSubmit = vi.fn();
    render(<ImageDialog open onClose={() => {}} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Image URL"), "https://example.com/image.png");
    await userEvent.click(screen.getByRole("button", { name: "Insert" }));
    expect(onSubmit).toHaveBeenCalledWith({ src: "https://example.com/image.png", alt: "" });
  });
});
