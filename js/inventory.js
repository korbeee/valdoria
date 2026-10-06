'use strict';

const MAX_STACK = 999;

// Itens com maxStack no defItem (ex.: ferramentas = 1) empilham menos
const maxStackOf = (item) => (ITEM_DEFS[item] && ITEM_DEFS[item].maxStack) || MAX_STACK;

class Inventory {
  constructor(size) {
    this.slots = Array.from({ length: size }, () => null);
  }

  // Retorna quantos itens NÃO couberam
  add(item, count) {
    return this.addRange(item, count, 0, this.slots.length);
  }

  addRange(item, count, start, end) {
    for (let i = start; i < end && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.item === item && s.count < maxStackOf(item)) {
        const n = Math.min(count, maxStackOf(item) - s.count);
        s.count += n;
        count -= n;
      }
    }
    for (let i = start; i < end && count > 0; i++) {
      if (!this.slots[i]) {
        const n = Math.min(count, maxStackOf(item));
        this.slots[i] = { item, count: n };
        count -= n;
      }
    }
    return count;
  }

  canAdd(item, count) {
    let room = 0;
    const max = maxStackOf(item);
    for (const s of this.slots) room += !s ? max : s.item === item ? Math.max(0, max - s.count) : 0;
    return room >= count;
  }

  count(item) {
    return this.slots.reduce((sum, s) => sum + (s && s.item === item ? s.count : 0), 0);
  }

  usedSlots() {
    return this.slots.reduce((n, s) => n + (s ? 1 : 0), 0);
  }

  removeItem(item, count) {
    if (this.count(item) < count) return false;
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.item === item) {
        const n = Math.min(count, s.count);
        s.count -= n;
        count -= n;
        if (s.count === 0) this.slots[i] = null;
      }
    }
    return true;
  }

  takeFromSlot(i) {
    const s = this.slots[i];
    if (!s) return;
    if (--s.count === 0) this.slots[i] = null;
  }

  // Junta pilhas iguais e ordena por tipo de item dentro do intervalo.
  // Itens favoritos (Alt+clique) ficam parados no lugar e os outros se arrumam em volta.
  sortRange(start, end) {
    const totals = new Map();
    for (let i = start; i < end; i++) {
      const s = this.slots[i];
      if (s?.fav) continue;
      if (s) totals.set(s.item, (totals.get(s.item) || 0) + s.count);
      this.slots[i] = null;
    }
    let i = start;
    for (const item of [...totals.keys()].sort((a, b) => a - b)) {
      let n = totals.get(item);
      while (n > 0 && i < end) {
        if (this.slots[i]) { i++; continue; } // espaço de favorito
        const k = Math.min(n, maxStackOf(item));
        this.slots[i++] = { item, count: k };
        n -= k;
      }
    }
  }
}
