'use strict';
// Five original pixel silhouettes, sharing the same gameplay. The item ID preserves
// the rolled finish through inventory moves, saves and multiplayer equipment packets.
const ESSENCE_NAIL_PROFILE={preparacao:.035,corte:.075,recuperacao:.11,arcoAntes:75,arcoDepois:65,recuo:7,assenta:4,espera:.025};
const ESSENCE_NAIL_IDS=[ITEM.REF_CAVERN_NEEDLE];
const ESSENCE_NAIL_SPRITES=[];
function essenceNailArt(style){
 const colors={k:[30,32,49],s:[77,77,102],b:[129,127,151],l:[187,184,203],h:[235,232,239],w:[255,248,239]};
 const rows=Array.from({length:32},()=>Array(12).fill('.'));
 const dot=(x,y,c)=>{if(rows[y]&&x>=0&&x<12)rows[y][x]=c;};
 for(let y=2;y<=24;y++){
  const width=Math.max(0,Math.floor((y-2)/7));
  for(let x=6-width;x<=6+width;x++)dot(x,y,x===6-width?'h':x<6?'l':x===6+width?'s':'b');
 }
 // Split, smooth, forked, woven and etched: different contours and large motifs
 // rather than resampling the supplied images.
 for(let y=24;y<31;y++){dot(5,y,'s');dot(6,y,'l');dot(7,y,'b');}
 dot(6,2,'w');dot(5,30,'k');dot(7,30,'k');
 if(style===0)for(const [y,dir]of [[10,1],[17,-1],[22,1]])for(let x=4;x<=8;x++){const yy=y+dir*Math.floor((x-4)/2);if(rows[yy][x]!=='.')dot(x,yy,'k');}
 if(style===1)for(let y=5;y<24;y++)dot(6,y,'h');
 if(style===2)for(let y=14;y<=24;y++){dot(6,y,'.');if(y>19)dot(5,y,'.');} // A real open fork, not painted dark.
 if(style===3)for(let y=9;y<30;y++){const x=5+Math.floor(y/3)%3;if(rows[y][x]!=='.'){dot(x,y,'k');if(rows[y][x+1]!=='.')dot(x+1,y,'h');}}
 if(style===4)for(let y=10;y<29;y+=3)for(let x=4;x<=8;x++){if(rows[y][x]!=='.')dot(x,y,'s');if(rows[y+1][x]!=='.'&&x<6)dot(x,y+1,'h');}
 const original=rows.map(r=>r.slice());for(let y=0;y<32;y++)for(let x=0;x<12;x++)if(original[y][x]!=='.')for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]])if(rows[y+dy]?.[x+dx]==='.')dot(x+dx,y+dy,'k');
 // Keep the fork transparent inside its outline.
 if(style===2)for(let y=18;y<=24;y++)dot(6,y,'.');
 const c=makeCanvas(12,32),ctx=c.getContext('2d');for(let y=0;y<32;y++)for(let x=0;x<12;x++){const v=rows[y][x];if(v!=='.'){ctx.fillStyle=rgb(colors[v]);ctx.fillRect(x,y,1,1);}}
 // Ícone do FERRÃO: um espinho fino que afina até a ponta, com colar dourado na base e farpas perto da ponta
 const igrid=Array.from({length:16},()=>Array(16).fill('.'));
 const idot=(x,y,v)=>{if(x>=0&&x<16&&y>=0&&y<16)igrid[y][x]=v;};
 const N=26;
 for(let i=0;i<=N;i++){
  const t=i/N,x=1.8+13*t,y=15-14.4*t,w=Math.round(1.55*Math.pow(1-t,0.8)+0.3);
  for(let k=-w;k<=w;k++){
   const px=Math.round(x+0.74*k),py=Math.round(y+0.67*k);
   let v=k<0?'h':k===0?'l':k===w&&w>0?'s':'b';
   if(t<0.13)v=k<0?'Y':'y';                                                 // colar dourado
   else if(t<0.2)v=k<0?'d':'r';                                              // base de couro
   if(t>0.9)v='w';
   if(style===3&&Math.floor(i/2)%2===0&&t>0.22&&k>=0&&t<0.85)v='s';        // trançado: faixas escuras
   if(style===1&&k===-1&&t>0.22)v='w';                                      // liso: fio brilhante
   if(style===0&&t>0.32&&t<0.56&&k===0)continue;                            // fendido: fresta no meio
   if(style===4&&k===w&&w>0&&i%3===0)continue;                              // entalhado: dentes no fio
   if(style===2&&t>0.84&&k===0)continue;                                    // bifurcado: ponta em duas
   idot(px,py,v);
  }
 }
 for(const t of [0.56,0.72]){const x=1.8+13*t,y=15-14.4*t,w=Math.round(1.55*Math.pow(1-t,0.8)+0.3);idot(Math.round(x+0.74*(w+1)),Math.round(y+0.67*(w+1)),'b');idot(Math.round(x-0.74*(w+1)),Math.round(y-0.67*(w+1)),'l');}   // farpas
 if(style===2){idot(15,0,'w');idot(13,1,'h');idot(14,2,'b');}
 const cores2={...colors,y:[196,150,64],Y:[255,226,150],d:[70,46,34],r:[149,95,55]};
 return {sprite:c,icon:{cores:cores2,pixels:igrid.map(r=>r.join(''))}};
}
const nailNames=['Fendido','Liso','Bifurcado','Trançado','Entalhado'];
for(let i=0;i<5;i++){
 const id=i?Math.max(...Object.values(ITEM))+1:ITEM.REF_CAVERN_NEEDLE;
 if(i){ITEM['REF_CAVERN_NEEDLE_'+i]=id;ESSENCE_NAIL_IDS.push(id);GAME_REFERENCE_ITEMS.push(id);defItem(id,{...ITEM_DEFS[ITEM.REF_CAVERN_NEEDLE]});}
 Object.assign(ITEM_DEFS[id],{name:'Agulhão da Alma Teimosa — '+nailNames[i],nailSkin:i,alcance:52,perfilGolpe:ESSENCE_NAIL_PROFILE,descricao:'Corte rápido com feixe de luz frontal. A aparência vem sorteada.'});
 const art=essenceNailArt(i);ESSENCE_NAIL_SPRITES.push(art.sprite);ITEM_ART[id]=art.icon;
}
const essenceNailRecipe=RECIPES.find(r=>r.resultado.item===ITEM.REF_CAVERN_NEEDLE);
essenceNailRecipe.nome='Agulhão da Alma Teimosa (aparência aleatória)';essenceNailRecipe.resultado.variantes=ESSENCE_NAIL_IDS;
function drawEssenceNailHeld(ctx,id,horizontal=false){
 const img=ESSENCE_NAIL_SPRITES[ITEM_DEFS[id].nailSkin];ctx.save();if(horizontal)ctx.rotate(Math.PI/2);ctx.drawImage(img,-6,-28);ctx.restore();
}
const ESSENCE_SLASH_FRAMES=Array.from({length:4},(_,frame)=>{
 const c=makeCanvas(64,64),ctx=c.getContext('2d'),length=34+frame*4;
 for(let x=5;x<=length;x++){
  const u=(x-5)/(length-5),half=(23-13*u)*Math.sqrt(Math.min(1,(1-u)*6));
  for(let y=-Math.ceil(half);y<=Math.ceil(half);y++){
   const edge=Math.abs(y)/(half||1);if(edge>1)continue;
   ctx.fillStyle=edge>.88?'#a4e5ef':edge>.72?'#e0ffff':'#fffdf3';ctx.fillRect(x,y+32,1,1);
  }
 }
 return c;
});
function drawEssenceNailSlash(ctx,s,p){
 const age=s.t-s.prof.preparacao;if(age<0||age>s.prof.corte+.075)return;
 const progress=clamp(age/s.prof.corte,0,1),frame=Math.min(3,Math.floor(progress*4)),sh=shoulderPos(p,swordLunge(s));
 ctx.save();ctx.translate(Math.round(sh.x),Math.round(sh.y));ctx.rotate(swordWorldAngle(s,s.aim));ctx.translate(8,0);ctx.globalAlpha=age<=s.prof.corte?.95:Math.max(0,1-(age-s.prof.corte)/.075);ctx.imageSmoothingEnabled=false;ctx.drawImage(ESSENCE_SLASH_FRAMES[frame],0,-32);ctx.restore();
}
function sweepEssenceNailHits(g,s){
 const sh=shoulderPos(g.player,swordLunge(s)),angle=swordWorldAngle(s,s.aim),c=Math.cos(angle),sn=Math.sin(angle),length=s.reach;
 for(const m of g.mobs)if(!m.dead&&m!==g.mount&&!s.hit.has(m)){
  const dx=clamp(sh.x,m.x,m.x+m.w)-sh.x,dy=clamp(sh.y,m.y,m.y+m.h)-sh.y;if(dx*dx+dy*dy>(length+24)**2)continue;
  search:for(let x=14;x<=length;x+=3){const u=(x-13)/(length-13),half=(23-13*u)*Math.sqrt(Math.min(1,(1-u)*6));for(let y=-half;y<=half;y+=3){const xx=sh.x+c*x-sn*y,yy=sh.y+sn*x+c*y;if(m.containsPoint(xx,yy,1.5)){applySwordHit(g,s,m,xx,yy,angle);break search;}}}
 }
}
