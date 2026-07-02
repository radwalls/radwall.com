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

  test("features a random user-made selection instead of house presets", async ({
    page
  }) => {
    const houseNames = [
      "Distant Beacon",
      "Ancient Sword Swing",
      "Reactor Cough",
      "Lock-On Ghost",
      "Old Anime Power-Up",
      "Servo Twitch"
    ];
    const userNames = [
      "Glass Orchard",
      "Rust Choir",
      "Moon Relay",
      "Broken Halo",
      "Wet Circuit",
      "Night Engine",
      "Satellite Teeth"
    ];
    const rows = [...houseNames, ...userNames].map(name => ({
      name,
      params: { mode: "rise", reverb: "bunker" },
      updated_at: "2026-07-02T00:00:00.000Z"
    }));

    await page.route(
      "https://vrahcpgciumnyqsxghxv.supabase.co/rest/v1/**",
      route =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(rows)
        })
    );
    await page.goto(synthPath, { waitUntil: "domcontentloaded" });

    const featured = page.locator("#featuredPresetRow .featured-shared-preset");
    await expect(featured).toHaveCount(6);
    const featuredNames = await featured.locator("strong").allTextContents();
    expect(featuredNames.every(name => userNames.includes(name))).toBeTruthy();
    expect(featuredNames.some(name => houseNames.includes(name))).toBeFalsy();
    await expect(featured.locator("span")).toHaveCount(0);
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

    await expect(page.locator("#exportPresets")).toHaveText(
      "download preset backup"
    );
    const backupPresentation = await page.locator("#exportPresets").evaluate(button => ({
      fontSize: parseFloat(getComputedStyle(button).fontSize),
      parentClass: button.parentElement.className,
      bottom: button.getBoundingClientRect().bottom + window.scrollY
    }));
    expect(backupPresentation.fontSize).toBeLessThanOrEqual(8);
    expect(backupPresentation.parentClass).toContain("backup-footer");
    expect(backupPresentation.bottom).toBeGreaterThan(
      await page.locator(".layout").evaluate(
        element => element.getBoundingClientRect().bottom + window.scrollY
      )
    );

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

  test("explains every sound control and offers six pitch modes", async ({
    page
  }) => {
    await page.goto(synthPath, { waitUntil: "domcontentloaded" });

    const modeOptions = page.locator("#modeSelect option");
    await expect(modeOptions).toHaveCount(6);
    await expect(modeOptions).toHaveText([
      "rise",
      "fall",
      "pulse",
      "staircase",
      "fracture",
      "orbit"
    ]);

    const controls = page.locator(".control input, .control select");
    await expect(controls).toHaveCount(17);
    const explanations = [];
    for (let index = 0; index < 17; index++) {
      await controls.nth(index).focus();
      explanations.push(await page.locator("#recipe").innerText());
    }
    expect(new Set(explanations).size).toBe(17);
    expect(explanations.every(text => text.startsWith("CONTROL //"))).toBeTruthy();
    expect(
      await page.locator(".recipe").evaluate(
        element => getComputedStyle(element, "::before").content
      )
    ).toContain("SIGNAL RECIPE / CONTROL NOTES");

    await expect(page.locator("body")).not.toContainText(
      "Tip: record a few passes"
    );
  });

  test("places a working level slider inside the reverb control", async ({
    page
  }) => {
    await page.goto(synthPath, { waitUntil: "domcontentloaded" });

    const level = page.locator("#reverbLevel");
    await expect(level).toBeVisible();
    await expect(level).toHaveValue("1");
    await expect(level).toHaveAttribute("max", "5");
    expect(
      await level.evaluate(input => ({
        previous: input.parentElement.previousElementSibling.tagName,
        next: input.parentElement.nextElementSibling.tagName
      }))
    ).toEqual({ previous: "LABEL", next: "SELECT" });

    await level.fill("0.25");
    await expect(page.locator("#v-reverbLevel")).toHaveText("25%");
    const gains = await page.evaluate(() => {
      initAudio();
      updateReverb();
      return {
        actual: reverbWet.gain.value,
        expected: getReverbSettings().wet * 0.25
      };
    });
    expect(gains.actual).toBeCloseTo(gains.expected, 5);
  });

  test("pitch-down reset preserves the selected pitch mode", async ({ page }) => {
    await page.goto(synthPath, { waitUntil: "domcontentloaded" });

    await page.locator("#modeSelect").selectOption("staircase");
    for (let press = 0; press < 4; press++) {
      await page.locator("#pitchDown").click();
    }

    await expect(page.locator("#modeSelect")).toHaveValue("staircase");
  });

  test("exports the current sound as a valid WAV file", async ({ page }) => {
    await page.goto(synthPath, { waitUntil: "domcontentloaded" });

    const crusherSamples = await page.evaluate(() => {
      const context = new OfflineAudioContext(1, 64, 44100);
      const source = context.createBuffer(1, 64, 44100);
      const input = source.getChannelData(0);
      for (let index = 0; index < input.length; index++) {
        input[index] = index / input.length;
      }
      return Array.from(
        applyBitCrusher(context, source, 0.5).getChannelData(0)
      );
    });
    expect(new Set(crusherSamples.slice(0, 19))).toEqual(new Set([0]));
    expect(crusherSamples[19]).toBeGreaterThan(0);

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await page.locator("#exportWav").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.wav$/);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const wav = Buffer.concat(chunks);
    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wav.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wav.readUInt32LE(24)).toBe(
      await page.evaluate(() => audioCtx.sampleRate)
    );
    expect(wav.length).toBeGreaterThan(44);
    await expect(page.locator("#presetStatus")).toContainText("wav ready");
  });
});
