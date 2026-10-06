const fs = require('node:fs');
const path = require('node:path');

const [token, name, sourceAssetId, prompt] = process.argv.slice(2);
if (!token || !name || !sourceAssetId || !prompt) throw new Error('Uso: token, nome, asset e movimento.');
const body = { operation: 'animate', output_frames: 8, colors: 32, prompt, inputs: [{ asset_id: sourceAssetId }] };

async function main() {
  const response = await fetch('https://www.spritefusion.com/api/v1/generate', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '', requestId = null, completed = false; const outputs = [];
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream: true }).replaceAll('\r\n', '\n');
    for (let boundary = buffer.indexOf('\n\n'); boundary >= 0; boundary = buffer.indexOf('\n\n')) {
      const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
      const json = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n'); if (!json) continue;
      const event = JSON.parse(json); if (event.type === 'started') requestId = event.request_id; if (event.type === 'output') outputs.push(event.asset);
      if (event.type === 'completed') { completed = true; if (event.status !== 'succeeded') throw new Error(JSON.stringify(event.error || event)); }
    }
  }
  if (!completed || !outputs.length) throw new Error('stream_interrupted');
  const root = path.join('assets/tiger/spritefusion-motion', name); fs.mkdirSync(root, { recursive: true });
  for (const [index, asset] of outputs.entries()) for (const [key, suffix] of [['assetUrl', 'animation.webp'], ['spritesheetUrl', 'spritesheet.png']]) {
    if (!asset[key]) continue; const file = await fetch(asset[key]); if (!file.ok) throw new Error(`Baixar ${key} falhou.`);
    fs.writeFileSync(path.join(root, `${index + 1}-${suffix}`), Buffer.from(await file.arrayBuffer()));
  }
  fs.writeFileSync(path.join(root, 'request.json'), JSON.stringify({ requestId, operation: body.operation, prompt: body.prompt, sourceAssetId, outputs }, null, 2));
  console.log(JSON.stringify({ requestId, outputs: outputs.map((asset, index) => ({ index: index + 1, id: asset.id, frames: asset.frameCount })) }));
}
main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
