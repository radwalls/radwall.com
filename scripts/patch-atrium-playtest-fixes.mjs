import fs from "node:fs";

const bundlePath = new URL("../atrium/assets/index-ChedvSPu.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes("secondAtriumFallPending")) {
  const brokenDarkSprite =
    'onDestroy(e){const t=e.creatureState.launch?.player;t&&t.setControlsEnabled?.(!0)}}function ul(e={})';
  if (source.includes(brokenDarkSprite)) {
    source = source.replace(
      brokenDarkSprite,
      'onDestroy(e){const t=e.creatureState.launch?.player;t&&t.setControlsEnabled?.(!0)}}}function ul(e={})'
    );
    fs.writeFileSync(bundlePath, source);
    console.log("Repaired Dark Sprite behavior closure.");
    process.exit(0);
  }
  const verboseBubbleReward =
    'const Ue=we($),De=[];X?De.push(\'"The tomb key is yours."\'):De.push(`You share ${te} more bubble gum.`),$>=Qn&&De.push(Ue),ke&&(xe(),ge(),ye(s.pos),De.push(\'"The Bubble Board is yours. Have fun out there."\')),j(De)';
  if (source.includes(verboseBubbleReward)) {
    source = source.replace(
      verboseBubbleReward,
      'const Ue=we($),De=[];ke?(xe(),ge(),ye(s.pos),De.push(\'"The Bubble Board is yours. Have fun out there."\')):(X?De.push(\'"The tomb key is yours."\'):De.push(`You share ${te} more bubble gum.`),$>=Qn&&De.push(Ue)),j(De)'
    );
    fs.writeFileSync(bundlePath, source);
    console.log("Tightened Bubble Board reward dialogue.");
    process.exit(0);
  }
  const clippedPianoDialogue =
    'const a=28,s=8,u=46,c=6;let i=[];function d(h,l){const p=Math.round(a*.6),g=Math.max(280,Math.min(900,h.length*p)),m=Math.ceil(a*1.9);';
  if (source.includes(clippedPianoDialogue)) {
    source = source.replace(
      clippedPianoDialogue,
      'const a=26,s=12,u=120,c=1;let i=[];function d(h,l){const p=Math.round(a*.58),g=Math.max(380,Math.min(900,h.length*p)),m=Math.max(Math.ceil(a*2.2),Math.ceil(h.length/44)*38+24);'
    );
    source = source.replace(
      'M=add([text(h,{size:a}),pos(f,y),anchor("center"),color(240,240,255),layer("ui"),opacity(1),{t:0}])',
      'M=add([text(h,{size:a,width:g-36,align:"center",lineSpacing:6}),pos(f,y),anchor("center"),color(240,240,255),layer("ui"),opacity(1),{t:0}])'
    );
    fs.writeFileSync(bundlePath, source);
    console.log("Expanded and wrapped pre-labs dialogue.");
    process.exit(0);
  }
  console.log("Atrium playtest fixes are already applied.");
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

function replacePattern(label, pattern, after) {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Expected one match for ${label}, found ${matches.length}`);
  }
  source = source.replace(pattern, after);
}

replaceOne(
  "Manus story lock",
  'function sr(e){if(state.hour>=24)return 0;',
  'function sr(e){if(state.manusNightLock||state.hour>=24)return 0;'
);

replaceOne(
  "Manus sleep release",
  'action:()=>{if(destroyAll("fallOverlay"),v.darknessActive=!1,c(),v.day===1)',
  'action:()=>{if(v.manusNightLock=!1,destroyAll("fallOverlay"),v.darknessActive=!1,c(),v.day===1)'
);

replaceOne(
  "parade panic exit",
  'function g(){state.paradeActive=!1,state.paradeLoop&&(state.paradeLoop.cancel(),state.paradeLoop=null),destroyAll("parade")}',
  'function g(){state.paradeActive=!1,state.paradeLoop&&(state.paradeLoop.cancel(),state.paradeLoop=null),get("parade").forEach(H=>{const ae=H.pos.x<n?-1:1;H.panicTime=0;add([text("!",{size:18}),pos(H.pos.add(vec2(0,-18))),anchor("center"),color(255,210,120),opacity(1),z(8),{life:0},`paradePanic`]).onUpdate(function(){this.life+=dt(),this.pos.y-=18*dt(),this.opacity=Math.max(0,1-this.life/.7),this.life>=.7&&destroy(this)}),H.onUpdate(()=>{H.panicTime+=dt(),H.move(ae*120,-35),H.opacity=Math.max(0,1-H.panicTime/1.1),H.panicTime>=1.1&&destroy(H)})})}'
);

replaceOne(
  "man in the hat dialogue",
  'const H=["This processional... well, you would think they are celebrating. But they are mourning.","That road they are walking goes to Galiah\'s Tomb. She was a young girl who passed away many years ago.","This Atrium... it feels fresh inside, yet fragile...","I think you\'re late to work.","...","..."];let ae=0;const se=add([rect(780,230,{radius:18}),pos(center().x,height()-170),anchor("center"),color(28,26,48),opacity(.92),fixed(),layer("ui"),z(1200),area(),"suitedManDialogue"]),ze=add([text("",{size:26,width:680,align:"left"}),pos(center().x-330,height()-230),anchor("topleft"),color(245,240,255),fixed(),layer("ui"),z(1201),"suitedManDialogue"])',
  'const H=["This procession looks like a celebration.","But they are mourning.","The road leads to Galiah\'s Tomb.","She was a young girl who died many years ago.","The Atrium feels fresh inside...","...yet fragile.","I think you\'re late to work.","..."];let ae=0;const se=add([rect(860,280,{radius:18}),pos(center().x,height()-190),anchor("center"),color(28,26,48),opacity(.92),fixed(),layer("ui"),z(1200),area(),"suitedManDialogue"]),ze=add([text("",{size:24,width:760,align:"left",lineSpacing:8}),pos(center().x-380,height()-275),anchor("topleft"),color(245,240,255),fixed(),layer("ui"),z(1201),"suitedManDialogue"])'
);

replaceOne(
  "released creature proximity hooks",
  'h.onUpdate(()=>{if(!jd()){destroy(h);return}if(g&&(m.enterCooldown=Math.max(0,m.enterCooldown-dt()),V()))return;',
  'h.onUpdate(()=>{if(!jd()){destroy(h);return}const Q=t?.();l?.onUpdate?.(h,Q,{walker:p,roam:m,def:e}),Q&&h.pos.dist(Q.pos)<=(e.touchRadius??18)&&l?.onPlayerTouch?.(h,Q,{walker:p,roam:m,def:e}),Q&&h.pos.dist(Q.pos)<=(e.detectRadius??72)&&l?.onPlayerDetect?.(h,Q,{walker:p,roam:m,def:e});if(g&&(m.enterCooldown=Math.max(0,m.enterCooldown-dt()),V()))return;'
);

const valveheartStart = source.indexOf("function qy(e){");
const manusStart = source.indexOf("function Hy(){", valveheartStart);
if (valveheartStart < 0 || manusStart < 0) throw new Error("Could not locate Valveheart behavior");
source =
  source.slice(0, valveheartStart) +
  `function qy(e){return{onSpawn(t){t.creatureState.bindCooldown=0},onUpdate(t){t.creatureState.bindCooldown=Math.max(0,(t.creatureState.bindCooldown??0)-dt())},onPlayerDetect(t,n){if(!n||t.creatureState.bindCooldown>0||n.atriumBound)return;t.creatureState.bindCooldown=6,n.atriumBound=!0,n.setControlsEnabled?.(!1);const o=add([circle(18),pos(n.pos),anchor("center"),outline(3,rgb(180,40,60)),opacity(.9),z(30),"releasedCreatureFX"]),r=add([text("BOUND",{size:12}),pos(n.pos.add(vec2(0,-24))),anchor("center"),color(255,130,145),z(31),"releasedCreatureFX"]);o.onUpdate(()=>{o.pos=n.pos,o.angle=(o.angle??0)+180*dt()}),r.onUpdate(()=>{r.pos=n.pos.add(vec2(0,-24))}),wait(1.6,()=>{n.atriumBound=!1,(typeof n.exists!="function"||n.exists())&&n.setControlsEnabled?.(!0),destroy(o),destroy(r)})},onIdleStart(t){const n=typeof e=="function"?e():null;if(n){const r=n.pos.x-t.pos.x;Math.abs(r)>2&&(t.scale.x=Math.abs(t.scale.x)*(r<0?-1:1))}const o=add([text("ðŸ‘",{size:14}),pos(t.pos.add(vec2(0,-24))),anchor("center"),z(t.z+1),"releasedCreatureFX"]);t.creatureState.marker=o},onIdleUpdate(t){const n=t.creatureState?.marker;n&&(n.pos=t.pos.add(vec2(0,-24)))},onIdleEnd(t){const n=t.creatureState?.marker;n&&destroy(n),t.creatureState.marker=null},onDestroy(t){const n=t.creatureState?.marker;n&&destroy(n)}}}` +
  source.slice(manusStart);

const newManusStart = source.indexOf("function Hy(){", valveheartStart);
const spriteStart = source.indexOf("function Fy(){", newManusStart);
if (newManusStart < 0 || spriteStart < 0) throw new Error("Could not locate Manus behavior");
source =
  source.slice(0, newManusStart) +
  `function Hy(){return{onSpawn(e){e.creatureState.nightCooldown=0},onUpdate(e){e.creatureState.nightCooldown=Math.max(0,(e.creatureState.nightCooldown??0)-dt())},onPlayerDetect(e,t){if(!t||e.creatureState.nightCooldown>0||v.manusNightLock)return;e.creatureState.nightCooldown=12,v.manusNightLock=!0,v.hour=24;const n=add([rect(width(),height()),pos(0,0),anchor("topleft"),color(4,8,24),opacity(0),fixed(),layer("ui"),z(1150),"manusNight"]),o=add([text("MANUS DRAWS NIGHT OVER THE ATRIUM\\nRETURN HOME AND SLEEP",{size:24,width:620,align:"center"}),pos(center()),anchor("center"),color(155,185,255),opacity(0),fixed(),layer("ui"),z(1151),"manusNight"]);tween(0,.72,1.1,r=>n.opacity=r),tween(0,1,.5,r=>o.opacity=r),wait(3.2,()=>{tween(1,0,.8,r=>o.opacity=r),wait(.85,()=>destroy(o))})},onIdleStart(e){e.creatureState.idleTime=0,e.creatureState.baseAngle=e.angle??0},onIdleUpdate(e){e.creatureState.idleTime+=dt();const t=Math.sin(e.creatureState.idleTime*2.2)*6;e.angle=e.creatureState.baseAngle+t},onIdleEnd(e){e.angle=e.creatureState.baseAngle??0}}}` +
  source.slice(spriteStart);

const newSpriteStart = source.indexOf("function Fy(){", newManusStart);
const ulStart = source.indexOf("function ul(e={})", newSpriteStart);
if (newSpriteStart < 0 || ulStart < 0) throw new Error("Could not locate Dark Sprite behavior");
source =
  source.slice(0, newSpriteStart) +
  `function Fy(){return{onSpawn(e){e.creatureState.launchCooldown=0,e.creatureState.launch=null},onUpdate(e){e.creatureState.launchCooldown=Math.max(0,(e.creatureState.launchCooldown??0)-dt());const t=e.creatureState.launch;if(!t)return;const n=t.player;if(!n||typeof n.exists=="function"&&!n.exists()){e.creatureState.launch=null;return}n.pos=n.pos.add(t.direction.scale(t.speed*dt())),t.remaining-=dt(),t.remaining<=0&&(n.setControlsEnabled?.(!0),e.creatureState.launch=null)},onPlayerTouch(e,t){if(!t||e.creatureState.launchCooldown>0||e.creatureState.launch)return;const n=Math.max(0,Number(v.blame?.laserHits)||0);let o=t.pos.sub(e.pos);o.len()<.01&&(o=vec2(1,0)),o=o.unit(),e.creatureState.launchCooldown=5,e.creatureState.launch={player:t,direction:o,speed:140+n*55,remaining:.72},t.setControlsEnabled?.(!1),Sy(t.pos,t,{beamWidth:5,hitRadius:18,strikeSeconds:.45});const r=add([text("LAUNCHED",{size:13}),pos(t.pos.add(vec2(0,-25))),anchor("center"),color(120,255,155),opacity(1),z(40),{life:0},"releasedCreatureFX"]);r.onUpdate(()=>{r.life+=dt(),r.pos.y-=14*dt(),r.opacity=Math.max(0,1-r.life),r.life>=1&&destroy(r)})},onIdleStart(e){e.creatureState.idleTime=0},onIdleUpdate(e){e.creatureState.idleTime+=dt();const t=.25+Math.sin(e.creatureState.idleTime*3.4)*.2;e.opacity=Dn(t,.3,.85)},onIdleEnd(e){e.opacity=.9},onDestroy(e){const t=e.creatureState.launch?.player;t&&t.setControlsEnabled?.(!0)}}}` +
  source.slice(ulStart);

replacePattern(
  "Bubbler reward dialogue",
  /const Ue=we\(\$\),Pe="The spherical refractions fade with each dawn\.",De=\[\];.*?,j\(De\)/g,
  'const Ue=we($),De=[];ke?(xe(),ge(),ye(s.pos),De.push(\'"The Bubble Board is yours. Have fun out there."\')):(X?De.push(\'"The tomb key is yours."\'):De.push(`You share ${te} more bubble gum.`),$>=Qn&&De.push(Ue)),j(De)'
);

replacePattern(
  "Bubbler mandatory introduction",
  /const ie=te\?\["A stranger cups a ring of bubbles that hum like glass\.".*?\];oe&&/g,
  'const ie=te?["A stranger cups a ring of humming bubbles.",\'"Bubble gum for the tomb key?"\']:[\'"More bubble gum? Choose how much."\'];oe&&'
);

replaceOne(
  "scaffolding spinning hazards",
  'function r(f,y,S,M,V="fanHaz"){const A=add([rect(30,6,{radius:2}),pos(f,S),anchor("center"),color(200,200,255),area(),V,{dir:1,ang:0,minX:Math.min(f,y),maxX:Math.max(f,y),speed:M}]);A.onUpdate(()=>{A.ang+=dt()*8,A.angle=A.ang*57.2958,A.pos.x+=A.speed*A.dir*dt(),A.pos.x<=A.minX&&(A.dir=1),A.pos.x>=A.maxX&&(A.dir=-1)})}r(e-170,e-90,t-90,60),r(e+90,e+170,t-140,60);',
  ''
);

replaceOne(
  "scaffolding hazard collision",
  '),p.onCollide("fanHaz",f=>{const y=p.pos.sub(f.pos).unit();o(p,y)}),p.onCollide("roofTrigger"',
  '),p.onCollide("roofTrigger"'
);

replaceOne(
  "second fall departure",
  'a.onCollide("townShard",()=>{if(state.haveTownShard||u)return;u=!0,a.setControlsEnabled?.(!1),state.haveTownShard=!0,addItem("shard-town","Atrium Shard","shard","A shimmering fragment of the dark."),s&&destroy(s);const i=add([text("Shard acquired!",{size:22}),pos(a.pos.x,a.pos.y-22),anchor("center"),layer("ui"),opacity(1),{t:0}]);i.onUpdate(()=>{i.t+=dt(),i.opacity=1-clamp(i.t/1.2,0,1),i.opacity<=0&&destroy(i)}),wi({closeSeconds:8,darknessOpacity:.8,onClosed:()=>{const d=add([rect(width(),height()),pos(0,0),color(255,255,255),opacity(0),fixed(),layer("ui"),z(2e3)]);tween(0,1,.75,h=>d.opacity=h),wait(.8,()=>go("dream",{source:"townShard"}))}})})',
  'a.onCollide("townShard",()=>{if(state.haveTownShard||u)return;u=!0,a.setControlsEnabled?.(!1),state.haveTownShard=!0,addItem("shard-town","Atrium Shard","shard","A shimmering fragment of the dark."),s&&destroy(s);const i=add([text("Shard acquired!",{size:22}),pos(a.pos.x,a.pos.y-22),anchor("center"),layer("ui"),opacity(1),{t:0}]),d=add([rect(width(),height()),pos(0,0),color(0,0,0),opacity(0),fixed(),layer("ui"),z(1999)]);i.onUpdate(()=>{i.t+=dt(),i.opacity=1-clamp(i.t/1.2,0,1),i.opacity<=0&&destroy(i)}),play("deep-broken-glass1"),tween(a.pos.y,a.pos.y+180,1.1,h=>a.pos.y=h),tween(0,1,1.1,h=>d.opacity=h),wait(1.15,()=>{state.secondAtriumFallPending=!0,state.entry="center",go("overworld")})})'
);

replaceOne(
  "second fall overworld landing",
  'const Y=rn(N,(H,ae)=>D(H,ae),{body:!0,scale:.15,initialHeading:ne});state.atriumShutdownActive&&state.eyeEventActive&&wi({closeSeconds:.01,darknessOpacity:.46,atriumNodes:[R,L],onClosed:()=>tc(Y)});',
  'const Y=rn(N,(H,ae)=>D(H,ae),{body:!0,scale:.15,initialHeading:ne});if(state.secondAtriumFallPending){state.secondAtriumFallPending=!1,Y.setControlsEnabled?.(!1);const H=add([sprite("fall-silhouette"),pos(Y.pos.x,Y.pos.y-120),anchor("center"),z(9999),layer("ui")]);tween(H.pos.y,Y.pos.y,.8,ae=>H.pos.y=ae),wait(.82,()=>{destroy(H),shake(7),Y.setControlsEnabled?.(!0),wi({delaySeconds:.65,closeSeconds:8,darknessOpacity:.8,atriumNodes:[R,L],onStart:()=>{state.atriumShutdownActive=!0},onClosed:()=>{const ae=add([rect(width(),height()),pos(0,0),color(255,255,255),opacity(0),fixed(),layer("ui"),z(2e3)]);tween(0,1,.75,se=>ae.opacity=se),wait(.8,()=>go("dream",{source:"townShard"}))}})})}else state.atriumShutdownActive&&state.eyeEventActive&&wi({closeSeconds:.01,darknessOpacity:.46,atriumNodes:[R,L],onClosed:()=>tc(Y)});'
);

replaceOne(
  "pre-labs dialogue sizing",
  'const a=28,s=8,u=46,c=6;let i=[];function d(h,l){const p=Math.round(a*.6),g=Math.max(280,Math.min(900,h.length*p)),m=Math.ceil(a*1.9);',
  'const a=26,s=12,u=120,c=1;let i=[];function d(h,l){const p=Math.round(a*.58),g=Math.max(380,Math.min(900,h.length*p)),m=Math.max(Math.ceil(a*2.2),Math.ceil(h.length/44)*38+24);'
);

replaceOne(
  "pre-labs dialogue wrapping",
  'M=add([text(h,{size:a}),pos(f,y),anchor("center"),color(240,240,255),layer("ui"),opacity(1),{t:0}])',
  'M=add([text(h,{size:a,width:g-36,align:"center",lineSpacing:6}),pos(f,y),anchor("center"),color(240,240,255),layer("ui"),opacity(1),{t:0}])'
);

fs.writeFileSync(bundlePath, source);
console.log("Applied Atrium playtest fixes.");
