import { test, expect } from "@playwright/test";

test.describe("import", () => {
  test("imports a markdown document into the editor", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Import" }).click();
    await page.getByLabel("Markdown", { exact: true }).check();
    await page.getByLabel("Choose file").setInputFiles({
      name: "notes.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# Imported Heading\n\nImported paragraph text.\n", "utf-8"),
    });
    await page.getByRole("button", { name: "Import", exact: true }).click();

    const editor = page.locator(".draftly-editor .ProseMirror");
    await expect(editor.locator("h1")).toHaveText("Imported Heading");
    await expect(editor).toContainText("Imported paragraph text.");
  });

  test("imports a dokuwiki document into the editor", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Import" }).click();
    await page.getByLabel("DokuWiki", { exact: true }).check();
    await page.getByLabel("Choose file").setInputFiles({
      name: "notes.dokuwiki",
      mimeType: "text/plain",
      buffer: Buffer.from("====== Imported DokuWiki ======\n\nDokuwiki paragraph text.\n", "utf-8"),
    });
    await page.getByRole("button", { name: "Import", exact: true }).click();

    const editor = page.locator(".draftly-editor .ProseMirror");
    await expect(editor.locator("h1")).toHaveText("Imported DokuWiki");
    await expect(editor).toContainText("Dokuwiki paragraph text.");
  });
});
