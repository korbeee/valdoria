const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');let count=0;
for(const dir of ['js','server','tests'])for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
 if(!entry.isFile()||!['.js','.cjs'].includes(path.extname(entry.name)))continue;
 const file=path.join(root,dir,entry.name),result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);count++;
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
for(const file of scripts)assert(fs.existsSync(path.join(root,file)),'Script ausente: '+file);
assert(scripts.indexOf('js/world-saves.js')<scripts.indexOf('js/game.js'),'Salvamento deve carregar antes do jogo');
assert(fs.existsSync(path.join(root,'js/world-save-worker.js')),'Worker de salvamento ausente');
assert(fs.existsSync(path.join(root,'server/world-save-storage.php')),'Armazenamento de mundos ausente');
for(const file of ['README.md','docs/README.md','tests/README.md','package.json','server/package.json'])assert(fs.existsSync(path.join(root,file)),'Arquivo de projeto ausente: '+file);
console.log(`${count} scripts válidos; ${scripts.length} referências do jogo verificadas.`);
