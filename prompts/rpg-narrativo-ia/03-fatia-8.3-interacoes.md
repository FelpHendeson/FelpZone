# Prompt — Sistema 8, Fatia 8.3: interações dirigidas por dados

> Executar somente após revisão e consolidação da Fatia 8.2.

```text
Implemente somente a Fatia 8.3 do Sistema 8 — Catálogo e planejamento puro de interações com presenças.

Trabalhe dentro de `rpg-narrativo-ia`. Leia integralmente `AGENTS.md`, `README.md`, `docs/PROJECT-STATUS.md`, `docs/SYSTEM-PRESENCES.md`, `docs/PHASE-2-ENGINE.md`, `docs/SYSTEM-TIME-AND-DATE.md` e a implementação/testes atuais de presenças, condições, efeitos, campanhas e narrativa.

Pré-condição:

- Fatias 8.1 e 8.2 implementadas, revisadas e com testes passando.
- Se essa pré-condição não for verdadeira, não tente compensar implementando várias fatias juntas.

Objetivo:

Modelar interações contextuais como dados e criar uma operação pura que valide uma tentativa e devolva um plano de execução. Nesta fatia, o plano não altera `GameState`, não aplica efeitos, não avança o relógio, não resolve presença e não abre sessão narrativa.

Contrato esperado:

- tipos de interação aprovados: `observe`, `investigate`, `approach`, `talk` e `avoid`;
- definição com ID, presença, tipo, rótulo, dica opcional, custo, condições opcionais, efeitos opcionais, feedback opcional, narrativa opcional e intenção de resolução;
- catálogo indexado por ID e por presença;
- consulta de interações conhecidas/disponíveis para uma presença descoberta;
- planejamento puro de uma interação válida.

Use uma forma equivalente a:

interface PresenceInteractionDefinition {
  id: string;
  presenceId: string;
  kind: PresenceInteractionKind;
  label: string;
  hint?: string;
  timeCost: TimeCost;
  conditions?: GameCondition[];
  effects?: GameEffect[];
  feedback?: string;
  narrative?: { campaignId: string; eventId: string };
  resolvesPresence: boolean;
}

interface PresenceInteractionPlan {
  interactionId: string;
  presenceId: string;
  timeCost: TimeCost;
  effects: GameEffect[];
  feedback?: string;
  narrative?: { campaignId: string; eventId: string };
  resolvesPresence: boolean;
}

Os nomes podem seguir as convenções do projeto. Preserve a separação entre planejar e executar.

Validação obrigatória:

- IDs globais de interação não vazios e únicos;
- tipo pertencente ao conjunto aprovado;
- `presenceId` existente;
- rótulo não vazio e dica/feedback válidos quando presentes;
- `timeCost` validado pelas funções do módulo de tempo;
- condições validadas nos formatos existentes;
- efeitos validados sem duplicar regras do motor;
- referência narrativa aponta para campanha e evento existentes;
- evento inicial precisa poder abrir uma sessão narrativa válida;
- `resolvesPresence` é booleano;
- conteúdo original e índices internos permanecem imutáveis.

Regras de planejamento:

- presença oculta, indisponível ou resolvida não aceita interação;
- interação precisa pertencer à presença solicitada;
- condições da presença e da interação precisam estar satisfeitas;
- consulta pode mostrar interação conhecida bloqueada com motivo seguro, mas não revela interação de presença oculta;
- o resultado devolve cópias defensivas dos efeitos, custo e referência narrativa;
- o plano não altera qualquer estado;
- falha devolve erro controlado e não produz resultado parcial;
- a existência de `narrative` não inicia a sessão;
- `resolvesPresence` representa intenção para o futuro orquestrador, não resolução imediata.

Catálogo protótipo mínimo:

- Mira: ao menos uma interação social que possa apontar para narrativa;
- coelho chifrudo: ao menos uma interação sem diálogo;
- não crie combate, dano, chance, hostilidade, captura ou domesticação;
- se um evento narrativo compatível ainda não existir, mantenha a referência fora do catálogo inicial ou use somente um evento existente validamente, sem escrever a Fatia 8.6 antecipadamente.

Testes mínimos:

- catálogo válido e índices por presença;
- todos os tipos aprovados;
- ID, tipo, presença, custo, condição, efeito e narrativa inválidos;
- listagem não expõe ocultas;
- bloqueio de presença indisponível ou resolvida;
- bloqueio por condição da interação;
- planejamento válido com e sem narrativa;
- plano contém cópias defensivas;
- planejamento não altera `PresenceState`, `GameState` ou catálogo;
- erro não retorna alteração parcial;
- entradas congeladas permanecem intactas.

Não implemente:

- nova `SandboxAction`;
- aplicação de efeitos;
- aplicação de tempo;
- resolução efetiva da presença;
- abertura de `narrativeSession`;
- alteração de `GameState`, `SandboxState`, schema, save ou migrações;
- UI;
- conteúdo completo da Fatia 8.6;
- agenda, IA, combate ou sobrevivência.

Atualize a documentação somente para refletir contratos efetivamente entregues e marque apenas a Fatia 8.3 como implementada.

Execute:

npm test
npm run lint
npm run typecheck
npm run build

Relate contratos, testes, decisões e pendências. Não antecipe a Fatia 8.4.
```
