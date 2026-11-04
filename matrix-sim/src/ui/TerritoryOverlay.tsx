import { useEffect, useRef } from 'react';
import { bandColor } from '../simulation/bands';
import type { Territories } from '../simulation/territories';

export function TerritoryOverlay({ territories, size, focused }: { territories: Territories; size: number; focused: number | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const unit = 8;
    target.width = target.height = size * unit;
    const ctx = target.getContext('2d');
    if (!ctx) return;
    const { owners, contested } = territories;
    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];
      if (!owner) continue;
      const x = i % size, y = Math.floor(i / size);
      ctx.globalAlpha = focused === owner ? 0.42 : focused === null ? 0.34 : 0.28;
      ctx.fillStyle = bandColor(owner); ctx.fillRect(x * unit, y * unit, unit, unit);
      ctx.globalAlpha = focused === null || owner === focused ? 0.95 : 0.75;
      ctx.strokeStyle = bandColor(owner); ctx.lineWidth = focused === owner ? 1.5 : 1;
      ctx.beginPath();
      if (x === 0 || owners[i - 1] !== owner) { ctx.moveTo(x * unit, y * unit); ctx.lineTo(x * unit, (y + 1) * unit); }
      if (x === size - 1 || owners[i + 1] !== owner) { ctx.moveTo((x + 1) * unit, y * unit); ctx.lineTo((x + 1) * unit, (y + 1) * unit); }
      if (y === 0 || owners[i - size] !== owner) { ctx.moveTo(x * unit, y * unit); ctx.lineTo((x + 1) * unit, y * unit); }
      if (y === size - 1 || owners[i + size] !== owner) { ctx.moveTo(x * unit, (y + 1) * unit); ctx.lineTo((x + 1) * unit, (y + 1) * unit); }
      ctx.stroke();
      if (contested[i]) { ctx.globalAlpha = 0.6; ctx.strokeStyle = '#fff0ce'; ctx.beginPath(); ctx.moveTo(x * unit + 1, y * unit + 6); ctx.lineTo(x * unit + 6, y * unit + 1); ctx.stroke(); }
    }
  }, [territories, size, focused]);
  return <canvas ref={canvas} className="territory-canvas" aria-hidden="true" />;
}
