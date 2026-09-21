import { useEffect, useMemo, useState } from 'react';
import {
  listUnlockedGuidanceTopics,
  type GuidanceState,
  type IndexedGuidance,
} from '../../../modules/guidance';
import { DetailScreen, EmptyAction } from './shared';

export function GuidancePanel({
  catalog,
  state,
  initialTopicId,
  onSeen,
  onBack,
}: {
  catalog: IndexedGuidance;
  state: GuidanceState;
  initialTopicId?: string | null;
  onSeen: (topicId: string) => void;
  onBack: () => void;
}) {
  const topics = useMemo(() => listUnlockedGuidanceTopics(catalog, state), [catalog, state]);
  const fallbackId = topics[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTopicId && topics.some((topic) => topic.id === initialTopicId) ? initialTopicId : fallbackId,
  );

  useEffect(() => {
    if (initialTopicId && topics.some((topic) => topic.id === initialTopicId)) {
      setSelectedId(initialTopicId);
    } else if (selectedId && !topics.some((topic) => topic.id === selectedId)) {
      setSelectedId(fallbackId);
    } else if (!selectedId && fallbackId) {
      setSelectedId(fallbackId);
    }
  }, [fallbackId, initialTopicId, selectedId, topics]);

  const selected = topics.find((topic) => topic.id === selectedId) ?? null;
  const seen = new Set(state.seenTopicIds);

  return (
    <DetailScreen title="Ajuda" eyebrow="Orientação do Sistema" tone="system" onBack={onBack}>
      {topics.length === 0 ? (
        <EmptyAction message="Nenhum tópico de ajuda foi desbloqueado ainda." />
      ) : (
        <>
          <div className="hub-card-grid" aria-label="Tópicos de ajuda">
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className="hub-card"
                aria-pressed={selected?.id === topic.id}
                onClick={() => {
                  setSelectedId(topic.id);
                  if (!seen.has(topic.id)) {
                    onSeen(topic.id);
                  }
                }}
              >
                <span className="hub-card__icon" aria-hidden="true">?</span>
                <span>
                  <strong>{topic.title}</strong>
                  <small>{topic.summary}</small>
                </span>
                <span aria-hidden="true">{seen.has(topic.id) ? '→' : 'Novo'}</span>
              </button>
            ))}
          </div>
          {selected ? (
            <section className="surface-card" aria-labelledby="guidance-topic-title">
              <span className="section-kicker">{selected.category}</span>
              <h2 id="guidance-topic-title">{selected.title}</h2>
              <p>{selected.summary}</p>
              {selected.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ) : null}
        </>
      )}
    </DetailScreen>
  );
}
