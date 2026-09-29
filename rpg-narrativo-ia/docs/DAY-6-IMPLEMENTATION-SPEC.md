# Dia 6 — Especificação técnica e fatias

## Estado

**Especificação técnica concluída — Fatias A, B, C e D implementadas; Dia 6 fechado neste recorte.** Este documento traduz [Dia 6 — narrativa](DAY-6-NARRATIVE-SPEC.md) em contratos concretos sobre o motor já consolidado, sem alterar o schema (permanece 26) nem os tipos de efeito existentes.

Referências:

- [Dia 6 — narrativa](DAY-6-NARRATIVE-SPEC.md);
- [Dia 5 — implementação](DAY-5-IMPLEMENTATION-SPEC.md);
- [Motor e pack de mundo](CONTENT-PACK.md).

---

# 1. Decisão de modelagem técnica

## 1.1 Evento de campanha puro, como no Dia 5

Pelos mesmos motivos documentados na Fatia B do Dia 5: a cena não tem local fixo, participante obrigatório/opcional nem custo de tempo próprio, e o resultado desejado é só `flag.set`. Nenhuma mudança em `src/modules/activities` ou nos packs de atividades/NPCs é necessária.

## 1.2 Um único evento, sem variação de tom por postura do Dia 5

A especificação narrativa deixou em aberto se a variação de tom por postura do Dia 5 (seção 4) justificaria eventos separados. Decisão adotada: **um único evento genérico**, sem ramificar por `day5.organization.stance.*`.

Motivo: variar o corpo do texto por postura exigiria três (ou quatro, contando quem nunca declarou postura) cópias quase idênticas do mesmo evento só para trocar uma frase de abertura — custo de manutenção real por um ganho de tom, não de mecânica. A "menor solução capaz de validar a experiência" (`AGENTS.md`) é um evento só, com um corpo que funciona igualmente bem para as três posturas e para quem nunca declarou nenhuma. A variação de tom por postura fica registrada como conteúdo futuro (seção 5 deste documento), não como lacuna silenciosa.

## 1.3 Critério de convivência — reaproveita `day2.survivors.contact`

Como documentado na Fatia B do Dia 5, `day2.survivors.contact = true` já é definido exclusivamente pelas interações de conversa real do Dia 2 (`talk-caio-rocky-bank`, `talk-davi-rocky-bank`), e ambas registram `npc.rememberFact` para Davi. Ou seja, `day2.survivors.contact = true` já implica "Davi é conhecido", sem precisar de uma condição nova. A mesma flag usada para gatilhar a conversa do Dia 5 gatilha a cena do Dia 6.

---

# 2. Conteúdo novo

## 2.1 `day-six-start` (`content/first-day/campaign/world-triggers.json`)

```json
{
  "id": "day-six-start",
  "source": { "type": "world.day.min", "day": 6 },
  "campaignId": "first-day",
  "eventId": "day-six-awakening",
  "conditions": [{ "type": "flag.is", "flag": "day5.started", "value": true }]
}
```

## 2.2 Eventos (`content/first-day/campaign/events.json`)

- **`day-six-awakening`** — evento único, sem condição de rota, no mesmo padrão de `day-five-awakening`: uma escolha (`day-six-look-around`, efeitos vazios) cuja transição é `firstMatch` sobre `["day-six-davi-question", "day-six-alone-continue"]`.
- **`day-six-davi-question`** — condição `day2.survivors.contact = true`. Corpo genérico apresentando o caso concreto: o grupo tem mais para fazer do que consegue cobrir, e alguém pergunta diretamente se Davi deveria ser poupado enquanto se recupera ou contribuir do jeito que conseguir. Três escolhas, todas só com `flag.set` (mais `day6.started`) e `transition: returnToExploration`:
  - `day6-davi-protected` → `day6.davi.priority.protected = true`;
  - `day6-davi-equal-duty` → `day6.davi.priority.equal-duty = true`;
  - `day6-davi-self-choice` → `day6.davi.priority.self-choice = true`.
- **`day-six-alone-continue`** — condição `day2.survivors.contact = false`. Uma escolha só, efeito `day6.started = true`, retorno ao sandbox.

Nenhum evento usa `npc.rememberFact` ou `relationship.change` — apenas `flag.set`.

---

# 3. Fatias de implementação

## Fatia A — entrada do Dia 6 pelo relógio real — **implementada**

- `day-six-start` e `day-six-awakening` seguem o formato de `day-five-start`/`day-five-awakening`.
- Testado: o trigger só nasce após `day5.started` e é consumido uma vez; a escolha de `day-six-awakening` não define `day6.started` sozinha; as quatro rotas herdadas chegam ao Dia 6 sem regressão.

## Fatia B — o caso concreto de Davi — **implementada**

- `day-six-davi-question` e suas três saídas foram adicionadas.
- Cobertura: a cena só aparece com `day2.survivors.contact = true`; cada saída define a flag correspondente e `day6.started`; escolher uma saída não define as outras; a postura do Dia 5 (quando existiu) não trava nenhuma das três saídas do Dia 6 — testado escolhendo uma saída de Dia 6 "inconsistente" com a postura declarada no Dia 5 e confirmando que a escolha é aceita normalmente.
- `day-six-alone-continue` cobre as rotas de afastamento e ausência de encontro, definindo apenas `day6.started`.

## Fatia C — robustez e falhas de disponibilidade — **implementada**

- A condição do evento por si só impede que `day-six-davi-question` apareça sem `day2.survivors.contact`, sem precisar de nenhuma verificação adicional no motor.
- `day-six-start` não nasce antes de `day5.started`, e nasce exatamente uma vez mesmo avançando o relógio várias vezes.
- Save/reload após qualquer uma das três saídas preserva exatamente a flag escolhida, sem duplicar ou reverter.

## Fatia D — playtest integrado e fechamento — **implementada**

- As quatro rotas herdadas chegam ao Dia 6 e recebem o conteúdo correto: cooperação e contato sem compromisso veem o caso concreto de Davi; afastamento e ausência de encontro seguem sem ele.
- Save/reload depois da escolha retoma o sandbox sem duplicar relógio, dia, período, status ou a saída escolhida.
- Fechamento: **99 arquivos de teste / 1006 testes**, lint, typecheck e build PWA verdes.

---

# 4. Rotas integradas

- cooperação e contato conhecido sem compromisso (`day2.survivors.contact = true`) recebem o caso concreto de Davi e podem escolher qualquer uma das três saídas, independentemente da postura declarada no Dia 5;
- afastamento e ausência de encontro nunca recebem a cena, seguindo direto para `day-six-alone-continue`;
- entrada via relógio real e preservação das decisões dos Dias 1–5;
- ausência de party, assentamento, cargo, liderança reconhecida, facção ou sistema de distribuição de recursos.

Gates finais:

~~~bash
npm test
npm run lint
npm run typecheck
npm run build
~~~

---

# 5. Fora das Fatias A–D

- variação de tom por postura declarada no Dia 5 (eventos separados por `day5.organization.stance.*`);
- party, assentamento, cargo, liderança reconhecida ou facção;
- sistema de distribuição de recursos ou de tarefas obrigatórias;
- Sistemas 20, 21, 26, 27, 28 ou 29 aplicados mecanicamente à saída escolhida;
- ranking ou Registro regional (reservado ao Dia 7);
- consequência mecânica automática sobre a saúde ou capacidade de Davi;
- elenco novo obrigatório;
- nova versão de schema.

---

# 6. Critério de conclusão

O Dia 6 está implementado quando o relógio real abre o dia sem ramificação narrativa forçada, o caso concreto de Davi aparece exatamente para quem já o conhece (e não para quem não o conhece), a saída escolhida é registrada sem criar política ou sistema de recursos, a postura do Dia 5 não trava nenhuma das saídas, as rotas herdadas dos Dias 2–5 continuam válidas, e os gates finais passam.

As Fatias A, B, C e D cumprem esse critério. Este recorte do Dia 6 está fechado; o próximo passo é uma decisão de conteúdo sobre o Dia 7 (o Registro regional, já antecipado pela Fundação Narrativa).
