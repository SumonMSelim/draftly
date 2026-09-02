import { test, expect } from "@playwright/test";

test.describe("document lifecycle", () => {
  test("create, type, reload: content persists locally", async ({ page }) => {
    await page.goto("/");

    const editor = page.locator(".draftly-editor .ProseMirror");
    await expect(editor).toBeVisible();

    await editor.click();
    await page.keyboard.type("Persisted network security notes.");

    // Wait past the autosave debounce window (~750ms) so the write lands in IndexedDB.
    await page.waitForTimeout(1500);

    await page.reload();

    const editorAfterReload = page.locator(".draftly-editor .ProseMirror");
    await expect(editorAfterReload).toContainText("Persisted network security notes.");
  });

  test("export .draftly.json, delete the document, then import it back", async ({ page }) => {
    await page.goto("/");

    const editor = page.locator(".draftly-editor .ProseMirror");
    await editor.click();
    await page.keyboard.type("Round trip content.");
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: "Export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download .draftly.json" }).click();
    const download = await downloadPromise;
    const projectPath = await download.path();
    expect(projectPath).toBeTruthy();
    const projectContent = await download.createReadStream().then(
      (stream) =>
        new Promise<string>((resolve, reject) => {
          let data = "";
          stream!.on("data", (chunk) => (data += chunk));
          stream!.on("end", () => resolve(data));
          stream!.on("error", reject);
        }),
    );
    const project = JSON.parse(projectContent);
    expect(project.format).toBe("draftly");

    await page.keyboard.press("Escape");

    // Delete every document in the manager, which forces a fresh document to be created.
    const deleteButtons = page.locator('.document-manager button[aria-label^="Delete "]');
    while ((await deleteButtons.count()) > 0) {
      await deleteButtons.first().click();
    }

    await page.getByRole("button", { name: "Import" }).click();
    await page.getByLabel("Draftly project").check();
    await page.getByLabel("Choose file").setInputFiles({
      name: "roundtrip.draftly.json",
      mimeType: "application/json",
      buffer: Buffer.from(projectContent, "utf-8"),
    });
    await page.getByRole("button", { name: "Import", exact: true }).click();

    const editorAfterImport = page.locator(".draftly-editor .ProseMirror");
    await expect(editorAfterImport).toContainText("Round trip content.");
  });
});
