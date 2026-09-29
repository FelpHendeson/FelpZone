# Dia 5 — Especificação técnica e fatias

## Estado

**Especificação técnica concluída — Fatias A, B, C e D implementadas; Dia 5 fechado neste recorte.** Este documento traduz [Dia 5 — narrativa](DAY-5-NARRATIVE-SPEC.md) em contratos concretos sobre o motor já consolidado, sem alterar o schema (permanece 26) nem os tipos de efeito existentes.

Referências:

- [Dia 5 — narrativa](DAY-5-NARRATIVE-SPEC.md);
- [Dia 4 — implementação](DAY-4-IMPLEMENTATION-SPEC.md);
- [Motor e pack de mundo](CONTENT-PACK.md).

---

# 1. Decisão de modelagem técnica

A especificação narrativa deixou em aberto se a cena deveria ser um evento de campanha ou uma atividade contextual. Decisão adotada:

**Evento de campanha puro (`StoryEvent`/`GameEffect`), sem atividade contextual.**

Motivos:

- a cena não tem local fixo, participante obrigatório/opcional nem custo de tempo próprio no molde de `ContextualActivityDefinition` — ela nasce do relógio real, como as aberturas dos Dias 2 a 4, não de uma ação do jogador em um ponto do mapa;
- o resultado desejado (a postura declarada do jogador) é só `flag.set`, que já é válido em efeitos de escolha de evento comum — não é necessário `npc.rememberFact` nem `relationship.change` amarrado a um NPC específico, então a restrição de contrato documentada na Fatia B do Dia 3 (`npc.rememberFact` inválido em efeito de evento comum) não se aplica aqui porque a fatia simplesmente não usa esse efeito;
- escrever o texto de forma genérica ("alguém do grupo que você já conhece") evita precisar ramificar por combinação de NPC presente, o que manteria a fatia pequena sem introduzir participantes obrigatórios/opcionais como uma atividade exigiria.

Isso também explica por que nenhuma mudança em `src/modules/activities`, `content/first-day/world/activities.json` ou `content/first-day/world/npcs.json` é necessária nesta fatia.

## 1.1 Critério de convivência

A Fundação e a especificação narrativa exigem que a cena só apareça quando já existe convivência humana estabelecida. O estado real já distingue isso com precisão via `day2.survivors.contact`:

- `talk-caio-rocky-bank` e `talk-davi-rocky-bank` (interações do Dia 2) são as únicas ações que definem `day2.survivors.contact = true` — ambas exigem uma conversa real, não apenas reconhecimento à distância;
- `avoid-caio-rocky-bank` define `day2.survivors.avoided = true`, mas nunca `day2.survivors.contact`, então a rota de afastamento chega ao Dia 5 com `day2.survivors.contact` ainda `false`;
- quem nunca visitou a Margem Rochosa (rota solo) também nunca define a flag, permanecendo `false`.

Ou seja, `day2.survivors.contact` já distingue exatamente "houve conversa real com alguém" de "não houve", cobrindo as quatro rotas herdadas dos Dias 2–4 sem precisar de uma flag nova:

| Rota do Dia 3/4 | `day2.survivors.contact` | Cena do Dia 5 |
| --- | --- | --- |
| Cooperação (Davi escoltado) | `true` | aparece |
| Contato conhecido sem compromisso | `true` | aparece |
| Afastamento (reconhecido de longe) | `false` | não aparece |
| Ausência de encontro | `false` | não aparece |

---

# 2. Conteúdo novo

## 2.1 `day-five-start` (`content/first-day/campaign/world-triggers.json`)

Segue exatamente o formato de `day-three-start`/`day-four-start`:

```json
{
  "id": "day-five-start",
  "source": { "type": "world.day.min", "day": 5 },
  "campaignId": "first-day",
  "eventId": "day-five-awakening",
  "conditions": [{ "type": "flag.is", "flag": "day4.started", "value": true }]
}
```

## 2.2 Eventos (`content/first-day/campaign/events.json`)

- **`day-five-awakening`** — evento único, sem condição de rota, no mesmo padrão de `day-three-awakening`: uma única escolha (`day-five-look-around`, efeitos vazios) cuja transição é `firstMatch` sobre `["day-five-group-conversation", "day-five-alone-continue"]`.
- **`day-five-group-conversation`** — condição `day2.survivors.contact = true`. Corpo genérico (não nomeia um NPC específico) introduzindo a pergunta sobre como o grupo deveria se organizar agora que a diferença de capacidade entre as pessoas começou a ficar visível. Três escolhas, todas só com `flag.set` (mais `day5.started`) e `transition: returnToExploration`:
  - `day5-stance-collective` → `day5.organization.stance.collective = true`;
  - `day5-stance-capable` → `day5.organization.stance.capable = true`;
  - `day5-stance-undecided` → `day5.organization.stance.undecided = true`.
- **`day-five-alone-continue`** — condição `day2.survivors.contact = false`. Uma escolha só, texto refletindo que o dia segue sem ninguém para essa conversa, efeito `day5.started = true`, retorno ao sandbox.

Nenhum evento usa `npc.rememberFact` ou `relationship.change` — apenas `flag.set`, dentro do contrato já suportado por efeitos de escolha de evento comum.

---

# 3. Fatias de implementação

## Fatia A — entrada do Dia 5 pelo relógio real — **implementada**

- `day-five-start` e `day-five-awakening` seguem o formato de `day-three-start`/`day-three-awakening`.
- Testado: o trigger só nasce após `day4.started` e é consumido uma vez; a escolha de `day-five-awakening` não define `day5.started` sozinha — isso acontece só dentro do ramo escolhido por `firstMatch`; as quatro rotas herdadas chegam ao Dia 5 sem regressão.

## Fatia B — a conversa sobre organização do grupo — **implementada**

- `day-five-group-conversation` e suas três posturas foram adicionados.
- Cobertura: a cena só aparece com `day2.survivors.contact = true`; cada postura define a flag correspondente e `day5.started`; escolher uma postura não define as outras; retorno ao sandbox sem duplicar consequência.
- `day-five-alone-continue` cobre as rotas de afastamento e ausência de encontro, definindo apenas `day5.started`.

## Fatia C — robustez e falhas de disponibilidade — **implementada**

- Forçar `day-five-group-conversation` pelo motor de eventos quando `day2.survivors.contact = false` é recusado pelo próprio contrato de condição do evento (o motor não inicia sessão sobre evento cuja condição falha), sem mutar flags.
- O trigger `day-five-start` não nasce antes de `day4.started`, e nasce exatamente uma vez mesmo avançando o relógio várias vezes.
- Save/reload após qualquer uma das três posturas preserva exatamente a flag escolhida, sem duplicar ou reverter.

## Fatia D — playtest integrado e fechamento — **implementada**

- As quatro rotas herdadas (cooperação, contato sem compromisso, afastamento, ausência de encontro) chegam ao Dia 5 e recebem o conteúdo correto: as duas primeiras veem a conversa, as duas últimas seguem sem ela.
- Save/reload depois da conversa retoma o sandbox sem duplicar relógio, dia, período, status ou a postura escolhida.
- Fechamento: **98 arquivos de teste / 990 testes**, lint, typecheck e build PWA verdes.

---

# 4. Rotas integradas

- cooperação e contato conhecido sem compromisso (ambas com `day2.survivors.contact = true`) recebem a conversa e podem declarar qualquer uma das três posturas;
- afastamento e ausência de encontro nunca recebem a conversa, seguindo direto para `day-five-alone-continue`;
- entrada via relógio real e preservação das decisões dos Dias 1–4;
- ausência de party, assentamento, cargo, liderança reconhecida ou facção — a postura é só uma flag para consumo narrativo futuro.

Gates finais:

~~~bash
npm test
npm run lint
npm run typecheck
npm run build
~~~

---

# 5. Fora das Fatias A–D

- party, assentamento, cargo, liderança reconhecida ou facção;
- Sistemas 20, 21, 26, 27, 28 ou 29 aplicados mecanicamente à postura declarada;
- ranking ou Registro regional (reservado ao Dia 7);
- nova atividade contextual de trabalho;
- elenco novo obrigatório;
- nova versão de schema.

---

# 6. Critério de conclusão

O Dia 5 está implementado quando o relógio real abre o dia sem ramificação narrativa forçada, a cena de organização aparece exatamente para quem tem convivência real estabelecida (e não para quem não tem), a postura declarada é registrada sem criar instituição nenhuma, as rotas herdadas dos Dias 2–4 continuam válidas, e os gates finais passam.

As Fatias A, B, C e D cumprem esse critério. Este recorte do Dia 5 está fechado; o próximo passo é uma decisão de conteúdo sobre o Dia 6.
