const { test, expect } = require("@playwright/test");

const criticalAssets = [
  "/atrium/audio/Atrium_stereo_1mb.mp3",
  "/atrium/sprites/char.png",
  "/atrium/sprites/atrium_state_day.png",
  "/atrium/videos/atriumkaplay_cropped.mp4"
];

test.describe("Atrium deployment", () => {
  test("all public Atrium entry URLs resolve", async ({ request }) => {
    for (const path of ["/atrium", "/atrium/", "/atrium/index.html"]) {
      const response = await request.get(path);
      expect(response.ok(), `${path} returned ${response.status()}`).toBeTruthy();
      await expect(response.text()).resolves.toContain("<title>The Atrium</title>");
    }
  });

  test("entry point, generated bundle, and critical assets load", async ({
    page,
    request
  }) => {
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", error => pageErrors.push(error.message));

    const response = await page.goto("/atrium/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle("The Atrium");

    const bundlePath = await page
      .locator('script[type="module"]')
      .getAttribute("src");
    expect(bundlePath).toMatch(/^\/atrium\/assets\/index-[\w-]+\.js$/);

    const preloadPath = await page
      .locator('link[rel="preload"][as="audio"]')
      .getAttribute("href");
    expect(preloadPath).toBe("/atrium/audio/Atrium_stereo_1mb.mp3");

    for (const path of [bundlePath, preloadPath, ...criticalAssets]) {
      const assetResponse = await request.get(path);
      expect(
        assetResponse.ok(),
        `${path} returned ${assetResponse.status()}`
      ).toBeTruthy();
      expect((await assetResponse.body()).byteLength).toBeGreaterThan(0);
    }

    const canvas = page.locator("canvas");
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toBeVisible();
    await expect
      .poll(() => canvas.evaluate(element => element.width > 0 && element.height > 0))
      .toBeTruthy();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("homepage keeps Atrium hidden", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('a[href*="atrium"]')).toHaveCount(0);
  });
});

test.describe("Atrium portrait guard", () => {
  test.skip(({ isMobile }) => !isMobile, "Mobile project only");

  test("asks mobile visitors to rotate without horizontal overflow", async ({
    page
  }) => {
    const response = await page.goto("/atrium/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const guard = page.locator("#landscape-guard");
    await expect(guard).toBeVisible();
    await expect(
      guard.getByRole("button", { name: "Play in landscape" })
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBeFalsy();
  });
});
