# Dia 4 — Especificação técnica de implementação

## Estado

**Fatias A, B, C e D implementadas — Dia 4 fechado neste recorte.** Este documento converte a [especificação narrativa do Dia 4](DAY-4-NARRATIVE-SPEC.md) em uma sequência de trabalho, seguindo o mesmo padrão de recorte usado em [Dia 3 — implementação](DAY-3-IMPLEMENTATION-SPEC.md).

Referências:

- [Dia 4 — narrativa](DAY-4-NARRATIVE-SPEC.md);
- [Dia 3 — implementação](DAY-3-IMPLEMENTATION-SPEC.md);
- [Atividades Contextuais](MECHANIC-CONTEXTUAL-ACTIVITIES.md);
- [Motor e pack de mundo](CONTENT-PACK.md).

---

# 1. Objetivo técnico

Abrir o Dia 4 pelo relógio real, a partir de `day3.started`, e acrescentar uma segunda atividade contextual jogável que aprofunde a convivência já estabelecida com Davi — sem repetir o tema da vigília do Dia 3 e sem exigir nova localização, novo NPC ou novo schema.

## 1.1 Por que a segunda atividade escolhida não duplica a primeira

A [especificação narrativa](DAY-4-NARRATIVE-SPEC.md) lista várias pressões válidas (expedição, vigia em dupla, cuidado mais ativo de Davi, treino conjunto). A escolhida para esta primeira fatia jogável do Dia 4 é **cuidar do ferimento de Davi de forma mais ativa do que a simples verificação já feita no Dia 2** (`davi-condition`), pelos seguintes motivos:

- reaproveita um fio narrativo já plantado (`day2.davi.condition.known`, `day2.davi.condition.seen`) em vez de abrir geografia nova;
- inverte a forma de participação da vigília: aqui Davi é o participante obrigatório e Caio o opcional, provando que o contrato de atividades generaliza para os dois arranjos sem mudança de motor;
- não exige nenhuma localização, item ou catálogo novo — acontece na Clareira do Despertar, onde Davi já está presente por relocação persistente desde que foi escoltado no Dia 2.

**Achado durante a implementação:** a localização de Davi diverge por rota. Quando escoltado (`escort-davi-to-clearing`, Dia 2), `npc.relocate` fixa `locationOverrideId: 'awakening-clearing'` — uma relocação permanente que independe da agenda e do período. Quando não escoltado (rota `day-three-independent`), Davi permanece na própria rotina (Margem Rochosa). Como uma atividade só pode ter um `locationId`, ela não pode aparecer para as duas rotas ao mesmo tempo; a versão implementada usa `day2.davi.escorted = true` como requisito (em vez de `day2.survivors.contact`, mais permissivo) e vive na Clareira, onde Davi realmente está para quem o ajudou a se mudar. A rota de contato conhecido sem compromisso (`day-three-independent`) não recebe esta atividade — decisão consciente, não lacuna: cuidar do ferimento de verdade pressupõe já ter assumido alguma responsabilidade por ele.

Uma expedição à Mata Densa (`dense-woods`, já existente no mapa e na tabela de exploração, mas sem uso narrativo) permanece como conteúdo futuro de uma fatia posterior, não como lacuna deste recorte.

---

# 2. Decisões e contratos

## 2.1 Pack e schema

- Manter a campanha `first-day` e não alterar o schema (permanece 26).
- Reusar `activities.consumedActivityIds` para a nova atividade de execução única.
- Não persistir catálogo ou conteúdo de campanha no save.

## 2.2 Entrada do Dia 4 — sem ramificação por texto

Ao contrário do amanhecer do Dia 3 (quatro variantes narrativas distintas), o amanhecer do Dia 4 usa **um único evento**, sem ramificação por rota herdada. A variação real do dia não vem de um texto de abertura diferente por rota — vem de quais atividades e presenças estão disponíveis no sandbox, exatamente como as quatro rotas do Dia 3 já convergem para o mesmo tipo de decisão (`day2.survivors.contact`, `day2.davi.escorted` etc.) sem exigir uma prosa própria para cada combinação.

- Novo world trigger `day-four-start`: `source: { type: 'world.day.min', day: 4 }`, condição `day3.started = true` (mesmo padrão do trigger `day-three-start`), evento `day-four-awakening`.
- `day-four-awakening`: um único corpo de texto que reconhece a passagem do tempo sem presumir nenhuma rota específica do Dia 3; uma escolha define `day4.started = true` e retorna ao sandbox (`returnToExploration`).
- Nenhuma variante narrativa nova é criada. Se uma necessidade real de diferenciação por rota aparecer, ela pertence a uma fatia futura, não a esta.

## 2.3 Pipeline de atividade

Reusar `activity.perform` sem alteração de contrato, nas mesmas cinco garantias já documentadas na especificação do Dia 3 (seção 2.2): planejamento e validação pelo módulo `activities`, efeitos aplicados uma única vez, um período cobrado pelo pipeline normal, necessidades e sincronização de mundo aplicadas uma vez, narrativa aberta antes de qualquer world trigger elegível.

## 2.4 Visibilidade e consentimento

Davi só pode ser escolhido como participante obrigatório se for conhecido, estiver presente na Clareira e disponível; Caio, quando declarado como opcional, segue a mesma regra — e sua própria agenda só o traz à Clareira no período `entardecer`, então ele é elegível apenas nessa janela, não o dia inteiro. O motor continua validando essas condições; a UI não é responsável por consentimento.

---

# 3. Conteúdo da segunda atividade jogável

## 3.1 Entrada do Dia 4

ID do trigger: `day-four-start`. ID do evento: `day-four-awakening`. Ambos seguem exatamente o formato de `day-three-start`/`day-three-awakening` (ver `content/first-day/campaign/world-triggers.json` e `events.json`), com uma única escolha que define `day4.started` e retorna ao sandbox.

## 3.2 Atividade — `tend-davi-wound-with-caio`

ID:

`tend-davi-wound-with-caio`

Local:

`awakening-clearing`

Disponível quando:

- `day4.started = true`;
- `day2.davi.escorted = true` (Davi só está fixo na Clareira, por relocação persistente, para quem o ajudou a se mudar no Dia 2 — ver achado da seção 1.1);
- Davi é conhecido, está na Clareira e está disponível.

Participantes:

- obrigatório: `davi-moura`;
- opcional (0–1): `caio-nascimento`, quando presente pela própria agenda.

Efeitos-base da atividade:

- `npc.rememberFact` para `davi-moura` (fato de memória sobre ter recebido cuidado ativo, distinto de `davi-met-at-rocky-bank`/`davi-arrived-clearing` já existentes);
- `guidance.unlock` para o mesmo tópico de Atividades Contextuais, condicional a ainda não estar desbloqueado (idempotente, como na vigília).

Narrativa:

- `campaignId: first-day`, `eventId: davi-wound-care`.

## 3.3 Evento `davi-wound-care`

Três escolhas, no mesmo padrão de contrato usado em `night-watch-proposal` (apenas `flag.set` e `relationship.change` — `npc.rememberFact` não é válido em efeito de escolha de evento comum):

- **Cuidar com paciência, aceitando gastar mais tempo com ele** (notável): define `day4.davi.care.covered` e `day4.davi.care.attentive`; `relationship.change` positivo maior com Davi.
- **Fazer o cuidado básico rápido, sem se prolongar** : define `day4.davi.care.covered` e `day4.davi.care.quick`; `relationship.change` positivo menor com Davi.
- **Dizer que agora não é o momento e adiar**: define `day4.davi.care.declined`; nenhuma variação de relação — recusar não é punido mecanicamente, mesma regra do Dia 3.

Cada escolha retorna ao sandbox. Nenhuma concede item, cura mecânica de condição ou descoberta — o Sistema 14/15 (itens, condições) não é usado nesta fatia; o resultado é inteiramente relacional e narrativo, como a vigília.

O ato de participar já consome a atividade (`repeatable: false`).

---

# 4. Continuidade das rotas herdadas do Dia 2 e do Dia 3

## Cooperação (`day-three-cooperation`)

É a única rota com `day2.davi.escorted = true`. A atividade fica disponível assim que o jogador chega à Clareira, onde Davi já está presente por relocação persistente — independentemente de ter participado ou não da vigília do Dia 3.

## Contato conhecido sem compromisso (`day-three-independent`)

`day2.survivors.contact = true`, mas `day2.davi.escorted` nunca foi definido: Davi permanece na própria agenda (Margem Rochosa), não na Clareira. `talk-caio-rocky-bank` já registra reconhecimento de Davi (`npc.rememberFact`), então a atividade continua visível na listagem natural de quem chega à Clareira — mas bloqueada, porque o requisito de flag não é atendido. Não há contato forçado nem execução possível.

## Afastamento e ausência de encontro

Nas rotas `day-three-distance` (Davi reconhecido de longe via `avoid-caio-rocky-bank`, sem `day2.davi.escorted`) e `day-three-solo` (Davi nunca conhecido), a atividade nunca fica disponível pelo mesmo requisito de flag.

---

# 5. Fatias de implementação

## Fatia A — entrada do Dia 4 pelo relógio real — **implementada**

- `day-four-start` (`content/first-day/campaign/world-triggers.json`) e `day-four-awakening` (`content/first-day/campaign/events.json`) seguem exatamente o formato de `day-three-start`/`day-three-awakening`.
- Testado: o trigger só nasce após `day3.started` e é consumido uma vez; a escolha define `day4.started` e retorna ao sandbox; as quatro rotas do Dia 3 continuam alcançáveis sem regressão até o Dia 4.
- Schema, NPCs, mapa e contratos não foram alterados.

## Fatia B — atividade e cena de cuidado com Davi — **implementada**

- A atividade `tend-davi-wound-with-caio` e o fato de memória `davi-wound-tended` foram adicionados (seção 3.2).
- O evento `davi-wound-care` foi adicionado com as três decisões (seção 3.3).
- **Achado durante a implementação** (documentado na seção 1.1): a rota de contato conhecido sem compromisso (`day-three-independent`) não recebe a atividade, porque Davi só é relocado para a Clareira por quem o escoltou (`day2.davi.escorted`); nas outras rotas ele permanece na própria agenda.
- Cobertura em `src/tests/day-four.test.ts`: indisponibilidade antes de `day4.started`; as três ramificações da cena; bloqueio de segunda execução; persistência via save/reload; confirmação de que a rota de contato sem compromisso não recebe a atividade.

## Fatia C — robustez e falhas de disponibilidade — **implementada**

- Bloqueio sem mutar estado quando o jogador não está na Clareira, mesmo com Davi escoltado e disponível.
- Caio só é elegível como testemunha opcional no período em que a própria agenda o traz à Clareira (`entardecer`) — nuance distinta da vigília do Dia 3, onde o requisito bloqueante recaía sobre o participante obrigatório; aqui é o participante opcional que varia por agenda.
- `activity.perform` forçado nas rotas de contato conhecido sem compromisso, afastamento e ausência de encontro é recusado sem criar presença, contato ou mutar flags; nas duas primeiras a atividade permanece visível na listagem natural (Davi já reconhecido por `npc.rememberFact` em `talk-caio-rocky-bank`/`avoid-caio-rocky-bank`) mas bloqueada, e na terceira ela nem aparece (Davi nunca conhecido).
- Save/reload cobre a ramificação de cuidado rápido, não só a de cuidado atencioso.
- Nenhum código de produção mudou nesta fatia — apenas prova de que a robustez já herdada do contrato de `planContextualActivity`/`listKnownContextualActivities` cobre a nova atividade.

## Fatia D — playtest integrado e fechamento — **implementada**

- Rota cooperativa: `tend-davi-wound-with-caio` fica disponível assim que o jogador chega à Clareira no Dia 4.
- Rota de afastamento: a atividade aparece na listagem, mas bloqueada, sem contato forçado.
- Rota sem encontro: a atividade não aparece na listagem, pois Davi nunca foi conhecido.
- Save/reload depois do cuidado retoma o sandbox sem duplicar relógio, consumo ou escolha.
- Fechamento: **97 arquivos de teste / 975 testes**, lint, typecheck e build PWA verdes.

---

# 6. Arquivos esperados

Conteúdo e catálogos:

- `content/first-day/campaign/world-triggers.json` (Fatia A);
- `content/first-day/campaign/events.json` (Fatias A e B);
- `content/first-day/world/activities.json` (Fatia B);
- `content/first-day/world/npcs.json` (Fatia B).

Validação e testes:

- `src/tests/campaign-validation.test.ts` (regressão do pack, sem alteração de código);
- `src/tests/day-four.test.ts` (novo, Fatias A–D).

---

# 7. Testes de aceite

## Pack e contrato

- a campanha compõe com o novo trigger, evento, atividade e fato;
- referência inexistente de NPC, fato, flag/narrativa ou local reprova a composição;
- `activity.perform` continua rejeitando ID arbitrário e participante indevido;
- nenhuma alteração de schema ou migração.

## Execução

- Dia 3: atividade indisponível (não existe `day4.started` ainda);
- Dia 4 antes de `day-four-awakening`: atividade indisponível;
- rota conhecida (`day2.survivors.contact = true`): atividade aparece apenas na Margem Rochosa com Davi conhecido, presente e disponível;
- execução concluída cobra exatamente um período e aplica desgaste uma vez;
- cada escolha retorna ao sandbox e registra só o resultado selecionado;
- recurso, descoberta e relação com terceiros permanecem inalterados;
- segundo uso bloqueado, incluindo após save/reload.

## Rotas integradas

- a rota cooperativa (Davi escoltado) realiza a atividade;
- contato conhecido sem compromisso, afastamento e ausência de encontro nunca a executam — nas duas primeiras ela permanece visível mas bloqueada, na terceira nem aparece;
- entrada via relógio real e preservação das decisões dos Dias 1–3;
- ausência de party, assentamento, profissão ou final de jogo.

Gates finais:

~~~bash
npm test
npm run lint
npm run typecheck
npm run build
~~~

O playtest integrado do Dia 4 deve acrescentar suas rotas sem retirar os testes dos Dias 1 a 3 existentes.

---

# 8. Fora das Fatias A–D

- nova versão de schema;
- novas ações ou efeitos para a mecânica de atividades;
- Sistema 14/15 (itens, condições) aplicado mecanicamente ao ferimento de Davi;
- nova localização (a Mata Densa permanece reservada para fatia futura);
- Caio/Davi/Mira movidos artificialmente para habilitar a atividade;
- novo elenco obrigatório;
- rota de contato forçado para quem evitou os sobreviventes;
- ordem formal, party, profissão, assentamento, lei ou propriedade;
- conteúdo do Dia 5 ou dos dias seguintes.

---

# 9. Critério de conclusão

O Dia 4 está implementado quando o relógio real abre o dia sem ramificação narrativa forçada, a segunda atividade compartilhada pode ser escolhida e concluída com custo real, decisão registrada e retorno livre ao sandbox, as rotas herdadas do Dia 2/3 continuam válidas, e os gates finais passam.

As Fatias A, B, C e D cumprem esse critério:

- **Fatia A** — `day-four-start` abre `day-four-awakening` uma única vez ao relógio real, sem ramificação por rota, e as quatro rotas herdadas do Dia 3 chegam ao Dia 4 sem regressão.
- **Fatia B** — `tend-davi-wound-with-caio` fica disponível somente na rota cooperativa (Davi escoltado), com três desfechos de custo real (`care-with-patience`, `care-quickly`, `postpone-davi-care`), registro único e retorno livre ao sandbox.
- **Fatia C** — localização incorreta, disponibilidade condicionada ao período de Caio, e as rotas sem escolta rejeitam a atividade sem efeito colateral, com verificação de robustez a save/reload.
- **Fatia D** — playtest integrado confirma a visibilidade correta em cada rota (disponível na cooperativa; visível mas bloqueada nas rotas de contato sem compromisso e de afastamento; ausente na rota solo) e a persistência do estado do mundo após save/reload.

Este recorte do Dia 4 está fechado; o próximo passo é uma decisão de conteúdo sobre o Dia 5.
