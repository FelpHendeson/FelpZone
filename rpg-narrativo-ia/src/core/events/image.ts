import type { ImageReference } from './types';

const LOCAL_IMAGE_PATH = /^\/images\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp|avif)$/;

/** Image assets are bundled locally so a content pack stays offline-capable. */
export function isLocalImagePath(value: unknown): value is string {
  return typeof value === 'string' && LOCAL_IMAGE_PATH.test(value);
}

export function inspectImageReference(value: unknown): ImageReference | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  const image = value as Record<string, unknown>;
  if (
    (image.kind !== 'scene' && image.kind !== 'portrait' && image.kind !== 'icon') ||
    typeof image.label !== 'string' || image.label.trim() === '' ||
    (image.src !== undefined && !isLocalImagePath(image.src))
  ) {
    return undefined;
  }

  return image.src === undefined
    ? { kind: image.kind, label: image.label }
    : { kind: image.kind, label: image.label, src: image.src };
}
