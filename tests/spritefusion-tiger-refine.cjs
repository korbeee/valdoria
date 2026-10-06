const fs = require('node:fs');
const path = require('node:path');
const token = process.argv[2];
if (!token) throw new Error('Sprite Fusion token ausente.');
const body = {
  operation: 'edit', size: 64,
  prompt: 'Remove the clothes, scarf, straps, weapons, jewelry and all humanoid elements. Keep the pixel-art rendering quality and expressive striped tiger face. Turn it into a natural, heavy adult tiger boss in a low stalking side pose: muscular horizontal body, four powerful paws planted on the ground, long tail, broad shoulders, orange fur, charcoal stripes, and a cream muzzle and chest. It must read clearly as a dangerous feline enemy for a 2D side-scrolling game.',
  inputs: [{ asset_id: '213c1ac5-5824-4702-ba03-a8c8943d6472' }],
};
async function main() {
  const response = await fetch('https://www.spritefusion.com/api/v1/generate', { method:'POST', headers:{authorization:`Bearer ${token}`,'content-type':'application/json'}, body:JSON.stringify(body) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const reader=response.body.getReader(), decoder=new TextDecoder(); let buffer='',completed=false,requestId=null;const outputs=[];
  while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true}).replaceAll('\r\n','\n');for(let boundary=buffer.indexOf('\n\n');boundary>=0;boundary=buffer.indexOf('\n\n')){const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);const json=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!json)continue;const event=JSON.parse(json);if(event.type==='started')requestId=event.request_id;if(event.type==='output')outputs.push(event.asset);if(event.type==='completed'){completed=true;if(event.status!=='succeeded')throw new Error(JSON.stringify(event.error||event));}}}
  if(!completed||!outputs.length)throw new Error('stream_interrupted');
  const root='assets/tiger/spritefusion-refined-test';fs.mkdirSync(root,{recursive:true});
  for(const [index,asset] of outputs.entries()){const image=await fetch(asset.assetUrl);if(!image.ok)throw new Error(`Baixar asset ${asset.id} falhou.`);fs.writeFileSync(path.join(root,`variation-${index+1}.png`),Buffer.from(await image.arrayBuffer()));}
  fs.writeFileSync(path.join(root,'request.json'),JSON.stringify({requestId,operation:body.operation,prompt:body.prompt,sourceAssetId:body.inputs[0].asset_id,outputs},null,2));
  console.log(JSON.stringify({requestId,outputCount:outputs.length,outputs:outputs.map((a,index)=>({index:index+1,id:a.id,url:a.assetUrl}))}));
}
main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
