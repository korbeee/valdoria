const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const box=vm.createContext({window:{},console,assert});
for(const file of ['js/util.js','js/render-style.js','js/shaders.js'])vm.runInContext(fs.readFileSync(file,'utf8'),box,{filename:file});
vm.runInContext(`
const TILE={AIR:0,STONE:1,GLASS:2,LATTICE_WINDOW:3,LEAVES:4,TRUNK:5};
const WALL={NONE:0},SOLID=[0,1,1,1,0,0];
const world={isSkyExposed:(x,y)=>y<10,getTile:(x,y)=>y===10?TILE.STONE:TILE.AIR,getWall:()=>0,hasWater:()=>false};
let field=shaderSunField(world,-10,8,20,8,.2);
assert.ok(field.slice(0,60).every(v=>v>.99),'sky and incident roof light');
assert.ok(field.slice(60).every(v=>v===0),'solid roof blocks sunlight');
world.getTile=(x,y)=>y===10?TILE.GLASS:TILE.AIR;
field=shaderSunField(world,-10,8,20,8,.2);
assert.ok(field[80]>.8&&field[80]<.9,'glass transmits partial sunlight');
assert.ok(shaderSunStep(.2)<0,'light travels downward-left');
assert.ok(shaderHighlightWeight(.97,.72)<shaderHighlightWeight(.55,.72)*.25,'pale highlights retain headroom');
assert.equal(shaderHighlightWeight(.04,.72),0,'dark outlines do not glow');
let min=1,max=0,delta=0,last=shaderBeamAt(0,100,.2);
for(let x=1;x<1800;x++){const v=shaderBeamAt(x,100,.2);min=Math.min(min,v);max=Math.max(max,v);delta=Math.max(delta,Math.abs(last-v));last=v;}
assert.ok(max-min>.4&&delta<.04,'broad feathered rays with dark gaps');
const step=shaderSunStep(.2);
assert.ok(Math.abs(shaderBeamAt(100,200,.2)-shaderBeamAt(100+step*80,280,.2))<1e-9,'ray field anchored to light travel');
console.log('8 rendering math checks passed');
`,box);
