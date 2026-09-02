import { test, expect } from "@playwright/test";

test.describe("export", () => {
  test("exports a heading and paragraph to markdown", async ({ page }) => {
    await page.goto("/");

    const editor = page.locator(".draftly-editor .ProseMirror");
    await editor.click();
    await page.getByLabel("Paragraph style").selectOption("1");
    await page.keyboard.type("Network Security");
    await page.keyboard.press("Enter");
    await page.getByLabel("Paragraph style").selectOption("0");
    await page.keyboard.type("The firewall blocks unwanted traffic.");

    await expect(page.locator(".source-preview pre code")).toContainText("# Network Security");
    await expect(page.locator(".source-preview pre code")).toContainText("The firewall blocks unwanted traffic.");
  });

  test("exports the same document to dokuwiki", async ({ page }) => {
    await page.goto("/");

    const editor = page.locator(".draftly-editor .ProseMirror");
    await editor.click();
    await page.getByLabel("Paragraph style").selectOption("1");
    await page.keyboard.type("Network Security");

    await page.getByRole("button", { name: "DokuWiki", exact: true }).click();
    await expect(page.locator(".source-preview pre code")).toContainText("====== Network Security ======");
  });
});
