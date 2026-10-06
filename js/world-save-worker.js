'use strict';

// Conversão para texto e compressão rodam fora da thread que desenha e simula a partida.
function encodeSaveBytes(bytes){
 const parts=[];
 for(let i=0;i<bytes.length;i+=32768)parts.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
 return btoa(parts.join(''));
}
self.onmessage=async({data:{id,save}})=>{
 const progress=(value,label)=>self.postMessage({id,type:'progress',progress:value,label});
 try{
  let total=0,done=0;const recycle=[];
  const count=node=>{if(!node||typeof node!=='object')return;if(ArrayBuffer.isView(node)){total+=node.byteLength;return;}for(const value of Object.values(node))count(value);};
  count(save.state);progress(.08,'Preparando terreno');
  const encode=node=>{
   if(!node||typeof node!=='object')return;
   if((node.type==='bytes'||node.type==='canvas')&&ArrayBuffer.isView(node.data)){
    const bytes=new Uint8Array(node.data.buffer,node.data.byteOffset,node.data.byteLength);node.data=encodeSaveBytes(bytes);done+=bytes.byteLength;
    if(node.type==='bytes')recycle.push(bytes.buffer);
    progress(.08+.47*done/Math.max(1,total),'Preparando terreno');return;
   }
   for(const value of Object.values(node))encode(value);
  };
  encode(save.state);self.postMessage({id,type:'recycle',buffers:recycle},recycle);progress(.6,'Organizando seu progresso');
  const json=JSON.stringify(save);progress(.7,'Compactando mundo');
  const bytes=await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  self.postMessage({id,type:'complete',bytes},[bytes]);
 }catch(e){self.postMessage({id,type:'error',error:e.message||'Falha ao preparar o mundo.'});}
};
