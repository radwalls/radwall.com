import fs from "node:fs";

const bundlePath = new URL("../atrium/assets/index-ChedvSPu.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes("secondAtriumFallMovieComplete")) {
  console.log("Atrium labs and falling-flow hotfix is already applied.");
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
  "labs reveal safe completion",
  'const u=()=>{destroyAll(o),setCursor("default"),t.onComplete?.()};return lo("Continue",u,',
  'const u=()=>{const c=t.onComplete;c?wait(.01,c):null,setCursor("default"),destroyAll(o)};return lo("Continue",u,'
);

replaceOne(
  "labs exit transition",
  'const d=()=>{state.entry="southReturn",go("oldTown")};Xy(null,{onComplete:d})||d()',
  'const d=()=>{state.entry="southReturn",wt("oldTown",{fadeOut:.15,fadeIn:.45,maxOpacity:.85})};Xy(null,{onComplete:d})||d()'
);

replaceOne(
  "falling FMV source-aware scene",
  'scene("dream",()=>{const e=Dy();',
  'scene("dream",(e={})=>{const t=e.source==="townShard";t&&(state.secondAtriumFallMovieComplete=!1);const n=Dy();'
);

replaceOne(
  "falling FMV local variables",
  'onSceneLeave(e.cleanup);const t=add([text("Falling...",{size:48}),pos(center()),anchor("center"),opacity(0),layer("ui")]);e.ready.then(({duration:n})=>{e.play?.();const o=Number.isFinite(n)&&n>0?n:Si,r=Math.min(1,o/3),a=Math.max(r,o-r);tween(t.opacity,1,r,s=>t.opacity=s),wait(a,()=>tween(t.opacity,0,r,s=>t.opacity=s)),wait(o,()=>{Vd(),state.entry="center",state.barricadeActive=!1,go("overworld")})})});',
  'onSceneLeave(n.cleanup);const o=add([text("Falling...",{size:48}),pos(center()),anchor("center"),opacity(0),layer("ui")]);n.ready.then(({duration:r})=>{n.play?.();const a=Number.isFinite(r)&&r>0?r:Si,s=Math.min(1,a/3),u=Math.max(s,a-s);tween(o.opacity,1,s,c=>o.opacity=c),wait(u,()=>tween(o.opacity,0,s,c=>o.opacity=c)),wait(a,()=>{Vd(),state.entry="center",state.barricadeActive=!1,t&&(state.secondAtriumFallMovieComplete=!0,state.secondAtriumFallPending=!0),go("overworld")})})});'
);

replaceOne(
  "rooftop launch into FMV",
  'wait(1.15,()=>{state.secondAtriumFallPending=!0,state.entry="center",go("overworld")})',
  'wait(1.15,()=>{state.entry="center",go("dream",{source:"townShard"})})'
);

replaceOne(
  "overworld landing shutdown and lasers",
  'wi({delaySeconds:.65,closeSeconds:8,darknessOpacity:.8,atriumNodes:[R,L],onStart:()=>{state.atriumShutdownActive=!0},onClosed:()=>{const ae=add([rect(width(),height()),pos(0,0),color(255,255,255),opacity(0),fixed(),layer("ui"),z(2e3)]);tween(0,1,.75,se=>ae.opacity=se),wait(.8,()=>go("dream",{source:"townShard"}))}})',
  'wi({delaySeconds:.65,closeSeconds:8,darknessOpacity:.8,atriumNodes:[R,L],onStart:()=>{state.atriumShutdownActive=!0,state.eyeEventActive=!0,wait(2.5,()=>tc(Y))},onClosed:()=>{state.secondAtriumFallMovieComplete=!1}})'
);

fs.writeFileSync(bundlePath, source);
console.log("Fixed labs continuation and reordered the falling FMV sequence.");
