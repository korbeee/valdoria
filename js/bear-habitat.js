'use strict';

// Cenário em cache, iluminado junto com o terreno, atrás dos blocos e atores.
const BEAR_HABITAT_ART = new WeakMap();
function bearHabitatMaterial(w, x, y, tile) {
  if (tile !== TILE.BEDROCK) return tile;
  for (const l of w.bearLairs || []) {
    if (!l.habitat) continue;
    const [a, b, c, d] = l.bounds;
    if (x >= a - 3 && x <= c + 3 && y >= b - 3 && y <= d + 3) return TILE.STONE;
  }
  return tile;
}

function bearHabitatArt(w, l) {
  if (BEAR_HABITAT_ART.has(l)) return BEAR_HABITAT_ART.get(l);
  const [x0, y0, x1, floor] = l.bounds, W = (x1 - x0 + 1) * T, H = (floor - y0) * T;
  const canvas = makeCanvas(W, H), c = canvas.getContext('2d'), rnd = (i) => hash2(x0 + i * 7, y0 + i * 13, w.seed + 891);
  const poly = (pts, color) => { c.fillStyle = color; c.beginPath(); pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.closePath(); c.fill(); };
  c.save(); c.beginPath(); c.moveTo(0,H);
  l.habitat.roof.forEach((y,i) => c.lineTo(i*T,(y-y0)*T)); c.lineTo(W,(l.habitat.roof.at(-1)-y0)*T); c.lineTo(W,H); c.closePath(); c.clip();
  c.fillStyle = '#282d2b'; c.fillRect(0,0,W,H);
  // Grandes planos inclinados e estratos; a parede perde a aparência de sala quadrada.
  for (let i = 0; i < 11; i++) {
    const x = i * W / 10 - 70, y = 46 + rnd(i) * 90, width = 100 + rnd(i+30) * 120;
    poly([[x,0],[x+width,0],[x+width-35,y],[x+width+12,H],[x+30,H],[x-20,y+65]], ['#303732','#343a34','#383c35'][i%3]);
    poly([[x+width-35,y],[x+width+12,H],[x+width+4,H],[x+width-43,y+2],[x+width-22,0],[x+width-18,0]], '#202722');
  }
  for (let i = 0; i < 16; i++) {
    const y = 24 + i*20;
    poly([[0,y],[W*.25,y-12],[W*.6,y+8],[W,y-5],[W,y-2],[W*.6,y+11],[W*.25,y-8],[0,y+3]], i%3 ? '#44473a' : '#222b27');
  }
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(rnd(i+100)*W), y = Math.floor(rnd(i+300)*H);
    c.fillStyle = ['#424a37','#51563b','#657047','#202623'][i%4]; c.fillRect(x,y,3+rnd(i+500)*7,2);
    if(i%4===0) c.fillRect(x+3,y-2,4,2);
  }
  // Estalactites pequenas e raízes que não bloqueiam os saltos.
  for (let i = 1; i < l.habitat.roof.length-1; i+=3) {
    const x = i*T+5, y = (l.habitat.roof[i]-y0)*T, len = 12+rnd(i+650)*28;
    poly([[x-8,y-3],[x+9,y-3],[x+3,y+len]], '#4d5043');
    poly([[x-8,y-3],[x+3,y+len],[x,y+5]], '#666655');
    if(i%2) { c.strokeStyle='#493a2b';c.lineWidth=3;c.beginPath();c.moveTo(x+15,y);c.lineTo(x+12,y+20);c.lineTo(x+19,y+36);c.lineTo(x+16,y+48);c.stroke();
      c.strokeStyle='#726044';c.lineWidth=1;c.beginPath();c.moveTo(x+14,y+19);c.lineTo(x+5,y+30);c.stroke(); }
  }
  for (const side of [0,1]) for (let i=0;i<45;i++) {
    const x=side?W-rnd(i+750)*110:rnd(i+800)*110, y=H-14-rnd(i+900)*110;
    c.fillStyle=['#34442e','#49593a','#60704a'][i%3];c.fillRect(x,y,5+rnd(i+950)*9,2+i%4);
  }
  c.fillStyle='#22251d'; c.fillRect(0,H-7,W,7);
  for(let i=0;i<100;i++) { const x=rnd(i+1100)*W,y=H-4-rnd(i+1200)*8;c.fillStyle=['#77745a','#66563b','#989079'][i%3];c.fillRect(x,y,2+i%4,2); }
  // Cama de folhas, gravetos e capim seco exatamente sob o urso hibernando.
  const bedX=l.x-x0*T;
  c.fillStyle='#1b211c';c.beginPath();c.ellipse(bedX,H-6,87,12,0,0,Math.PI*2);c.fill();
  for(let i=0;i<130;i++) { const a=rnd(i+1400)*Math.PI*2,r=Math.sqrt(rnd(i+1600)); const x=bedX+Math.cos(a)*r*80,y=H-8+Math.sin(a)*r*9;
    poly([[x-5,y],[x,y-3],[x+7,y],[x+1,y+2]],['#56452b','#78603a','#9b7b45','#b59859'][i%4]); }
  const markX=bedX-l.habitat.side*90;
  for(let i=0;i<4;i++) poly([[markX+i*8,H-88],[markX+i*8+3,H-88],[markX+i*8-10,H-56],[markX+i*8-13,H-54]],'#181f1b');
  // Pegadas vindas da entrada.
  for(let i=0;i<9;i++) { const x=bedX+l.habitat.side*(110+i*25),y=H-15-(i%2)*5;
    c.fillStyle='#1c241d';c.beginPath();c.ellipse(x,y,4,2,0,0,Math.PI*2);c.fill();for(let k=0;k<3;k++)c.fillRect(x-4+k*3,y-4,1,1); }
  c.restore(); BEAR_HABITAT_ART.set(l,canvas); return canvas;
}

function drawBearHabitatBackdrop(ctx,g,vx,vy,vw,vh) {
  for(const l of g.world.bearLairs||[]) {
    if(!l.habitat)continue;
    const [a,b,c,d]=l.bounds;
    if((c+4)*T<vx||(a-4)*T>vx+vw||(d+4)*T<vy||(b-4)*T>vy+vh)continue;
    ctx.drawImage(bearHabitatArt(g.world,l),a*T,b*T);
  }
}
