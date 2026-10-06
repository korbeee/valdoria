const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('C:/Users/bagre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
(async()=>{
 const source=fs.readFileSync('js/tiger-art.js','utf8');
 assert(!source.includes('new Image('));assert(!source.includes('tigerPose('));
 const api=vm.runInNewContext(source+';({paintTiger,TIGER_ART,TIGER_FRAME})');
 const {W,H}=api.TIGER_ART,F=api.TIGER_FRAME;
 const atlas=await loadImage('assets/tiger/integrated/atlas.png');
 const a=createCanvas(atlas.width,atlas.height),c=a.getContext('2d');c.drawImage(atlas,0,0);
 for(let f=0;f<F.count;f++){
  const expected=c.getImageData(f%7*W,Math.floor(f/7)*H,W,H).data,actual=new Uint8ClampedArray(W*H*4);
  api.paintTiger({set(x,y,color){assert(x>0&&x<W-1&&y>=0&&y<H,`bounds ${f}`);actual.set([...color,255],(y*W+x)*4);}},null,f);
  for(let p=0;p<expected.length;p+=4){if(expected[p+3]<128){expected.fill(0,p,p+4);}else expected[p+3]=255;}
  assert.deepEqual(actual,expected,`PNG differs at ${f}`);
  assert(actual.some(v=>v));
  assert(Array.from({length:W},(_,x)=>actual[((H-1)*W+x)*4+3]).some(Boolean),`ground ${f}`);
 }
 const selector=fs.readFileSync('js/savanna-art.js','utf8').match(/function tigerFrame\(m\) \{[\s\S]*?\n\}/)[0];
 const select=vm.runInNewContext(selector+';tigerFrame',{TIGER_ART:api.TIGER_ART,TIGER_FRAME:F});
 const seen=new Set();for(const state of ['sleep','wake','hunt','return','swipe','crouch','pounce','recover','stun','roar'])for(let i=0;i<120;i++)for(const vx of [0,15])for(const vy of [-10,10]){
  const f=select({state,sleeping:state==='sleep',clock:i/8,stateT:i/60,onGround:state!=='pounce',vy,vx,gait:i/4});assert(Number.isInteger(f)&&f>=0&&f<F.count,`${state}: ${f}`);seen.add(f);
 }
 assert.equal(seen.size,F.count,'All 49 states reachable');
 console.log('PASS: 49 runtime frames match actual PNG pixels; all states covered; no legacy fallback; margins and ground verified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
