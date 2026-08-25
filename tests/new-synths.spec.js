const { test, expect } = require("@playwright/test");

test.describe("new project synths", () => {
  for (const pageName of ["atrium-synth.html", "forgotten-oil-rigs-2-synth.html"]) {
    test(`${pageName} loads controls and can start`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      await page.goto(`/${pageName}`);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("#playButton")).toBeVisible();
      await expect(page.locator("#exportButton")).toBeVisible();
      await expect(page.locator("canvas")).toBeVisible();
      await expect(page.locator("input[type='range']")).toHaveCount(9);
      await expect(page.locator(".preset")).toHaveCount(4);
      await page.locator("#randomButton").click();
      await page.locator("#playButton").click();
      await page.waitForTimeout(250);
      await page.locator("#playButton").click();
      const downloadPromise = page.waitForEvent("download", { timeout: 20000 });
      await page.locator("#exportButton").click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(".wav");
      expect(errors).toEqual([]);
    });
  }

  test("homepage hides each instrument behind its matching album artwork", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toContainText("Atrium Synth");
    await expect(page.locator("body")).not.toContainText("Oil Rigs 2 Synth");

    await page.locator(".album[onclick*=\"openAlbumPage('album4'\"]").click();
    const atriumLink = page.locator("#album4 .secret-signal-link");
    await expect(atriumLink).toBeVisible();
    await expect(atriumLink).toHaveAttribute("href", "atrium-synth.html");
    await expect(atriumLink).toHaveAttribute("aria-label", "Open the Atrium sound instrument");
    await expect(atriumLink).toHaveAttribute("title", "A faint Atrium signal");
    await expect(page.locator("#album5 .secret-signal-link")).not.toBeVisible();
    await page.locator("#album4 .back-button").click();

    await page.locator(".album[onclick*=\"openAlbumPage('album5'\"]").click();
    const oilRigsLink = page.locator("#album5 .secret-signal-link");
    await expect(oilRigsLink).toBeVisible();
    await expect(oilRigsLink).toHaveAttribute("href", "forgotten-oil-rigs-2-synth.html");
    await expect(oilRigsLink).toHaveAttribute("aria-label", "Open the Eternal Sands sound instrument");
    await expect(oilRigsLink).toHaveAttribute("title", "A signal under the sand");
    await expect(page.locator("#album4 .secret-signal-link")).not.toBeVisible();
  });

  test("secret album buttons navigate to the matching instrument", async ({ page }) => {
    await page.goto("/");
    await page.locator(".album[onclick*=\"openAlbumPage('album4'\"]").click();
    await page.locator("#album4 .secret-signal-link").click();
    await expect(page).toHaveURL(/\/atrium-synth\.html$/);

    await page.goto("/");
    await page.locator(".album[onclick*=\"openAlbumPage('album5'\"]").click();
    await page.locator("#album5 .secret-signal-link").click();
    await expect(page).toHaveURL(/\/forgotten-oil-rigs-2-synth\.html$/);
  });
});
