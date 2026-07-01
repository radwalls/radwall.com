const { test, expect } = require("@playwright/test");

const synthPath = "/grey-red-synth.html";

test.describe("Grey Red synth", () => {
  test("loads online presets from the active backend", async ({ page }) => {
    const response = await page.goto(synthPath, { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("#presetStatus")).toContainText(
      "online presets ready",
      { timeout: 15_000 }
    );
    await expect(
      page.locator('#savedPresetSelect option[value="Distant Beacon"]')
    ).toHaveCount(1);
  });

  test("preserves and migrates cached presets before replacing the cache", async ({
    page
  }) => {
    const migratedPosts = [];
    await page.addInitScript(() => {
      localStorage.setItem(
        "greyRedMachinePresets",
        JSON.stringify({
          "Local Rescue": {
            params: {
              baseFreq: 91,
              modRatio: 1.7,
              modIndex: 220,
              sweep: 4,
              sweepTime: 1,
              attack: 0.02,
              decay: 1.4,
              noise: 0.12,
              distortion: 360,
              crush: 0.3,
              filterFreq: 1100,
              resonance: 8,
              delayMix: 0.1,
              volume: 0.5,
              mode: "rise",
              reverb: "bunker"
            },
            updatedAt: "2026-07-01T00:00:00.000Z"
          }
        })
      );
    });

    await page.route("https://vrahcpgciumnyqsxghxv.supabase.co/rest/v1/**", async route => {
      if (route.request().method() === "POST") {
        migratedPosts.push(JSON.parse(route.request().postData() || "{}"));
        await route.fulfill({ status: 201, body: "" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]"
      });
    });

    await page.goto(synthPath, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#presetStatus")).toContainText("restored 1 cached");
    await expect(
      page.locator('#savedPresetSelect option[value="Local Rescue"]')
    ).toHaveCount(1);
    expect(migratedPosts).toHaveLength(1);
    expect(migratedPosts[0].name).toBe("Local Rescue");
  });

  test("scrolls normally and exposes a downloadable backup", async ({ page }) => {
    await page.goto(synthPath, { waitUntil: "domcontentloaded" });

    const pageMetrics = await page.evaluate(() => ({
      clientHeight: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight,
      overflowY: getComputedStyle(document.body).overflowY
    }));
    expect(pageMetrics.scrollHeight).toBeGreaterThan(pageMetrics.clientHeight);
    expect(pageMetrics.overflowY).not.toBe("hidden");

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    const downloadPromise = page.waitForEvent("download");
    await page.locator("#exportPresets").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^grey-red-presets-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test("uses the hardware workstation and CRT presentation", async ({ page }) => {
    await page.goto(synthPath, { waitUntil: "domcontentloaded" });

    await expect(page.locator(".machine-model")).toContainText("GR-404");
    await expect(page.locator(".status-lamps .is-on")).toHaveCount(2);
    await expect(page.locator(".meter")).toBeVisible();
    await expect(page.locator(".recipe")).toBeVisible();
    await expect(page.locator(".note")).toHaveCount(7);

    const presentation = await page.evaluate(() => ({
      statusColor: getComputedStyle(document.querySelector(".preset-status")).color,
      mainWidth: document.querySelector("main").getBoundingClientRect().width,
      viewportWidth: document.documentElement.clientWidth,
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth
    }));
    expect(presentation.statusColor).toBe("rgb(101, 255, 187)");
    expect(presentation.mainWidth).toBeLessThanOrEqual(presentation.viewportWidth);
    expect(presentation.horizontalOverflow).toBeFalsy();
  });
});
