import fs from "node:fs";

const bundlePath = new URL("../atrium/assets/index-ChedvSPu.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes("burnedMovementMultiplier")) {
  if (!source.includes("burnedVisibilityVeil")) {
    source = source.replace(
      "x.burnedMovementMultiplier=.58;let C=vec2(0,0)",
      'x.burnedMovementMultiplier=.58,ir().meta.allBurned&&Ld.has(v.lastScene)&&get("burnedVisibilityVeil").length===0&&add([rect(width(),height()),pos(0,0),anchor("topleft"),color(8,6,14),opacity(.22),fixed(),layer("ui"),z(-15),"burnedVisibilityVeil"]);let C=vec2(0,0)'
    );
    source = source.replace(
      "burned:{color:[20,8,28],opacity:.62},burnedNoAtrium:{color:[34,20,24],opacity:.58}",
      "burned:{color:[20,8,28],opacity:.5},burnedNoAtrium:{color:[34,20,24],opacity:.46}"
    );
    fs.writeFileSync(bundlePath, source);
    console.log("Added the universal burned outdoor visibility veil.");
    process.exit(0);
  }
  console.log("Atrium launch safety and burned consequences are already applied.");
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
  "player safe-position initialization",
  "P=vec2(x.scale.x,x.scale.y);let C=vec2(0,0)",
  'P=vec2(x.scale.x,x.scale.y);x.lastSafePos=vec2(e.x,e.y),x.atriumForcedLaunch=!1,x.burnedMovementMultiplier=.58,ir().meta.allBurned&&Ld.has(v.lastScene)&&get("burnedVisibilityVeil").length===0&&add([rect(width(),height()),pos(0,0),anchor("topleft"),color(8,6,14),opacity(.22),fixed(),layer("ui"),z(-15),"burnedVisibilityVeil"]);let C=vec2(0,0)'
);

replaceOne(
  "burned movement penalty",
  'const mt=et&&_t()&&j,_e=et?{...i,...je?{brake:m.coastBrake??i.brake}:{},...mt?{accel:m.airAccel??i.accel,turnEase:m.airTurnEase??i.turnEase}:{}}:u;if(le?',
  'const mt=et&&_t()&&j,Qe=et?{...i,...je?{brake:m.coastBrake??i.brake}:{},...mt?{accel:m.airAccel??i.accel,turnEase:m.airTurnEase??i.turnEase}:{}}:u,_e=ir().meta.allBurned&&Ld.has(v.lastScene)?{...Qe,maxSpeed:Qe.maxSpeed*x.burnedMovementMultiplier,accel:Qe.accel*.72,decel:Qe.decel*.78}:Qe;if(le?'
);

replaceOne(
  "player safe-position tracking and recovery",
  'const sn=Ve(_e.scaleEase*B,0,1);x.scale=qo(x.scale,ut,sn)}),x.isSkateJumping=',
  'const sn=Ve(_e.scaleEase*B,0,1);x.scale=qo(x.scale,ut,sn),!x.atriumForcedLaunch&&t(x.pos.x,x.pos.y,x)&&(x.lastSafePos=vec2(x.pos.x,x.pos.y))}),x.isPositionSafe=B=>!!B&&Number.isFinite(B.x)&&Number.isFinite(B.y)&&t(B.x,B.y,x),x.respawnAtLastSafePosition=()=>{const B=x.lastSafePos??e;x.pos=vec2(B.x,B.y),C=vec2(0,0),x.atriumForcedLaunch=!1,x.setControlsEnabled?.(!0),shake(3)},x.isSkateJumping='
);

replaceOne(
  "burned outdoor visibility",
  "burned:{color:[70,18,80],opacity:.32},burnedNoAtrium:{color:[150,60,68],opacity:.18}",
  "burned:{color:[20,8,28],opacity:.5},burnedNoAtrium:{color:[34,20,24],opacity:.46}"
);

const darkSpriteStart = source.indexOf("function Fy(){");
const releasedCreatureSpawner = source.indexOf("function ul(e={})", darkSpriteStart);
if (darkSpriteStart < 0 || releasedCreatureSpawner < 0) {
  throw new Error("Could not locate Dark Sprite behavior");
}

const darkSpriteBehavior =
  `function Fy(){return{onSpawn(e){e.creatureState.launchCooldown=0,e.creatureState.launch=null},onUpdate(e){e.creatureState.launchCooldown=Math.max(0,(e.creatureState.launchCooldown??0)-dt());const t=e.creatureState.launch;if(!t)return;const n=t.player;if(!n||typeof n.exists=="function"&&!n.exists()){e.creatureState.launch=null;return}const o=n.pos.add(t.direction.scale(t.speed*dt())),r=Number.isFinite(o.x)&&Number.isFinite(o.y)&&Math.abs(o.x)<width()*4&&Math.abs(o.y)<height()*4&&n.isPositionSafe?.(o)!==!1;if(!r){n.respawnAtLastSafePosition?.(),n.atriumForcedLaunch=!1,n.setControlsEnabled?.(!0),e.creatureState.launch=null;const a=add([text("SAFETY RESET",{size:13}),pos(n.pos.add(vec2(0,-25))),anchor("center"),color(255,220,150),opacity(1),z(40),{life:0},"releasedCreatureFX"]);a.onUpdate(()=>{a.life+=dt(),a.pos.y-=12*dt(),a.opacity=Math.max(0,1-a.life/1.2),a.life>=1.2&&destroy(a)});return}n.pos=o,t.remaining-=dt(),t.remaining<=0&&(n.atriumForcedLaunch=!1,n.setControlsEnabled?.(!0),e.creatureState.launch=null)},onPlayerTouch(e,t){if(!t||e.creatureState.launchCooldown>0||e.creatureState.launch)return;const n=Math.max(0,Number(v.blame?.laserHits)||0);let o=t.pos.sub(e.pos);o.len()<.01&&(o=vec2(1,0)),o=o.unit(),e.creatureState.launchCooldown=5,e.creatureState.launch={player:t,direction:o,speed:Math.min(320,140+n*45),remaining:.6},t.atriumForcedLaunch=!0,t.setControlsEnabled?.(!1),Sy(t.pos,t,{beamWidth:5,hitRadius:18,strikeSeconds:.45});const r=add([text("LAUNCHED",{size:13}),pos(t.pos.add(vec2(0,-25))),anchor("center"),color(120,255,155),opacity(1),z(40),{life:0},"releasedCreatureFX"]);r.onUpdate(()=>{r.life+=dt(),r.pos.y-=14*dt(),r.opacity=Math.max(0,1-r.life),r.life>=1&&destroy(r)})},onIdleStart(e){e.creatureState.idleTime=0},onIdleUpdate(e){e.creatureState.idleTime+=dt();const t=.25+Math.sin(e.creatureState.idleTime*3.4)*.2;e.opacity=Dn(t,.3,.85)},onIdleEnd(e){e.opacity=.9},onDestroy(e){const t=e.creatureState.launch?.player;t&&(t.atriumForcedLaunch=!1,t.setControlsEnabled?.(!0))}}}`;

source =
  source.slice(0, darkSpriteStart) +
  darkSpriteBehavior +
  source.slice(releasedCreatureSpawner);

fs.writeFileSync(bundlePath, source);
console.log("Applied Atrium launch safety and burned consequences.");
