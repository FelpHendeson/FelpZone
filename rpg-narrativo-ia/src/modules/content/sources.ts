import { ContentError } from './errors';
import { PACK_FILE_KEYS, type ContentSource, type PackFileKey } from './types';

export function createMemorySource(id: string, raw: unknown): ContentSource {
  if (!nonEmpty(id)) {
    throw new ContentError('A fonte de conteúdo precisa de um identificador.');
  }
  return {
    id,
    loadRaw() {
      return raw;
    },
  };
}

export function createJsonPackSource(id: string, raw: unknown): ContentSource {
  return createMemorySource(id, raw);
}

export function createRemoteSource(options: {
  id: string;
  packUrl: string;
  fetchImpl?: typeof fetch;
}): ContentSource {
  if (!nonEmpty(options.id) || !nonEmpty(options.packUrl)) {
    throw new ContentError('A fonte remota de conteúdo é inválida.');
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    id: options.id,
    async loadRaw() {
      const pack = await readJson(fetchImpl, options.packUrl, 'O manifesto do pack remoto é inválido.');
      if (!isRecord(pack) || !isRecord(pack.files)) {
        throw new ContentError('O manifesto do pack remoto é inválido.');
      }
      const assembled: Record<string, unknown> = {
        id: pack.id,
        startingLocationId: pack.startingLocationId,
      };
      for (const key of PACK_FILE_KEYS) {
        const relative = pack.files[key];
        if (!nonEmpty(relative)) {
          throw new ContentError(`O pack remoto não declara o arquivo ${key}.`);
        }
        assembled[key] = await readJson(
          fetchImpl,
          new URL(relative, options.packUrl).href,
          `O arquivo remoto ${key} é inválido.`,
        );
      }
      return assembled;
    },
  };
}

async function readJson(fetchImpl: typeof fetch, url: string, reason: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    throw new ContentError(reason, { cause: error instanceof Error ? error : undefined });
  }
  if (!response.ok) {
    throw new ContentError(reason);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new ContentError(reason, { cause: error instanceof Error ? error : undefined });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export type { PackFileKey };
