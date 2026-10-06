// Offline production-art test: no browser, UI automation or network required.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,ImageData}=require('C:/Users/bagre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const sandbox=vm.createContext({console,ImageData,performance,document:{createElement:()=>createCanvas(1,1)},assert,
  save:(name,c)=>fs.writeFileSync(name,c.toBuffer('image/png')),digest:c=>crypto.createHash('sha256').update(c.getContext('2d').getImageData(0,0,c.width,c.height).data).digest('hex')});
for(const path of ['js/util.js','js/tiles.js','js/decor.js','js/organic-trees.js','js/world.js','js/player.js','js/water.js','js/tree-fall.js'])vm.runInContext(fs.readFileSync(path,'utf8'),sandbox,{filename:path});
const result=vm.runInContext(`(()=>{
 const checks={},hashes=new Set(),start=performance.now();
 const gallery=makeCanvas(1320,1200),ctx=gallery.getContext('2d');ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#24352f';ctx.fillRect(0,0,gallery.width,gallery.height);
 const kinds=['oak','oak','oak','maple','blossom','willow','jungle','birch','pine','snowPine','acacia','acacia'];
 const generate=(seed,kind)=>kind==='pine'||kind==='snowPine'?generateOrganicPine(seed,kind==='snowPine'):kind==='acacia'?generateOrganicAcacia(seed):generateOrganicCanopy(seed,kind);
 for(let i=0;i<kinds.length;i++){
   const seed=713+i*917,tree=generate(seed,kinds[i]),height=(i%3+6)*T;
   const trunk=organicTrunkFor(tree,height),x=165+(i%4)*330,base=365+Math.floor(i/4)*400,z=2;
   ctx.drawImage(trunk,Math.round(x-trunk.width*z/2),base-height*z,trunk.width*z,trunk.height*z);
   ctx.drawImage(tree.canvas,Math.round(x-tree.canvas.width*z/2),base-height*z+(tree.overlap-tree.canvas.height)*z,tree.canvas.width*z,tree.canvas.height*z);
   ctx.fillStyle='#405a38';ctx.fillRect(x-140,base,280,4);ctx.fillStyle='#1a2522';ctx.fillRect(x-140,base+4,280,13);
   ctx.fillStyle='#d6d8b4';ctx.font='16px monospace';ctx.fillText(kinds[i]+' / '+seed,x-80,base+32);
   hashes.add(digest(tree.canvas));
   assert.equal(digest(tree.canvas),digest(generate(seed,kinds[i]).canvas));
 }
 save('tests/organic-trees-gallery.png',gallery);
 checks.uniqueSilhouettes=hashes.size===kinds.length;checks.deterministic=true;
 const a=canopyFor(150,BIOME.FOREST,871),again=canopyFor(150,BIOME.FOREST,871),other=canopyFor(150,BIOME.FOREST,872);
 checks.cacheReuse=a===again;checks.worldSeedChangesTree=digest(a.canvas)!==digest(other.canvas);
 const saved=digest(a.canvas),limit=ORGANIC_TREES.cacheLimit;ORGANIC_TREES.cacheLimit=12;organicTreeCache.clear();
 for(let i=0;i<ORGANIC_TREES.cacheLimit+5;i++)canopyFor(i,BIOME.FOREST,871);
 checks.cacheBounded=organicTreeCache.size<=ORGANIC_TREES.cacheLimit;checks.evictionStable=saved===digest(canopyFor(150,BIOME.FOREST,871).canvas);
 ORGANIC_TREES.cacheLimit=limit;
 checks.snowAndCoast=!!canopyFor(151,BIOME.SNOW,871).canvas&&!!canopyFor(151,BIOME.OCEAN,871).canvas;
 // A chopped tree must retain exactly the generated trunk/crown until landing.
 const world=new World(180,100,871,{lazy:true});let tx=40;
 while(!canopyFor(tx,BIOME.FOREST,world.seed).organic)tx++;
 for(let y=40;y<=47;y++)world.setTile(tx,y,TILE.TRUNK);world.setTile(tx,48,TILE.DIRT);
 const g={world,player:{cx:tx*T-20},particles:[],fallingTrees:[],shake:0};
 const before=canopyFor(tx,BIOME.FOREST,world.seed),body=organicTrunkFor(before,8*T),drops=[];
 globalThis.spawnParticles=()=>{};globalThis.playSfx=()=>{};globalThis.dropItem=(g,item,count)=>drops.push({item,count});
 startTreeFall(g,tx,45);const fall=g.fallingTrees[0];
 checks.cutPreservesArt=fall.canopy===before&&fall.trunkArt===body;
 checks.cutPreservesStump=world.getTile(tx,46)===TILE.STUMP&&world.getTile(tx,47)===TILE.TRUNK&&world.getTile(tx,45)===TILE.AIR;
 const fallPreview=makeCanvas(400,240);drawFallingTrees(fallPreview.getContext('2d'),g,{flat:{}});
 landTree(g,fall);checks.woodDropCount=drops.filter(d=>d.item===ITEM.WOOD).reduce((s,d)=>s+d.count,0)===6;
 for(const [name,value] of Object.entries(checks))assert.ok(value,name);
 return {checks,generationAndTestsMs:performance.now()-start};
})()`,sandbox);
fs.writeFileSync('tests/organic-trees-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
