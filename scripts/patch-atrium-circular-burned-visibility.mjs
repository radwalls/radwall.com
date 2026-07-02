import fs from "node:fs";

const bundlePath = new URL("../atrium/assets/index-ChedvSPu.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes("burnedVisibilityGradient")) {
  console.log("Circular burned visibility is already applied.");
  process.exit(0);
}

const start = source.indexOf("function setupBurnedAtmosphere(){");
const end = source.indexOf("const Ay=", start);

if (start < 0 || end < 0) {
  throw new Error("Could not locate the burned atmosphere implementation.");
}

const replacement =
  'function setupBurnedAtmosphere(){const e=ir();if(!e.meta.allBurned||!Ld.has(v.lastScene)||get("burnedAtmosphereController").length>0)return;const t=e.key==="burnedNoAtrium",n=width(),o=height(),r=document.getElementById("burned-visibility-gradient");r&&(r.style.display=t?"none":"block");add([rect(n,o),pos(0,0),anchor("topleft"),color(92,80,70),opacity(t?.06:.12),fixed(),layer("ui"),z(-16),"burnedVisibilityVeil"]);const a=(s=!1)=>{const u=add([rect(rand(2,8),rand(1,3),{radius:1}),pos(s?rand(-80,n):rand(-100,0),rand(-40,o)),anchor("center"),rotate(rand(-20,20)),color(rand(125,190),rand(112,165),rand(105,145)),opacity(rand(.28,t?.52:.78)),fixed(),layer("ui"),z(-12),"burnedAshParticle",{vx:rand(170,360),vy:rand(22,95),life:rand(3.5,7),age:s?rand(0,3):0,wobble:rand(1.5,4),phase:rand(0,Math.PI*2)}]);s&&(u.pos.x=rand(-80,n),u.pos.y=rand(-40,o)),u.onUpdate(()=>{u.age+=dt(),u.pos.x+=u.vx*dt(),u.pos.y+=(u.vy+Math.sin(time()*u.wobble+u.phase)*18)*dt(),u.angle+=45*dt(),u.opacity=Math.max(0,Math.min(t?.52:.78,(1-u.age/u.life)*(t?.62:.9))),(u.age>=u.life||u.pos.x>n+120||u.pos.y>o+100)&&destroy(u)})};for(let s=0;s<(t?12:55);s++)a(!0);const i=add([pos(0,0),fixed(),"burnedAtmosphereController","burnedVisibilityGradient"]);i.windLoop=loop(t?.16:.035,()=>a()),i.onDestroy(()=>{i.windLoop?.cancel?.(),r&&(r.style.display="none")})}';

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(bundlePath, source);
console.log("Added circular burned visibility and reduced post-jettison ash.");
