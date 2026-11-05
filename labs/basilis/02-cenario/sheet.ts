// Editor da folha: carregar uma imagem (de IA ou não), ajustar a grade e tocar nas células para dar papéis.

import {
  GENERATED_LAYOUT,
  ROLES,
  ROLE_LABELS,
  cellAt,
  cellRect,
  generateSheet,
  generatedCells,
  sliceSheet,
  type Role,
  type RoleCells,
  type SheetLayout,
  type TileImages,
} from './tileset.ts';

interface StoredSheet {
  layout: SheetLayout;
  cells: RoleCells;
  /** Imagem carregada, como data URL. Nula = folha gerada. */
  image: string | null;
}

const STORAGE_KEY = 'basilis.lab02.sheet';
const GRID_FIELDS: [keyof SheetLayout, string][] = [
  ['tileSize', 'Tamanho do tile (px na imagem)'],
  ['offsetX', 'Margem à esquerda'],
  ['offsetY', 'Margem no topo'],
  ['spacing', 'Espaço entre tiles'],
];

export class SheetEditor {
  /** Tiles atuais, já fatiados em 16 × 16. */
  tiles: TileImages;
  source: 'gerada' | 'carregada' = 'gerada';
  private readonly generated = generateSheet();
  private readonly fallback: TileImages;
  private image: CanvasImageSource = this.generated;
  private imageSize = { width: this.generated.width, height: this.generated.height };
  private imageUrl: string | null = null;
  private layout: SheetLayout = { ...GENERATED_LAYOUT };
  private cells: RoleCells = generatedCells();
  private selected: Role = 'grass';
  private readonly view = document.createElement('canvas');
  private readonly previews = document.createElement('div');
  private readonly roleButtons = new Map<Role, HTMLButtonElement>();
  private readonly gridInputs = new Map<keyof SheetLayout, HTMLInputElement>();
  private readonly status = document.createElement('p');

  constructor(container: HTMLElement) {
    this.fallback = sliceSheet(this.generated, GENERATED_LAYOUT, generatedCells(), {} as TileImages);
    this.tiles = this.fallback;
    this.build(container);
    void this.restore();
  }

  private build(container: HTMLElement): void {
    const intro = document.createElement('p');
    intro.className = 'ajuda';
    intro.textContent = 'Carregue uma spritesheet (PNG), ajuste a grade até os quadrados caírem sobre os tiles, escolha um papel e toque no tile da folha que o representa.';

    const actions = document.createElement('div');
    actions.className = 'acoes';
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/png,image/webp,image/jpeg';
    file.hidden = true;
    file.addEventListener('change', () => {
      const chosen = file.files?.[0];
      if (chosen) void this.loadFile(chosen);
      file.value = '';
    });
    const load = button('Carregar spritesheet', () => file.click());
    const reset = button('Usar folha gerada', () => this.useGenerated());
    actions.append(load, reset, file);

    const grid = document.createElement('div');
    grid.className = 'grade';
    for (const [key, label] of GRID_FIELDS) {
      const row = document.createElement('label');
      row.className = 'campo-numero';
      const text = document.createElement('span');
      text.textContent = label;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = key === 'tileSize' ? '4' : '0';
      input.inputMode = 'numeric';
      input.addEventListener('change', () => {
        const value = Math.max(Number(input.min), Math.round(Number(input.value) || 0));
        this.layout[key] = value;
        this.apply();
      });
      this.gridInputs.set(key, input);
      row.append(text, input);
      grid.append(row);
    }

    const roles = document.createElement('div');
    roles.className = 'papeis';
    for (const role of ROLES) {
      const roleButton = button(ROLE_LABELS[role], () => {
        this.selected = role;
        this.refresh();
      });
      this.roleButtons.set(role, roleButton);
      roles.append(roleButton);
    }

    this.view.className = 'folha';
    this.view.addEventListener('click', (event) => this.pick(event));
    this.previews.className = 'previas';
    this.status.className = 'ajuda';

    container.append(intro, actions, grid, roles, this.view, this.previews, this.status);
    this.refresh();
  }

  private async loadFile(file: File): Promise<void> {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const image = await loadImage(url);
    this.image = image;
    this.imageSize = { width: image.naturalWidth, height: image.naturalHeight };
    this.imageUrl = url;
    // Chute inicial: folhas de IA costumam ter 8 tiles por linha.
    this.layout = { tileSize: Math.max(4, Math.floor(image.naturalWidth / 8)), offsetX: 0, offsetY: 0, spacing: 0 };
    this.cells = {};
    this.source = 'carregada';
    this.apply();
  }

  private useGenerated(): void {
    this.image = this.generated;
    this.imageSize = { width: this.generated.width, height: this.generated.height };
    this.imageUrl = null;
    this.layout = { ...GENERATED_LAYOUT };
    this.cells = generatedCells();
    this.source = 'gerada';
    this.apply();
  }

  private pick(event: MouseEvent): void {
    const rect = this.view.getBoundingClientRect();
    const ratio = this.imageSize.width / rect.width;
    const cell = cellAt(this.layout, (event.clientX - rect.left) * ratio, (event.clientY - rect.top) * ratio);
    if (!cell) return;
    this.cells[this.selected] = cell;
    const next = ROLES[(ROLES.indexOf(this.selected) + 1) % ROLES.length];
    if (!this.cells[next]) this.selected = next;
    this.apply();
  }

  private apply(): void {
    this.tiles = sliceSheet(this.image, this.layout, this.cells, this.fallback);
    this.save();
    this.refresh();
  }

  private refresh(): void {
    for (const [key, input] of this.gridInputs) input.value = String(this.layout[key]);
    for (const [role, roleButton] of this.roleButtons) {
      roleButton.classList.toggle('selecionado', role === this.selected);
      roleButton.classList.toggle('definido', Boolean(this.cells[role]));
    }
    this.drawSheet();
    this.drawPreviews();
    const missing = ROLES.filter((role) => !this.cells[role]).map((role) => ROLE_LABELS[role]);
    this.status.textContent = missing.length ? `Sem tile na folha (usa o gerado): ${missing.join(', ')}.` : 'Todos os papéis definidos.';
  }

  private drawSheet(): void {
    const { width, height } = this.imageSize;
    // A folha gerada é minúscula; amplia para dar para tocar.
    const zoom = width < 256 ? Math.floor(256 / width) : 1;
    this.view.width = width * zoom;
    this.view.height = height * zoom;
    const ctx = this.view.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.image, 0, 0, width * zoom, height * zoom);

    ctx.lineWidth = Math.max(1, Math.round(width / 300));
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    const step = this.layout.tileSize + this.layout.spacing;
    for (let row = 0; this.layout.offsetY + row * step < height; row++) {
      for (let col = 0; this.layout.offsetX + col * step < width; col++) {
        const { x, y, size } = cellRect(this.layout, { col, row });
        ctx.strokeRect(x * zoom, y * zoom, size * zoom, size * zoom);
      }
    }
    ctx.font = `${Math.max(12, Math.round((this.layout.tileSize * zoom) / 4))}px system-ui, sans-serif`;
    for (const role of ROLES) {
      const cell = this.cells[role];
      if (!cell) continue;
      const { x, y, size } = cellRect(this.layout, cell);
      ctx.strokeStyle = role === this.selected ? '#ffe066' : '#c9a227';
      ctx.lineWidth = Math.max(2, ctx.lineWidth * 2);
      ctx.strokeRect(x * zoom, y * zoom, size * zoom, size * zoom);
      ctx.fillStyle = '#ffe066';
      ctx.fillText(String(ROLES.indexOf(role) + 1), x * zoom + 4, y * zoom + Math.max(12, (size * zoom) / 4));
    }
  }

  private drawPreviews(): void {
    this.previews.replaceChildren(
      ...ROLES.map((role, index) => {
        const item = document.createElement('figure');
        const preview = document.createElement('canvas');
        preview.width = 16;
        preview.height = 16;
        preview.getContext('2d')!.drawImage(this.tiles[role], 0, 0);
        const caption = document.createElement('figcaption');
        caption.textContent = `${index + 1}. ${ROLE_LABELS[role]}`;
        item.append(preview, caption);
        return item;
      }),
    );
  }

  private save(): void {
    const stored: StoredSheet = { layout: this.layout, cells: this.cells, image: this.imageUrl };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Imagem grande demais para o armazenamento: guarda só a grade e os papéis.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, image: null, cells: {} }));
      } catch {
        // Sem armazenamento.
      }
    }
  }

  private async restore(): Promise<void> {
    let stored: StoredSheet | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredSheet | null;
    } catch {
      stored = null;
    }
    if (!stored?.image) return;
    try {
      const image = await loadImage(stored.image);
      this.image = image;
      this.imageSize = { width: image.naturalWidth, height: image.naturalHeight };
      this.imageUrl = stored.image;
      this.layout = stored.layout;
      this.cells = stored.cells;
      this.source = 'carregada';
      this.apply();
    } catch {
      this.useGenerated();
    }
  }
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.addEventListener('click', onClick);
  return element;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Imagem inválida'));
    image.src = url;
  });
}
