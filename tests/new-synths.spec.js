const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

test.describe("new project synths", () => {
  for (const { pageName, rangeCount } of [
    { pageName: "atrium-synth.html", rangeCount: 9 },
    { pageName: "forgotten-oil-rigs-2-synth.html", rangeCount: 17 }
  ]) {
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
      await expect(page.locator("input[type='range']")).toHaveCount(rangeCount);
      await expect(page.locator(".preset")).toHaveCount(4);
      await expect(page.locator(".note")).toHaveCount(7);

      const dockPosition = await page.locator("#playDock").evaluate(element =>
        getComputedStyle(element).position
      );
      expect(dockPosition).toBe(page.viewportSize().width <= 700 ? "fixed" : "sticky");

      await page.locator("#randomButton").click();
      await page.locator("#playButton").click();
      await expect(page.locator("#playButton")).toHaveClass(/is-playing/);
      await page.waitForTimeout(450);
      await page.locator("#playButton").click();
      await expect(page.locator("#playButton")).not.toHaveClass(/is-playing/);

      const downloadPromise = page.waitForEvent("download", { timeout: 45000 });
      await page.locator("#exportButton").click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(".wav");
      const downloadPath = await download.path();
      const wav = fs.readFileSync(downloadPath);
      expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(wav.subarray(8, 12).toString("ascii")).toBe("WAVE");
      expect(wav.byteLength).toBeGreaterThan(500000);
      let sampledPeak = 0;
      for (let offset = 44; offset < wav.byteLength - 1; offset += 200) {
        sampledPeak = Math.max(sampledPeak, Math.abs(wav.readInt16LE(offset)));
      }
      expect(sampledPeak).toBeGreaterThan(300);
      expect(errors).toEqual([]);
    });
  }

  test("Atrium strikes build to an audible shatter state", async ({ page }) => {
    await page.goto("/atrium-synth.html");
    await page.locator("#fracture").evaluate(element => {
      element.value = "1";
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("#strikeButton").click();
    await page.locator("#strikeButton").click();
    await expect.poll(() => page.locator("body").getAttribute("data-shatter-count"))
      .toBe("1");
    await expect(page.locator("#readout")).toContainText("SHATTER");
    await expect(page.locator("#fractureText")).toHaveText("0%");
  });

  test("Oil Rigs arp exposes and uses a separate filter for all eight steps", async ({ page }) => {
    await page.goto("/forgotten-oil-rigs-2-synth.html");
    const stepFilters = page.locator(".step-filter");
    await expect(stepFilters).toHaveCount(8);
    await stepFilters.nth(0).fill("0.12");
    await stepFilters.nth(1).fill("0.91");
    await expect(stepFilters.nth(0)).toHaveValue("0.12");
    await expect(stepFilters.nth(1)).toHaveValue("0.91");
    await page.locator("#playButton").click();
    await expect.poll(() => page.locator("body").getAttribute("data-arp-step"))
      .not.toBeNull();
    await expect(page.locator(".step-filter-card.is-active")).toHaveCount(1);
    await page.locator("#playButton").click();
  });

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
