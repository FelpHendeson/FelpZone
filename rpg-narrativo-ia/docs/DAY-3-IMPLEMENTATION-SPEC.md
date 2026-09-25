# Dia 3 — Especificação técnica de implementação

## Estado

**Especificada; nenhuma fatia implementada.** Este documento converte a [especificação narrativa do Dia 3](DAY-3-NARRATIVE-SPEC.md) em uma sequência de trabalho. O primeiro dia jogável termina no sandbox do Dia 3; o restante do Dia 3 ainda precisa de conteúdo.

A campanha first-day já contém:

- o world trigger day-three-start, condicionado por day2.started;
- day-three-awakening e quatro variantes de continuidade;
- a flag day3.started, definida antes de voltar ao sandbox;
- atividades contextuais e o estado persistente activities.consumedActivityIds;
- as rotas integradas Dia 1 → Dia 2 → amanhecer do Dia 3 nos testes day-two-playtest.

As Fatias A–D abaixo ampliam a experiência depois do amanhecer. Não duplicar nem substituir a entrada existente sem um defeito demonstrado.

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

# 3. Conteúdo da primeira atividade

ID proposto:

compare-spring-paths-with-caio

Local:

spring-lake

Disponível quando:

- day3.started = true;
- day2.survivors.contact = true;
- Caio é conhecido, está na Nascente e está disponível;
- a atividade ainda não foi consumida.

Declarar também npc.known para caio-nascimento: o planejador valida presença e disponibilidade de participantes obrigatórios, mas não infere que o jogador conhece essa pessoa. Manter day2.survivors.contact como gate explícito para não iniciar contato retroativo. O texto da atividade apresenta a revisão como convite de Caio; executá-la é a aceitação voluntária do jogador, e disponibilidade oculta ou ocupada impede a oferta.

Definição conceitual:

~~~json
{
  "id": "compare-spring-paths-with-caio",
  "label": "Comparar os acessos à Nascente com Caio",
  "description": "Rever os caminhos que vocês conhecem e combinar qual observar depois.",
  "locationId": "spring-lake",
  "timeCost": { "periods": 1 },
  "repeatable": false,
  "requirements": [
    { "type": "flag.is", "flag": "day3.started", "value": true },
    { "type": "flag.is", "flag": "day2.survivors.contact", "value": true },
    { "type": "npc.known", "npcId": "caio-nascimento" }
  ],
  "participants": {
    "requiredNpcIds": ["caio-nascimento"],
    "optionalNpcIds": [],
    "minOptional": 0,
    "maxOptional": 0
  },
  "effects": [
    { "type": "flag.set", "flag": "day3.spring-paths.compared", "value": true },
    {
      "type": "npc.rememberFact",
      "npcId": "caio-nascimento",
      "factId": "caio-spring-paths-compared"
    },
    { "type": "guidance.unlock", "topicId": "contextual-activities" }
  ],
  "narrative": {
    "campaignId": "first-day",
    "eventId": "day-three-spring-paths"
  }
}
~~~

Adicionar o fato de memória ao NPC correto e validar todas as referências na composição do pack.

## 3.1 Evento day-three-spring-paths

A cena reconhece apenas que o jogador e Caio revisaram acessos já conhecidos. Não afirmar que uma rota foi explorada, garantida ou provada segura.

Opções narrativas:

- **Anotar uma rota para observar depois:** define day3.spring-paths.plan.observe.
- **Manter cada um atento ao próprio caminho:** define day3.spring-paths.plan.independent.
- **Deixar a decisão para outro momento:** define day3.spring-paths.plan.deferred.

Cada escolha retorna ao sandbox. Nenhuma concede água, item, descoberta, relação ou movimento de NPC.

O ato de participar já consome a atividade. Escolher adiar a decisão não permite repetir a conversa como atividade paga: o resultado fica registrado e o jogador pode voltar ao tema apenas se conteúdo futuro oferecer uma nova situação.

---

# 4. Continuidade das rotas

## Cooperação no Dia 2

Após day-three-cooperation-continue, o jogador pode chegar à Nascente e executar a atividade quando Caio estiver realmente presente. Davi pode estar em outro local pela agenda; não o teleportar nem incluí-lo artificialmente.

## Sobreviventes evitados

Após day-three-distance-continue, day2.survivors.contact permanece falso. A atividade de Caio não aparece. Os sinais distantes continuam observáveis sem iniciar contato ou marcar que o jogador conheceu os sobreviventes.

## Sobreviventes conhecidos sem compromisso

Após day-three-independent-continue, Caio pode participar apenas se conhecido e presente pela agenda. A escolha de iniciar a atividade não converte a recusa/independência anterior em acordo permanente.

## Nenhum encontro no Dia 2

Após day-three-solo-continue, a fumaça permanece informação à distância. Não revelar a presença de Caio pela atividade, não marcar day2.survivors.contact e não bloquear exploração individual.

---

# 5. Fatias de implementação

## Fatia A — contrato de entrada e regressão

- Conferir as quatro variantes já existentes de day-three-awakening e seus gates.
- Confirmar que o trigger só nasce após day2.started e é consumido uma vez.
- Confirmar que cada escolha define day3.started e volta ao sandbox.
- Acrescentar casos de aceitação explícitos às suítes existentes apenas para lacunas encontradas; não reescrever o conteúdo que já passa.
- Não alterar schema, NPCs, mapa ou contratos.

## Fatia B — atividade compartilhada e cena

- Adicionar a atividade e o fato de memória especificados na seção 3.
- Adicionar o evento com as três decisões provisórias.
- Desbloquear guidance de Atividades somente se o tópico ainda não estiver desbloqueado; a UI de atividades já existe.
- Validar custos, participante, flags e referência narrativa durante a composição do pack.
- Não adicionar recursos diretamente nem alterar a atividade existente de água.

## Fatia C — autonomia e falhas de disponibilidade

- Confirmar que o catálogo não oferece a atividade antes de day3.started.
- Confirmar que ausência, indisponibilidade ou ocultação de Caio bloqueia a execução sem mutar estado.
- Confirmar que execução não é possível sem contato conhecido, ainda que alguém altere a ação enviada pelo cliente.
- Preservar a rota solo e a rota de distância; nenhuma tentativa de executar a atividade pode criar presença ou contato.
- Save/reload preserva o consumo, as flags escolhidas e a memória; nova execução é recusada sem efeitos duplicados.

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
- src/tests/day-two-playtest.test.ts.

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

O Dia 3 está implementado quando a atividade compartilhada pode ser escolhida e concluída no mundo com custo real, decisão registrada e retorno livre ao sandbox; as quatro saídas do amanhecer herdadas continuam válidas; e os gates finais passam. Até lá, o próximo passo de execução é a **Fatia A — contrato de entrada e regressão**.
