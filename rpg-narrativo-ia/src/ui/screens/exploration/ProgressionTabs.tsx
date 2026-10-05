import { useState } from 'react';
import type {
  SystemArchetypeTechniqueView,
  SystemArchetypeView,
  SystemGardenIntegrationView,
  SystemStatusView,
  SystemTrainingView,
  SystemTreeDevelopView,
  SystemTreeNodeView,
  SystemTreePathView,
} from '../../../modules/system-interface';
import { formatTimeCost } from '../../sandbox';
import { Silhouette } from '../../components/Silhouette';
import { poseForAction, poseForSkill } from '../../silhouettes';
import { INITIAL_COMBAT } from '../../../modules/combat';
import { EmptyAction } from './shared';

type ProgressionTab = 'tree' | 'training' | 'garden' | 'basics';

const TABS: Array<{ id: ProgressionTab; label: string }> = [
  { id: 'tree', label: 'Árvore' },
  { id: 'training', label: 'Treino' },
  { id: 'garden', label: 'Jardim' },
  { id: 'basics', label: 'Fundamentos' },
];

/**
 * Progressão com alternância clara entre Árvore, Treino, Jardim e Fundamentos
 * (Sistemas 11 e 16). Só apresenta o que o system-interface já derivou.
 */
export function ProgressionTabs({
  status,
  onTrain,
  onCultivate,
  onTrainTechnique,
  initialTab = 'tree',
}: {
  status: SystemStatusView;
  onTrain: (training: SystemTrainingView) => void;
  onTrainTechnique?: (technique: SystemArchetypeTechniqueView) => void;
  onCultivate: (recipeId: string) => void;
  initialTab?: ProgressionTab;
}) {
  const [tab, setTab] = useState<ProgressionTab>(initialTab);
  const trainingById = new Map(status.trainings.map((training) => [training.methodId, training]));
  const gardenReady = status.garden.integrations.some((entry) => entry.canCultivate);
  const trainable = status.trainings.filter((training) => training.canTrain).length;

  return (
    <div className="progression">
      <div className="progression-tabs" role="tablist" aria-label="Superfícies de progressão">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            id={`progression-tab-${entry.id}`}
            aria-selected={tab === entry.id}
            aria-controls={`progression-panel-${entry.id}`}
            className={tab === entry.id ? 'progression-tabs__item progression-tabs__item--active' : 'progression-tabs__item'}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
            {entry.id === 'garden' && gardenReady ? <span className="progression-tabs__dot" aria-label="integração pronta" /> : null}
            {entry.id === 'training' && trainable > 0 ? <small>{trainable}</small> : null}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`progression-panel-${tab}`} aria-labelledby={`progression-tab-${tab}`} className="progression__panel">
        {tab === 'tree' ? <ArchetypeBranches view={status.archetype} onTrain={onTrainTechnique} /> : null}
        {tab === 'tree' ? (
          <SkillTreeView
            paths={status.skillTree.paths}
            hasHiddenPaths={status.skillTree.hasHiddenPaths}
            onTrain={(methodId) => {
              const training = trainingById.get(methodId);
              if (training) onTrain(training);
            }}
          />
        ) : null}
        {tab === 'training' ? <TrainingList trainings={status.trainings} onTrain={onTrain} /> : null}
        {tab === 'garden' ? (
          <GardenView
            points={status.garden.cultivationPoints}
            nextPointLevel={status.garden.nextPointLevel}
            integrations={status.garden.integrations}
            onCultivate={onCultivate}
          />
        ) : null}
        {tab === 'basics' ? <Basics status={status} /> : null}
      </div>
    </div>
  );
}

function SkillTreeView({
  paths,
  hasHiddenPaths,
  onTrain,
}: {
  paths: SystemTreePathView[];
  hasHiddenPaths: boolean;
  onTrain: (methodId: string) => void;
}) {
  if (paths.length === 0) return <EmptyAction message="Nenhum caminho revelado ainda." />;
  return (
    <div className="skill-tree">
      {paths.map((path) => (
        <section key={path.pathId} className={`skill-path skill-path--${path.field}`} aria-labelledby={`path-${path.pathId}`}>
          <header className="skill-path__head">
            <span className="skill-path__field">{path.fieldName}</span>
            <h3 id={`path-${path.pathId}`}>{path.name}</h3>
            <p>{path.description}</p>
          </header>
          <ol className="skill-path__nodes">
            {path.nodes.map((node) => <SkillNode key={node.skillId} node={node} onTrain={onTrain} />)}
            {path.hasHiddenSkills ? (
              <li className="skill-node skill-node--hidden">
                <span className="skill-node__marker" aria-hidden="true" />
                <div className="skill-node__body"><p>Há possibilidades ainda não compreendidas neste caminho.</p></div>
              </li>
            ) : null}
          </ol>
        </section>
      ))}
      {hasHiddenPaths ? <p className="skill-tree__hidden">◇ Outros caminhos ainda não foram revelados pelo Sistema.</p> : null}
    </div>
  );
}

function SkillNode({ node, onTrain }: { node: SystemTreeNodeView; onTrain: (methodId: string) => void }) {
  return (
    <li className={`skill-node skill-node--${node.status}${node.origin === 'garden' ? ' skill-node--garden' : ''}`}>
      <span className="skill-node__marker" aria-hidden="true" />
      <div className="skill-node__body">
        <Silhouette pose={poseForSkill(node.skillId)} size={48} tint={node.status === 'known' ? 'var(--accent)' : 'var(--text-muted)'} className="skill-node__silhouette" />
        <div className="skill-node__head">
          <strong>{node.name}</strong>
          {node.status === 'known' ? (
            <span className="skill-node__level">Proficiência {node.proficiency ?? 0}</span>
          ) : (
            <span className="skill-node__level skill-node__level--open">Possível</span>
          )}
        </div>
        <p>{node.description}</p>
        {node.origin === 'garden' ? <span className="skill-node__tag skill-node__tag--garden">❀ Cultivada no Jardim</span> : null}
        {node.requirements.length > 0 ? (
          <p className="skill-node__requires">
            Requer{' '}
            {node.requirements.map((requirement, index) => (
              <span key={requirement.skillId}>
                {index > 0 ? ', ' : ''}
                <span className={requirement.known ? 'is-met' : undefined}>{requirement.name}</span>
                {requirement.crossPath ? <span className="skill-node__link"> ⇄ {requirement.pathName}</span> : null}
              </span>
            ))}
          </p>
        ) : null}
        <DevelopHint develop={node.develop} onTrain={onTrain} />
      </div>
    </li>
  );
}

function DevelopHint({ develop, onTrain }: { develop: SystemTreeDevelopView; onTrain: (methodId: string) => void }) {
  switch (develop.kind) {
    case 'known':
      return null;
    case 'training':
      return (
        <div className="skill-node__develop">
          <span>Desenvolve com <strong>{develop.methodName}</strong>{develop.canTrain ? '' : ` — ${develop.blockedReason ?? 'indisponível agora'}`}</span>
          {develop.canTrain ? (
            <button type="button" className="button button--compact" onClick={() => onTrain(develop.methodId)}>Treinar</button>
          ) : null}
        </div>
      );
    case 'milestone':
      return <p className="skill-node__develop">Um método será revelado no marco do Nível {develop.level}.</p>;
    case 'garden':
      return <p className="skill-node__develop">Pode nascer de uma integração no Jardim.</p>;
    case 'unrevealed':
      return <p className="skill-node__develop">O Sistema ainda não indicou como desenvolver.</p>;
  }
}

function TrainingList({ trainings, onTrain }: { trainings: SystemTrainingView[]; onTrain: (training: SystemTrainingView) => void }) {
  if (trainings.length === 0) return <EmptyAction message="Nenhum método de treino disponível agora." />;
  return (
    <div className="training-list">
      {trainings.map((training) => (
        <article key={training.methodId} className={training.canTrain ? 'training-card' : 'training-card training-card--blocked'}>
          <header className="training-card__head">
            <span className="training-card__target">{training.targetLabel}</span>
            <h3>{training.name}</h3>
          </header>
          <p className="training-card__description">{training.description}</p>
          <ul className="training-card__effects" aria-label="Efeitos do treino">
            {training.effectsSummary.map((effect) => <li key={effect}>{effect}</li>)}
          </ul>
          {training.requirementsSummary.length > 0 ? (
            <p className="training-card__requires">Requisitos: {training.requirementsSummary.join(', ')}</p>
          ) : null}
          <footer className="training-card__footer">
            <small>{training.blockedReason ?? `Custa ${formatTimeCost(training.cost)}`}</small>
            <button type="button" className="button button--compact" disabled={!training.canTrain} onClick={() => onTrain(training)}>Treinar</button>
          </footer>
        </article>
      ))}
    </div>
  );
}

function GardenView({
  points,
  nextPointLevel,
  integrations,
  onCultivate,
}: {
  points: number;
  nextPointLevel: number | null;
  integrations: SystemGardenIntegrationView[];
  onCultivate: (recipeId: string) => void;
}) {
  return (
    <div className="garden">
      <div className="garden__points">
        <span className="garden__points-value">{points}</span>
        <div>
          <strong>Ponto{points === 1 ? '' : 's'} de cultivo</strong>
          <small>
            {nextPointLevel !== null
              ? `O marco do Nível ${nextPointLevel} concede um novo ponto.`
              : 'Pontos nascem somente de marcos do Sistema.'}
          </small>
        </div>
      </div>
      {integrations.length === 0 ? (
        <EmptyAction message="Nenhuma integração percebida. Elas surgem quando você conhece habilidades de caminhos capazes de se unir." />
      ) : (
        <div className="garden__list">
          {integrations.map((integration) => <GardenIntegration key={integration.recipeId} integration={integration} onCultivate={onCultivate} />)}
        </div>
      )}
    </div>
  );
}

const VISIBILITY_LABEL: Record<SystemGardenIntegrationView['visibility'], string> = {
  perceived: 'Percebida',
  available: 'Disponível',
  cultivated: 'Cultivada',
};

function GardenIntegration({ integration, onCultivate }: { integration: SystemGardenIntegrationView; onCultivate: (recipeId: string) => void }) {
  return (
    <article className={`garden-card garden-card--${integration.visibility}`}>
      <header className="garden-card__head">
        <h3>{integration.name ?? 'Integração percebida'}</h3>
        <span>{VISIBILITY_LABEL[integration.visibility]}</span>
      </header>
      {integration.sourceNames.length > 0 ? (
        <div className="garden-card__graph" aria-label={`${integration.sourceNames.join(' + ')} resulta em ${integration.resultName ?? 'algo ainda oculto'}`}>
          <div className="garden-card__sources">
            {integration.sourceNames.map((name) => <span key={name} className="garden-chip">{name}</span>)}
          </div>
          <span className="garden-card__arrow" aria-hidden="true">❀</span>
          <span className={integration.resultName ? 'garden-chip garden-chip--result' : 'garden-chip garden-chip--unknown'}>
            {integration.resultName ?? '?'}
          </span>
        </div>
      ) : null}
      <p>{integration.description ?? 'Os requisitos desta integração ainda não estão claros.'}</p>
      {integration.requirements.length > 0 ? (
        <ul className="garden-card__checks" aria-label="Requisitos">
          {integration.requirements.map((requirement) => (
            <li key={requirement.text} className={requirement.met ? 'is-met' : undefined}>
              <span aria-hidden="true">{requirement.met ? '✓' : '○'}</span> {requirement.text}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="garden-card__footer">
        <small>
          {integration.cost
            ? `${integration.cost.cultivationPoints} ponto${integration.cost.cultivationPoints === 1 ? '' : 's'} · ${formatTimeCost(integration.cost.timeCost)} · permanente`
            : 'Custo ainda desconhecido'}
          {!integration.canCultivate && integration.blockedReason && integration.visibility !== 'cultivated' ? ` — ${integration.blockedReason}` : ''}
        </small>
        {integration.visibility !== 'cultivated' ? (
          <button type="button" className="button button--compact" disabled={!integration.canCultivate} onClick={() => onCultivate(integration.recipeId)}>
            Cultivar
          </button>
        ) : null}
      </div>
    </article>
  );
}

function Basics({ status }: { status: SystemStatusView }) {
  return (
    <div className="progression-basics">
      <ul className="system-note-list">
        {status.energies.map((energy) => <li key={energy.id}><strong>{energy.name}</strong><p>{energy.description}</p></li>)}
        {status.execution.reserves.map((reserve) => (
          <li key={reserve.energyId}><strong>{reserve.name}</strong><p>{reserve.current}/{reserve.max} disponível</p></li>
        ))}
      </ul>
      <ul className="system-chip-list" aria-label="Campos de aplicação">
        {status.fields.map((field) => <li key={field.id} className="system-chip"><strong>{field.name}</strong><span>{field.description}</span></li>)}
      </ul>
    </div>
  );
}

/** Patente e galhos de arquétipo: o próprio (ou os abertos) primeiro; os distantes recolhidos. */
function ArchetypeBranches({ view, onTrain }: { view: SystemArchetypeView; onTrain?: (technique: SystemArchetypeTechniqueView) => void }) {
  const near = view.branches.filter((branch) => branch.access !== 'distant');
  const distant = view.branches.filter((branch) => branch.access === 'distant');
  const renderBranch = (branch: SystemArchetypeView['branches'][number]) => (
    <section
      key={branch.archetypeId}
      className={`archetype-branch archetype-branch--${branch.access}`}
      style={{ ['--archetype' as string]: branch.color }}
      aria-labelledby={`branch-${branch.archetypeId}`}
    >
      <header className="archetype-branch__head">
        <span className="skill-path__field">
          {branch.access === 'own' ? 'Seu galho' : branch.access === 'open' ? `Galho aberto · ${branch.archetypeName}` : `Galho distante · ${branch.archetypeName}`}
        </span>
        <h3 id={`branch-${branch.archetypeId}`}>{branch.name}</h3>
        <p>{branch.description}</p>
        {branch.access === 'distant' ? <p className="archetype-branch__note">Fora do seu caminho: o treino leva o dobro do tempo e pede mais nível.</p> : null}
      </header>
      <ol className="skill-path__nodes">
        {branch.techniques.map((technique) => (
          <TechniqueNode key={technique.actionId} technique={technique} color={branch.color} onTrain={onTrain} />
        ))}
      </ol>
    </section>
  );
  return (
    <div className="archetype-branches">
      <section className={`archetype-rank archetype-rank--${view.rank}`} aria-label="Patente do arquétipo">
        <span className="section-kicker">{view.rank === 'initiate' ? 'Patente reconhecida' : 'Patente'}</span>
        <strong>{view.title}</strong>
        {view.rank === 'initiate' ? (
          <p>Você monta a rodada com {view.roundTicks} tempos.</p>
        ) : view.next ? (
          <p>
            Para virar Iniciado em {view.next.branchName}: {view.next.techniques}/{view.next.techniquesNeeded} técnicas do galho e{' '}
            {view.next.eliteVictories}/{view.next.eliteNeeded} vitória sobre uma ameaça de elite. Iniciados montam a rodada com{' '}
            {view.initiateRoundTicks} tempos.
          </p>
        ) : null}
        <small>
          Assinatura usada {view.counters.signatureUses}× · {view.counters.victories} vitória{view.counters.victories === 1 ? '' : 's'} ·{' '}
          {view.counters.eliteVictories} de elite
        </small>
      </section>
      {near.map(renderBranch)}
      {distant.length > 0 ? (
        <details className="archetype-branches__distant">
          <summary>Galhos de outros arquétipos</summary>
          {distant.map(renderBranch)}
        </details>
      ) : null}
    </div>
  );
}

function TechniqueNode({
  technique,
  color,
  onTrain,
}: {
  technique: SystemArchetypeTechniqueView;
  color: string;
  onTrain?: (technique: SystemArchetypeTechniqueView) => void;
}) {
  const action = INITIAL_COMBAT.actionById.get(technique.actionId);
  const status = technique.known ? 'known' : technique.canTrain ? 'available' : 'locked';
  return (
    <li className={`skill-node skill-node--${status === 'locked' ? 'available' : status} technique-node--${status}`}>
      <span className="skill-node__marker" aria-hidden="true" />
      <div className="skill-node__body">
        <Silhouette
          pose={action ? poseForAction(action) : 'stand'}
          size={48}
          tint={technique.known ? color : 'var(--text-muted)'}
          glow={technique.known ? color : undefined}
          className="skill-node__silhouette"
        />
        <div className="skill-node__head">
          <strong>{technique.name}</strong>
          <span className={technique.known ? 'skill-node__level' : 'skill-node__level skill-node__level--open'}>
            {technique.known ? 'No banco de ações' : `Técnica ${technique.tier}`}
          </span>
        </div>
        <p>{technique.description}</p>
        {!technique.known && technique.requirements.length > 0 ? (
          <ul className="technique-node__requires">
            {technique.requirements.map((requirement) => (
              <li key={requirement.label} className={requirement.met ? 'is-met' : undefined}>
                <span aria-hidden="true">{requirement.met ? '✓' : '○'}</span> {requirement.label}
              </li>
            ))}
          </ul>
        ) : null}
        {!technique.known && onTrain ? (
          <button
            type="button"
            className="button button--compact"
            disabled={!technique.canTrain}
            onClick={() => onTrain(technique)}
          >
            Treinar · {formatTimeCost({ periods: 0, minutes: technique.minutes })}
          </button>
        ) : null}
      </div>
    </li>
  );
}
