'use strict';

class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, left: false, right: false };
    this.textMode = false; // digitando num campo do jogo (busca do livro): as teclas não movem o jogador
    this.onKeyDown = null;
    this.onMouseDown = null;
    this.onWheel = null;

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return; // digitando em campos dos menus
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F3'].includes(e.code)) e.preventDefault();
      // Segurando Ctrl (cursor inteligente) as teclas do jogo não viram atalho do navegador (Ctrl+S, Ctrl+D...)
      if (e.ctrlKey && !e.metaKey && /^(Key[A-Z]|Digit\d)$/.test(e.code)) e.preventDefault();
      if (this.onKeyDown) this.onKeyDown(e, e.repeat); // repetição só vale para escrever
      if (!this.textMode) this.keys.add(e.code);
    });
    // Alt sozinho não abre o menu da janela (Alt+clique favorita itens no inventário)
    window.addEventListener('keyup', (e) => { if (e.key === 'Alt') e.preventDefault(); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.left = this.mouse.right = this.mouse.rawLeft = false;
    });

    canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    canvas.addEventListener('mousedown', (e) => {
      if(typeof game!=='undefined'&&game.intro?.active)return;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (e.button === 0) this.mouse.rawLeft = true; // estado real do botão (usado para arrastar na UI)
      // Clique consumido pela interface não chega ao mundo
      if (this.onMouseDown && this.onMouseDown(e.button, e.clientX, e.clientY, e.shiftKey, { ctrl: e.ctrlKey, alt: e.altKey })) return;
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = this.mouse.rawLeft = false;
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.onWheel) this.onWheel(Math.sign(e.deltaY));
    }, { passive: false });
  }

  down(code) { return this.keys.has(code); }
}
