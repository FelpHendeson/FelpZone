import { useEffect, useId, useRef } from 'react';
import type { SystemAnnouncement } from '../system-window';
import { ImagePlaceholder } from './ImagePlaceholder';
import { SystemCorners } from './Icon';

const KIND_LABEL: Record<SystemAnnouncement['kind'], string> = {
  level: 'Nível',
  title: 'Título',
  skill: 'Habilidade',
  proficiency: 'Proficiência',
  patent: 'Registro',
  unlock: 'Interface',
};

/** Janela diegética do Sistema: aparece quando o personagem conquista algo. */
export function SystemWindow({ announcements, onClose }: { announcements: SystemAnnouncement[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = announcements.length > 0;
  const headline = announcements[0];

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="system-window" aria-labelledby={titleId} onClose={onClose}>
      {headline ? (
        <div className={`system-window__panel system-window__panel--${headline.kind}`}>
          <SystemCorners />
          <p className="system-window__kicker">[ Sistema ]</p>
          <h2 id={titleId} className="system-window__headline">{headline.title}</h2>
          <ul className="system-window__list">
            {announcements.map((entry) => (
              <li key={entry.id} className={`system-window__item system-window__item--${entry.kind}`}>
                {entry.imageSrc ? (
                  <ImagePlaceholder kind="icon" label={entry.title} src={entry.imageSrc} className="system-window__image" />
                ) : null}
                <div>
                  <span className="system-window__tag">{KIND_LABEL[entry.kind]}</span>
                  {announcements.length > 1 ? <strong>{entry.title}</strong> : null}
                  {entry.detail ? <p>{entry.detail}</p> : null}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="button button--primary" onClick={onClose} autoFocus>
            Confirmar
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
