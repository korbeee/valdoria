const fs=require('fs'),{chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{const page=await b.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
 const result=await page.evaluate(()=>{
 let checks=0;const check=(v,s)=>{if(!v)throw Error(s);checks++;};const ui=game.inventoryUI,ctx=renderer.ctx,canvas=renderer.canvas;
 const messages=ITEM_DEFS.filter(d=>d?.name).flatMap(d=>['+1 '+d.name,'Equipou: '+d.name,d.descricao||d.name]);messages.push('X'.repeat(160));
 const nail=ITEM_DEFS.findIndex(d=>d?.nailSkin!=null);game.inventory.slots[0]={item:nail,count:1};
 const fillText=ctx.fillText,draw=ui.draw,mapDraw=game.mapUI.draw,scale=ui.scale;ui.draw=game.mapUI.draw=()=>{};game.debug=game.showHelp=false;
 let mode='';ctx.fillText=function(text,x,y,...args){const t=this.getTransform(),m=this.measureText(text),start=this.textAlign==='center'?x-m.width/2:this.textAlign==='right'?x-m.width:x,left=t.e+start*t.a,right=left+m.width*t.a,top=t.f+(y-(m.actualBoundingBoxAscent||8))*t.d,bottom=t.f+(y+(m.actualBoundingBoxDescent||2))*t.d;check(left>=-.1&&right<=canvas.width+.1&&top>=-.1&&bottom<=canvas.height+.1,mode+' texto fora da tela: '+text);return fillText.call(this,text,x,y,...args);};
 for(const [w,h,s]of [[320,240,1],[537,320,2],[1280,720,2]]){
  canvas.width=w;canvas.height=h;ui.scale=()=>s;
  for(const text of messages){ctx.setTransform(1,0,0,1,0,0);mode='vida/almas '+w;ui.drawVitals(ctx,game.player);const t=ctx.getTransform();check(t.a===1&&t.d===1&&t.e===0&&t.f===0,'medidor alterou a escala da interface');mode='aviso '+w;game.toast={text,t:2};renderer.drawUI(game,w,h);}
  for(const d of ITEM_DEFS.filter(d=>d?.name))for(const [x,y]of [[0,0],[w/s,h/s]]){ctx.setTransform(s,0,0,s,UI.ORIGIN,UI.ORIGIN);ctx.font=UI_FONT;mode='descrição '+w+' '+d.name;ui.drawTooltip(ctx,{item:ITEM_DEFS.indexOf(d),count:1},x,y,s,true);}
 }
 ctx.fillText=fillText;ui.draw=draw;game.mapUI.draw=mapDraw;ui.scale=scale;
 let labelChecks=0;ctx.setTransform(1,0,0,1,0,0);ctx.fillText=function(text,x,y,...args){const m=this.measureText(text);check(x>=34&&x+m.width<=104&&y>=0&&y+1<=22,'nome ultrapassou espaço do equipamento: '+text);labelChecks++;return fillText.call(this,text,x,y,...args);};
 for(const d of ITEM_DEFS.filter(d=>d?.name))ui.drawEquipmentLabel(ctx,d.name,0,UIC.text);ctx.fillText=fillText;
 canvas.width=537;canvas.height=320;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#659dcc';ctx.fillRect(0,0,537,320);ui.draw=game.mapUI.draw=()=>{};ui.scale=()=>2;game.toast={text:'+1 Agulhão da Alma Teimosa (aparência sorteada)',t:2};renderer.drawUI(game,537,320);const toast=canvas.toDataURL();
 ctx.fillStyle='#659dcc';ctx.fillRect(0,0,537,320);ctx.setTransform(2,0,0,2,UI.ORIGIN,UI.ORIGIN);ctx.font=UI_FONT;const item=ITEM_DEFS.find(d=>d?.referenceStrike==='soul');ui.drawTooltipBox(ctx,item.name,item.descricao,245,130,2);const tooltip=canvas.toDataURL();
 canvas.width=960;canvas.height=720;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#659dcc';ctx.fillRect(0,0,960,720);ui.drawVitals(ctx,game.player);game.hat=ITEM_DEFS.findIndex(d=>d?.chapeu);game.boots=ITEM_DEFS.findIndex(d=>d?.bota);game.toast={text:'Equipou: '+ITEM_DEFS[game.hat].name,t:2};renderer.drawUI(game,960,720);ui.drawEquipmentPanel(ctx,null);const equipment=canvas.toDataURL();
 return {checks,labelChecks,toast,tooltip,equipment,items:ITEM_DEFS.filter(d=>d?.name).length};
 });if(errors.length)throw Error(errors.join('\n'));for(const key of ['toast','tooltip','equipment'])fs.writeFileSync(__dirname+'/item-text-'+key+'.png',Buffer.from(result[key].split(',')[1],'base64'));console.log(result.checks+' verificações de limites passaram para '+result.items+' itens em três tamanhos de tela, incluindo medidor de almas e '+result.labelChecks+' linhas de nomes de equipamento.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
