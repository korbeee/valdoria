# Cursores de Valdoria

A versão atual usa **pixel art**, conforme a correção do usuário: sprites de 32 × 32 em `pixel/`, sem suavização no jogo. A folha gerada está em `valdoria-pixel-atlas.png`. Prévia em `tests/cursor-sprites-pixel.png`. A arte foi criada com a ferramenta integrada de geração de imagens, recortada e reduzida por vizinho mais próximo. Veja a direção atual em `PIXEL-ART.md`.

## Versão HD anterior (substituída)

Arte criada com a ferramenta integrada de geração de imagens, com transparência. A folha original está em `valdoria-hd-atlas.png`; os 14 sprites individuais de 128 × 128 estão em `hd/`. O jogo usa versões suavizadas de 48 × 48 e mantém o cursor nativo do navegador. A folha antiga não é carregada.

`js/cursor.js` carrega a arte e define os pontos de clique. `tests/prepare-cursors.cjs` recorta e redimensiona a folha sem repintar os desenhos. `tests/cursor.cjs` verifica os estados, carregamento e transparência, e monta `tests/cursor-sprites-hd.png`, com uma ampliação e o tamanho real de cada cursor.

## Prompt usado

Create ONE production-ready transparent PNG sprite atlas for mouse cursors for a woodland survival crafting game called Valdoria. This is a single sprite-sheet asset, not a presentation or mockup. HD hand-painted fantasy inventory art, polished smooth antialiased outlines, understated bevels, fine ivory highlights, antique honey-gold brass, walnut wooden handles, desaturated blue-grey steel, muted sage accents. Charming, tasteful, elegant, grounded forest adventure aesthetic. Excellent silhouette clarity at 40px. Not pixel art, not chunky, not neon, not cartoon emoji. NO lettering, labels, titles, grid lines, frames, decorative background, drop-shadow planes, sparkles or disconnected particles. Actual transparent alpha background throughout.

LAYOUT EXACTLY: 4 columns by 4 rows of equally sized square cells, canvas 1024x1024. Each cell is 256x256. Each cursor object centered within its own cell with at least 36px empty transparent padding on all sides. Same visual scale and lighting direction for all cells. Keep each silhouette entirely inside its own cell. Last two cells empty transparent. Exactly these fourteen objects in this row-major order:

Row 1 col 1: beautiful slender classic northwest-pointing mouse arrowhead, ivory enameled main face with honey-gold brass rim, dark slender outline, elegant asymmetric pointed silhouette and small sage gem inset near heel. This is a clean flat mouse pointer, not a weapon.

Row 1 col 2: delicate brass and ivory circular aiming reticle, four short cardinal ticks, hollow transparent center, perfectly centered.

Row 1 col 3: ivory leather glove pointing index finger straight up, warm brown leather cuff, subtle gold trim, natural hand anatomy.

Row 1 col 4: matching ivory leather glove closed gently into a gripping fist, brown cuff and gold trim.

Row 2 col 1: compact steel pickaxe, walnut handle diagonal lower-left to upper-right, realistic curved pointed metal head.

Row 2 col 2: small lovely forest woodcutting axe, curved steel blade, walnut handle, leather binding.

Row 2 col 3: small gardener shovel, blue silver rounded shovel head at upper right, wooden shaft to lower left.

Row 2 col 4: crafting hammer, sturdy steel rectangular head upper right, wooden handle to lower left.

Row 3 col 1: elegant short steel sword pointing upper left, restrained brass crossguard, leather grip, clear blade tip.

Row 3 col 2: compact construction symbol: three charming bevelled sandstone masonry blocks stacked in a tiny wall, sage accent.

Row 3 col 3: bug-catching net: round ivory mesh loop upper right with visibly transparent holes, walnut handle lower left.

Row 3 col 4: small round green glass healing potion with golden stopper and one ivory leaf on bottle, clearly readable silhouette.

Row 4 col 1: restrained copper-red prohibition ring with diagonal bar, subtle bright edge, transparent center.

Row 4 col 2: elegant ivory and brass text insertion I-beam caret, tall slender symmetrical design.

Row 4 col 3 and col 4: completely empty transparent.

All are standalone cursors, NOT arrows with a badge attached. Prioritize clean expressive professionally painted forms that work as small actual game cursors.
