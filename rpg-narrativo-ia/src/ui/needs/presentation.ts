import type { Attributes } from '../../core/state';
import {
  NEED_IDS,
  deriveNeedBand,
  type NeedBand,
  type NeedId,
  type NeedsSnapshot,
} from '../../modules/needs';

export interface NeedPresentation {
  id: NeedId;
  label: string;
  icon: string;
  value: number;
  band: NeedBand;
  bandLabel: string;
  higherIsBetter: boolean;
}

const NEED_META: Record<NeedId, { label: string; icon: string; higherIsBetter: boolean }> = {
  saude: { label: 'Saúde', icon: '♥', higherIsBetter: true },
  energia: { label: 'Energia', icon: 'ϟ', higherIsBetter: true },
  fome: { label: 'Fome', icon: '◒', higherIsBetter: false },
  sede: { label: 'Sede', icon: '≈', higherIsBetter: false },
};

const BAND_LABELS: Record<NeedBand, string> = {
  stable: 'Estável',
  attention: 'Atenção',
  urgent: 'Urgente',
  critical: 'Crítico',
};

export function attributesToNeedsSnapshot(attributes: Attributes): NeedsSnapshot {
  return {
    saude: attributes.saude,
    energia: attributes.energia,
    fome: attributes.fome,
    sede: attributes.sede,
  };
}

export function buildNeedsPresentation(attributes: Attributes): NeedPresentation[] {
  return NEED_IDS.map((id) => {
    const meta = NEED_META[id];
    const band = deriveNeedBand(id, attributes[id]);
    return {
      id,
      label: meta.label,
      icon: meta.icon,
      value: attributes[id],
      band,
      bandLabel: BAND_LABELS[band],
      higherIsBetter: meta.higherIsBetter,
    };
  });
}

export function needLabel(needId: NeedId): string {
  return NEED_META[needId].label;
}

export function formatNeedDelta(needId: NeedId, amount: number): string {
  const sign = amount < 0 ? '−' : '+';
  return `${needLabel(needId)} ${sign}${Math.abs(amount)}`;
}
