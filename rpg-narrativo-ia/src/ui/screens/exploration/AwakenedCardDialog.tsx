import { useEffect, useRef, useState } from 'react';
import type { PortraitConfig } from '../../../core/state';
import type { AwakenedCardData } from '../../../modules/awakened-card';
import { cardBust, shareText } from '../../awakened-card/card';
import { INITIAL_ARCHETYPES } from '../../../modules/archetypes';
import { INITIAL_COMBAT } from '../../../modules/combat';
import { CARD_FILE_NAME, canShareFiles, downloadBlob, renderCardPng, toDataUrl } from '../../awakened-card/export';
import { AppDialog } from '../../components/AppDialog';
import { AwakenedCard } from '../../components/AwakenedCard';
import { archetypeOf, poseForAction } from '../../silhouettes';

/**
 * Prévia da Carta do Desperto com "Compartilhar" e "Salvar imagem". O retrato próprio só entra
 * se o jogador marcar a opção; ela começa desmarcada.
 */
export function AwakenedCardDialog({
  open,
  card,
  portrait,
  customSrc,
  onClose,
}: {
  open: boolean;
  card: AwakenedCardData;
  portrait: PortraitConfig | undefined;
  customSrc: string | null;
  onClose: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [includeCustom, setIncludeCustom] = useState(false);
  const [presetHref, setPresetHref] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const presetSrc = portrait?.kind === 'preset' ? INITIAL_ARCHETYPES.portraitById.get(portrait.id)?.image.src : undefined;

  useEffect(() => {
    if (!open || !presetSrc) return;
    let alive = true;
    void toDataUrl(presetSrc).then((href) => {
      if (alive) setPresetHref(href);
    });
    return () => {
      alive = false;
    };
  }, [open, presetSrc]);

  const href = portrait?.kind === 'custom' ? (includeCustom && customSrc ? customSrc : undefined) : (presetHref ?? undefined);
  const archetype = archetypeOf(card.archetypeId);
  const signature = card.signature ? INITIAL_COMBAT.actionById.get(card.signature.actionId) : undefined;
  const pose = signature ? poseForAction(signature) : (archetype?.pose ?? 'stand');
  const shareable = open && canShareFiles();

  async function produce(): Promise<Blob | null> {
    if (!svgRef.current) return null;
    setBusy(true);
    setMessage(null);
    try {
      return await renderCardPng(svgRef.current);
    } catch {
      setMessage('Não foi possível gerar a imagem neste aparelho.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const blob = await produce();
    if (!blob) return;
    try {
      await navigator.share({
        files: [new File([blob], CARD_FILE_NAME, { type: 'image/png' })],
        title: 'Carta do Desperto',
        text: shareText(card),
      });
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') setMessage('O compartilhamento falhou. Tente salvar a imagem.');
    }
  }

  async function save() {
    const blob = await produce();
    if (!blob) return;
    downloadBlob(blob, CARD_FILE_NAME);
    setMessage('Imagem salva.');
  }

  return (
    <AppDialog open={open} title="Carta do Desperto" onClose={onClose}>
      <div className="awakened-card-dialog">
        <div className="awakened-card-dialog__preview">
          <AwakenedCard
            card={card}
            portraitHref={href}
            portraitConfig={cardBust(portrait)}
            pose={pose}
            prop={archetype?.prop}
            svgRef={svgRef}
          />
        </div>
        {portrait?.kind === 'custom' && customSrc ? (
          <label className="awakened-card-dialog__option">
            <input type="checkbox" checked={includeCustom} onChange={(event) => setIncludeCustom(event.target.checked)} />
            Incluir meu retrato próprio na carta
          </label>
        ) : null}
        <p className="awakened-card-dialog__hint">
          {card.sealCode
            ? 'O Selo do Eco vai no rodapé e no texto: quem receber pode enfrentar o seu Eco em Ecos.'
            : 'O Selo do Eco entra na carta depois da primeira vitória.'}
        </p>
        <div className="button-stack">
          {shareable ? (
            <button type="button" className="button button--primary" disabled={busy} onClick={() => void share()}>
              Compartilhar
            </button>
          ) : null}
          <button type="button" className={shareable ? 'button' : 'button button--primary'} disabled={busy} onClick={() => void save()}>
            {busy ? 'Gerando…' : 'Salvar imagem'}
          </button>
        </div>
        {message ? (
          <p className="echo-message" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </AppDialog>
  );
}
