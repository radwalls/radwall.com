const { test, expect } = require("@playwright/test");

const criticalAssets = [
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
    expect(bundlePath).toMatch(
      /^\/atrium\/assets\/index-[\w-]+\.js(?:\?v=[\w-]+)?$/
    );

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

    await expect(page.locator("#build-diagnostics")).toBeVisible();
    await expect(page.locator("#build-version")).toHaveText("ATRIUM BETA 0.7.2");
    await expect(page.locator("#fps-counter")).toHaveText(/^FPS \d+$/);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("homepage keeps Atrium hidden", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('a[href*="atrium"]')).toHaveCount(0);
  });

  test("playtest fixes are present in the deployed game bundle", async ({
    request
  }) => {
    const entry = await request.get("/atrium/");
    const html = await entry.text();
    const bundlePath = html.match(
      /src="(\/atrium\/assets\/index-[\w-]+\.js(?:\?v=[\w-]+)?)"/
    )?.[1];
    expect(bundlePath).toBeTruthy();

    const bundle = await (await request.get(bundlePath)).text();

    expect(bundle).toContain("secondAtriumFallPending");
    expect(bundle).toContain("MANUS DRAWS NIGHT OVER THE ATRIUM");
    expect(bundle).toContain("RETURN HOME AND SLEEP");
    expect(bundle).toContain("LAUNCHED");
    expect(bundle).toContain("BOUND");
    expect(bundle).toContain("SAFETY RESET");
    expect(bundle).toContain("respawnAtLastSafePosition");
    expect(bundle).toContain("burnedMovementMultiplier=.58");
    expect(bundle).toContain("burnedVisibilityVeil");
    expect(bundle).toContain("burnedAshParticle");
    expect(bundle).toContain("burnedVisibilityGradient");
    expect(bundle).not.toContain('"burnedDrawDistance"');
    expect(bundle).toContain("t?12:55");
    expect(bundle).toContain("t?.16:.035");
    expect(bundle).not.toContain('anchor("bottomleft")');
    expect(bundle).toContain("atriumStateFinalReveal");
    expect(bundle).toContain("FINAL ATRIUM STATE");
    expect(bundle).toContain("destroyAll(o),t.onComplete?.()");
    expect(bundle).not.toContain("Xy(h)");
    expect(bundle).toContain("secondAtriumFallMovieComplete");
    expect(bundle).toContain('go("dream",{source:"townShard"})');
    expect(bundle).toContain("wait(2.5,()=>tc(Y))");
    expect(bundle).not.toContain(
      'wait(.8,()=>go("dream",{source:"townShard"}))'
    );
    expect(bundle).toContain("postScaffoldHazardActive");
    expect(bundle).toContain("setupPostScaffoldHazard(x)");
    expect(bundle).toContain("postScaffoldDarkness");
    expect(bundle).toContain(
      "v.postScaffoldHazardActive=!1,v.atriumShutdownActive=!1"
    );
    expect(bundle).not.toContain(
      'wt("oldTown",{fadeOut:.15,fadeIn:.45,maxOpacity:.85})'
    );
    expect(bundle).toContain("The Bubble Board is yours. Have fun out there.");
    expect(bundle).toContain(
      "This processional... well, you would think they are celebrating."
    );
    expect(bundle).toContain("Man in the Hat");
    expect(bundle).toContain("pianoManDialogue");
    expect(bundle).not.toContain("const a=26,s=12,u=120,c=1");

    expect(bundle).not.toContain('p.onCollide("fanHaz"');
    expect(bundle).not.toContain("The spherical refractions fade with each dawn.");
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
