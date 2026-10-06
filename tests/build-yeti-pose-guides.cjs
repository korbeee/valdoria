const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{fs.mkdirSync('assets/yeti/guides',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://localhost/jogo-teste/tests/yeti-preview.html');
 for(const name of ['walk','roar','appear']){
  const png=await page.evaluate(name=>{
   const c=document.createElement('canvas');c.width=c.height=1280;const ctx=c.getContext('2d');ctx.fillStyle='#f5f7fb';ctx.fillRect(0,0,1280,1280);
   const line=(points,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();};
   const knee=(hip,foot)=>{const a=58,b=56,dx=foot.x-hip.x,dy=foot.y-hip.y,d=Math.hypot(dx,dy),q=(a*a-b*b+d*d)/(2*d),h=Math.sqrt(Math.max(0,a*a-q*q));return {x:hip.x+q*dx/d+h*dy/d,y:hip.y+q*dy/d-h*dx/d};};
   const foot=u=>u<.5?{x:174-u*176,y:260}:{x:86+(u-.5)*176,y:260-22*Math.sin((u-.5)*Math.PI*2)};
   for(let f=0;f<16;f++){
    ctx.save();ctx.translate(f%4*320,Math.floor(f/4)*320);ctx.fillStyle='#8996a9';ctx.font='bold 16px sans-serif';ctx.fillText(String(f+1),16,26);ctx.strokeStyle='#b9c5d4';ctx.lineWidth=1;ctx.strokeRect(1,1,318,318);ctx.beginPath();ctx.moveTo(20,270);ctx.lineTo(300,270);ctx.stroke();
    const u=f/16,progress=f/15,phase=u*Math.PI*2;
    const rise=name==='appear'?progress:1,hip={x:130,y:210-45*rise},shoulder={x:128,y:152-70*rise},head={x:158,y:140-88*rise};
    const nearFoot=name==='walk'?foot(u):{x:174,y:260},farFoot=name==='walk'?foot((u+.5)%1):{x:92,y:260};
    const roar=name==='roar'?Math.sin(progress*Math.PI):0;
    const nearHand={x:171+18*Math.sin(phase)*(name==='walk'),y:174-132*roar},farHand={x:112-14*Math.sin(phase)*(name==='walk'),y:156-122*roar};
    if(name==='appear'){nearHand.y=180-22*rise;farHand.y=169-24*rise;}
    const nearElbow={x:147+38*roar,y:130-59*roar},farElbow={x:94-25*roar,y:128-61*roar};
    line([hip,knee(hip,farFoot),farFoot],'#436cc3',16);line([{x:farFoot.x-13,y:farFoot.y},{x:farFoot.x+20,y:farFoot.y}],'#436cc3',13);
    line([{x:shoulder.x-9,y:shoulder.y+5},farElbow,farHand],'#436cc3',14);ctx.fillStyle='#436cc3';ctx.fillRect(farHand.x-11,farHand.y-10,22,20);
    line([hip,{x:112,y:(hip.y+shoulder.y)/2},shoulder,head],'#697780',34);ctx.fillStyle='#697780';ctx.beginPath();ctx.ellipse(head.x,head.y,24,26,0,0,Math.PI*2);ctx.fill();line([head,{x:head.x+30,y:head.y+9}],'#697780',15);
    line([hip,knee(hip,nearFoot),nearFoot],'#e19a34',19);line([{x:nearFoot.x-14,y:nearFoot.y},{x:nearFoot.x+24,y:nearFoot.y}],'#e19a34',15);
    line([shoulder,nearElbow,nearHand],'#e19a34',19);ctx.fillStyle='#e19a34';ctx.fillRect(nearHand.x-14,nearHand.y-12,28,24);
    ctx.restore();
   }return c.toDataURL().split(',')[1];
  },name);fs.writeFileSync('assets/yeti/guides/'+name+'.png',Buffer.from(png,'base64'));
 }console.log('Guias de caminhada, rugido e aparição salvos.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
