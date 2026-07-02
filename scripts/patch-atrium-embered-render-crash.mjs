import fs from "node:fs";

const bundlePath = new URL("../atrium/assets/index-ChedvSPu.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

function replaceOne(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Could not find ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Found more than one match for ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOne(
  "invalid burned draw-distance anchor",
  'anchor("bottomleft")',
  'anchor("botleft")'
);

replaceOne(
  "final Atrium state cleanup",
  'const u=()=>{setCursor("default"),t.onComplete?t.onComplete():destroyAll(o)};',
  'const u=()=>{setCursor("default"),destroyAll(o),t.onComplete?.()};'
);

fs.writeFileSync(bundlePath, source);
console.log("Fixed the Embered Dusk render crash and final-state overlay cleanup.");
