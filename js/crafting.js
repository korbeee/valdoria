'use strict';

// Motor de criação: transforma RECIPES (js/recipes.js) numa forma fácil de comparar.
// Uma receita é uma lista de ingredientes com quantidade — não existe desenho na grade.
// A bancada olha o que está em cima dela e lista TUDO que dá para montar; se a mesma
// pilha serve para mais de uma coisa, todas aparecem e quem escolhe é o jogador.

const BENCH_SLOTS = 5; // espaços da bancada (= máximo de ingredientes diferentes)

function craftWarn(label, msg) {
  console.warn(`[Criação] Receita "${label}": ${msg}`);
}

function compileRecipes(list) {
  const compiled = [];
  list.forEach((r, idx) => {
    const label = r.nome || `#${idx + 1}`;
    const res = r.resultado || {};
    if (!ITEM_DEFS[res.item]) return craftWarn(label, 'resultado.item não existe (confira o nome em ITEM).');
    const raw = r.ingredientes;
    if (!Array.isArray(raw) || !raw.length)
      return craftWarn(label, 'ingredientes precisa ser uma lista de pares [item, quantidade].');
    const items = [];
    for (const par of raw) {
      const [item, qtd] = Array.isArray(par) ? par : [par, 1];
      if (!ITEM_DEFS[item]) return craftWarn(label, 'um dos ingredientes não existe.');
      const n = Math.max(1, Math.floor(qtd || 1));
      const igual = items.find((e) => e.item === item);
      if (igual) igual.count += n;
      else items.push({ item, count: n });
    }
    if (items.length > BENCH_SLOTS) return craftWarn(label, `são no máximo ${BENCH_SLOTS} ingredientes diferentes.`);
    compiled.push({
      name: label,
      station: recipeStation(r),
      items,
      total: items.reduce((n, i) => n + i.count, 0),
      result: { item: res.item, count: clamp(Math.floor(res.quantidade || 1), 1, MAX_STACK),variants:res.variantes?.filter(id=>ITEM_DEFS[id]) },
    });
  });
  return compiled;
}

// Quantas vezes a receita cabe no que está nesses espaços (bancada, inventário...)
function craftTimes(slots, recipe) {
  let times = Infinity;
  for (const need of recipe.items) {
    let have = 0;
    for (const s of slots) if (s && s.item === need.item) have += s.count;
    times = Math.min(times, Math.floor(have / need.count));
    if (times <= 0) return 0;
  }
  return times === Infinity ? 0 : times;
}

// Tudo que dá para montar agora com o que está na bancada.
// As receitas que gastam mais material vêm primeiro (as "maiores" antes das triviais).
function benchRecipes(slots, station = null) {
  return craftRecipes().filter((r) => stationRecipeAllowed(r, station) && craftTimes(slots, r) > 0).sort((a, b) => b.total - a.total);
}

// Tira os ingredientes da receita desses espaços (usa as pilhas menores primeiro)
function takeIngredients(slots, recipe, times = 1) {
  for (const need of recipe.items) {
    let left = need.count * times;
    for (let i = 0; i < slots.length && left > 0; i++) {
      const s = slots[i];
      if (!s || s.item !== need.item) continue;
      const n = Math.min(left, s.count);
      s.count -= n;
      left -= n;
      if (s.count <= 0) slots[i] = null;
    }
  }
}

// Receitas que usam o item como ingrediente / que produzem o item
const recipesUsing = (item) => craftRecipes().filter((r) => r.items.some((i) => i.item === item));
const recipesMaking = (item) => craftRecipes().filter((r) => r.result.item === item||r.result.variants?.includes(item));
const craftResultItem = r => r.result.variants?.length?r.result.variants[Math.floor(Math.random()*r.result.variants.length)]:r.result.item;

// Texto curto dos ingredientes, para dicas e para o menu "Como jogar"
const recipeCostText = (r) => r.items.map((i) => `${i.count}× ${ITEM_DEFS[i.item].name}`).join(' + ');

// Vários arquivos (balde, puçá, ruínas, Coração...) carregam DEPOIS deste e ainda empurram
// receitas em RECIPES, porque os itens deles só nascem lá. Por isso a lista compilada não é
// montada uma vez só no carregamento: craftRecipes() compila o que entrou desde a última
// olhada. Quem lê as receitas (bancada, livro, menu) passa sempre por ela.
const CRAFT_RECIPES = [];
let craftCompiled = 0;
function craftRecipes() {
  if (craftCompiled < RECIPES.length) {
    CRAFT_RECIPES.push(...compileRecipes(RECIPES.slice(craftCompiled)));
    craftCompiled = RECIPES.length;
  }
  return CRAFT_RECIPES;
}
