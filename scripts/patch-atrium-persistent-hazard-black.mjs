import fs from "node:fs";

const bundlePath = new URL("../atrium/assets/index-ChedvSPu.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes("postScaffoldHazardActive")) {
  console.log("Atrium persistent hazard and Embered Dusk hotfix is already applied.");
  process.exit(0);
}

function replaceOne(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Could not find ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Found more than one match for ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOne(
  "labs reveal direct continuation",
  'const u=()=>{const c=t.onComplete;c?wait(.01,c):null,setCursor("default"),destroyAll(o)};return lo("Continue",u,',
  'const u=()=>{setCursor("default"),t.onComplete?t.onComplete():destroyAll(o)};return lo("Continue",u,'
);

replaceOne(
  "labs direct scene exit",
  'const d=()=>{state.entry="southReturn",wt("oldTown",{fadeOut:.15,fadeIn:.45,maxOpacity:.85})};Xy(null,{onComplete:d})||d()',
  'const d=()=>{state.entry="southReturn",go("oldTown")};Xy(null,{onComplete:d})||d()'
);

replaceOne(
  "playable Embered Dusk tint",
  "burned:{color:[20,8,28],opacity:.5},burnedNoAtrium:{color:[34,20,24],opacity:.46}",
  "burned:{color:[82,58,50],opacity:.3},burnedNoAtrium:{color:[72,58,52],opacity:.3}"
);

replaceOne(
  "playable ash visibility center",
  'color(8,6,14),opacity(.2),fixed(),layer("ui"),z(-16),"burnedVisibilityVeil"',
  'color(92,80,70),opacity(.12),fixed(),layer("ui"),z(-16),"burnedVisibilityVeil"'
);

replaceOne(
  "playable horizontal draw distance",
  'color(3,3,6),opacity(.72),fixed(),layer("ui"),z(-14),r]),add([rect(n,t),pos(e,0),anchor("topright"),color(3,3,6),opacity(.72)',
  'color(8,7,8),opacity(.62),fixed(),layer("ui"),z(-14),r]),add([rect(n,t),pos(e,0),anchor("topright"),color(8,7,8),opacity(.62)'
);

replaceOne(
  "playable vertical draw distance",
  'color(4,4,7),opacity(.62),fixed(),layer("ui"),z(-14),r]),add([rect(e-n*2,o),pos(n,t),anchor("bottomleft"),color(4,4,7),opacity(.62)',
  'color(10,9,10),opacity(.52),fixed(),layer("ui"),z(-14),r]),add([rect(e-n*2,o),pos(n,t),anchor("botleft"),color(10,9,10),opacity(.52)'
);

replaceOne(
  "outside scene coverage",
  'const Ld=new Set(["overworld","oldTown","townCircle","galiah","scaffold","atriumWalk","stationGateScene","redcoaststation"])',
  'const Ld=new Set(["overworld","oldTown","townCircle","galiah","scaffold","atriumWalk","stationGateScene","redcoaststation","monorailEmergencyStop","atriumLiftOff","tombSecretSemicircle"])'
);

replaceOne(
  "persistent outside hazard setup",
  "setupBurnedAtmosphere();let C=vec2(0,0)",
  "setupBurnedAtmosphere(),setupPostScaffoldHazard(x);let C=vec2(0,0)"
);

replaceOne(
  "persistent hazard implementation",
  "function setupBurnedAtmosphere(){",
  'function setupPostScaffoldHazard(e){if(!state.postScaffoldHazardActive||!Ld.has(v.lastScene))return;state.eyeEventActive=!0,state.atriumShutdownActive=!0,get("postScaffoldDarkness").length===0&&add([rect(width(),height()),pos(0,0),anchor("topleft"),color(5,6,12),opacity(.46),fixed(),layer("ui"),z(-17),"postScaffoldDarkness"]),tc(e,{minInterval:2.4,maxInterval:3.8,warningSeconds:.85,strikeSeconds:.4,hitRadius:13,beamWidth:4.5})}function setupBurnedAtmosphere(){'
);

replaceOne(
  "activate persistent hazard after landing",
  "state.atriumShutdownActive=!0,state.eyeEventActive=!0,wait(2.5,()=>tc(Y))",
  "state.atriumShutdownActive=!0,state.eyeEventActive=!0,state.postScaffoldHazardActive=!0,wait(2.5,()=>tc(Y))"
);

replaceOne(
  "avoid duplicate overworld lasers",
  'else state.atriumShutdownActive&&state.eyeEventActive&&wi({closeSeconds:.01',
  'else state.atriumShutdownActive&&state.eyeEventActive&&!state.postScaffoldHazardActive&&wi({closeSeconds:.01'
);

replaceOne(
  "clear persistent hazard on sleep",
  'action:()=>{if(v.manusNightLock=!1,destroyAll("fallOverlay"),v.darknessActive=!1,c(),v.day===1)',
  'action:()=>{if(v.postScaffoldHazardActive=!1,v.atriumShutdownActive=!1,v.eyeEventActive=!1,v.manusNightLock=!1,destroyAll("fallOverlay"),v.darknessActive=!1,c(),v.day===1)'
);

fs.writeFileSync(bundlePath, source);
console.log("Fixed Embered Dusk visibility and persisted outside darkness/lasers until sleep.");
