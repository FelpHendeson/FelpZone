// Painel de ajustes montado a partir de uma lista de campos. Cada mudança vale na hora e é salva.

import type { Field } from './settings.ts';

export function mountPanel<T extends object>(
  container: HTMLElement,
  settings: T,
  fields: Field<T>[],
  defaults: T,
  save: (settings: T) => void,
): void {
  const form = document.createElement('form');
  form.addEventListener('submit', (event) => event.preventDefault());

  const refreshers: (() => void)[] = [];
  for (const field of fields) {
    const { row, refresh } = buildField(field, settings, save);
    form.append(row);
    refreshers.push(refresh);
  }

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'restaurar';
  reset.textContent = 'Restaurar padrão';
  reset.addEventListener('click', () => {
    Object.assign(settings, defaults);
    save(settings);
    refreshers.forEach((refresh) => refresh());
  });
  form.append(reset);
  container.append(form);
}

function buildField<T extends object>(field: Field<T>, settings: T, save: (settings: T) => void): { row: HTMLElement; refresh: () => void } {
  const row = document.createElement('label');
  row.className = `campo campo-${field.kind}`;
  const title = document.createElement('span');
  title.className = 'rotulo';
  title.textContent = field.label;
  row.append(title);
  const values = settings as unknown as Record<string, unknown>;
  const key = field.key as string;

  if (field.kind === 'range') {
    const output = document.createElement('output');
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min: String(field.min), max: String(field.max), step: String(field.step) });
    const refresh = () => {
      input.value = String(values[key]);
      output.textContent = `${values[key]}${field.unit ? ` ${field.unit}` : ''}`;
    };
    input.addEventListener('input', () => {
      values[key] = Number(input.value);
      save(settings);
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
      select.value = String(values[key]);
    };
    select.addEventListener('change', () => {
      values[key] = select.value;
      save(settings);
    });
    row.append(select);
    refresh();
    return { row, refresh };
  }

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  const refresh = () => {
    checkbox.checked = Boolean(values[key]);
  };
  checkbox.addEventListener('change', () => {
    values[key] = checkbox.checked;
    save(settings);
  });
  row.prepend(checkbox);
  refresh();
  return { row, refresh };
}
