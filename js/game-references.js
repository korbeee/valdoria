'use strict';

// Original Valdoria designs. References describe play styles, never imported assets.
const GAME_REFERENCE_ITEMS=[];
function referenceItem(key,name,inspiration,theme,shape,properties,station,cost,count=1){
 const id=Math.max(...Object.values(ITEM))+1;ITEM[key]=id;GAME_REFERENCE_ITEMS.push(id);
 defItem(id,{name,maxStack:1,referenceGame:inspiration,...properties});
 ITEM_ART[id]=referenceIcon(shape,theme);
 RECIPES.push({nome:name,estacao:station,ingredientes:cost,resultado:{item:id,quantidade:count}});
}
function referenceIcon(shape,theme){
 const themes={jade:[[28,58,51],[51,115,91],[101,185,131],[202,237,165]],blue:[[32,48,78],[59,99,154],[103,170,213],[213,241,245]],ember:[[77,33,43],[154,56,52],[230,119,60],[255,215,136]],violet:[[49,35,70],[101,68,133],[177,123,196],[245,202,231]],gold:[[68,47,30],[144,98,41],[216,170,78],[252,235,166]]};
 const [a,b,c,h]=themes[theme],cores={k:[24,28,35],a,b,c,h,s:[91,104,116],w:[206,222,226],l:[139,163,176],d:[70,46,34],r:[149,95,55],g:[42,106,62],G:[114,182,84]};
 const grid=Array.from({length:16},()=>Array(16).fill('.'));
 const dot=(x,y,v)=>{if(x>=0&&x<16&&y>=0&&y<16)grid[y][x]=v;};
 const box=(x,y,w,h,v)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)dot(i,j,v);};
 const line=(x,y,xx,yy,v)=>{const n=Math.max(Math.abs(xx-x),Math.abs(yy-y));for(let i=0;i<=n;i++)dot(Math.round(x+(xx-x)*i/(n||1)),Math.round(y+(yy-y)*i/(n||1)),v);};
 const shaft=()=>{line(3,13,10,6,'d');line(4,13,11,6,'r');dot(4,12,'h');};
 if(shape==='pick'){shaft();line(3,3,9,2,'w');line(3,4,11,3,'c');line(9,3,13,7,'b');dot(13,8,'c');dot(10,4,'h');}
 if(shape==='axe'){shaft();box(8,2,3,6,'s');box(11,3,3,4,'c');box(13,4,1,2,'h');box(8,3,2,4,'w');dot(10,5,'a');}
 if(shape==='shovel'){shaft();box(9,2,4,5,'c');box(10,1,2,1,'h');box(10,3,2,3,'b');dot(11,7,'s');}
 if(shape==='blade'||shape==='needle'){line(3,13,7,9,'r');line(4,13,8,9,'d');line(5,7,9,11,'c');line(7,8,13,2,'w');line(8,8,13,3,'c');if(shape==='blade'){line(9,8,14,3,'b');dot(13,2,'h');}dot(7,9,'h');}
 if(shape==='maul'){shaft();box(6,2,7,5,'a');box(7,2,5,1,'h');box(7,3,5,3,'b');box(8,4,3,1,'c');dot(12,5,'s');}
 if(shape==='bow'){line(6,2,10,5,'c');line(10,5,10,10,'b');line(10,10,6,14,'c');line(6,2,6,14,'l');box(9,7,2,2,'r');dot(7,3,'h');dot(7,13,'h');}
 if(shape==='bottle'){box(6,1,4,2,'r');box(6,3,4,2,'l');box(4,5,8,7,'b');box(5,5,6,7,'c');box(5,10,6,2,'b');box(6,12,4,1,'a');box(5,6,1,4,'h');box(8,7,2,2,'w');dot(6,4,'h');}
 if(shape==='food'){box(3,11,10,2,'s');box(4,12,8,1,'w');box(4,6,8,5,'b');box(5,5,6,1,'c');box(5,6,6,2,'h');dot(6,9,'c');dot(9,9,'c');line(6,2,5,4,'l');line(9,1,8,3,'l');}
 if(shape==='wrap'){box(3,4,10,7,'a');box(4,4,8,6,'c');box(4,4,8,2,'h');box(4,9,8,2,'b');line(5,5,10,10,'r');line(9,5,5,9,'w');}
 if(shape==='armor'){box(5,2,6,2,'l');box(2,4,12,4,'a');box(3,4,10,2,'c');box(5,4,6,8,'b');box(6,5,4,6,'c');box(5,11,6,2,'s');box(6,11,4,1,'h');box(7,6,2,2,'h');dot(3,5,'w');dot(12,5,'w');}
 if(shape==='charm'){line(4,2,12,2,'r');line(4,2,6,7,'r');line(12,2,10,7,'r');box(5,7,7,5,'a');box(6,8,5,3,'c');box(7,7,3,1,'h');box(7,11,3,2,'b');dot(8,9,'w');}
 if(shape==='brooch'){box(4,3,8,9,'a');box(5,4,6,7,'b');box(6,5,4,5,'c');line(7,5,7,9,'h');dot(9,8,'h');box(7,12,2,1,'r');}
 if(shape==='cloud'){box(4,3,8,2,'l');box(3,5,10,8,'s');box(4,5,8,7,'a');box(5,8,6,3,'w');box(4,9,8,2,'w');box(6,7,3,1,'h');box(4,6,1,5,'c');box(4,12,8,1,'l');}
 if(shape==='starblade'){line(3,13,6,10,'r');line(5,8,8,11,'b');line(7,8,12,3,'c');line(8,8,13,3,'h');dot(12,2,'w');line(4,2,4,6,'h');line(2,4,6,4,'h');dot(4,4,'w');}
 if(shape==='bread'){box(2,6,12,6,'a');box(3,5,10,6,'c');box(4,4,8,1,'h');box(3,6,10,2,'h');box(3,11,10,1,'b');for(const x of [5,8,11])line(x,6,x-1,8,'b');}
 if(shape==='maskcloak'){Object.assign(cores,{a:[32,35,48],b:[65,71,87],c:[101,113,128],h:[157,174,186]});box(5,2,6,2,'a');box(5,2,6,1,'h');box(4,4,8,2,'c');box(3,6,10,3,'b');box(2,9,12,3,'b');box(2,12,3,2,'c');box(6,12,3,3,'b');box(11,12,3,2,'b');line(5,5,3,12,'c');line(7,5,7,12,'a');line(11,6,12,12,'a');}
 if(shape==='boltcharm'){box(4,3,8,9,'a');box(5,4,6,7,'b');line(9,4,6,8,'h');line(6,8,10,8,'h');line(10,8,7,11,'h');box(7,1,2,2,'r');}
 if(shape==='boots'){box(2,4,4,6,'b');box(10,4,3,6,'b');box(2,10,6,3,'c');box(9,10,6,3,'c');box(2,12,6,1,'a');box(9,12,6,1,'a');line(3,5,4,8,'h');line(11,5,12,8,'h');}
 if(shape==='flower'){line(8,7,8,14,'g');line(8,12,4,10,'G');box(4,9,3,2,'g');box(10,10,3,2,'G');box(5,2,6,7,'b');box(3,4,10,3,'c');box(5,3,6,5,'h');box(7,4,2,3,'a');dot(7,4,'w');}
 if(shape==='starfruit'){line(8,1,6,3,'g');box(9,1,3,2,'G');box(7,3,3,9,'c');box(3,6,10,4,'b');box(4,5,8,4,'c');box(5,10,2,3,'b');box(10,10,2,3,'b');line(8,4,6,9,'h');dot(5,7,'h');dot(10,8,'a');}
 if(shape==='mushroom'){box(6,9,5,4,'r');box(7,9,3,3,'h');box(3,5,10,4,'b');box(4,3,8,3,'c');box(6,2,4,1,'h');box(4,6,2,2,'h');box(8,4,3,2,'w');box(11,7,2,1,'h');}
 // Sem contorno preto desenhado aqui: o jogo já põe um contorno automático em todo ícone.
 return {cores,pixels:grid.map(r=>r.join(''))};
}
const referenceTool={nivel:2,velocidade:6,golpe:.34,forca:.5,alcanceFerramenta:4};
// Keep the original fourteen IDs in order so existing inventories migrate in place.
referenceItem('REF_DEEP_PICK','Picareta Brilha-Muito','Aventura de Cubos','blue','pick',{...referenceTool,ferramenta:'picareta',golpe:.25,forca:.60,referencePower:'scan',descricao:'Quebra pedra, acha minério e brilha mais que a sua autoestima. R na mão: revela minérios próximos por 5 s. Recarga: 12 s.'},'anvil',[[ITEM.METAL_BAR,6],[ITEM.CRYSTAL,6],[ITEM.STICK,2]]);
referenceItem('REF_GROVE_AXE','Machado do Fazendeiro Ocupado','Fazendinha Pixelada','gold','axe',{...referenceTool,ferramenta:'machado',golpe:.28,referencePower:'harvest',descricao:'O dono jura que só está "dando uma olhadinha" na plantação. R na mão: recupera 15 de vida e chove folhinha. Recarga: 20 s.'},'anvil',[[ITEM.METAL_BAR,4],[ITEM.GOLD,3],[ITEM.WOOD,6]]);
referenceItem('REF_TRAIL_SPADE','Frasco de Nuvem Mal Fechado','Cavar e Pular','blue','cloud',{acessorio:{reference:true},referencePassive:'cloud',descricao:'Uma nuvem engarrafada que fugiu da escola. Equipada: solte e aperte o pulo no ar para um segundo salto. Recarrega no chão.'},'anvil',[[ITEM.CLOUD_ESSENCE,4],[ITEM.GLASS,3],[ITEM.SILK,4]]);
referenceItem('REF_DUEL_BLADE','Espada do Pedido Cadente','Cavar e Pular','violet','starblade',{dano:12,rapidez:1.05,alcance:30,referenceStrike:'star',descricao:'Faça um pedido ao acertar: uma estrela cadente cai na cabeça do inimigo. Recarga da estrela: 2 s.'},'anvil',[[ITEM.METAL_BAR,6],[ITEM.CRYSTAL,4],[ITEM.CLOUD_ESSENCE,3]]);
referenceItem('REF_CAVERN_NEEDLE','Agulhão da Alma Teimosa','Insetos Melancólicos','blue','needle',{dano:11,rapidez:1.15,alcance:44,perfilGolpe:NEEDLE_THRUST,referenceStrike:'soul',referencePower:'soul',descricao:'Cada acerto pega uma almazinha (máx. 6). Com o medidor cheio, clique com o botão direito para soltar uma rajada para a frente.'},'anvil',[[ITEM.METAL_BAR,5],[ITEM.BONE,6],[ITEM.CRYSTAL,3]]);
referenceItem('REF_ASH_MAUL','Marreta do Rei Chateado','Fuga do Submundo','ember','maul',{dano:20,rapidez:.6,alcance:30,perfilGolpe:MAUL_SWING,referenceStrike:'quake',descricao:'O antigo rei dos mortos largou o cargo e esqueceu a marreta. Acertando o chão, solta uma onda de brasas que atravessa inimigos. Recarga da onda: 2,5 s.'},'anvil',[[ITEM.BRONZE,6],[ITEM.COAL,6],[ITEM.LEATHER,3]]);
referenceItem('REF_FOREST_BOW','Arco Quadradão','Aventura de Cubos','gold','bow',{arco:true,referencePower:'volley',descricao:'Madeira bem quadrada, mira bem redonda. Usa flechas comuns. R gasta 3 flechas em uma rajada explosiva: 9 de dano direto + 6 em área por flecha. Não quebra blocos. Recarga: 4 s.'},'anvil',[[ITEM.WOOD,10],[ITEM.METAL_BAR,4],[ITEM.SILK,6]]);
referenceItem('REF_HEARTH_TONIC','Frasco de Alma em Conserva','Insetos Melancólicos','blue','bottle',{cura:20,maxStack:10,referenceBuff:'soul',descricao:'Alma engarrafada, sabor menta, validade duvidosa. Restaura 20 de vida e enche o medidor de almas para 6: clique com o botão direito segurando o Agulhão para soltar a rajada.'},'workbench',[[ITEM.WATER,1],[ITEM.GEL,4],[ITEM.CRYSTAL,2]],2);
referenceItem('REF_FARM_STEW','Fruta Estrela do Quintal','Fazendinha Pixelada','violet','starfruit',{cura:25,maxStack:20,referenceBuff:'regen',descricao:'Uma fruta com pontinhas de estrela: não pergunte como ela cresce. Cura 25 de vida e regenera 2 por segundo durante 15 s.'},'workbench',[[ITEM.CACTUS,3],[ITEM.ANCIENT_HONEY,2],[ITEM.CRYSTAL,1]],2);
referenceItem('REF_TRAIL_RATION','Pão de Forma Bem Quadrado','Aventura de Cubos','gold','bread',{cura:30,maxStack:20,descricao:'Pão de casca tão quadrada que dá para usar de régua. Recupera 30 de vida.'},'oven',[[ITEM.EGG,2],[ITEM.WATER,1],[ITEM.COAL,1]],3);
Object.assign(OUTFIT_JACKETS,{referenceAsh:[[19,56,62],[28,102,113],[64,173,179],[163,236,224]]});
referenceItem('REF_SCOUT_ARMOR','Capa do Besourinho Misterioso','Insetos Melancólicos','blue','maskcloak',{roupa:{defesa:.22,visual:'referenceScout'},referencePassive:'soulHurt',descricao:'Manto cinza-azulado com gola alta e tecido em pontas. Reduz dano em 22%. Ao receber dano, ganha 1 alma para o Agulhão da Alma Teimosa.'},'anvil',[[ITEM.LEATHER,8],[ITEM.SILK,6],[ITEM.BONE,4],[ITEM.CRYSTAL,3]]);
referenceItem('REF_ASH_ARMOR','Couraça Cubona Cintilante','Aventura de Cubos','blue','armor',{roupa:{defesa:.30,visual:'referenceAsh'},referencePassive:'thorns',descricao:'Cheia de quinas: quem bater nela se machuca. Reduz dano em 30%. Ao receber dano, devolve 8 de dano aos inimigos próximos, em estilhaços turquesa.'},'anvil',[[ITEM.METAL_BAR,10],[ITEM.CRYSTAL,8],[ITEM.LEATHER,5]]);
referenceItem('REF_FIRST_CHARM','Amuleto do Trovão do Vizinho','Fuga do Submundo','gold','boltcharm',{acessorio:{reference:true},referencePower:'thunder',descricao:'Herança do vizinho que reclama de tudo (inclusive do céu). Equipado: R chama um raio sobre o inimigo mais próximo em até 12 blocos. Dano: 28. Recarga: 6 s.'},'anvil',[[ITEM.GOLD,4],[ITEM.WIND_CRYSTAL,3],[ITEM.BRONZE,4]]);
referenceItem('REF_STONE_BROOCH','Botas Fura-Fila','Cavar e Pular','gold','boots',{acessorio:{reference:true},referencePassive:'sprint',descricao:'Quem calça nunca mais espera na fila. Equipadas: correr no chão aumenta a velocidade em 25%, com faíscas douradas.'},'anvil',[[ITEM.LEATHER,6],[ITEM.WIND_CRYSTAL,3],[ITEM.GOLD,2]]);
referenceItem('REF_FIRE_BLOOM','Flor Churrasqueira','Pulo em Cogumelos','ember','flower',{acessorio:{reference:true},referencePower:'fire',descricao:'Uma flor com o dom de fazer churrasco à distância. Equipada: R lança 3 bolas de fogo que quicam no chão. Dano: 12 por bola. Recarga: 3 s.'},'anvil',[[ITEM.STINGER,6],[ITEM.COAL,8],[ITEM.GEL,6],[ITEM.GOLD,2]]);
referenceItem('REF_SPRING_MUSHROOM','Cogumelo Duvidoso do Pulão','Pulo em Cogumelos','jade','mushroom',{cura:15,maxStack:10,referenceBuff:'spring',descricao:'Cogumelo de procedência duvidosa. Por 20 s: saltos 25% mais altos; cair sobre inimigos causa 18 de dano e faz você quicar. Cura 15 de vida.'},'workbench',[[ITEM.GEL,6],[ITEM.MEAT,2],[ITEM.CLOUD_ESSENCE,1]],2);
ITEM_DEFS[ITEM.REF_FOREST_BOW].bowPalette=[[46,39,31],[104,79,51],[174,143,78],[222,211,163]];
for(const id of [ITEM.REF_DEEP_PICK,ITEM.REF_ASH_ARMOR])Object.assign(ITEM_ART[id].cores,{a:[19,56,62],b:[28,102,113],c:[64,173,179],h:[163,236,224]});
for(const [id,color,edge]of [[ITEM.REF_DUEL_BLADE,'#c786d7','#ffe4ab'],[ITEM.REF_CAVERN_NEEDLE,'#99c7dd','#e7fbff'],[ITEM.REF_ASH_MAUL,'#e6773c','#ffd788']])ITEM_DEFS[id].trailStyle={band:color,bandA:.24,edges:[[0,edge,1]]};
