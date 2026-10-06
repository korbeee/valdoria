const fs = require('node:fs');
const {createCanvas,loadImage}=require('C:/Users/bagre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
async function main(){
 const token=process.env.SPRITE_FUSION_API_KEY||process.argv[2];
 const base=await loadImage('assets/tiger/spritefusion-refined-test/variation-2.png');
 const padded=createCanvas(200,100),ctx=padded.getContext('2d');ctx.drawImage(base,37,35);
 const inputs=[{data_url:padded.toDataURL('image/png')}];
 for(const [name,prompt] of [
  ['idle-complete','Stationary breathing idle loop. This exact tiger stands on four planted paws, blinks and subtly moves its tail tip. Fixed camera, no walking or translation, consistent anatomy and size throughout.'],
  ['swipe-complete','A stationary claw swipe: raise the near front paw, extend it forward with claws, then return it to the ground. Keep this exact tiger and fixed camera. Keep the full face, paws and tail visible throughout; use the empty space around the tiger for the extended paw. No translation or zoom.']]){
  const root='assets/tiger/spritefusion-motion/'+name;fs.mkdirSync(root,{recursive:true});
  const body={operation:'animate',output_frames:8,colors:32,inputs,prompt};
  const res=await fetch('https://www.spritefusion.com/api/v1/generate',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok)throw Error('HTTP '+res.status+': '+await res.text());
  let buffer='';const record={operation:'animate',prompt,source:'spritefusion-refined-test/variation-2.png',outputs:[]};
  for await(const chunk of res.body){buffer+=Buffer.from(chunk).toString('utf8').replaceAll('\r\n','\n');let k;while((k=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,k);buffer=buffer.slice(k+2);const data=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');if(!data)continue;const e=JSON.parse(data);if(e.type==='started')record.requestId=e.request_id;if(e.type==='output')record.outputs.push(e.asset);fs.writeFileSync(root+'/request.json',JSON.stringify(record,null,2));if(e.type==='completed'&&e.status!=='succeeded')throw Error(JSON.stringify(e));}}
  for(const [i,a]of record.outputs.entries())for(const [key,file]of [['spritesheetUrl','spritesheet.png'],['assetUrl','animation.webp']]){const r=await fetch(a[key]);if(!r.ok)throw Error('download');fs.writeFileSync(root+'/'+(i+1)+'-'+file,Buffer.from(await r.arrayBuffer()));}
  console.log(name+': '+record.outputs.length+' saved');
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
