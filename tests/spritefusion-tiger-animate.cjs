const fs = require('node:fs');
const path = require('node:path');

const token = process.argv[2];
if (!token) throw new Error('Sprite Fusion token ausente.');

const body = {
  operation: 'animate',
  output_frames: 16,
  colors: 32,
  prompt: 'Create a seamless, slow stalking walk cycle for this exact pixel-art tiger boss. Keep its horizontal side-facing body, orange and charcoal striped fur, expressive feline face, four grounded paws and long tail. Give every leg a distinct weight shift and contact pose, with a subtle tail sway and shoulder motion. No clothes, weapons, accessories, glow or new scenery. Preserve the detailed hand-drawn pixel clusters and the existing proportions.',
  inputs: [{ asset_id: 'be37218f-ca63-4550-bb78-1cfe4327f83f' }],
};

async function main() {
  const response = await fetch('https://www.spritefusion.com/api/v1/generate', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', requestId = null, completed = false;
  const outputs = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
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

  const root = 'assets/tiger/spritefusion-walk-test';
  fs.mkdirSync(root, { recursive: true });
  for (const [index, asset] of outputs.entries()) {
    for (const [key, suffix] of [['assetUrl', 'animation.webp'], ['spritesheetUrl', 'spritesheet.png']]) {
      if (!asset[key]) continue;
      const image = await fetch(asset[key]);
      if (!image.ok) throw new Error(`Baixar ${key} falhou.`);
      fs.writeFileSync(path.join(root, `${index + 1}-${suffix}`), Buffer.from(await image.arrayBuffer()));
    }
  }
  fs.writeFileSync(path.join(root, 'request.json'), JSON.stringify({ requestId, operation: body.operation, prompt: body.prompt, sourceAssetId: body.inputs[0].asset_id, outputs }, null, 2));
  console.log(JSON.stringify({ requestId, outputCount: outputs.length, outputs: outputs.map((asset, index) => ({ index: index + 1, id: asset.id })) }));
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
