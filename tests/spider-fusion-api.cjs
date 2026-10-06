const fs=require('node:fs');
async function main(){
 const token=process.env.SPRITE_FUSION_API_KEY||process.argv[2],name=process.argv[3];
 const headers={authorization:'Bearer '+token,'content-type':'application/json'};
 if(name==='credits'){const r=await fetch('https://www.spritefusion.com/api/v1/credits',{headers});console.log(await r.text());return;}
 const root='assets/spider/spritefusion/'+name;fs.mkdirSync(root,{recursive:true});
 const body=JSON.parse(fs.readFileSync(root+'/input.json','utf8'));
 const response=await fetch('https://www.spritefusion.com/api/v1/generate',{method:'POST',headers,body:JSON.stringify(body)});
 if(!response.ok)throw Error('HTTP '+response.status+': '+await response.text());
 const record={operation:body.operation,prompt:body.prompt,outputs:[]};let buffer='';
 for await(const chunk of response.body){buffer+=Buffer.from(chunk).toString('utf8').replaceAll('\r\n','\n');let k;while((k=buffer.indexOf('\n\n'))>=0){const b=buffer.slice(0,k);buffer=buffer.slice(k+2);const data=b.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');if(!data)continue;const e=JSON.parse(data);if(e.type==='started')record.requestId=e.request_id;if(e.type==='output')record.outputs.push({...e.asset,index:e.index});fs.writeFileSync(root+'/request.json',JSON.stringify(record,null,2));if(e.type==='completed'&&e.status!=='succeeded')throw Error(JSON.stringify(e));}}
 for(const [i,a]of record.outputs.entries())for(const [key,suffix]of [['assetUrl',a.type==='animation'?'animation.webp':'image.png'],['spritesheetUrl','spritesheet.png']]){if(!a[key])continue;const r=await fetch(a[key]);if(!r.ok)throw Error('Download '+r.status);fs.writeFileSync(root+'/'+i+'-'+suffix,Buffer.from(await r.arrayBuffer()));}
 console.log(name+': '+record.outputs.length+' outputs saved');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
