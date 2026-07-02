import fs from "node:fs";

const bundlePath = new URL("../atrium/assets/index-ChedvSPu.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes("atriumStateFinalReveal")) {
  console.log("Atrium ash atmosphere and final labs reveal are already applied.");
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
  "burned atmosphere setup call",
  'ir().meta.allBurned&&Ld.has(v.lastScene)&&get("burnedVisibilityVeil").length===0&&add([rect(width(),height()),pos(0,0),anchor("topleft"),color(8,6,14),opacity(.22),fixed(),layer("ui"),z(-15),"burnedVisibilityVeil"]);let C=vec2(0,0)',
  "setupBurnedAtmosphere();let C=vec2(0,0)"
);

replaceOne(
  "burned atmosphere implementation",
  "const Ay={day:{color:[0,0,0],opacity:0}",
  `function setupBurnedAtmosphere(){if(!ir().meta.allBurned||!Ld.has(v.lastScene)||get("burnedAtmosphereController").length>0)return;const e=width(),t=height(),n=e*.24,o=t*.2,r="burnedDrawDistance";add([rect(e,t),pos(0,0),anchor("topleft"),color(8,6,14),opacity(.2),fixed(),layer("ui"),z(-16),"burnedVisibilityVeil"]),add([rect(n,t),pos(0,0),anchor("topleft"),color(3,3,6),opacity(.72),fixed(),layer("ui"),z(-14),r]),add([rect(n,t),pos(e,0),anchor("topright"),color(3,3,6),opacity(.72),fixed(),layer("ui"),z(-14),r]),add([rect(e-n*2,o),pos(n,0),anchor("topleft"),color(4,4,7),opacity(.62),fixed(),layer("ui"),z(-14),r]),add([rect(e-n*2,o),pos(n,t),anchor("bottomleft"),color(4,4,7),opacity(.62),fixed(),layer("ui"),z(-14),r]);const a=(s=!1)=>{const u=add([rect(rand(2,8),rand(1,3),{radius:1}),pos(s?rand(-80,e):rand(-100,0),rand(-40,t)),anchor("center"),rotate(rand(-20,20)),color(rand(125,190),rand(112,165),rand(105,145)),opacity(rand(.35,.78)),fixed(),layer("ui"),z(-12),"burnedAshParticle",{vx:rand(170,360),vy:rand(22,95),life:rand(3.5,7),age:s?rand(0,3):0,wobble:rand(1.5,4),phase:rand(0,Math.PI*2)}]);s&&(u.pos.x=rand(-80,e),u.pos.y=rand(-40,t)),u.onUpdate(()=>{u.age+=dt(),u.pos.x+=u.vx*dt(),u.pos.y+=(u.vy+Math.sin(time()*u.wobble+u.phase)*18)*dt(),u.angle+=45*dt(),u.opacity=Math.max(0,Math.min(.78,(1-u.age/u.life)*.9)),(u.age>=u.life||u.pos.x>e+120||u.pos.y>t+100)&&destroy(u)})};for(let s=0;s<55;s++)a(!0);const i=add([pos(0,0),fixed(),"burnedAtmosphereController"]);i.windLoop=loop(.035,()=>a()),i.onDestroy(()=>i.windLoop?.cancel?.())}const Ay={day:{color:[0,0,0],opacity:0}`
);

const oldRevealStart = source.indexOf("function Xy(e,t={}){");
const labsSceneStart = source.indexOf('scene("labsDecision"', oldRevealStart);
if (oldRevealStart < 0 || labsSceneStart < 0) {
  throw new Error("Could not locate Atrium state reveal");
}

const finalReveal =
  `function Xy(e,t={}){const n=ir();if(!n)return!1;const o="atriumStateFinalReveal",r=Math.min(960,width()-80),a=Math.min(720,height()-70),s=center();destroyAll(o),add([rect(width(),height()),pos(0,0),anchor("topleft"),color(3,4,10),opacity(.9),fixed(),layer("ui"),z(1600),area(),o]),add([rect(r,a,{radius:22}),pos(s),anchor("center"),color(16,18,30),opacity(.98),outline(5,rgb(150,160,195)),fixed(),layer("ui"),z(1601),o]),add([text("FINAL ATRIUM STATE",{size:30,align:"center"}),pos(s.x,s.y-a/2+42),anchor("center"),color(255,230,185),fixed(),layer("ui"),z(1602),o]),add([sprite(n.sprite,{width:Math.min(620,r-100),height:Math.min(350,a-280)}),pos(s.x,s.y-55),anchor("center"),fixed(),layer("ui"),z(1602),o]),add([text(n.title,{size:27,width:r-100,align:"center"}),pos(s.x,s.y+a/2-165),anchor("center"),color(235,240,255),fixed(),layer("ui"),z(1602),o]),add([text(n.description,{size:18,width:r-130,align:"center",lineSpacing:6}),pos(s.x,s.y+a/2-112),anchor("center"),color(205,212,230),fixed(),layer("ui"),z(1602),o]);const u=()=>{destroyAll(o),setCursor("default"),t.onComplete?.()};return lo("Continue",u,{pos:vec2(s.x,s.y+a/2-38),width:220,height:48,textSize:22,z:1603,tag:o}),!0}`;

source =
  source.slice(0, oldRevealStart) +
  finalReveal +
  source.slice(labsSceneStart);

replaceOne(
  "labs reveal guard",
  "let n=0,o=null;function r(i)",
  "let n=0,o=null,P=!1;function r(i)"
);

replaceOne(
  "per-creature Atrium state reveal",
  "function u(i){const d=t[n].stateKey,h=ir().key;state.labs[d]=i,lr(),Xy(h);",
  "function u(i){const d=t[n].stateKey;state.labs[d]=i,lr();"
);

const oldCompletion =
  'function c(){if(t.every(d=>state.labs[d.stateKey]!==null)){if(hl(),!state.labs.shardGiven){state.labs.shardGiven=!0,state.haveOldShard=!0,typeof addItem=="function"&&addItem("shard-old","Atrium Shard","shard-oldtown","A cracked fragment from the labs, it seems the cell holder owned this piece. Could it be possible he extracted it from those monsters? Or from another?");const d=add([rect(width(),height()),pos(0,0),color(255,255,255),opacity(0),fixed(),layer("ui")]);tween(0,.8,.25,h=>d.opacity=h),wait(.28,()=>tween(.8,0,.35,h=>d.opacity=h))}wait(.7,()=>{state.entry="southReturn",go("oldTown")})}}';
const newCompletion =
  'function c(){if(!P&&t.every(d=>state.labs[d.stateKey]!==null)){P=!0,hl();if(!state.labs.shardGiven){state.labs.shardGiven=!0,state.haveOldShard=!0,typeof addItem=="function"&&addItem("shard-old","Atrium Shard","shard-oldtown","A cracked fragment from the labs, it seems the cell holder owned this piece. Could it be possible he extracted it from those monsters? Or from another?")}const d=()=>{state.entry="southReturn",go("oldTown")};Xy(null,{onComplete:d})||d()}}';
replaceOne("final labs completion reveal", oldCompletion, newCompletion);

fs.writeFileSync(bundlePath, source);
console.log("Applied ash wind, reduced draw distance, and final labs state reveal.");
