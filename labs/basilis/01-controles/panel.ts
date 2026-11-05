// Painel de ajustes montado a partir de FIELDS. Cada mudança vale na hora e fica salva no aparelho.

import { DEFAULTS, FIELDS, saveSettings, type Field, type Settings } from './settings.ts';

export function mountPanel(container: HTMLElement, settings: Settings): void {
  const form = document.createElement('form');
  form.addEventListener('submit', (event) => event.preventDefault());

  const refreshers: (() => void)[] = [];
  for (const field of FIELDS) {
    const { row, refresh } = buildField(field, settings);
    form.append(row);
    refreshers.push(refresh);
  }

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'restaurar';
  reset.textContent = 'Restaurar padrão';
  reset.addEventListener('click', () => {
    Object.assign(settings, DEFAULTS);
    saveSettings(settings);
    refreshers.forEach((refresh) => refresh());
  });
  form.append(reset);
  container.append(form);
}

function buildField(field: Field, settings: Settings): { row: HTMLElement; refresh: () => void } {
  const row = document.createElement('label');
  row.className = `campo campo-${field.kind}`;
  const title = document.createElement('span');
  title.className = 'rotulo';
  title.textContent = field.label;
  row.append(title);
  const values = settings as unknown as Record<string, unknown>;

  if (field.kind === 'range') {
    const output = document.createElement('output');
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min: String(field.min), max: String(field.max), step: String(field.step) });
    const refresh = () => {
      input.value = String(values[field.key]);
      output.textContent = `${values[field.key]}${field.unit ? ` ${field.unit}` : ''}`;
    };
    input.addEventListener('input', () => {
      values[field.key] = Number(input.value);
      saveSettings(settings);
      refresh();
    });
    title.append(output);
    row.append(input);
    refresh();
    return { row, refresh };
  }

  if (field.kind === 'choice') {
    const select = document.createElement('select');
    for (const [value, label] of field.options) select.add(new Option(label, value));
    const refresh = () => {
      select.value = String(values[field.key]);
    };
    select.addEventListener('change', () => {
      values[field.key] = select.value;
      saveSettings(settings);
    });
    row.append(select);
    refresh();
    return { row, refresh };
  }

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  const refresh = () => {
    checkbox.checked = Boolean(values[field.key]);
  };
  checkbox.addEventListener('change', () => {
    values[field.key] = checkbox.checked;
    saveSettings(settings);
  });
  row.prepend(checkbox);
  refresh();
  return { row, refresh };
}
