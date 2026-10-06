"use client";

import type { ShownNotice } from "@/client/useNotices";

/**
 * Avisos de acontecimentos da mesa. Ficam numa região "polite": leitores de
 * tela anunciam sem tirar o foco de quem está jogando, e nada aqui bloqueia os
 * botões da partida.
 */
export function Notices({ notices, onDismiss }: { notices: ShownNotice[]; onDismiss: (key: string) => void }) {
  return (
    <div className="notices" aria-live="polite" aria-atomic="false">
      {notices.map((notice) => (
        <button
          key={notice.key}
          className={`notice notice-${notice.level} tone-${notice.tone}`}
          onClick={() => onDismiss(notice.key)}
          aria-label={`${notice.title}. ${notice.text} Toque para fechar.`}
        >
          {notice.avatar && notice.level !== "quick" ? (
            <span className="avatar" aria-hidden>
              {notice.avatar}
            </span>
          ) : (
            <span className="notice-icon" aria-hidden>
              {notice.icon}
            </span>
          )}
          <span className="notice-body">
            <strong>
              {notice.level !== "quick" && <span aria-hidden>{notice.icon} </span>}
              {notice.title}
            </strong>
            {notice.text && <span>{notice.text}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
