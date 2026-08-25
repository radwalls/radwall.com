const { test, expect } = require("@playwright/test");

test.describe("Ruin Wind", () => {
  test("homepage keeps the instrument behind the transmission seam", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("body")).not.toContainText("Ruin Wind");
    const signal = page.locator(".wind-signal-link");
    await expect(signal).toBeVisible();
    await expect(signal).toHaveAttribute("href", "ruin-wind/");
    await expect(signal).toHaveAttribute("aria-label", "Open the Ruin Wind instrument");
    await expect(signal).toHaveAttribute("title", "The wind remembers");
  });

  test("four scenes load and the procedural engine starts cleanly", async ({ page, request }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });

    for (const path of [
      "/ruin-wind/",
      "/ruin-wind/styles.css",
      "/ruin-wind/wind.js",
      "/ruin-wind/wind-worklet.js"
    ]) {
      const response = await request.get(path);
      expect(response.ok(), `${path} returned ${response.status()}`).toBeTruthy();
    }

    await page.goto("/ruin-wind/");
    await expect(page).toHaveTitle(/Ruin Wind/);
    await expect(page.locator("h1")).toHaveText("Ruin Wind");
    await expect(page.locator(".scene-button")).toHaveCount(4);
    await expect(page.locator("input[type='range']")).toHaveCount(7);
    await expect(page.locator("#howl")).toBeVisible();
    await expect(page.locator("label[for='howl']")).toContainText("Howl");
    await expect(page.locator(".control-bank")).not.toContainText("Matter");
    await expect(page.locator("#windTrace")).toBeVisible();

    await page.locator('[data-scene="2"]').click();
    await expect(page.locator("#sceneName")).toHaveText("Red Coast");
    await expect(page.locator("body")).toHaveAttribute("data-scene", "2");

    await page.locator("#playButton").click();
    await expect.poll(() => page.locator("body").getAttribute("data-audio"), {
      timeout: 15_000
    }).toBe("running");
    await expect(page.locator("#playButton")).toHaveClass(/is-running/);

    await page.locator("#summonButton").click();
    await expect(page.locator("#statusMessage")).toHaveText("THE WAVE ARRIVES");

    const capture = page.locator("#captureButton");
    await capture.click();
    await expect(capture).toHaveClass(/is-recording/);
    await capture.click();
    await expect(capture).not.toHaveClass(/is-recording/, { timeout: 10_000 });
    await expect(capture).not.toBeDisabled();
    await expect(capture.locator("b")).toHaveText("CAPTURE");

    await page.locator("#playButton").click();
    await expect(page.locator("body")).toHaveAttribute("data-audio", "paused");
    expect(errors).toEqual([]);
  });

  test("removed matter engine stays absent from the interface and worklet", async ({ page, request }) => {
    await page.goto("/ruin-wind/");
    await expect(page.locator("#debris")).toHaveCount(0);

    const worklet = await request.get("/ruin-wind/wind-worklet.js");
    expect(worklet.ok()).toBeTruthy();
    expect(await worklet.text()).not.toMatch(/\b(?:debris|impact)\b/i);
  });

  test("howl uses a gust-shaped resonant wind path", async ({ request }) => {
    const worklet = await request.get("/ruin-wind/wind-worklet.js");
    expect(worklet.ok()).toBeTruthy();
    const source = await worklet.text();
    expect(source).toContain("howlEnvelope");
    expect(source).toContain("howlFrequencyA");
    expect(source).toContain("howlDelay");
  });

  test("mobile layout stays inside the viewport with touch-sized controls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ruin-wind/");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBeFalsy();

    const powerBox = await page.locator("#playButton").boundingBox();
    const firstSceneBox = await page.locator(".scene-button").first().boundingBox();
    expect(powerBox.height).toBeGreaterThanOrEqual(44);
    expect(firstSceneBox.height).toBeGreaterThanOrEqual(44);
  });
});
