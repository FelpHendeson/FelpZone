import { BADGES, BADGE_IDS, isBadgeId, type BadgeId } from "@/accounts/badges";

/** Vitórias e até 3 selos ao lado do nome (na mesa, no lobby e na lista de online). */
export function Honors({ wins, badges }: { wins?: number; badges?: readonly string[] }) {
  const known = (badges ?? []).filter(isBadgeId);
  if (!wins && known.length === 0) return null;
  const label = [wins ? `${wins} ${wins === 1 ? "vitória" : "vitórias"}` : "", ...known.map((id) => BADGES[id].name)].filter(Boolean).join(", ");
  return (
    <span className="honors" title={label} aria-label={label}>
      {wins ? <span className="honor-wins">🏆{wins}</span> : null}
      {known.map((id) => (
        <span key={id} aria-hidden>
          {BADGES[id].emoji}
        </span>
      ))}
    </span>
  );
}

/** Todos os selos: os conquistados em cor, os outros apagados com a dica de como ganhar. */
export function BadgeShelf({ earned }: { earned: readonly { id: BadgeId | string; at: number }[] }) {
  const have = new Map(earned.map((badge) => [badge.id, badge.at]));
  return (
    <ul className="badge-shelf">
      {BADGE_IDS.map((id) => {
        const at = have.get(id);
        return (
          <li key={id} className={at ? "earned" : "locked"}>
            <span className="badge-emoji" aria-hidden>
              {BADGES[id].emoji}
            </span>
            <span>
              <strong>{BADGES[id].name}</strong>
              <span className="muted small">
                {at ? `Conquistado em ${new Date(at).toLocaleDateString("pt-BR")}` : BADGES[id].description}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
