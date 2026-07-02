import fs from "node:fs";

const bundlePath = new URL("../atrium/assets/index-ChedvSPu.js", import.meta.url);
let source = fs.readFileSync(bundlePath, "utf8");

if (source.includes('"Man in the Hat",{size:28')) {
  console.log("Atrium dialogue correction is already applied.");
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
  "street observer dialogue restoration",
  'const H=["This procession looks like a celebration.","But they are mourning.","The road leads to Galiah\'s Tomb.","She was a young girl who died many years ago.","The Atrium feels fresh inside...","...yet fragile.","I think you\'re late to work.","..."];let ae=0;const se=add([rect(860,280,{radius:18}),pos(center().x,height()-190),anchor("center"),color(28,26,48),opacity(.92),fixed(),layer("ui"),z(1200),area(),"suitedManDialogue"]),ze=add([text("",{size:24,width:760,align:"left",lineSpacing:8}),pos(center().x-380,height()-275),anchor("topleft"),color(245,240,255),fixed(),layer("ui"),z(1201),"suitedManDialogue"])',
  'const H=["This processional... well, you would think they are celebrating. But they are mourning.","That road they are walking goes to Galiah\'s Tomb. She was a young girl who passed away many years ago.","This Atrium... it feels fresh inside, yet fragile...","I think you\'re late to work.","...","..."];let ae=0;const se=add([rect(780,230,{radius:18}),pos(center().x,height()-170),anchor("center"),color(28,26,48),opacity(.92),fixed(),layer("ui"),z(1200),area(),"suitedManDialogue"]),ze=add([text("",{size:26,width:680,align:"left"}),pos(center().x-330,height()-230),anchor("topleft"),color(245,240,255),fixed(),layer("ui"),z(1201),"suitedManDialogue"])'
);

replaceOne(
  "unused pre-labs dialogue index",
  '"];let o=0;function r(){const h=state?.labs;',
  '"];function r(){const h=state?.labs;'
);

const oldRendererStart = source.indexOf("const a=26,s=12,u=120,c=1;let i=[];function d(h,l){");
const pianoClickStart = source.indexOf('onClick("piano"', oldRendererStart);
if (oldRendererStart < 0 || pianoClickStart < 0) {
  throw new Error("Could not locate the broken pre-labs dialogue renderer");
}

const fixedRenderer =
  `const a="pianoManDialogue";function d(h){if(get(a).length>0)return;const l=(Array.isArray(h)?h:[h]).map(P=>String(P)),p=Math.min(920,width()-100),g=310,m=vec2(center().x,height()-190);let f=0;add([rect(width(),height()),pos(0,0),anchor("topleft"),color(4,5,12),opacity(.62),fixed(),layer("ui"),z(1290),area(),a]),add([rect(p,g,{radius:18}),pos(m),anchor("center"),color(18,18,34),opacity(.97),outline(4,rgb(110,120,160)),fixed(),layer("ui"),z(1291),a]),add([text("Man in the Hat",{size:28,align:"center"}),pos(m.x,m.y-g/2+38),anchor("center"),color(220,225,245),fixed(),layer("ui"),z(1292),a]);const y=add([text("",{size:26,width:p-90,align:"left",lineSpacing:9}),pos(m.x-p/2+45,m.y-g/2+78),anchor("topleft"),color(245,242,255),fixed(),layer("ui"),z(1292),a]);let S=null;const M=()=>{destroyAll(a),setCursor("default")},V=()=>{f+=1,f>=l.length?M():(y.text=l[f],S?.setLabel(f===l.length-1?"Close":"Continue"))};S=lo(l.length===1?"Close":"Continue",V,{pos:vec2(m.x+p/2-145,m.y+g/2-38),width:210,height:48,textSize:22,z:1293,tag:a}),y.text=l[f]}onClick("pianoman",()=>d(n)),`;

source =
  source.slice(0, oldRendererStart) +
  fixedRenderer +
  source.slice(pianoClickStart);

fs.writeFileSync(bundlePath, source);
console.log("Restored street dialogue and replaced the pre-labs dialogue panel.");
