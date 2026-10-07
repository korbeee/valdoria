'use strict';
// =====================================================================================
//  MAIS VIDA NO RECIFE: tartaruga-marinha e arraia-jamanta
// =====================================================================================
// Duas espécies grandes e calmas, no mesmo esquema das outras (js/aquatic.js): entram em AQUATIC, ganham a ficha de
// WILDLIFE que o Wildlife.update/drawWildlife esperam e, em vez do `look` de peixe, trazem a própria função de pintura
// (`paint`), com quadros de nadadeira batendo. Nascem só no mar de verdade: precisam de fundo e de largura.

// Polígono preenchido pixel a pixel (poucos pontos, sprite pequeno)
function olPolygon(s, pts, pick) {
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  for (const [x, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (((yi > y + 0.5) !== (yj > y + 0.5)) && (x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi)) inside = !inside;
    }
    if (inside) s.set(x, y, pick(x, y));
  }
}

// Tartaruga-marinha olhando para a direita: casco verde com placas, cabeça à frente e nadadeiras que remam (quadros 0-3)
function paintTurtle(a, frame) {
  const s = new Sprite(32, 22);
  const shell = [[34, 66, 48], [48, 87, 57], [68, 111, 66], [96, 137, 77], [135, 163, 94], [171, 187, 115]];
  const skin = [[63, 93, 65], [100, 128, 79], [143, 161, 99], [182, 193, 127]];
  const row = [0.15, 0.7, 1.1, 0.65][frame & 3];
  // Nadadeiras distantes e cauda ficam atrás da cúpula.
  olPolygon(s, [[6,10],[8,12],[5,17],[2,18],[3,14]], (x,y)=>skin[y>14?0:1]);
  olPolygon(s, [[18,8],[22,8],[26,12],[24,14],[20,12]], ()=>skin[0]);
  oaLine(s, 5, 10, 2, 11, 1, skin[1]);
  // Placas grandes com juntas finas: a luz acompanha o volume de cada escama do casco.
  const plates = [[8,7],[13,4],[18,5],[22,8],[11,10],[17,10],[7,12],[22,12]];
  shadeBall(s, 14, 10, 10, 8, (l, dx, dy, x, y) => {
    if (dy > 0.48) return null;
    let first=Infinity,second=Infinity,plate=0;
    for(let i=0;i<plates.length;i++){
      const [px,py]=plates[i],distance=(x-px)**2+(y-py)**2*1.25;
      if(distance<first){second=first;first=distance;plate=i;}else if(distance<second)second=distance;
    }
    if(second-first<3) return shell[l>.7?2:0];
    const relief=(x<plates[plate][0]&&y<plates[plate][1])?.13:0;
    return shell[clamp(Math.floor((l+relief)*4.5),1,5)];
  });
  // Borda segmentada do casco e ventre creme, com sombra na parte inferior.
  olPolygon(s, [[5,12],[10,13],[21,12],[24,12],[22,15],[18,16],[9,15],[6,14]],
    (x,y)=>y===12?[154,164,99]:y===13?[219,205,152]:y===14?[181,166,113]:[117,118,77]);
  for(const x of [8,12,16,20])s.set(x,13,[145,139,88]);
  // Pescoço e cabeça alongada, com escamas pequenas e bico escuro.
  olPolygon(s, [[21,10],[24,9],[25,7],[28,7],[30,9],[29,11],[26,12],[23,13]],
    (x,y)=>skin[y<9?3:y<11?2:1]);
  for(const [x,y]of [[24,10],[26,8],[27,11],[28,9]])s.set(x,y,skin[1]);
  s.set(28,8,[22,34,25]);s.set(27,7,skin[3]);
  s.set(29,10,[72,85,53]);s.set(28,11,[72,85,53]);
  // Remo próximo: ponta afilada e escamas alinhadas, sem ruído aleatório entre quadros.
  const fx=Math.round(17+Math.cos(row)*9),fy=Math.round(13+Math.sin(row)*7);
  olPolygon(s, [[17,12],[20,12],[fx+1,fy],[fx,fy+2],[fx-3,fy+1],[16,14]],
    (x,y)=>skin[clamp(3-Math.floor((y-12)/2),0,3)]);
  const n=Math.max(Math.abs(fx-18),Math.abs(fy-13),1);
  for(let i=1;i<n;i+=2){const x=Math.round(18+(fx-18)*i/n),y=Math.round(13+(fy-13)*i/n);s.set(x,y,skin[1]);}
  return s.finish([22, 43, 33]);
}

// Arraia-jamanta: losango largo, dorso azul-escuro com pintas e ventre claro; as pontas das asas batem (quadros 0-3)
function paintRay(a, frame) {
  const s = new Sprite(46, 24), f = [0, 2, 4, 2][frame], cy = 12;
  const wing = [[43, cy], [37, cy - 3], [26, 2 + f], [16, 1 + f], [14, cy - 4], [8, cy - 1], [8, cy + 1], [14, cy + 4], [16, 23 - f], [26, 22 - f], [37, cy + 3]];
  olPolygon(s, wing, (x, y) => {
    const t = (y - 1) / 22;
    const spot = (x * 7 + y * 13) % 17 === 0 && y < cy;
    if (y < cy - 0.5) return spot ? [210, 224, 236] : t < 0.25 ? [62, 92, 134] : [38, 60, 100];
    return y > cy + 7 ? [214, 226, 234] : [244, 248, 250];
  });
  oaLine(s, 8, cy, 0, cy, 1, [36, 52, 84]);                           // cauda
  s.set(42, cy - 3, [38, 60, 100]); s.set(42, cy + 3, [244, 248, 250]); s.set(43, cy - 3, [38, 60, 100]); s.set(43, cy + 3, [244, 248, 250]);   // chifres da cabeça
  s.set(40, cy - 1, [10, 14, 22]); s.set(40, cy + 1, [10, 14, 22]);   // olhos
  return s.finish([12, 20, 34]);
}

Object.assign(AQUATIC, {
  turtle: { name: 'Tartaruga-marinha', habitat: 'mar', w: 26, h: 14, hp: 9, speed: 15, style: 'glide', peso: 0.9, fundo: 6, largura: 14, perto: 'coral', max: 2, drops: [[ITEM.RAW_FISH, 1, 2]], paint: paintTurtle },
  ray: { name: 'Arraia-jamanta', habitat: 'mar', w: 40, h: 14, hp: 14, speed: 24, style: 'glide', peso: 0.5, fundo: 10, largura: 30, max: 1, drops: [[ITEM.RAW_FISH, 2, 3]], paint: paintRay },
});
for (const kind of ['turtle', 'ray']) {
  const a = AQUATIC[kind];
  WILDLIFE[kind] = { name: a.name, biome: BIOME.OCEAN, hp: a.hp, speed: a.speed, w: a.w, h: a.h, drop: ITEM.RAW_FISH, drops: a.drops, color: '#4f8fc6', shape: 'aquatic', aquatic: true, spec: a };
}
{
  const baseSprite = aquaticSprite;
  aquaticSprite = function (kind, frame) {
    const a = AQUATIC[kind];
    if (!a?.paint) return baseSprite(kind, frame);
    const key = kind + ':' + frame;
    let c = aquaticSprites.get(key);
    if (!c) { const normal = a.paint(a, frame); c = { normal, hurt: hurtFlash(normal) }; aquaticSprites.set(key, c); }
    return c;
  };
}
window.addEventListener('DOMContentLoaded', () => {   // o texto do bestiário (js/bestiary.js) carrega depois deste arquivo
  if (typeof BESTIARY_LORE !== 'undefined') Object.assign(BESTIARY_LORE, {
    turtle: 'Rema devagar pelo recife, sem pressa. Costuma aparecer perto dos corais.',
    ray: 'Plana no mar fundo como uma pipa de asas azuis. Não faz mal a ninguém.',
  });
});
