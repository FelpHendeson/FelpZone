# Contratos de domínio e mecânicas implementáveis

Versão 1.0 — 11/11/2026. **Especificação de engenharia, não aprovação de balanceamento nem conteúdo criativo.** Suporte ao [GDD](02-gdd-mvp.md), [governança criativa](15-governanca-criativa.md) e [Unity](16-especificacao-unity.md).

## 1. Identidades, versões e fonte de verdade

Todo objeto persistente possui ID imutável (UUID ou equivalente), Version para concorrência e referências a IDs estáveis de definição. Definições de conteúdo são diferentes das instâncias de jogador. Catálogo pode mudar sem recalcular origens passadas.

- PlayerAccount: identidade externa, preferências e datas.
- Character: ID, OwnerId, SlotIndex (0–2), BirthSnapshot, Appearance, Needs, Progression e Version.
- RuneDefinition: ID/version, elegibilidade e pesos de origem (**criativos em aberto**).
- BirthSnapshot: RuneId/Version, GeneratorVersion, Seed referência, RaceId, ElementId, CoreSkillIds, traços e aparência inicial. Não altera quando o personagem cresce.
- CharacterProgression: Level, Xp, baseAttributes, proficiencies, classId opcional, learnedSkills e possíveis modificadores.
- CharacterNeeds: Saciety, Rest, Hygiene, Health e LastEvaluatedAt; sem taxas fixas aprovadas.
- ManaState: quantidades e propriedades conforme sistema aprovado (reserva/qualidade são requisitos; controle/recuperação são propostas).
- CharacterAppearance: archetypeId, referências a peças/variações por slot, paleta/tintas quando aprovadas.
- ItemDefinition e ItemInstance (ID, owner, catalog version, equip state).
- Inventory/Wallet/TransactionLedger (na fase online).
- ActivitySession: atividade, personagem, versão, status, timestamps e resultado, com ID idempotente.
- Pet: futuro com ID, vinculação e necessidades, sem um catálogo inventado.

Não usar strings visuais, nomes traduzidos ou índices de array para identificar definições. Não persistir referência a Unity Object/GameObject como se fosse save. Não salvar classe derivada de UnityEngine.ScriptableObject como estado de progresso.

## 2. Regras invariantes não negociáveis

1. Conta possui no máximo três personagens humanoides vivos e não excluídos.
2. Uma invocação confirmada consome no máximo um slot e retorna exatamente um BirthSnapshot persistido.
3. Repetir uma operação com a mesma chave idempotente da mesma conta produz o mesmo resultado, nunca um novo prêmio/custo.
4. Propriedade de personagem/item/pet deve ser verificada em toda mutação.
5. Equipamento pode ocupar slots apenas se compatível; bônus são recalculados a partir do estado, jamais acumulados ao recarregar.
6. Um minigame tem no máximo uma conclusão econômica confirmada por sessão.
7. Inventário e carteira não podem ficar negativos por compra/venda.
8. A animação de UI não é fonte de verdade para rolagem, XP ou saldo.
9. Valores de necessidades são normalizados, finitos e dentro do intervalo de domínio definido.
10. Passage de tempo nunca pode retroceder necessidades por horário de dispositivo adulterado no serviço online.
11. Conteúdo antigo deve continuar resolvível após atualizar catálogos; usar migrações ou fallback explícito.
12. Excluir personagem sem política aprovada de itens e pets é bloqueado no MVP online (sem supor destino de propriedade).

## 3. Interfaces e tipos — referência C# para agente

Os fragmentos abaixo **não são código publicado**: são contratos sugeridos para guiar implementação, adaptáveis se houver ganho de manutenção verificável.

~~~csharp
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public interface ICharacterRepository
{
    Task<CharacterSnapshot?> FindAsync(
        Guid characterId, CancellationToken cancellationToken);

    Task<SaveResult> SaveAsync(
        CharacterSnapshot snapshot,
        long expectedVersion,
        CancellationToken cancellationToken);
}

public interface IContentCatalog
{
    CharacterArchetypeDefinition GetArchetype(string id);
    ItemDefinition GetItem(string id);
    RuneDefinition GetRune(string id);
}

public interface ICharacterAppearanceRenderer
{
    void Render(CharacterAppearanceSnapshot appearance);
    void Play(string animationId);
}

public interface IGameStateQuery
{
    Task<ScreenState> LoadActiveCharacterAsync(
        CancellationToken cancellationToken);
}
~~~

**Implementação local DEV:** IClock fake e save em JSON de teste; implementação online posterior usa HTTP e DTOs versionados. Interfaces devem ficar no projeto adequado ao grafo de dependências. Evitar serializar diretamente interfaces ou polimorfismo arbitrário sem conversores testados.

~~~csharp
public enum CommandStatus
{
    Succeeded,
    InvalidInput,
    NotAllowed,
    NotFound,
    Conflict,
    NetworkUnavailable,
    UnexpectedError
}

public sealed record CommandResult<T>(
    CommandStatus Status,
    T? Value,
    string? ErrorCode,
    string? Message);
~~~

Assinaturas e records dependem do nível C# suportado pela versão instalada; se record não estiver disponível, usar classes readonly com equivalente sem alterar o contrato conceitual.

## 4. Casos de uso: entrada, validação, efeito, resultado

| Use case | Entradas | Condições | Resultado |
| --- | --- | --- | --- |
| SelectCharacter | accountId, characterId | pertence à conta | seleção do personagem ativo |
| PreviewRune | runeId | catalogada e permitida | dados para UI, sem resultado definitivo |
| ConfirmSummon | accountId, runeId, operationId | conta, vaga, sessão, custo se houver | nascimento único e slot ocupado |
| ApplyCare | characterId, careActionId, operationId | dono, elegibilidade e estado | necessidades atualizadas e ação registrada |
| StartActivity | characterId, activityId | elegibilidade e cooldown se aprovado | sessão única com versão e prazo |
| CompleteActivity | sessionId, scorePayload, operationId | sessão aberta/validável | resultado, XP/recompensa únicos |
| EquipItem | characterId, itemInstanceId, slot | dono, compatibilidade, disponibilidade | item equipado e status recalculados |
| UnequipItem | characterId, slot | item realmente equipado | item removido do slot |
| BuyOffer | accountId, offerId, operationId | saldo/preço/catálogo válidos | débito + item/aprendizado atômicos |
| SellItem | accountId, itemInstanceId, operationId | propriedade, elegibilidade, não duplicado | remoção + crédito atômicos |
| LearnSkill | characterId, skillId, operationId | requisitos, categoria elegível, custo | registro aprendido único |
| DeleteCharacter | accountId, characterId, confirmation | política de vínculos aprovada | exclusão/transição consistente |

Para protótipo local, operações econômicas são DEV_ONLY e podem usar repositório em memória, nunca equivalentes de segurança real. Na versão online, idempotência e autorização são tarefas do backend.

## 5. Sistema de tempo e necessidades

**Contrato técnico proposto:**

~~~csharp
NeedSnapshot EvaluateNeeds(
    NeedSnapshot previous,
    DateTimeOffset lastEvaluation,
    DateTimeOffset now,
    NeedRules rules);
~~~

Função pura:
- Se now <= lastEvaluation, comportamento determinístico sem ganho; não aplicar taxa negativa por relógio regressivo.
- Calcular delta de tempo em unidades consistentes; limitar delta máximo efetivo por regras, não por improviso na UI.
- Aplicar curvas/taxas parametrizadas por NeedRules; limitar valores no intervalo definido.
- Derivar efeitos temporários (ex.: indisposição) de níveis, sem alterar stats permanentes.
- Aplicar cuidados por comando separado, com pré-condições e custo definidos pelo catálogo.
- Atualizar LastEvaluatedAt apenas quando a operação for validada/persistida.
- Para modo online, usar tempo de servidor e transação; offline de teste usa IClock fake.
- O que ocorre após dias/semanas sem abrir, doenças e risco de morte **é decisão criativa pendente**. Não criar morte permanente nem destruição automática.

**Exemplo DEV_ONLY, não balanceamento:** barras de 0 a 100 e taxas artificiais para validar UI. Trocar por tabela aprovada quando CR-08 for definido.

## 6. RPG e efeitos

Atributos base, modificadores de item e efeitos temporários são estruturas separadas. Proposta de pipeline:
1. Recolher atributos base do personagem e da progressão.
2. Resolver efeitos passivos de raça/skills/classe **somente se houver definições aprovadas**.
3. Resolver itens compatíveis e efeitos temporários válidos.
4. Calcular atributos efetivos por função pura com ordem fixa e limites.
5. Registrar explicações/descrições dos modificadores para tela de ficha.

**Evitar:** lógica específica do tipo "if class == Wizard" ou "if race == Elf" hardcoded em MonoBehaviour. Preferir catálogos de modificadores tipados e handlers testáveis para efeitos não triviais.

Esboço de definição:

~~~text
SkillDefinition
  id, version, category
  requirements[] (tipos definidos)
  costs[] (quando aplicáveis)
  effects[] (tipo, parâmetros validados)
  visualReferenceId? (opcional)
  tags[] (não dão poderes por si)
~~~

Os efeitos disponíveis inicialmente podem ser somente AttributeModifier e ActivityBonus como **plumbing técnico**, não habilidades reais. Poderes complexos terão especificações criativas e testes próprios antes de criar handlers dedicados.

**Compras de habilidades:** catálogo determina se uma habilidade pode ser adquirida. Não vender por padrão habilidades Core, raciais ou de classe antes de regras aprovadas.

## 7. Invocação e slots

Modelar slot Index 0–2 + CharacterId opcional. Excluir não significa sobrescrever sem confirmação. O nascimento pode ser reproduzível se preservar generatorVersion, catalogVersion, semente e snapshot; no entanto, a fonte primária de verdade do personagem existente é seu BirthSnapshot gravado, não um novo sorteio a cada carregamento.

Em modo G3:
- ConfirmSummon com chave idempotente exclusiva na conta;
- transação bloqueia/valida quantidade de slots e registra nascimento;
- retorno de rede pode repetir consulta por operationId;
- animação de apresentação usa apenas estado persistido;
- qualquer custo de invocação exige regra criativa aprovada;
- duas operações concorrentes para última vaga geram no máximo um personagem.

Em G1/G2 pode usar personagem DEV_ONLY fixo, sem simular resultado canônico.

## 8. Minigame: contrato genérico e Circuito de Mana DEV

~~~text
ActivityDefinition:
  id, version, estimatedDuration,
  capabilities, inputSettings, scoreDefinitionId,
  rewardPolicyId (apenas se aprovada)

ActivitySession:
  sessionId, characterId, activityId, status,
  startedAt, expiresAt, consumedOperationId?,
  clientPayloadVersion

ActivityResult:
  sessionId, normalizedScore, outcome,
  progressionChanges, currencyChanges,
  awardedAt, finalStatus
~~~

**Estados:** NotStarted → Active → Completed/Cancelled/Expired. Só Active aceita input; Completed é terminal e não concede novamente.

**Circuito de Mana proposto (a validar criativamente):**
- pulso percorre um percurso; jogador toca quando entra na zona;
- score calculado a partir de tempos/precisão normalizados;
- não tocar conta como tentativa ausente/erro, dependendo do contrato de rodada;
- cliente apresenta feedback visual/sonoro;
- domínio calcula pontuação independentemente do frame rate;
- servidor online valida duração, número de pulsos, plausibilidade e limites; não aceitar score arbitrário como verdade incondicional;
- políticas de recompensas e treino diário ficam abertas até CR-08.

Se o conceito de mana mudar na criação conjunta, a engine de sessões e pontuação deve continuar reutilizável.

## 9. Inventário e equipamentos

- ItemDefinition contém slot permitido, restrições, modificadores e referências de arte; ItemInstance contém proprietário, estado de vínculo, versão e origem.
- CharacterEquipment referencia instâncias de item por slot. Nunca copiar permanentemente stats no personagem ao equipar.
- Equip e Unequip são operações únicas com validação; ausência ou incompatibilidade retorna erro de domínio compreensível.
- Renderizador recebe AppearanceSnapshot já resolvido e aplica peças compatíveis com fallback; não precisa conhecer saldo/preço.
- Venda de item equipado requer escolha de regra explícita: bloquear ou desequipar na mesma transação, **pendente**.
- Equipamentos de RPG/sci-fi, visual e efeitos concretos dependem de CR-07.

## 10. Persistência local DEV e migração

No G1/G2 salvar um DTO GameSaveV1 com:
- schemaVersion e createdAt/updatedAt;
- personagem(s) de teste e snapshot de origem dev;
- necessidades, progresso, aparência, inventário e moeda fictícios;
- referências a definições dev versionadas;
- último timestamp avaliado.

JSON no persistentDataPath com gravação temporária e substituição segura, captura de erro e sinalização de save incompatível. Não editar catálogo para salvar progresso. Não usar PlayerPrefs como banco de progresso complexo; pode usá-lo para preferências triviais.

Criar migrador V1→V2 quando o schema mudar, testes de round-trip e corrupção de arquivo. O modo online não importa automaticamente moeda/invocação DEV; qualquer migração de progresso local para conta requer design e política antifraude separados.

## 11. Falhas e observabilidade

Padronizar ErrorCode: INVALID_INPUT, NOT_FOUND, NOT_OWNER, SLOT_LIMIT, ITEM_INCOMPATIBLE, INSUFFICIENT_FUNDS, OPERATION_ALREADY_APPLIED, STATE_CONFLICT, NETWORK_UNAVAILABLE, SESSION_EXPIRED, INTERNAL_ERROR. UI mapeia mensagem amigável; logs técnicos não expõem tokens ou dados sensíveis.

Em testes de domínio: inválidos, limite, concorrência simulada, mudança de versão de catálogo, ausência longa, save duplicado, componentes faltando, item incompatível, resposta já consumida e retrocesso de horário.

## 12. Gate de aceite

O agente deve poder demonstrar sem conteúdo criativo aprovado:
1. montar um personagem DEV modular;
2. mudar uma peça enquanto anima;
3. aplicar ação de cuidado usando regras temporárias injetadas e mostrar atualização;
4. iniciar/encerrar treino sem dupla recompensa local;
5. salvar/reabrir sem duplicar stats;
6. produzir relatório de testes EditMode e PlayMode.

O sistema não pode ser considerado G3/G4 se a API autoritativa, identidade, slots e economia real ainda forem simulados.
