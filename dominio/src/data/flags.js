// Bandeira e jaqueta: opções do editor. Símbolos são caminhos SVG num quadro 100×100.

export const FLAG_COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#f5f5f4', '#111827', '#7f1d1d', '#14532d'];
export const JACKET_COLORS = ['#111827', '#1f2937', '#f5f5f4', '#7f1d1d', '#1e3a8a', '#14532d', '#581c87', '#78350f', '#0f766e', '#be185d'];

export const PATTERNS = {
  lisa:     'Lisa',
  faixa:    'Faixa',
  listras:  'Listras',
  diagonal: 'Diagonal',
  cruz:     'Cruz',
  borda:    'Borda',
};

// Cada símbolo: d (caminho preenchido) e, opcional, holes (círculos vazados na cor do fundo) ou stroke (traço).
export const SYMBOLS = {
  raio:    { label: 'Raio',    d: 'M58 4 L22 56 L46 56 L36 96 L78 40 L54 40 L68 4 Z' },
  coroa:   { label: 'Coroa',   d: 'M12 78 L12 30 L33 52 L50 18 L67 52 L88 30 L88 78 Z' },
  estrela: { label: 'Estrela', d: 'M50 4 L61 38 L97 38 L68 59 L79 94 L50 72 L21 94 L32 59 L3 38 L39 38 Z' },
  lua:     { label: 'Lua',     d: 'M62 6 A44 44 0 1 0 62 94 A36 36 0 1 1 62 6 Z' },
  chama:   { label: 'Chama',   d: 'M50 4 C64 28 86 42 78 68 C72 88 58 96 50 96 C34 96 18 86 20 64 C22 48 34 42 38 26 C46 38 48 44 52 48 C58 34 58 20 50 4 Z' },
  caveira: { label: 'Caveira', d: 'M50 8 C27 8 13 24 13 45 C13 59 21 67 30 71 L30 90 L70 90 L70 71 C79 67 87 59 87 45 C87 24 73 8 50 8 Z',
             holes: [[36, 46, 9], [64, 46, 9], [50, 62, 4]] },
  asa:     { label: 'Asa',     d: 'M6 64 C26 30 60 16 96 10 C86 26 76 32 64 36 C78 38 86 40 94 44 C80 56 66 60 54 60 C62 64 68 70 72 78 C50 82 26 76 6 64 Z' },
  olho:    { label: 'Olho',    d: 'M4 50 C22 22 78 22 96 50 C78 78 22 78 4 50 Z', holes: [[50, 50, 15]], dot: [50, 50, 7] },
  adaga:   { label: 'Adaga',   d: 'M47 4 L53 4 L58 60 L42 60 Z M28 60 L72 60 L72 68 L28 68 Z M44 68 L56 68 L56 90 L44 90 Z M41 90 L59 90 L59 96 L41 96 Z' },
  cobra:   { label: 'Cobra',   stroke: 'M74 16 C30 12 26 44 50 50 C74 56 72 86 28 86', head: [78, 16, 9] },
};

export const DEFAULT_FLAG = { bg: '#ef4444', fg: '#111827', pattern: 'diagonal', symbol: 'raio', sym: '#f5f5f4' };
export const DEFAULT_JACKET = { color: '#111827', accent: '#ef4444' };
