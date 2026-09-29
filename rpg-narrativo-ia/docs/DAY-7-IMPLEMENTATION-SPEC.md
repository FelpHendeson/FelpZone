# Dia 7 — Especificação técnica e fatias

## Estado

**Especificação técnica concluída — Fatias A, B e C implementadas; Dia 7 fechado neste recorte.** Este documento traduz [Dia 7 — narrativa](DAY-7-NARRATIVE-SPEC.md) em contratos concretos sobre o motor já consolidado, sem alterar o schema (permanece 26) nem os tipos de efeito ou de Registro existentes.

Referências:

- [Dia 7 — narrativa](DAY-7-NARRATIVE-SPEC.md);
- [Dia 6 — implementação](DAY-6-IMPLEMENTATION-SPEC.md);
- [Sistema 20 — Registro, patentes e rankings](SYSTEM-20-SYSTEM-REGISTRY-RANKINGS.md).

---

# 1. Decisão de modelagem técnica

## 1.1 Revelação puramente narrativa, sem entrada nova no catálogo de Registro

A especificação narrativa deixou em aberto se a mudança de escala (regional, não só a Clareira) justificaria uma entrada nova no catálogo `content/first-day/system/registry.json`. Decisão adotada: **não**. Motivos:

- a Fundação Narrativa trata números de população, ranking e identidade do topo como propositalmente provisórios e não revelados — uma entrada real de `RegistryRankingDefinition` exige `competitors` com `actorId`/`name`/`score` concretos, o que forçaria a inventar uma identidade ou escondê-la de um jeito que o contrato de visibilidade atual (`'public' | 'known'`) não modela (não existe "existe alguém, mas a identidade é desconhecida" como estado de competidor);
- o Sistema 20 já está implementado e consolidado com exemplos locais (`local-exploration`, `local-combat`, patente `clearing-scout`) desde o Dia 1 — o Dia 7 não precisa provar de novo que o Registro funciona, só que a **percepção do jogador sobre a escala do mundo** mudou;
- inventar uma categoria, métrica ou regra de visibilidade nova para representar "identidade reservada" seria mudança de engine, fora do escopo de conteúdo de pack e da fatia autorizada.

A revelação do Dia 7 é, portanto, um evento de campanha puro (como nos Dias 5 e 6): corpo narrativo descrevendo a mensagem "Primeiro ciclo de avaliação concluído", a população regional e o indivíduo acima da curva, sem nenhum dado mecânico novo de Registro. Uma entrada real no catálogo de Registro regional (com competidores concretos) fica registrada como conteúdo futuro, para quando a identidade do topo deixar de precisar ser um mistério.

## 1.2 Sem gating por convivência — a revelação chega a todas as rotas

Diferente das cenas dos Dias 5 e 6, esta cena não usa `day2.survivors.contact` como condição. `day-seven-registry` não tem `conditions` (além do trigger em si depender só de `day6.started`), então ela é alcançada por qualquer uma das quatro rotas herdadas, exatamente como `day-two-awakening`/`day-four-awakening` (aberturas universais, sem `firstMatch`).

## 1.3 Novo tópico de ajuda: `regional-registry`

Adicionado a `content/first-day/ui/guidance.json`, categoria `society` (já suportada pelo catálogo de categorias do módulo `guidance`), `popupOnUnlock: true`. Desbloqueado pelo próprio evento via `guidance.unlock`, no mesmo padrão já usado por `contextual-activities` nos Dias 2 a 4.

---

# 2. Conteúdo novo

## 2.1 `day-seven-start` (`content/first-day/campaign/world-triggers.json`)

```json
{
  "id": "day-seven-start",
  "source": { "type": "world.day.min", "day": 7 },
  "campaignId": "first-day",
  "eventId": "day-seven-registry",
  "conditions": [{ "type": "flag.is", "flag": "day6.started", "value": true }]
}
```

## 2.2 Evento (`content/first-day/campaign/events.json`)

- **`day-seven-registry`** — evento único, `canStartSession: true`, sem `conditions` de rota (chega a todas as rotas herdadas). Corpo narrativo com a mensagem "Primeiro ciclo de avaliação concluído", a revelação da população regional e do indivíduo acima da curva, sem números definitivos nem identidade revelada. Uma escolha (`day-seven-look-around`), efeitos `flag.set day7.started = true` e `guidance.unlock topicId: "regional-registry"`, `transition: returnToExploration`.

Nenhuma mudança em `content/first-day/system/registry.json`, `src/modules/registry` ou nos tipos de `RegistryRankingDefinition`/`RegistryMetric`.

---

# 3. Fatias de implementação

## Fatia A — entrada do Dia 7 pelo relógio real — **implementada**

- `day-seven-start` e `day-seven-registry` seguem o formato de aberturas universais já existentes (`day-two-awakening`, `day-four-awakening`): sem `firstMatch`, sem condição de rota.
- Testado: o trigger só nasce após `day6.started` e é consumido uma vez; a revelação chega às quatro rotas herdadas sem regressão, inclusive as de afastamento e ausência de encontro.

## Fatia B — a revelação e o tópico de ajuda — **implementada**

- `day7.started` e o desbloqueio de `regional-registry` são definidos pela mesma escolha.
- Testado: o tópico `regional-registry` não está desbloqueado antes do Dia 7 e passa a estar depois da escolha; o Sistema 20 (rankings/patentes locais da Clareira, já existentes desde o Dia 1) continua funcionando sem nenhuma alteração de contrato.

## Fatia C — playtest integrado e fechamento — **implementada**

- As quatro rotas herdadas (cooperação, contato sem compromisso, afastamento, ausência de encontro) recebem a revelação igualmente, confirmando que ela não depende de `day2.survivors.contact` nem de nenhuma outra flag de convivência.
- Save/reload depois da revelação preserva `day7.started` e o desbloqueio do tópico de ajuda sem duplicar.
- Fechamento: **100 arquivos de teste / 1012 testes**, lint, typecheck e build PWA verdes.

Este dia não precisou de uma Fatia D separada de robustez: a ausência de `conditions` de rota e de qualquer novo tipo de efeito elimina a maior parte das superfícies de falha que exigiram fatias dedicadas nos Dias 3 a 6.

---

# 4. Rotas integradas

- todas as quatro rotas herdadas (cooperação, contato conhecido sem compromisso, afastamento, ausência de encontro) recebem a revelação igualmente;
- entrada via relógio real e preservação das decisões dos Dias 1–6;
- ausência de party, assentamento, cargo, liderança reconhecida, facção, aliança ou início mecânico do arco "Os Primeiros Senhores";
- nenhuma mudança no catálogo de Registro, em suas categorias, métricas ou regras de visibilidade.

Gates finais:

~~~bash
npm test
npm run lint
npm run typecheck
npm run build
~~~

---

# 5. Fora das Fatias A–C

- entrada real no catálogo de Registro regional com competidores concretos (aguardando decisão de quando a identidade do topo deixa de ser mistério);
- novo tipo de métrica, categoria ou regra de visibilidade no Sistema 20;
- party, assentamento, cargo, liderança reconhecida, facção ou aliança entre assentamentos;
- números definitivos de população, ranking ou poder;
- o início mecânico do arco "Os Primeiros Senhores";
- elenco novo obrigatório;
- nova versão de schema.

---

# 6. Critério de conclusão

O Dia 7 está implementado quando o relógio real abre o dia sem depender de convivência humana estabelecida, a revelação do Registro regional acontece para todas as rotas herdadas, nenhum número definitivo ou identidade é exposto como final, o Sistema 20 não precisa de nenhuma mudança de contrato, e os gates finais passam.

As Fatias A, B e C cumprem esse critério. Este recorte do Dia 7 está fechado, e com ele o primeiro arco — Os Sete Dias — também está fechado. O próximo passo deixa de ser um dia numerado e passa a ser uma decisão de conteúdo sobre o início do arco "Os Primeiros Senhores" (Fundação Narrativa, seção 14).
