# Dia 3 — Especificação técnica de implementação

## Estado

**Fatias A, B e C implementadas.** Este documento converte a [especificação narrativa do Dia 3](DAY-3-NARRATIVE-SPEC.md) em uma sequência de trabalho.

A campanha first-day já contém:

- o world trigger day-three-start, condicionado por day2.started;
- day-three-awakening e quatro variantes de continuidade, agora com as quatro rotas cobertas por teste integrado (`day-two-playtest.test.ts`), incluindo `day-three-independent`, que não tinha regressão própria;
- a flag day3.started, definida antes de voltar ao sandbox;
- atividades contextuais e o estado persistente activities.consumedActivityIds;
- a primeira atividade jogável do Dia 3 — `share-night-watch-with-caio` — e o evento `night-watch-proposal`, cobertos em `src/tests/day-three.test.ts`;
- as rotas integradas Dia 1 → Dia 2 → amanhecer do Dia 3 nos testes day-two-playtest.

**Mudança de conteúdo em relação à primeira versão desta especificação:** a seção 3 originalmente propunha `compare-spring-paths-with-caio`, uma segunda conversa sobre a Nascente. Ela foi descartada porque duplicava o tema de `discuss-water-with-caio` (Dia 2, Fatia E) no mesmo local com o mesmo NPC. A atividade implementada usa a Margem Rochosa e o tema da vigília noturna, que a especificação narrativa já lista como pressão dramática válida ("vigiar reduz o tempo disponível para outras tarefas") e ainda não tinha sido jogada. As Fatias C–D abaixo permanecem como próximo trabalho.

Referências:

- [Dia 3 — narrativa](DAY-3-NARRATIVE-SPEC.md);
- [Dia 2 — implementação](DAY-2-IMPLEMENTATION-SPEC.md);
- [Atividades Contextuais](MECHANIC-CONTEXTUAL-ACTIVITIES.md);
- [Motor e pack de mundo](CONTENT-PACK.md);
- [Dia 2 — playtest integrado](../src/tests/day-two-playtest.test.ts).

---

# 1. Objetivo técnico

Acrescentar uma pequena experiência jogável que demonstre cooperação voluntária como atividade situada, enquanto preserva as rotas de afastamento e ausência de encontro.

O jogador que já conhece Caio pode comparar com ele os acessos conhecidos à Nascente. A atividade custa tempo real, exige que ambos possam participar e abre uma conversa curta que registra um plano provisório. Ela não coleta água, não revela conhecimento que o jogador não descobriu e não cria organização.

O jogador que não conhece Caio não recebe essa atividade, NPC ou conversa por consequência. Continua no sandbox com os sinais distantes e a liberdade já estabelecidos no fim do Dia 2.

---

# 2. Decisões e contratos

## 2.1 Pack e schema

- Manter a campanha first-day e os IDs da entrada do Dia 3.
- Manter schema 26. Usar activities.consumedActivityIds para a atividade de execução única.
- Não persistir catálogo ou conteúdo de campanha no save.
- Usar flags de campanha somente para decisões novas do Dia 3; não copiar presença, relacionamento ou inventário para flags paralelas.

## 2.2 Pipeline de atividade

Reusar activity.perform sem alteração de contrato. A atividade deve:

1. ser planejada e validada pelo módulo activities;
2. aplicar seus efeitos declarativos uma única vez;
3. cobrar um período pelo pipeline normal do sandbox;
4. aplicar necessidades e sincronização de mundo uma vez;
5. abrir a narrativa declarada antes de world triggers que tenham ficado elegíveis durante esse avanço.

Não chamar coleta, movimento ou outra ação do sandbox por dentro de uma atividade. Os efeitos permitidos continuam sendo os do contrato atual: flags, relações, fatos de memória, relocação tipada de NPC e guidance.

## 2.3 Visibilidade e consentimento

O pack é a fonte da disponibilidade. Caio só pode ser escolhido se for conhecido, estiver presente e disponível; o motor continua validando essas condições. Não revelar NPC oculto pela view-model nem tornar a UI responsável por consentimento.

---

# 3. Conteúdo da primeira atividade — implementada

ID:

share-night-watch-with-caio

Local:

rocky-bank

Disponível quando:

- day3.started = true;
- day2.survivors.contact = true;
- Caio é conhecido, está na Margem Rochosa e está disponível;
- a atividade ainda não foi consumida.

Declarar também npc.known para caio-nascimento: o planejador valida presença e disponibilidade de participantes obrigatórios, mas não infere que o jogador conhece essa pessoa. Manter day2.survivors.contact como gate explícito para não iniciar contato retroativo. Davi participa apenas como testemunha opcional (0–1): ele não assume turno, mas pode estar presente pela agenda. O texto da atividade apresenta a conversa como iniciativa de Caio; executá-la é a aceitação voluntária do jogador, e disponibilidade oculta ou ocupada impede a oferta.

Definição implementada (`content/first-day/world/activities.json`):

~~~json
{
  "id": "share-night-watch-with-caio",
  "label": "Ouvir Caio sobre a vigília",
  "description": "Caio quer decidir com você quem cobre a vigília desta noite na Margem Rochosa.",
  "locationId": "rocky-bank",
  "timeCost": { "periods": 1 },
  "repeatable": false,
  "requirements": [
    { "type": "flag.is", "flag": "day3.started", "value": true },
    { "type": "flag.is", "flag": "day2.survivors.contact", "value": true },
    { "type": "npc.known", "npcId": "caio-nascimento" },
    { "type": "npc.present", "npcId": "caio-nascimento" },
    { "type": "npc.available", "npcId": "caio-nascimento" }
  ],
  "participants": {
    "requiredNpcIds": ["caio-nascimento"],
    "optionalNpcIds": ["davi-moura"],
    "minOptional": 0,
    "maxOptional": 1
  },
  "effects": [
    { "type": "npc.rememberFact", "npcId": "caio-nascimento", "factId": "caio-watch-request-heard" },
    { "type": "guidance.unlock", "topicId": "contextual-activities" }
  ],
  "narrative": {
    "campaignId": "first-day",
    "eventId": "night-watch-proposal"
  }
}
~~~

O fato de memória `caio-watch-request-heard` e a narrativa foram validados na composição do pack.

## 3.1 Evento night-watch-proposal — implementado

A cena reconhece que Caio não dorme direito desde que encontrou Davi e está vigiando a Margem Rochosa sozinho à noite. Davi ouve, mas não participa da decisão — ele ainda não consegue assumir turno.

Restrição de contrato encontrada durante a implementação: `npc.rememberFact` só existe nos efeitos de atividades e interações, não nos efeitos de uma escolha de evento comum (o motor de eventos não recebe o catálogo de NPCs). Por isso as três opções abaixo usam apenas `flag.set` e `relationship.change`, e o único fato de memória do arco fica no efeito-base da atividade.

Opções narrativas:

- **Assumir a vigília sozinho para que Caio durma de verdade** (`take-watch-alone`, notável): define `day3.watch.covered` e `day3.watch.taken-by-player`; `relationship.change` +14 com Caio.
- **Propor revezar a vigília em turnos** (`split-the-watch`): define `day3.watch.covered` e `day3.watch.shared`; `relationship.change` +8 com Caio.
- **Dizer que precisa cuidar da própria rotina essa noite** (`decline-watch-duty`): define `day3.watch.declined`; nenhuma variação de relação — a especificação narrativa exige que recusar não seja punido mecanicamente.

Cada escolha retorna ao sandbox. Nenhuma concede água, item, descoberta ou movimento de NPC.

O ato de participar já consome a atividade. Não repete a conversa como atividade paga; o resultado fica registrado e o jogador pode voltar ao tema apenas se conteúdo futuro oferecer uma nova situação.

---

# 4. Continuidade das rotas

## Cooperação no Dia 2 — coberta por teste

Após day-three-cooperation-continue, o jogador pode chegar à Margem Rochosa e executar `share-night-watch-with-caio` quando Caio estiver realmente presente (alvorecer/manhã pela agenda). Davi pode estar em outro local pela agenda; não é teleportado nem incluído artificialmente — é apenas participante opcional quando presente.

## Sobreviventes evitados

Após day-three-distance-continue, day2.survivors.contact permanece falso. A atividade de Caio não aparece (o requisito `day2.survivors.contact` bloqueia o catálogo). Os sinais distantes continuam observáveis sem iniciar contato ou marcar que o jogador conheceu os sobreviventes.

## Sobreviventes conhecidos sem compromisso — coberta por teste

Após day-three-independent-continue (Fatia A, `day2.survivors.contact = true` sem `day2.davi.escorted`), Caio pode participar apenas se conhecido e presente pela agenda. A escolha de iniciar a atividade não converte a recusa/independência anterior em acordo permanente; a conversa da vigília fica disponível do mesmo jeito, porque a tensão de vigiar sozinho independe de o jogador ter ajudado Davi a se mudar.

## Nenhum encontro no Dia 2

Após day-three-solo-continue, a fumaça permanece informação à distância. A atividade de Caio não aparece, day2.survivors.contact continua falso e a exploração individual não é bloqueada.

---

# 5. Fatias de implementação

## Fatia A — contrato de entrada e regressão — **implementada**

- As quatro variantes de day-three-awakening e seus gates foram conferidas; nenhuma precisou de correção.
- O trigger só nasce após day2.started e é consumido uma vez (já coberto antes desta fatia).
- Cada escolha define day3.started e volta ao sandbox (já coberto antes desta fatia).
- A lacuna real era a ausência de teste para `day-three-independent` (contato feito, ajuda recusada). Um novo caso foi acrescentado a `day-two-playtest.test.ts` cobrindo `talk-caio-rocky-bank → wary-check-davi → decline-davi-responsibility → day-three-independent`; as suítes existentes não foram reescritas.
- Schema, NPCs, mapa e contratos não foram alterados.

## Fatia B — atividade compartilhada e cena — **implementada**

- A atividade `share-night-watch-with-caio` e o fato de memória `caio-watch-request-heard` foram adicionados (seção 3), substituindo a proposta original `compare-spring-paths-with-caio` para não duplicar `discuss-water-with-caio`.
- O evento `night-watch-proposal` foi adicionado com três decisões (seção 3.1).
- Guidance de Atividades é desbloqueada pela atividade só quando ainda não estiver; a UI de atividades já existente não precisou de mudança.
- Custos, participante, flags e referência narrativa foram validados pela composição do pack (testes de regressão do pack continuam verdes).
- Nenhum recurso foi adicionado diretamente; a atividade de água do Dia 2 não foi alterada.
- Cobertura dedicada em `src/tests/day-three.test.ts`: indisponibilidade antes de day3.started, as três ramificações da cena (assumir sozinho, revezar, recusar), bloqueio de segunda execução e persistência via save/reload.
- Fechamento: **96 arquivos de teste / 950 testes**, lint, typecheck e build PWA verdes.

## Fatia C — autonomia e falhas de disponibilidade — **implementada**

- A indisponibilidade antes de day3.started já tinha teste na Fatia B; permanece coberta.
- Novo caso: com Ana ainda na Margem Rochosa, avançar o relógio até Caio se mover pela agenda para a Nascente (meio-dia) reproduz "presente no local, NPC ausente" sem qualquer navegação manual. A tentativa é recusada e o estado capturado antes da chamada permanece intacto — uma ação recusada não devolve um novo estado para aplicar.
- Novo caso: na rota de afastamento (`day2.survivors.avoided`, sem `day2.survivors.contact`), forçar `activity.perform` com `optionalParticipantIds: ['davi-moura']` — participante que nunca foi declarado opcional — ainda é recusado; a presença de Caio já resolvida (por `avoid-caio-rocky-bank`) permanece resolvida sem virar contato.
- Novo caso: na rota sem encontro (`day-three-solo`), a mesma tentativa não descobre `rocky-bank` nem cria a presença `caio-rocky-bank` — a rejeição do motor não tem efeito colateral algum no mundo.
- Save/reload testado também para a ramificação de revezamento (`split-the-watch`), não só para "assumir sozinho": consumo, flag e confiança sobrevivem ao ciclo, e uma segunda tentativa após o reload continua bloqueada.
- Cobertura em `src/tests/day-three.test.ts`, descrever `Fatia C — autonomia e falhas de disponibilidade`. Nenhum código de produção mudou — a robustez já vinha do contrato de `planContextualActivity`/`listKnownContextualActivities`; a fatia só prova isso.
- Fechamento: **96 arquivos de teste / 954 testes**, lint, typecheck e build PWA verdes.

## Fatia D — playtest integrado e fechamento

- Percorrer a rota cooperativa desde o Dia 1 e realizar a atividade no primeiro período em que Caio está presente na Nascente.
- Percorrer a rota de contato conhecido sem compromisso e verificar consentimento opcional.
- Percorrer as rotas de evasão e ausência de encontro até o sandbox do Dia 3 e verificar ausência da atividade e do contato forçado.
- Salvar e recarregar depois da atividade, retomando no sandbox sem duplicar custo, fato ou escolha.
- Atualizar status, roadmap, README e documentação de testes somente após os gates.

---

# 6. Arquivos esperados

Conteúdo e catálogos:

- content/first-day/world/activities.json;
- content/first-day/world/npcs.json;
- content/first-day/campaign/events.json;
- content/first-day/campaign/world-triggers.json somente se a Fatia A revelar defeito no gate existente.

Validação e testes:

- src/tests/campaign-validation.test.ts;
- src/tests/contextual-activities.test.ts;
- src/tests/day-two-world.test.ts;
- src/tests/day-two-playtest.test.ts (rota day-three-independent acrescentada na Fatia A);
- src/tests/day-three.test.ts (novo, Fatia B).

Atualizar src/campaigns/first-day ou os tipos do motor apenas se a composição JSON exigir uma referência que o contrato atual já não permita validar. Não antecipar infraestrutura genérica.

---

# 7. Testes de aceite

## Pack e contrato

- a campanha compõe com o novo evento, fato e atividade;
- referência inexistente de NPC, fato, flag/narrativa ou local reprova a composição;
- activity.perform continua rejeitando ID arbitrário e participante indevido;
- nenhuma alteração de schema ou migração.

## Execução

- Dia 2: atividade indisponível;
- Dia 3 antes de day-three-*-continue: atividade indisponível;
- rota conhecida: atividade aparece apenas em spring-lake com Caio conhecido, presente e disponível;
- execução concluída cobra exatamente um período e aplica desgaste uma vez;
- evento direto tem precedência sobre world trigger elegível;
- cada escolha retorna ao sandbox e registra só o resultado selecionado;
- recurso, descoberta e relação permanecem inalterados;
- segundo uso bloqueado, incluindo após save/reload.

## Rotas integradas

- cooperação e contato conhecido sem compromisso;
- contato evitado;
- nenhum encontro;
- Mira presente e ausente, sem ser requisito;
- entrada via relógio real e preservação das decisões dos Dias 1–2;
- ausência de party, assentamento, profissão, propriedade ou final de jogo.

Gates finais:

~~~bash
npm test
npm run lint
npm run typecheck
npm run build
~~~

O playtest integrado do Dia 3 deve acrescentar suas rotas sem retirar os testes Dia 1 → Dia 2 existentes.

---

# 8. Fora das Fatias A–D

- nova versão de schema;
- novas ações ou efeitos para a mecânica de atividades;
- coleta, criação ou partilha automática de recursos;
- nova localização ou recurso ecológico;
- Caio/Davi/Mira movidos artificialmente para habilitar atividade;
- novo elenco obrigatório;
- rota de contato forçado para quem evitou os sobreviventes;
- ordem formal, party, profissão, assentamento, lei ou propriedade;
- simulação offline de atividade ou necessidades de NPC;
- conteúdo do Dia 4 ou dos dias seguintes.

---

# 9. Critério de conclusão

O Dia 3 está implementado quando a atividade compartilhada pode ser escolhida e concluída no mundo com custo real, decisão registrada e retorno livre ao sandbox; as quatro saídas do amanhecer herdadas continuam válidas; e os gates finais passam. As Fatias A, B e C cumprem esse critério para a primeira atividade, incluindo robustez contra indisponibilidade de NPC e tentativas fora de contrato. O próximo passo de execução é a **Fatia D — playtest integrado e fechamento**.
