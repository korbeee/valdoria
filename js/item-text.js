'use strict';
// =====================================================================================
//  TEXTOS CURTOS DOS ITENS
// =====================================================================================
// As dicas de item ficavam enormes. Aqui estão as versões enxutas (até uns 110 caracteres, 2 a 4 linhas)
// dos itens que mais passavam disso. Carrega depois de todos os arquivos que criam itens e antes de game.js.
// Regra de ouro: nome, o que faz, número que importa. Piada só se couber em meia linha.

const SHORT_ITEM_TEXT = {
  'Boné do Bigodão': 'Bigodão já colado. Defesa 5%. R: 4 s invencível (recarga 90 s); 25% ao levar golpe. Conjunto Encanado Bigodão.',
  'Camisa Encanada': 'Camisa vermelha, macacão azul e luvas brancas. Defesa 10%. Conjunto Encanado Bigodão: +6% de defesa.',
  'Botas Pisa-Pisa': 'Para quem resolve tudo pisando na cabeça dos outros. Defesa 4%. Pisão leve. Conjunto Encanado Bigodão.',
  'Arco Quadradão': 'Madeira quadrada, mira redonda. R gasta 3 flechas numa rajada explosiva (recarga 4 s).',
  'Frasco de Alma em Conserva': 'Alma engarrafada, sabor menta. Cura 20 e enche o medidor de almas do Agulhão.',
  'Amuleto do Trovão do Vizinho': 'Herança do vizinho que reclama do céu. R: raio no inimigo mais próximo (28 de dano, recarga 6 s).',
  'Carne Suculenta': 'Do Patriarca. Solte (Q) perto do Tigre adormecido para acordá-lo.',
  'Marreta do Rei Chateado': 'O rei dos mortos largou o cargo e esqueceu a marreta. Acertar o chão solta uma onda de brasas.',
  'Pedra dos Ventos': 'Coloque 3 lado a lado, em chão firme: sobe uma corrente de ar. Quebrar uma desativa.',
  'Couraça Cubona Cintilante': 'Cheia de quinas. Defesa 30%. Ao ser atingido, devolve 8 de dano a quem estiver perto.',
  'Cogumelinho': 'Cogumelo de carinha que anda sacolejando. Só enfeite. Em baús de cabanas e minas.',
  'Picareta de Diamante': 'Seus antigos donos tinham uma regra: nunca cavar diretamente sob os próprios pés. Afortunada: minério dá de 1 a 5.',
  'Cogumelo Duvidoso do Pulão': 'De procedência duvidosa. 20 s: pulo 25% maior e pisão de 18 de dano. Cura 15.',
  'Flor Churrasqueira': 'Faz churrasco à distância. R: 3 bolas de fogo que quicam (12 de dano cada, recarga 3 s).',
  'Sapinho': 'Sapinho de olhos esbugalhados que pula atrás de você. Só enfeite. Em baús de vilas e acampamentos.',
  'Capa do Besourinho Misterioso': 'Manto escuro com gola alta. Defesa 22%. Ao ser atingido, ganha 1 alma para o Agulhão.',
  'Escudo do Escavador': 'Botão direito com arma (ou F) ergue o escudo. No tempo certo anula o golpe e o próximo sai 80% mais forte.',
  'Totem da Nevasca': 'Invoca o Yeti, o Abominável (botão direito). Fora do gelo ele fica mais forte.',
  'Fantasminha': 'Fantasminha tímido que flutua atrás de você. Só enfeite. Em baús de masmorras e do céu.',
  'Corujinha': 'Corujinha curiosa de olhos enormes que paira ao seu lado. Só enfeite. Em baús de torres e templos.',
  'Machado do Fazendeiro Ocupado': 'Só está "dando uma olhadinha" na plantação. R: cura 15 e chove folhinha (recarga 20 s).',
  'Frasco de Nuvem Mal Fechado': 'Nuvem engarrafada que fugiu da escola. Pulo extra no ar; recarrega no chão.',
  'Pintinho da Tempestade': 'Pintinho com penas de relâmpago que voa soltando faíscas. Só enfeite. Cai do Olho da Tempestade.',
  'Picareta Brilha-Muito': 'Brilha mais que a sua autoestima. R: revela minérios por 5 s (recarga 12 s).',
  'Núcleo de Vendaval': 'Núcleo de ar comprimido da carapaça do Casco de Ferro. Faz Pedras dos Ventos.',
  'Célula de combustível': 'Combustível do Jetpack dos Vigias: 20 s de impulso, gasta sozinha ao voar.',
  'Gelatina': 'Gelatina turquesa com uma bolhinha dentro. Só enfeite. Em baús de minas e geodos.',
  'Fruta Estrela do Quintal': 'Não pergunte como cresce. Cura 25 e regenera 2 por segundo por 15 s.',
  'Mini-Núcleo': 'Fragmento vivo do Núcleo: basalto rachado com o coração em brasa. Só enfeite. Cai do Núcleo.',
  'Botas Fura-Fila': 'Nunca mais espere na fila. Correr no chão fica 25% mais rápido.',
  'Tigrinho de Âmbar': 'Filhote listrado do Tigre da Floresta que rosna de brincadeira. Só enfeite. Cai do Tigre.',
  'Raposinha': 'Raposinha ruiva de rabo enorme. Só enfeite. Em baús de tribos, ruínas e acampamentos.',
  'Luvas de Seda': 'No ar, empurre uma parede para agarrar por 2 s e pule dela. Recarrega no chão.',
  'Yetizinho': 'Bolota de pelo branco com carinha de gelo, solta um friozinho. Só enfeite. Cai do Yeti.',
};
const SHORT_NEEDLE_TEXT = 'Acertos juntam almas (máx. 6). Medidor cheio: botão direito solta uma rajada. Golpe para baixo no ar: pogo.';
const SHORT_SAPLING_TEXT = 'Plante em terra, grama, neve ou areia com espaço em cima. Vira árvore em minutos.';

ITEM_DEFS.forEach((d) => {
  if (!d?.name) return;
  if (d.nailSkin != null) d.descricao = SHORT_NEEDLE_TEXT;
  else if (/^Muda /.test(d.name) && d.descricao?.startsWith('Plante')) d.descricao = SHORT_SAPLING_TEXT;
  else if (SHORT_ITEM_TEXT[d.name]) d.descricao = SHORT_ITEM_TEXT[d.name];
});
