# Dia 2 — Especificação técnica de implementação

## Estado

**Especificada em 22 de setembro de 2026. Fatias A–E implementadas e validadas; Fatias F–G pendentes.**

Esta especificação converte [Dia 2 — especificação narrativa e jogável](DAY-2-NARRATIVE-SPEC.md) em trabalho técnico.

Ela também incorpora a nova [Mecânica de Atividades Contextuais](MECHANIC-CONTEXTUAL-ACTIVITIES.md).

---

# 1. Meta

Entregar um segundo dia em que o jogador:

1. continua exatamente do estado herdado da primeira noite;
2. pode começar com Mira próxima ou não;
3. encontra sinais de pelo menos duas novas pessoas;
4. descobre a Margem Rochosa;
5. conhece ou evita Caio e Davi;
6. toma uma decisão sobre a situação de Davi;
7. pode executar pelo menos uma atividade compartilhada real;
8. percebe que outras pessoas também estão se organizando sem ele;
9. encerra o Dia 2 ainda em `status: playing`;
10. entra no Dia 3 sem party, cidadania ou assentamento automático.

---

# 2. Decisões técnicas principais

## 2.1 Não criar campanha separada

O conteúdo continua no pack/campanha `first-day` enquanto os Sete Dias formarem o primeiro arco contínuo.

O nome histórico do pack não obriga o conteúdo a terminar no Dia 1.

Renomear pack/campaign agora criaria churn de IDs e saves sem benefício.

Uma renomeação estrutural pode ser discutida depois do primeiro arco.

## 2.2 Usar `day2.started` como gate narrativo

O Dia 1 já registra:

`day2.started = true`

ao concluir o amanhecer.

Descobertas específicas do Dia 2 devem preferir:

```json
{
  "type": "flag.is",
  "flag": "day2.started",
  "value": true
}
```

em vez de criar uma segunda noção de dia dentro de exploração.

O módulo de exploração já suporta condições de descoberta e reavaliação.

## 2.3 Não liberar os protótipos sociais antigos

Conteúdos de:

- organizações;
- cidadania/profissão;
- economia;
- assentamento;
- política;

permanecem no pack para provar os Sistemas 21–29, mas precisam ser gated para não aparecer como progressão natural do Dia 2.

A implementação do Dia 2 deve revisar visibilidade/requisitos dessas ações.

Não remover os módulos.

---

# 3. Save schema 26 — Atividades

Adicionar:

```ts
export const SCHEMA_VERSION_V25 = 25 as const;
export const SCHEMA_VERSION = 26 as const;

interface ContextualActivitiesState {
  consumedActivityIds: string[];
}
```

`GameState` recebe:

```ts
activities: ContextualActivitiesState;
```

Migração 25 → 26:

```ts
activities: {
  consumedActivityIds: []
}
```

Sem:

- avanço de relógio;
- descoberta;
- movimento de NPC;
- abertura de narrativa;
- sincronização que gere gameplay durante a migração.

---

# 4. Novo módulo `activities`

Sugestão:

```text
src/modules/activities/
├── index.ts
├── types.ts
├── inspect.ts
├── state.ts
├── plan.ts
└── apply.ts
```

Responsabilidades:

- validar catálogo;
- indexar atividades;
- criar/validar/copiar estado;
- listar atividades disponíveis;
- planejar participantes;
- aplicar efeitos do domínio;
- marcar atividade única como consumida.

React não decide disponibilidade.

---

# 5. Pack

Adicionar chave:

`activities`

em:

- `PACK_FILE_KEYS`;
- bundle do first-day;
- schema do pack;
- compose;
- `IndexedWorld`;
- `SandboxContext`.

Arquivo:

`content/first-day/world/activities.json`

O catálogo não vai para o save.

---

# 6. Efeito de relocação de NPC

O Dia 2 precisa mover Davi de forma explícita quando o jogador o acompanha.

Adicionar ao domínio de NPCs uma operação pública equivalente a:

```ts
relocateNpc(
  catalog: IndexedNpcs,
  state: NPCsState,
  npcId: string,
  locationId: string,
): NPCsState
```

Regras:

- NPC precisa existir;
- destino precisa existir;
- NPC `departed` não pode ser movido sem regra explícita futura;
- `locationOverrideId` é a fonte persistida;
- não alterar agenda base;
- operação pura;
- cópia defensiva.

A atividade usa essa API.

Não escrever em `sandbox.npcs.entries` diretamente no executor.

---

# 7. `activity.perform`

Adicionar ao union de `SandboxAction`:

```ts
{
  type: 'activity.perform';
  activityId: string;
  optionalParticipantIds: string[];
}
```

Adicionar detalhe:

```ts
{
  type: 'activity.perform';
  plan: ContextualActivityPlan;
}
```

Fluxo no executor:

1. obter catálogo ativo;
2. validar atividade;
3. validar local;
4. validar consumo;
5. validar requisitos;
6. validar NPCs obrigatórios;
7. validar opcionais;
8. gerar plano imutável;
9. aplicar efeitos;
10. consumir atividade única;
11. cobrar tempo;
12. aplicar desgaste;
13. sincronizar mundo;
14. sincronizar objetivos;
15. abrir narrativa declarada, se houver.

Toda falha acontece antes da mutação observável.

---

# 8. Prioridade narrativa

Contrato igual ao comportamento já consolidado no Dia 1:

- narrativa aberta diretamente pela atividade tem prioridade;
- world trigger elegível pelo avanço de tempo espera a sessão atual terminar;
- ao retornar ao sandbox, `resolveWorldNarrativeState` continua a cadeia.

Adicionar teste explícito.

---

# 9. UI de Atividades

Não criar bottom-nav nova.

Adicionar em `WorldPanel` uma seção:

**Atividades**

View-model mínimo:

```ts
interface ContextualActivityView {
  id: string;
  label: string;
  description: string;
  costPeriods: number;
  available: boolean;
  blockedReason?: string;
  requiredParticipants: ActivityParticipantView[];
  optionalParticipants: ActivityParticipantView[];
}
```

Participante secreto/desconhecido não aparece.

Seleção opcional fica local à UI até o clique.

A ação enviada contém apenas IDs permitidos.

---

# 10. Guidance

Adicionar tópico:

`contextual-activities`

Texto inicial:

> Algumas necessidades podem ser resolvidas com outras pessoas. Atividades consomem tempo e podem gerar relações, informação, prática ou acontecimentos.

Desbloqueio:

- na primeira situação do Dia 2 em que uma atividade fica disponível.

Não desbloquear profissões/assentamentos junto.

---

# 11. Mapa — Margem Rochosa

Adicionar sob a região inicial:

```text
spring-lake
└── rocky-bank
```

ou como local irmão, conforme a relação visual final.

ID:

`rocky-bank`

Nome:

**Margem Rochosa**

Descrição:

> Uma dobra de pedra acompanha o curso d'água e cria um abrigo ruim, mas defensável o bastante para alguém ferido parar por algumas horas.

Inicialmente:

- hidden;
- desbloqueada por descoberta específica na Nascente.

---

# 12. Descobertas do Dia 2

Adicionar à Nascente descobertas condicionadas por:

`day2.started = true`

Sugestão:

## `multiple-human-tracks`

Tipo:

`landmark`

Conteúdo:

- pegadas de pelo menos duas pessoas;
- ritmo diferente;
- uma trilha irregular.

## `dried-blood-trace`

Tipo:

`landmark`

Conteúdo:

- sangue em pequena quantidade;
- não implica ferimento fatal.

## `path-rocky-bank`

Tipo:

`passage`

Target:

`rocky-bank`

`unlockTarget: true`

Condição:

`day2.started`

A descoberta precisa funcionar mesmo se a Nascente já estiver com progresso suficiente desde o Dia 1.

Usar `reevaluateDiscoveries` no fluxo normal de sincronização quando o jogador estiver no local.

---

# 13. NPCs

Adicionar:

## Caio

`caio-nascimento`

## Davi

`davi-moura`

Ambos precisam de:

- definição;
- entity;
- agenda;
- fatos de memória;
- presença inicial.

Não adicionar Rowan nesta etapa.

---

# 14. Agenda

A agenda deve provar agência sem simulação contínua.

Proposta inicial:

## Caio

- alvorecer/manhã: Margem Rochosa;
- meio-dia: Nascente;
- tarde: Nascente ou Clareira;
- entardecer: Clareira;
- noite: local definido pela resolução do dia.

## Davi

Enquanto a situação inicial não for resolvida:

- Margem Rochosa como fallback/override.

Depois de atividade ou resolução narrativa:

- override para Clareira ou outro destino escolhido.

A primeira implementação pode usar `locationOverrideId` para Davi em vez de uma máquina complexa de condição médica.

---

# 15. Presenças

Adicionar presença inicial de Caio e Davi na Margem Rochosa.

Descoberta compartilhada sugerida:

`survivors-rocky-bank`

Pode revelar duas entidades no mesmo local.

Interações mínimas:

- observar;
- fazer contato;
- evitar.

Evitar deve:

- resolver a situação de contato;
- registrar que o jogador reconheceu os sobreviventes;
- não criar relação positiva automática;
- permitir que o mundo continue.

---

# 16. Eventos narrativos

Eventos sugeridos:

```text
day-two-human-tracks
survivors-rocky-bank
caio-first-contact
davi-condition
water-question
day-two-cooperation
day-two-distance
day-two-evening
day-two-alone-evening
day-three-awakening
```

IDs finais podem ser refinados durante implementação, mas devem permanecer estáveis depois de publicados.

---

# 17. Estado herdado do Dia 1

As cenas usam `firstMatch`/condições para reconhecer:

- `camp.together`;
- `camp.alone`;
- `mira.contact.avoided`;
- fatos de Mira;
- relação com Mira;
- recursos;
- estado físico.

Não duplicar tudo em novas flags “day2.route.*” se o estado canônico já responde.

Criar flag apenas para decisões novas que não existam em outro domínio.

---

# 18. Jornada principal

Adicionar:

`day-two-others`

Título:

**Os outros**

Ativação:

`day2.started = true`

Etapas:

1. descobrir sinais de mais de uma pessoa;
2. localizar Caio/Davi;
3. entender que Davi está ferido;
4. tomar decisão sobre envolvimento;
5. descobrir intenção de movimento/organização para o Dia 3.

A etapa 4 precisa aceitar:

- ajudar;
- recusar;
- evitar.

Critério não pode ser “relationship >= X”.

---

# 19. Jornadas laterais

Adicionar somente se o conteúdo ficar claro durante implementação.

Primeiro recorte recomendado:

## `davi-leg`

Título provisório:

**Uma perna ruim**

Concluir por:

- atividade de ajuda;
- decisão explícita de não assumir responsabilidade;
- outra resolução declarada.

Não exigir cura total.

## `more-than-one-mouth`

Título provisório:

**Água para mais de um**

Pode reagir a:

- água no inventário;
- coleta real;
- compartilhamento;
- recusa.

Não criar propriedade ou imposto.

---

# 20. Primeira atividade vertical

Implementar primeiro:

`escort-davi-to-clearing`

Razão:

- prova participantes;
- prova consentimento;
- prova tempo;
- prova `npc.relocate`;
- prova narrativa;
- não exige integrar ecologia ou produção.

Contrato proposto:

```json
{
  "id": "escort-davi-to-clearing",
  "label": "Acompanhar Davi até a Clareira",
  "locationId": "rocky-bank",
  "timeCost": { "periods": 1 },
  "repeatable": false,
  "participants": {
    "requiredNpcIds": ["davi-moura"],
    "optionalNpcIds": ["caio-nascimento", "mira-vale"],
    "minOptional": 0,
    "maxOptional": 1
  }
}
```

Efeitos:

- `npc.relocate(davi, awakening-clearing)`;
- fato de memória;
- flag de resolução;
- guidance unlock;
- narrativa de chegada.

Relação deve depender da variante/decisão, não ser bônus automático só por clicar.

---

# 21. Segunda atividade

Depois que a vertical estiver sólida:

`check-multiple-human-tracks`

Objetivo:

provar atividade opcional de investigação sem NPC obrigatório.

Pode:

- envolver Caio;
- envolver Mira;
- revelar informação;
- abrir evento.

Não conceder recursos.

---

# 22. Autonomia quando o jogador não ajuda

Caso o jogador evite Caio e Davi:

- a jornada registra decisão;
- não abre atividade obrigatória;
- Davi continua no mundo;
- Caio não desaparece;
- um estado/agenda posterior pode colocá-los na Nascente ou Clareira;
- o Dia 2 pode encerrar sem o jogador estar com eles.

Caso o jogador nem encontre a Margem Rochosa:

- não forçar cutscene de encontro;
- o encerramento solo do Dia 2 mostra sinais de outras pessoas se organizando;
- o conteúdo pode reapresentar Caio/Davi depois por outra presença.

---

# 23. Gate dos ciclos protótipo 21–29

Antes de publicar o Dia 2, revisar no mínimo:

- `propose-mira-party`;
- residência da Clareira;
- profissões de coletor/guarda;
- moeda `ember-mark`;
- propriedade `clearing-cache`;
- reivindicação `awakening-camp`;
- ações políticas.

Essas ações devem exigir marcos narrativos posteriores.

Proposta simples:

`community.phase.formalized = true`

ou flags específicas do arco futuro.

Não setar essa flag no Dia 2.

A escolha do gate definitivo será feita quando Dias 3–4 forem especificados.

Até lá, nenhuma UI do Dia 2 deve apresentar esses ciclos como próximos passos naturais.

---

# 24. Fatias de implementação

## Fatia A — Atividades + schema 26 — **implementada**

- novo módulo `modules/activities` valida, indexa, planeja e aplica atividades contextuais;
- `ContextualActivitiesState` persiste apenas `consumedActivityIds`;
- save atual avançou de schema 25 para **schema 26**;
- migração 25 → 26 cria estado vazio sem avançar tempo, mover NPC, abrir narrativa ou executar atividade;
- `activities.json` entrou no pack e no contrato de composição;
- o catálogo real permanece **vazio nesta fatia** para não antecipar conteúdo de Caio/Davi;
- `SandboxContext` e `IndexedWorld` propagam o catálogo ativo;
- nova ação `activity.perform` recebe `activityId` e participantes opcionais;
- participantes obrigatórios/opcionais são validados pelo motor; a UI não decide consentimento;
- requisitos iniciais cobrem flags, inventário, relação, local, dia e presença/conhecimento/disponibilidade de NPC;
- efeitos iniciais cobrem flag, relação, memória, relocação explícita de NPC e desbloqueio de guidance;
- `npc.relocate` foi adicionado como operação pura do domínio de NPCs, usando `locationOverrideId`;
- execução cobra tempo e necessidades uma única vez pelo pipeline normal do sandbox;
- narrativa declarada pela atividade tem prioridade sobre gatilhos globais do mesmo avanço temporal;
- a seção **Atividades** já existe na UI de ações locais e suporta seleção limitada de participantes opcionais;
- tópico de ajuda `contextual-activities` entrou no catálogo, mas só será desbloqueado por conteúdo futuro;
- cobertura dedicada em `contextual-activities.test.ts`;
- fechamento: **93 arquivos de teste / 932 testes**, lint, typecheck e build PWA verdes.

A próxima fatia é a **Fatia F — Autonomia e encerramento**.

## Fatia B — Mundo do Dia 2 — **implementada**

- `rocky-bank` entrou como local oculto sob `spring-lake`, desbloqueado por `path-rocky-bank`;
- pegadas de duas pessoas, sangue seco e passagem dependem de `day2.started` e podem surgir ao reavaliar progresso anterior;
- Caio e Davi entraram no catálogo de NPCs, com entidades, agendas, fatos de memória e presenças ligadas a `survivors-rocky-bank`;
- nenhum encontro ou atividade de Caio/Davi é executado nesta fatia; o catálogo de atividades continua vazio;
- testes verificam o gate do Dia 1, a reavaliação da Nascente, a revelação conjunta e as referências do pack.
- fechamento: **94 arquivos de teste / 934 testes**, lint, typecheck e build PWA verdes; schema permanece 26.

## Fatia C — Jornada e primeiro contato — **implementada**

- a jornada `day-two-others` acompanha sinais, localização, condição de Davi, decisão de envolvimento e intenção futura;
- `multiple-human-tracks` aciona `day-two-human-tracks` pelo pipeline de `world-events`;
- Caio e Davi podem ser observados, abordados ou evitados por interações declarativas;
- o contato com Caio possui variantes para Mira próxima, Mira evitada e ausência de Mira;
- ajudar, recusar responsabilidade ou ir embora registram decisão sem conceder relação, party ou posição social;
- save/reload preserva a rota escolhida; a jornada permanece aberta para a intenção futura das Fatias D–F.
- fechamento: **94 arquivos de teste / 938 testes**, lint, typecheck e build PWA verdes; schema permanece 26.

## Fatia D — Davi e primeira atividade — **implementada**

- a decisão de ajudar libera `escort-davi-to-clearing` na Margem Rochosa;
- Davi é obrigatório; Caio e Mira são opcionais somente quando presentes e disponíveis;
- a atividade custa um período, aplica desgaste uma vez e usa `npc.relocate` para mover Davi à Clareira;
- consumo único, fato de memória, guidance e localização persistem no save;
- `davi-arrives-clearing` tem prioridade narrativa e a reação escolhida pode alterar a relação com Davi;
- a cena revela a intenção imediata dos sobreviventes e pode concluir `day-two-others` sem criar party.
- fechamento: **94 arquivos de teste / 940 testes**, lint, typecheck e build PWA verdes; schema permanece 26.

## Fatia E — Água e tensão social

- conversa sobre uso da Nascente;
- coleta continua canônica;
- decisões deixam memória/relacionamento;
- nenhuma lei/propriedade.

## Fatia F — Autonomia e encerramento

- rota cooperação;
- rota afastamento;
- rota sem encontrar sobreviventes;
- encerramento variável;
- entrada no Dia 3.

## Fatia G — Playtest do Dia 2

Rotas obrigatórias:

```text
Dia 2
→ sinais
→ Caio/Davi
→ ajudar
→ atividade compartilhada
→ noite
→ Dia 3
```

```text
Dia 2
→ sinais
→ evita Caio/Davi
→ segue vida própria
→ percebe organização à distância
→ noite
→ Dia 3
```

Rota de robustez:

```text
Dia 2
→ não vai à Nascente
→ não encontra Margem Rochosa
→ mundo continua
→ Dia 3
```

---

# 25. Testes obrigatórios

## Persistência

- schema 25 → 26;
- activity state vazio;
- save/reload;
- atividade única não duplica.

## Conteúdo

- descobertas do Dia 2 não aparecem no Dia 1;
- descoberta condicional pode ser reavaliada quando o progresso já passou do limiar;
- Margem Rochosa não vaza antes do gate;
- Caio/Davi não vazam antes da descoberta.

## Atividades

- tempo uma vez;
- needs uma vez;
- NPC obrigatório ausente bloqueia;
- opcional inválido bloqueia;
- relocação persiste;
- evento abre;
- trigger não atropela;
- falha é atômica.

## Narrativa

- funciona com Mira presente;
- funciona sem Mira;
- funciona se Mira foi evitada;
- Davi pode ser ajudado;
- Davi pode ser ignorado;
- não cria party;
- não concede cidadania;
- não cria assentamento;
- não encerra o jogo.

## Gate final

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

---

# 26. Resultado esperado

Depois da implementação, o jogador deixa de sentir que o mundo é:

> “eu + um NPC tutorial”.

O segundo dia passa a provar:

> **outras pessoas já têm histórias, relações e decisões em andamento — e conviver com elas é uma mecânica tão real quanto explorar ou treinar.**
