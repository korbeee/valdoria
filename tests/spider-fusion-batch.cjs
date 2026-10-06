const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {createCanvas,loadImage}=require('C:/Users/bagre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
async function main(){
 const token=process.env.SPRITE_FUSION_API_KEY||process.argv[2],config=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
 for(const job of config){
  const root='assets/spider/spritefusion/'+job.name;fs.mkdirSync(root,{recursive:true});
  if(fs.existsSync(root+'/0-spritesheet.png')){console.log('already saved: '+job.name);continue;}
  let inputs;
  if(job.file){const im=await loadImage(job.file),cv=createCanvas(job.width||192,job.height||128);const c=cv.getContext('2d');c.imageSmoothingEnabled=false;const scale=job.scale||1;c.drawImage(im,Math.round((cv.width-im.width*scale)/2),Math.round((cv.height-im.height*scale)/2),Math.round(im.width*scale),Math.round(im.height*scale));fs.writeFileSync(root+'/source.png',cv.toBuffer('image/png'));inputs=[{data_url:cv.toDataURL('image/png')}];}
  else inputs=[{asset_id:job.asset}];
  const body={operation:job.operation||'animate',inputs,prompt:job.prompt};if(body.operation==='animate'){body.output_frames=job.frames||8;body.colors=32;}else body.size=64;
  fs.writeFileSync(root+'/input.json',JSON.stringify(body));
  console.log('Generating '+job.name);
  const p=spawnSync(process.execPath,['tests/spider-fusion-api.cjs',token,job.name],{stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:600000});
  if(p.stdout)process.stdout.write(p.stdout);if(p.status!==0)throw Error(p.stderr?.toString()||p.error?.message||'generation failed');
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
