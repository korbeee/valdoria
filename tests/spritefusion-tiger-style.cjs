const fs = require('node:fs');
const path = require('node:path');

const token = process.argv[2];
if (!token) throw new Error('Sprite Fusion token ausente.');
const inputPath = 'C:/Users/bagre/AppData/Local/Temp/codex-clipboard-479ce117-2f43-42a8-83f9-22f6b509c30b.png';
const reference = `data:image/png;base64,${fs.readFileSync(inputPath).toString('base64')}`;
const body = {
  operation: 'style-reference', size: 64,
  prompt: 'An adult tiger boss for a side-scrolling fantasy cave game, full body in a left-facing three-quarter stalking pose. Use the supplied image strictly as the visual style reference: dense deliberate pixel clusters, expressive feline face, orange fur with bold charcoal stripes, cream muzzle and chest, strong silhouette, visible paws, tail, layered fur and anatomy. Make it imposing and coherent at game scale.',
  inputs: [{ data_url: reference }],
};

async function main() {
  fs.writeFileSync('tests/spritefusion-tiger-style.log', 'started\n');
  const response = await fetch('https://www.spritefusion.com/api/v1/generate', {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', completed = false, requestId = null;
  const outputs = [];
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream: true }).replaceAll('\r\n', '\n');
    for (let boundary = buffer.indexOf('\n\n'); boundary >= 0; boundary = buffer.indexOf('\n\n')) {
      const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
      const json = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!json) continue;
      const event = JSON.parse(json);
      if (event.type === 'started') requestId = event.request_id;
      if (event.type === 'output') outputs.push(event.asset);
      if (event.type === 'completed') { completed = true; if (event.status !== 'succeeded') throw new Error(JSON.stringify(event.error || event)); }
    }
  }
  if (!completed || !outputs.length) throw new Error('stream_interrupted');
  const root = 'assets/tiger/spritefusion-style-test'; fs.mkdirSync(root, { recursive: true });
  for (const [index, asset] of outputs.entries()) {
    const image = await fetch(asset.assetUrl); if (!image.ok) throw new Error(`Baixar asset ${asset.id} falhou.`);
    fs.writeFileSync(path.join(root, `variation-${index + 1}.png`), Buffer.from(await image.arrayBuffer()));
  }
  const record = { requestId, operation: body.operation, prompt: body.prompt, reference: inputPath, outputs };
  fs.writeFileSync(path.join(root, 'request.json'), JSON.stringify(record, null, 2));
  fs.appendFileSync('tests/spritefusion-tiger-style.log', `completed ${outputs.length}\n`);
  console.log(JSON.stringify({ requestId, outputCount: outputs.length, outputs: outputs.map((a, index) => ({ index: index + 1, id: a.id, url: a.assetUrl })) }));
}
main().catch(error => { fs.appendFileSync('tests/spritefusion-tiger-style.log', `error ${error.stack || error.message}\n`); console.error(error.stack || error.message); process.exitCode = 1; });
