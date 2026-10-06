'use strict';

const MAP_FOG = true;            // false = mapa todo revelado desde o início
const MAP_REVEAL_RADIUS = 18;    // em tiles, ao redor do jogador
const MAP_ZOOMS = [0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 16]; // px da tela por tile no mapa grande
const FOG_COLOR = [10, 12, 16];
const MAP_WALL_COLORS = {
  [WALL.DIRT]: [58, 40, 30], [WALL.STONE]: [50, 50, 60], [WALL.PLANKS]: [80, 56, 36], [WALL.BRICK]: [76, 44, 36],
  [WALL.STONE_BRICK]: [58, 58, 64], [WALL.SANDSTONE]: [92, 72, 44], [WALL.WOOD]: [56, 38, 24], [WALL.SNOW]: [96, 104, 116],
};
const MAP_TILE_COLORS = { [TILE.GRASS]: [86, 172, 60] };

const MINIMAP = { W: 96, H: 82, BAR: 12 };

// ---------- Dados do mapa: 1 pixel por tile, em pedaços de 256x256 criados sob demanda ----------
const MAP_CHUNK = 256;

class WorldMap {
  constructor(world) {
    this.world = world;
    this.revealed = new Uint8Array(world.w * world.h);
    if (!MAP_FOG) this.revealed.fill(1);
    this.allExplored = !MAP_FOG;
    this.chunks = new Map();
    this.lastRevealKey = -1;

    world.onTileChange = (x, y) => {
      this.paint(x, y);
      this.paint(x, y + 1); // o realce de "topo exposto" do tile de baixo muda
    };
  }

  colorAt(x, y) {
    const w = this.world;
    const i = y * w.w + x;
    const t = w.tiles[i];
    const n = (hash2(x, y, 55) - 0.5) * 12;
    // Água: azul, mais escura quanto mais funda (medida a partir do nível do mar)
    if (w.water[i] && !SOLID[t]) {
      const c = lerpColor([70, 140, 222], [22, 62, 150], clamp((y - w.seaLevel) / 45, 0, 1));
      return [c[0] + n * 0.4, c[1] + n * 0.4, c[2] + n * 0.4];
    }
    if (t !== TILE.AIR) {
      const c = MAP_TILE_COLORS[t] || TILE_DEFS[t].color;
      const k = w.getTile(x, y - 1) === TILE.AIR ? 1.2 : 1;
      return [c[0] * k + n, c[1] * k + n, c[2] * k + n];
    }
    const wall = w.walls[i];
    if (wall !== WALL.NONE) {
      const c = MAP_WALL_COLORS[wall] || [62, 57, 53];
      return [c[0] + n * 0.5, c[1] + n * 0.5, c[2] + n * 0.5];
    }
    if (y <= w.surface[x] + 1) return lerpColor([84, 148, 222], [176, 214, 246], clamp(y / w.surface[x], 0, 1));
    return [24, 24, 32];
  }

  // Pedaço (cx, cy); com create = true ele é criado e pintado inteiro
  chunk(cx, cy, create) {
    const key = cy * 65536 + cx;
    let c = this.chunks.get(key);
    if (c || !create) return c;
    const w = this.world, cw = Math.min(MAP_CHUNK, w.w - cx * MAP_CHUNK), ch = Math.min(MAP_CHUNK, w.h - cy * MAP_CHUNK);
    const canvas = makeCanvas(cw, ch), ctx = canvas.getContext('2d');
    c = { canvas, ctx, img: ctx.createImageData(cw, ch), dirty: true, x0: cx * MAP_CHUNK, y0: cy * MAP_CHUNK };
    this.chunks.set(key, c);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) this.paintInto(c, c.x0 + x, c.y0 + y);
    return c;
  }

  paintInto(c, x, y) {
    const i = y * this.world.w + x;
    const col = this.revealed[i] ? this.colorAt(x, y) : FOG_COLOR;
    const d = c.img.data, p = ((y - c.y0) * c.img.width + (x - c.x0)) * 4;
    d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = 255;
    c.dirty = true;
  }

  paint(x, y) {
    if (!this.world.inBounds(x, y)) return;
    const c = this.chunk(Math.floor(x / MAP_CHUNK), Math.floor(y / MAP_CHUNK), false);
    if (c) this.paintInto(c, x, y); // pedaço ainda não criado será pintado quando for
  }

  reveal(cx, cy, r) {
    const w = this.world;
    const key = cy * w.w + cx;
    if (key === this.lastRevealKey) return;
    this.lastRevealKey = key;
    for (let y = Math.max(0, cy - r); y <= Math.min(w.h - 1, cy + r); y++)
      for (let x = Math.max(0, cx - r); x <= Math.min(w.w - 1, cx + r); x++) {
        const i = y * w.w + x;
        if (this.revealed[i] || (x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
        this.revealed[i] = 1;
        this.paintInto(this.chunk(Math.floor(x / MAP_CHUNK), Math.floor(y / MAP_CHUNK), true), x, y);
      }
  }

  flush() {
    for (const c of this.chunks.values()) if (c.dirty) { c.ctx.putImageData(c.img, 0, 0); c.dirty = false; }
  }

  revealAll() {
    this.revealed.fill(1);
    this.allExplored = true;
    this.chunks.clear();
    this.lastRevealKey = -1;
  }

  // Desenha o mapa com o tile (0,0) em (ox, oy) e `z` px por tile, só o que cai no retângulo de recorte
  drawTo(ctx, ox, oy, z, clipX, clipY, clipW, clipH) {
    const w = this.world, S = MAP_CHUNK;
    const cx0 = Math.max(0, Math.floor((clipX - ox) / z / S)), cx1 = Math.min(Math.ceil(w.w / S) - 1, Math.floor((clipX + clipW - ox) / z / S));
    const cy0 = Math.max(0, Math.floor((clipY - oy) / z / S)), cy1 = Math.min(Math.ceil(w.h / S) - 1, Math.floor((clipY + clipH - oy) / z / S));
    for (let cy = cy0; cy <= cy1; cy++)
      for (let cx = cx0; cx <= cx1; cx++) {
        // Revelar os dados também precisa gerar os desenhos, inclusive ao arrastar
        // até uma região que nunca foi visitada. Só materializa a área visível.
        const c = this.chunk(cx, cy, this.allExplored);
        if (!c) continue; // inexplorado: fica a cor da névoa do fundo
        if (c.dirty) { c.ctx.putImageData(c.img, 0, 0); c.dirty = false; }
        const x = Math.round(ox + c.x0 * z), y = Math.round(oy + c.y0 * z);
        ctx.drawImage(c.canvas, x, y, Math.round(ox + (c.x0 + c.canvas.width) * z) - x, Math.round(oy + (c.y0 + c.canvas.height) * z) - y);
      }
  }

  describe(x, y) {
    const w = this.world;
    if (!w.inBounds(x, y)) return 'Fora do mundo';
    const i = y * w.w + x;
    if (!this.revealed[i]) return 'Inexplorado';
    const t = w.tiles[i];
    const where = BIOME_NAMES[w.biomeAt(x)];
    if (t !== TILE.AIR) return `${TILE_DEFS[t].name} · ${where}`;
    if (w.walls[i] !== WALL.NONE) return `Caverna · ${where}`;
    return y <= w.surface[x] ? `Céu · ${where}` : 'Vazio';
  }
}

// ---------- Minimapa + mapa grande ----------
class MapUI {
  constructor(game, input, renderer) {
    this.game = game;
    this.input = input;
    this.renderer = renderer;
    this.open = false;
    this.zoom = 4;
    this.cx = 0;
    this.cy = 0;
    this.drag = null;
  }

  get scale() { return this.game.inventoryUI.scale(); }

  // Retângulo do minimapa em px da tela
  minimapRect() {
    const s = this.scale;
    const w = MINIMAP.W * s, h = MINIMAP.H * s;
    const cw = this.renderer.canvas.width;
    // Em telas estreitas, desce o minimapa para não cobrir a hotbar
    const fits = cw >= (UI.W + MINIMAP.W) * s + UI.ORIGIN * 3;
    const y = fits ? UI.ORIGIN : UI.ORIGIN + (UI.HOTBAR_H + 16) * s;
    return [cw - UI.ORIGIN - w, y, w, h];
  }

  bigLayout() {
    const s = this.scale, c = this.renderer.canvas;
    const pw = Math.floor((c.width - 32) / s), ph = Math.floor((c.height - 32) / s);
    const ox = Math.floor((c.width - pw * s) / 2), oy = Math.floor((c.height - ph * s) / 2);
    return {
      s, pw, ph, ox, oy,
      close: [pw - 17, 6, 12, 12],
      area: [ox + 5 * s, oy + 29 * s, (pw - 10) * s, (ph - 47) * s], // px da tela
    };
  }

  openMap() {
    const { world, player } = this.game;
    if (this.game.inventoryUI.open) this.game.inventoryUI.close();
    const L = this.bigLayout();
    const fit = MAP_ZOOMS.filter((z) => world.w * z <= L.area[2] && world.h * z <= L.area[3]);
    this.zoom = fit.length ? fit[fit.length - 1] : 2; // mundo grande não cabe: começa perto do jogador
    this.cx = fit.length ? world.w / 2 : player.cx / T;
    this.cy = fit.length ? world.h / 2 : player.cy / T;
    this.drag = null;
    this.open = true;
  }

  close() {
    this.open = false;
    this.drag = null;
  }

  toggle() {
    if (this.open) this.close();
    else this.openMap();
  }

  // Esconde o minimapa se ele cobrir o inventário ou a janela de craft abertos
  minimapVisible() {
    const inv = this.game.inventoryUI;
    if (!inv.open) return true;
    const a = this.minimapRect(), b = inv.screenBounds();
    return a[0] >= b[0] + b[2] || b[0] >= a[0] + a[2] || a[1] >= b[1] + b[3] || b[1] >= a[1] + a[3];
  }

  capturesMouse(mx, my) {
    return this.open || (this.minimapVisible() && inRect(mx, my, this.minimapRect()));
  }

  onMouseDown(button, mx, my) {
    if (!this.open) {
      if (!this.minimapVisible() || !inRect(mx, my, this.minimapRect())) return false;
      if (button === 0) this.openMap();
      return true;
    }
    const L = this.bigLayout();
    const u = (mx - L.ox) / L.s, v = (my - L.oy) / L.s;
    if (button === 0 && inRect(u, v, L.close)) this.close();
    else if (button === 0 && inRect(mx, my, L.area)) this.drag = { mx, my, cx: this.cx, cy: this.cy };
    return true;
  }

  // Zoom mantendo fixo o ponto sob o cursor
  zoomAt(dir) {
    const L = this.bigLayout();
    const idx = MAP_ZOOMS.indexOf(this.zoom);
    const next = MAP_ZOOMS[clamp(idx - dir, 0, MAP_ZOOMS.length - 1)];
    if (next === this.zoom) return;
    const { x, y } = this.input.mouse;
    const [ax, ay, aw, ah] = L.area;
    if (inRect(x, y, L.area)) {
      const mx = x - (ax + aw / 2), my = y - (ay + ah / 2);
      this.cx += mx / this.zoom - mx / next;
      this.cy += my / this.zoom - my / next;
    }
    this.zoom = next;
    this.clampView();
  }

  clampView() {
    const { world } = this.game;
    this.cx = clamp(this.cx, 0, world.w);
    this.cy = clamp(this.cy, 0, world.h);
  }

  draw(ctx) {
    this.game.map.flush();
    ctx.imageSmoothingEnabled = false;
    ctx.font = UI_FONT;
    ctx.textBaseline = 'alphabetic';
    if (this.open) this.drawBig(ctx);
    else if (this.minimapVisible()) this.drawMini(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawMarker(ctx, x, y, size) {
    const blink = 0.75 + Math.sin(performance.now() / 180) * 0.25;
    ctx.globalAlpha = blink;
    // cabeça do sprite do jogador (quadro parado)
    ctx.drawImage(this.renderer.playerAtlas, 6, 5, 18, 18, Math.round(x - 9 * size), Math.round(y - 9 * size), 18 * size, 18 * size);
    ctx.globalAlpha = 1;
  }

  drawMini(ctx) {
    const { map, player } = this.game;
    const s = this.scale;
    const [rx, ry] = this.minimapRect();
    const { W, H, BAR } = MINIMAP;
    ctx.setTransform(s, 0, 0, s, rx, ry);
    uiFrame(ctx, 0, 0, W, H);

    const ax = 5, ay = 5, aw = W - 10, ah = H - 10 - BAR;
    rrect(ctx, ax - 1, ay - 1, aw + 2, ah + 2, '#0e0e0e');
    ctx.fillStyle = rgb(FOG_COLOR);
    ctx.fillRect(ax, ay, aw, ah);

    const ptx = player.cx / T, pty = player.cy / T;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ax, ay, aw, ah);
    ctx.clip();
    map.drawTo(ctx, Math.round(ax + aw / 2 - ptx), Math.round(ay + ah / 2 - pty), 1, ax, ay, aw, ah);
    this.drawMarker(ctx, ax + aw / 2, ay + ah / 2, 0.64);
    ctx.restore();

    // Rodapé com coordenadas
    const by = H - BAR - 3;
    ctx.fillStyle = UIC.header;
    ctx.fillRect(4, by, W - 8, BAR - 1);
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(4, by - 1, W - 8, 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#dcdcdc';
    ctx.fillText(`${Math.floor(ptx)}, ${Math.floor(pty)}`, 6, by + 9);
    ctx.textAlign = 'right';
    ctx.fillStyle = UIC.limeBright;
    ctx.fillText('[M]', W - 5, by + 9);
  }

  drawBig(ctx) {
    const { map, world, player } = this.game;
    const L = this.bigLayout();
    const { s, pw, ph } = L;
    const W = this.renderer.canvas.width, H = this.renderer.canvas.height;

    if (this.drag) {
      if (!this.input.mouse.rawLeft) {
        // Admin: clique sem arrastar teleporta o jogador para o ponto clicado
        const moved = Math.hypot(this.input.mouse.x - this.drag.mx, this.input.mouse.y - this.drag.my);
        if (this.game.adminMapTeleport && moved < 4) {
          const [ax, ay, aw, ah] = L.area, z = this.zoom;
          const tx = Math.floor((this.drag.mx - Math.round(ax + aw / 2 - this.cx * z)) / z);
          const ty = Math.floor((this.drag.my - Math.round(ay + ah / 2 - this.cy * z)) / z);
          this.drag = null;
          if (adminTeleport(this.game, tx, ty)) { this.close(); return; }
        }
        this.drag = null;
      } else {
        this.cx = this.drag.cx - (this.input.mouse.x - this.drag.mx) / this.zoom;
        this.cy = this.drag.cy - (this.input.mouse.y - this.drag.my) / this.zoom;
        this.clampView();
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    ctx.setTransform(s, 0, 0, s, L.ox, L.oy);
    uiFrame(ctx, 0, 0, pw, ph);

    // Cabeçalho
    ctx.fillStyle = UIC.header;
    ctx.fillRect(4, 4, pw - 8, 22);
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(4, 26, pw - 8, 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = UIC.text;
    ctx.fillText('Mapa do mundo', 8, 13);
    const sub = this.game.adminMapTeleport ? 'Clique: teleportar   Arraste: mover   Roda: zoom ' : 'Arraste: mover   Roda: zoom ';
    ctx.fillStyle = UIC.lime;
    ctx.fillText(sub, 8, 22);
    ctx.fillStyle = UIC.limeBright;
    ctx.fillText('[M]', 8 + ctx.measureText(sub).width, 22);

    const { x: mx, y: my } = this.input.mouse;
    const cr = L.close;
    ctx.fillStyle = inRect((mx - L.ox) / s, (my - L.oy) / s, cr) ? UIC.limeBright : UIC.text;
    for (let k = 0; k < 6; k++) {
      ctx.fillRect(cr[0] + 3 + k, cr[1] + 3 + k, 2, 1);
      ctx.fillRect(cr[0] + 8 - k, cr[1] + 3 + k, 2, 1);
    }

    rrect(ctx, 4, 28, pw - 8, ph - 45, '#0e0e0e');

    // Rodapé
    ctx.fillStyle = UIC.header;
    ctx.fillRect(4, ph - 16, pw - 8, 12);
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(4, ph - 17, pw - 8, 1);

    // Mapa (em px da tela para ficar nítido em qualquer zoom)
    const [ax, ay, aw, ah] = L.area;
    const z = this.zoom;
    const x0 = Math.round(ax + aw / 2 - this.cx * z), y0 = Math.round(ay + ah / 2 - this.cy * z);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = rgb(FOG_COLOR);
    ctx.fillRect(ax, ay, aw, ah);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ax, ay, aw, ah);
    ctx.clip();
    map.drawTo(ctx, x0, y0, z, ax, ay, aw, ah);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 0.5, y0 - 0.5, world.w * z + 1, world.h * z + 1);
    this.drawMarker(ctx, x0 + (player.cx / T) * z, y0 + (player.cy / T) * z, Math.max(1, Math.floor(s * 0.75)));
    ctx.restore();

    // Informações do rodapé
    ctx.setTransform(s, 0, 0, s, L.ox, L.oy);
    let info;
    if (inRect(mx, my, L.area)) {
      const tx = Math.floor((mx - x0) / z), ty = Math.floor((my - y0) / z);
      info = `X ${tx}  Y ${ty}  ${map.describe(tx, ty)}`;
    } else {
      info = `Jogador: X ${Math.floor(player.cx / T)}  Y ${Math.floor(player.cy / T)}`;
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#dcdcdc';
    ctx.fillText(info, 8, ph - 6);
    ctx.textAlign = 'right';
    ctx.fillText(`Zoom ${z}x`, pw - 8, ph - 6);
  }
}
