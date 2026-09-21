import { useState } from 'react';
import { findNpc } from '../../../campaigns/first-day';
import type { Campaign } from '../../../core/events';
import type { GameState } from '../../../core/state';
import type { SandboxAction } from '../../../modules/sandbox-actions';
import {
  type SystemStatusView,
  type SystemTrainingView,
} from '../../../modules/system-interface';
import { AttributeSummary } from '../../components/AttributeSummary';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatPeriodCost } from '../../sandbox';
import { EmptyAction } from './shared';

export function SystemPanel({
  section,
  status,
  campaign,
  onAction,
  onBack,
}: {
  section: 'progression' | 'registry' | 'society' | 'family' | 'domain';
  status: SystemStatusView;
  campaign: Campaign;
  onAction: (action: SandboxAction) => void;
  onBack: () => void;
}) {
  const [pending, setPending] = useState<SystemTrainingView | null>(null);
  const [pendingGarden, setPendingGarden] = useState<string | null>(null);
  const [pendingPatent, setPendingPatent] = useState<string | null>(null);
  const gardenRecipe = status.garden.recipes.find((recipe) => recipe.id === pendingGarden);
  const patent = status.registry.patents.find((entry) => entry.id === pendingPatent);
  const sectionCopy = {
    progression: { eyebrow: 'Fortalecimento', title: 'Progressão', description: 'Eteris, Númen, habilidades, treino e Jardim.' },
    registry: { eyebrow: 'Reconhecimento do Sistema', title: 'Registro', description: 'Patentes, classificações e posições reconhecidas.' },
    society: { eyebrow: 'Vida compartilhada', title: 'Sociedade', description: 'Grupos, companheiros, profissões e cidadania.' },
    family: { eyebrow: 'Laços de vida', title: 'Família e lar', description: 'Parentesco, casa, linhagem e os marcos de uma vida compartilhada.' },
    domain: { eyebrow: 'Construção de poder', title: 'Domínio', description: 'Economia, propriedades, territórios e política.' },
  }[section];

  return (
    <div className={`tab-panel system-panel system-panel--${section}`}>
      <header className="system-console">
        <button type="button" className="back-button" onClick={onBack} aria-label={`Voltar de ${sectionCopy.title}`}><span aria-hidden="true">←</span></button>
        <div>
          <span className="section-kicker">{sectionCopy.eyebrow}</span>
          <h1>{sectionCopy.title}</h1>
          <p>{sectionCopy.description}</p>
        </div>
        <span className="system-console__level">Nível <strong>{status.level}</strong></span>
      </header>

      <div className="system-disclosure-list">
        {section === 'progression' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">∞</span>
            <span><strong>Eteris e Númen</strong><small>Fundamentos conhecidos</small></span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            <ul className="system-note-list">
              {status.energies.map((energy) => (
                <li key={energy.id}><strong>{energy.name}</strong><p>{energy.description}</p></li>
              ))}
              {status.execution.reserves.map((reserve) => (
                <li key={reserve.energyId}>
                  <strong>{reserve.name}</strong>
                  <p>
                    {reserve.current}/{reserve.max} disponível
                  </p>
                </li>
              ))}
            </ul>
            <ul className="system-chip-list" aria-label="Campos de aplicação">
              {status.fields.map((field) => (
                <li key={field.id} className="system-chip"><strong>{field.name}</strong><span>{field.description}</span></li>
              ))}
            </ul>
          </div>
        </details>

        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⌘</span>
            <span><strong>Habilidades e caminhos</strong><small>{status.knownSkills.length} conhecidas</small></span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body system-disclosure__body--stack">
            <section aria-labelledby="system-skills-title">
              <div className="section-heading"><h2 id="system-skills-title">Habilidades conhecidas</h2><span className="section-count">{status.knownSkills.length}</span></div>
              {status.knownSkills.length === 0 ? <EmptyAction message="O Sistema ainda não registrou habilidades." /> : (
                <ul className="system-skill-list">
                  {status.knownSkills.map((skill) => (
                    <li key={skill.skillId} className="system-skill">
                      <div className="system-skill__head"><strong>{skill.name}</strong><span>Proficiência {skill.proficiency}</span></div>
                      <p>{skill.description}</p><small>{skill.pathName}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="system-tree-title">
              <div className="section-heading"><h2 id="system-tree-title">Árvore de habilidades</h2></div>
              {status.tree.paths.length === 0 ? <EmptyAction message="Nenhum caminho revelado ainda." /> : (
                <div className="system-tree">
                  {status.tree.paths.map((path) => (
                    <article key={path.pathId} className="system-tree__path">
                      <header className="system-tree__path-head"><strong>{path.name}</strong><span>{path.field === 'corpo' ? 'Corpo' : 'Poder'}</span></header>
                      <ul className="system-tree__nodes">
                        {path.nodes.map((node) => (
                          <li key={node.skillId} className={`system-tree__node system-tree__node--${node.status}`}>
                            <strong>{node.name}</strong>
                            <span>{node.status === 'known' ? `Conhecida · proficiência ${node.proficiency}` : 'Possível de desenvolver'}</span>
                          </li>
                        ))}
                      </ul>
                      {path.hasHiddenSkills ? <small className="system-tree__hidden">Há possibilidades ainda não compreendidas neste caminho</small> : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </details>

        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">△</span>
            <span><strong>Treinamento</strong><small>{status.trainings.length} métodos conhecidos</small></span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.trainings.length === 0 ? <EmptyAction message="Nenhum método de treino disponível agora." /> : (
              <div className="action-card-list">
                {status.trainings.map((training) => (
                  <article key={training.methodId} className={training.canTrain ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title"><h3>{training.name}</h3><span>{training.targetLabel}</span></div>
                      <p>{training.description}</p>
                      <ul className="training-effects" aria-label="Efeitos do treino">
                        {training.effectsSummary.map((effect) => <li key={effect}>{effect}</li>)}
                      </ul>
                      {training.requirementsSummary.length > 0 ? (
                        <p className="training-requirements">Requisitos: {training.requirementsSummary.join(', ')}</p>
                      ) : null}
                      <div className="action-card__footer">
                        <small>{training.blockedReason ?? `Custa ${formatPeriodCost(training.costPeriods)}`}</small>
                        <button type="button" className="button button--compact" disabled={!training.canTrain} onClick={() => setPending(training)}>Treinar</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </details>

        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">❀</span>
            <span><strong>Jardim</strong><small>{status.garden.cultivationPoints} ponto{status.garden.cultivationPoints === 1 ? '' : 's'} de cultivo</small></span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.garden.recipes.length === 0 ? (
              <EmptyAction message="Nenhuma integração percebida no Jardim." />
            ) : (
              <div className="action-card-list">
                {status.garden.recipes.map((recipe) => (
                  <article key={recipe.id} className={recipe.visibility === 'available' ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{recipe.name ?? 'Integração percebida'}</h3>
                        <span>{recipe.visibility === 'cultivated' ? 'Cultivada' : recipe.visibility === 'available' ? 'Disponível' : 'Percebida'}</span>
                      </div>
                      {recipe.description ? <p>{recipe.description}</p> : <p>Os requisitos desta integração ainda não estão claros.</p>}
                      {recipe.cost ? (
                        <p className="training-requirements">
                          Custa {recipe.cost.cultivationPoints} ponto{recipe.cost.cultivationPoints === 1 ? '' : 's'} · {formatPeriodCost(recipe.cost.timeCost.periods)}
                        </p>
                      ) : null}
                      <div className="action-card__footer">
                        <small>{recipe.requirementsMet === false ? 'Requisitos em aberto' : recipe.visibility === 'cultivated' ? 'Já integrada' : 'Integração irreversível neste recorte'}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={recipe.visibility !== 'available' || !recipe.requirementsMet}
                          onClick={() => setPendingGarden(recipe.id)}
                        >
                          Cultivar integração
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </details>

        </> : null}
        {section === 'registry' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">▣</span>
            <span>
              <strong>Registro</strong>
              <small>
                {status.registry.accessGranted
                  ? `${status.registry.rankings.length} ranking${status.registry.rankings.length === 1 ? '' : 's'} visíve${status.registry.rankings.length === 1 ? 'l' : 'is'}`
                  : 'Acesso não concedido'}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {!status.registry.accessGranted ? (
              <EmptyAction message="O Registro ainda não reconhece este usuário." />
            ) : (
              <>
                {status.registry.rankings.length === 0 ? (
                  <EmptyAction message="Nenhum ranking reconhecido neste recorte." />
                ) : (
                  <div className="action-card-list">
                    {status.registry.rankings.map((ranking) => (
                      <article key={ranking.rankingId} className="action-card">
                        <div className="action-card__body">
                          <div className="action-card__title">
                            <h3>{ranking.name}</h3>
                            <span>{ranking.scope}</span>
                          </div>
                          <p>{ranking.description}</p>
                          <p className="training-requirements">
                            {ranking.metricLabel}
                            {ranking.playerPosition ? ` · posição ${ranking.playerPosition}` : ''}
                          </p>
                          <ol className="registry-standings" aria-label={`Classificação de ${ranking.name}`}>
                            {ranking.standings.map((standing) => (
                              <li key={standing.actorId} className={standing.isPlayer ? 'is-player' : undefined}>
                                <span>
                                  {standing.position}. {standing.name}
                                </span>
                                <span>{standing.score}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {status.registry.patents.length === 0 ? (
                  <EmptyAction message="Nenhuma patente declarada neste pack." />
                ) : (
                  <div className="action-card-list">
                    {status.registry.patents.map((entry) => (
                      <article key={entry.id} className={entry.claimable || entry.granted ? 'action-card' : 'action-card action-card--blocked'}>
                        <div className="action-card__body">
                          <div className="action-card__title">
                            <h3>{entry.name}</h3>
                            <span>{entry.granted ? 'Concedida' : entry.claimable ? 'Reivindicável' : 'Requisitos em aberto'}</span>
                          </div>
                          <p>{entry.description}</p>
                          <div className="action-card__footer">
                            <small>{entry.granted ? 'Já registrada neste recorte' : 'A patente não substitui o nível'}</small>
                            <button
                              type="button"
                              className="button button--compact"
                              disabled={!entry.claimable}
                              onClick={() => setPendingPatent(entry.id)}
                            >
                              Reivindicar patente
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </details>

        </> : null}
        {section === 'society' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⚑</span>
            <span>
              <strong>Grupos</strong>
              <small>
                {status.organizations.length === 1
                  ? '1 organização ativa'
                  : `${status.organizations.length} organizações ativas`}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.organizations.length === 0 ? (
              <EmptyAction message="Nenhum grupo ativo neste recorte." />
            ) : (
              <div className="action-card-list">
                {status.organizations.map((organization) => (
                  <article key={organization.id} className="action-card">
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{organization.name}</h3>
                        <span>{organization.typeName}</span>
                      </div>
                      <p>{organization.description}</p>
                      <ul className="registry-standings" aria-label={`Membros de ${organization.name}`}>
                        {organization.members.map((member) => (
                          <li key={member.actorId} className={member.isPlayer ? 'is-player' : undefined}>
                            <span>{member.isPlayer ? 'Você' : findNpc(campaign, member.actorId)?.name ?? member.actorId}</span>
                            <span>
                              {member.roleName} · {member.membershipName}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {status.party.some((member) => !member.isPlayer) ? (
              <ul className="registry-standings" aria-label="Companhia ativa">
                {status.party
                  .filter((member) => !member.isPlayer)
                  .map((member) => (
                    <li key={member.actorId}>
                      <span>{member.name}</span>
                      <span>
                        {member.roleName} · {member.health}/{member.maxHealth}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : null}
            {status.organizationActions.length > 0 ? (
              <div className="action-card-list">
                {status.organizationActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'organization.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        </> : null}
        {section === 'family' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⌂</span>
            <span>
              <strong>Família e lar</strong>
              <small>
                {status.family.length === 1 ? '1 pessoa reconhecida' : `${status.family.length} pessoas reconhecidas`}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.family.length === 0 ? (
              <EmptyAction message="Nenhuma estrutura familiar neste recorte." />
            ) : (
              <ul className="registry-standings" aria-label="Família e lar">
                {status.family.map((member) => (
                  <li key={member.actorId} className={member.isPlayer ? 'is-player' : undefined}>
                    <span>{member.isPlayer ? 'Você' : member.name}</span>
                    <span>
                      {[member.kinshipName, member.householdName, member.stageName]
                        .filter(Boolean)
                        .join(' · ') || 'Sem parentesco declarado'}
                      {member.ageYears !== undefined ? ` · ${member.ageYears} anos` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {status.familyActions.length > 0 ? (
              <div className="action-card-list">
                {status.familyActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'family.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        </> : null}
        {section === 'society' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⚖</span>
            <span>
              <strong>Ocupação e cidadania</strong>
              <small>
                {status.civic.filter((entry) => entry.active).length === 1
                  ? '1 concessão ativa'
                  : `${status.civic.filter((entry) => entry.active).length} concessões ativas`}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.civic.length === 0 ? (
              <EmptyAction message="Nenhuma cidadania ou ofício reconhecido neste recorte." />
            ) : (
              <ul className="registry-standings" aria-label="Ocupação e cidadania">
                {status.civic.map((entry) => (
                  <li key={`${entry.kind}:${entry.definitionId}:${entry.active ? 'active' : 'revoked'}`}>
                    <span>{entry.name}</span>
                    <span>
                      {[entry.kind === 'citizenship' ? 'Cidadania' : entry.kind === 'profession' ? 'Profissão' : entry.kind, entry.scopeName, entry.active ? 'Ativa' : 'Revogada']
                        .join(' · ')}
                      {entry.progress !== undefined ? ` · prática ${entry.progress}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {status.civicActions.length > 0 ? (
              <div className="action-card-list">
                {status.civicActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'civic.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        </> : null}
        {section === 'domain' ? <>
        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⚖</span>
            <span>
              <strong>Comércio e propriedade</strong>
              <small>
                {status.economy.wallets.length === 0
                  ? 'sem saldo'
                  : status.economy.wallets.map((wallet) => `${wallet.amount} ${wallet.name}`).join(' · ')}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.economy.wallets.length === 0 && status.economy.properties.length === 0 ? (
              <EmptyAction message="Nenhuma transação ou direito de uso neste recorte." />
            ) : (
              <ul className="registry-standings" aria-label="Comércio e propriedade">
                {status.economy.wallets.map((wallet) => (
                  <li key={wallet.currencyId}>
                    <span>{wallet.name}</span>
                    <span>{wallet.amount}</span>
                  </li>
                ))}
                {status.economy.properties.map((property) => (
                  <li key={property.propertyId}>
                    <span>{property.name}</span>
                    <span>Direito de uso</span>
                  </li>
                ))}
              </ul>
            )}
            {status.economyActions.length > 0 ? (
              <div className="action-card-list">
                {status.economyActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'economy.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⌂</span>
            <span>
              <strong>Base e território</strong>
              <small>
                {status.settlements.claims.length === 0
                  ? 'sem reivindicação'
                  : status.settlements.structures.length === 0
                    ? 'acampamento reivindicado'
                    : `${status.settlements.structures.length} estrutura${status.settlements.structures.length === 1 ? '' : 's'}`}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.settlements.claims.length === 0 && status.settlements.projects.length === 0 ? (
              <EmptyAction message="Nenhuma base administrável neste recorte." />
            ) : (
              <ul className="registry-standings" aria-label="Base e território">
                {status.settlements.claims.map((claim) => (
                  <li key={claim.territoryId}>
                    <span>{claim.name}</span>
                    <span>Reivindicado</span>
                  </li>
                ))}
                {status.settlements.structures.map((structure) => (
                  <li key={`${structure.territoryName}-${structure.structureTypeId}`}>
                    <span>{structure.name}</span>
                    <span>{structure.territoryName}</span>
                  </li>
                ))}
                {status.settlements.projects.map((project) => (
                  <li key={project.projectId}>
                    <span>{project.label}</span>
                    <span>{project.remainingPeriods} período{project.remainingPeriods === 1 ? '' : 's'}</span>
                  </li>
                ))}
                {status.settlements.storage.map((entry) => (
                  <li key={`${entry.territoryId}-${entry.itemId}`}>
                    <span>Estoque {entry.itemId}</span>
                    <span>{entry.quantity}/{entry.capacity}</span>
                  </li>
                ))}
                {status.settlements.assignments.map((assignment) => (
                  <li key={`${assignment.npcId}-${assignment.roleName}`}>
                    <span>{assignment.roleName}</span>
                    <span>{assignment.npcId}</span>
                  </li>
                ))}
              </ul>
            )}
            {status.settlementActions.length > 0 ? (
              <div className="action-card-list">
                {status.settlementActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'settlement.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>

        <details className="system-disclosure">
          <summary>
            <span className="system-disclosure__icon" aria-hidden="true">⚑</span>
            <span>
              <strong>Facções e diplomacia</strong>
              <small>
                {status.politics.mandates.length === 0
                  ? 'sem mandato'
                  : status.politics.agreements.find((entry) => entry.status === 'active')
                    ? 'pacto ativo'
                    : 'mandato em vigor'}
              </small>
            </span>
            <span className="system-disclosure__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="system-disclosure__body">
            {status.politics.mandates.length === 0 && status.politics.agreements.length === 0 ? (
              <EmptyAction message="Nenhuma facção ou acordo neste recorte." />
            ) : (
              <ul className="registry-standings" aria-label="Facções e diplomacia">
                {status.politics.mandates.map((mandate) => (
                  <li key={`${mandate.factionName}-${mandate.officeName}`}>
                    <span>{mandate.officeName}</span>
                    <span>{mandate.factionName}</span>
                  </li>
                ))}
                {status.politics.relations.map((relation) => (
                  <li key={`${relation.fromName}-${relation.toName}`}>
                    <span>{relation.fromName} → {relation.toName}</span>
                    <span>{relation.stanceName}</span>
                  </li>
                ))}
                {status.politics.agreements.map((agreement) => (
                  <li key={agreement.agreementId}>
                    <span>{agreement.name}</span>
                    <span>{agreement.status}</span>
                  </li>
                ))}
                {status.politics.laws.map((law) => (
                  <li key={law.lawId}>
                    <span>{law.name}</span>
                    <span>{law.jurisdictionLocationId}</span>
                  </li>
                ))}
                {status.politics.influence.map((entry) => (
                  <li key={entry.factionName}>
                    <span>{entry.factionName}</span>
                    <span>{entry.amount}</span>
                  </li>
                ))}
              </ul>
            )}
            {status.politicsActions.length > 0 ? (
              <div className="action-card-list">
                {status.politicsActions.map((action) => (
                  <article key={action.actionId} className={action.available ? 'action-card' : 'action-card action-card--blocked'}>
                    <div className="action-card__body">
                      <div className="action-card__title">
                        <h3>{action.label}</h3>
                        <span>{action.available ? 'Disponível' : 'Bloqueada'}</span>
                      </div>
                      <p>{action.hint}</p>
                      <div className="action-card__footer">
                        <small>{action.blockedReason ?? `Custa ${formatPeriodCost(action.costPeriods)}`}</small>
                        <button
                          type="button"
                          className="button button--compact"
                          disabled={!action.available}
                          onClick={() => onAction({ type: 'politics.act', actionId: action.actionId })}
                        >
                          Executar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </details>
        </> : null}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `Treinar: ${pending.name}` : ''}
        message={
          pending
            ? `${pending.targetLabel}. Custa ${formatPeriodCost(pending.costPeriods)}. ${pending.effectsSummary.join('. ')}.`
            : ''
        }
        confirmLabel="Confirmar treino"
        onConfirm={() => {
          if (pending) {
            onAction({ type: 'training.train', methodId: pending.methodId });
            setPending(null);
          }
        }}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pendingGarden !== null}
        title={gardenRecipe?.name ? `Cultivar: ${gardenRecipe.name}` : 'Cultivar integração'}
        message={
          gardenRecipe?.cost
            ? `Custa ${gardenRecipe.cost.cultivationPoints} ponto${gardenRecipe.cost.cultivationPoints === 1 ? '' : 's'} de cultivo e ${formatPeriodCost(gardenRecipe.cost.timeCost.periods)}. A integração é permanente neste recorte.`
            : 'A integração consome cultivo e tempo.'
        }
        confirmLabel="Confirmar cultivo"
        onConfirm={() => {
          if (pendingGarden) {
            onAction({ type: 'garden.cultivate', recipeId: pendingGarden });
            setPendingGarden(null);
          }
        }}
        onCancel={() => setPendingGarden(null)}
      />
      <ConfirmDialog
        open={pendingPatent !== null}
        title={patent?.name ? `Reivindicar: ${patent.name}` : 'Reivindicar patente'}
        message={
          patent
            ? `${patent.description} A patente permanece separada do nível, do ranking e de qualquer título.`
            : 'O Registro avalia os requisitos desta patente.'
        }
        confirmLabel="Confirmar reivindicação"
        onConfirm={() => {
          if (pendingPatent) {
            onAction({ type: 'registry.claim', patentId: pendingPatent });
            setPendingPatent(null);
          }
        }}
        onCancel={() => setPendingPatent(null)}
      />
    </div>
  );
}

export function SystemIdentity({
  state,
  campaign,
  abilityName,
}: {
  state: GameState;
  campaign: Campaign;
  abilityName: string;
}) {
  return (
    <div className="system-identity">
      <div className="system-identity__profile">
        <span className="character-card__avatar" aria-hidden="true">♙</span>
        <div><span className="section-kicker">Sobrevivente</span><strong>{state.character.firstName} {state.character.lastName}</strong><small>{abilityName}</small></div>
      </div>
      <AttributeSummary attributes={state.attributes} />
      {state.relationships.length > 0 ? (
        <section className="character-trust" aria-labelledby="character-trust-title">
          <div className="section-heading"><h2 id="character-trust-title">Confiança</h2><span className="section-count">{state.relationships.length}</span></div>
        <ul className="relationship-list" aria-label="Confiança residual">
          {state.relationships.map((relationship) => (
            <li key={relationship.characterId}>
              <span className="relationship-list__avatar" aria-hidden="true">♙</span>
              <div><strong>{findNpc(campaign, relationship.characterId)?.name ?? relationship.characterId}</strong><span>Confiança residual</span></div>
              <strong>{relationship.trust}</strong>
            </li>
          ))}
        </ul>
        </section>
      ) : null}
    </div>
  );
}
