# Mecânica — Atividades Contextuais

## Estado

**Infraestrutura implementada na Fatia A do Dia 2; primeira atividade jogável com Davi implementada na Fatia D.**

Esta mecânica nasce do Dia 2 e da direção de longo prazo de trabalho como motor narrativo.

O catálogo ativo contém `escort-davi-to-clearing`, liberada somente depois que o jogador conhece a situação e oferece ajuda. Ela prova participantes, tempo, relocação persistente, guidance, narrativa e consumo único.

Ela **não é o Sistema 30**.

É uma camada pequena de orquestração entre sistemas já existentes.

Referência narrativa:

- [Dia 2 — especificação narrativa e jogável](DAY-2-NARRATIVE-SPEC.md);
- [Fundação narrativa — Reset](NARRATIVE-FOUNDATION.md).

---

# 1. Problema

O motor já sabe executar:

- exploração;
- coleta;
- crafting;
- treino;
- descanso;
- interações;
- ações sociais;
- profissões;
- assentamentos.

Mas falta representar uma intenção como:

> acompanhar Davi até a Clareira;

> vigiar enquanto outra pessoa descansa;

> verificar rastros com Caio;

> fazer uma ronda com Yasmin;

sem fingir que isso é:

- uma profissão formal;
- uma party;
- uma organização;
- uma construção;
- uma cutscene sem custo temporal.

---

# 2. Princípio

Uma atividade contextual é:

> **uma ação situada no mundo, declarada pelo pack, que consome tempo real, pode envolver NPCs e produz efeitos por contratos existentes.**

Ela não cria uma segunda simulação.

Fluxo:

```text
necessidade no mundo
↓
atividade disponível
↓
jogador escolhe executar
↓
motor valida local + participantes + requisitos
↓
tempo/necessidades avançam uma vez
↓
efeitos atômicos
↓
sincronização do sandbox
↓
evento narrativo opcional
```

---

# 3. Primeiro recorte

O primeiro recorte existe para o Dia 2.

Ele suporta:

- atividade instantânea com duração em períodos;
- local obrigatório;
- requisitos;
- NPCs obrigatórios;
- NPCs opcionais escolhidos pelo jogador;
- consentimento/eligibilidade por conteúdo;
- atividade única ou repetível;
- efeitos sociais e de estado de NPC;
- narrativa opcional;
- feedback;
- persistência de atividades únicas consumidas.

Ele não suporta ainda:

- escala de trabalho;
- salário;
- produção periódica;
- agenda semanal;
- fila de tarefas;
- atribuição offline;
- vários dias de duração;
- população abstrata;
- emprego formal.

---

# 4. Catálogo

Arquivo sugerido:

`content/first-day/world/activities.json`

Contrato conceitual:

```ts
interface ContextualActivityDefinition {
  id: string;
  label: string;
  description: string;
  locationId: string;
  timeCost: TimeCost;
  repeatable: boolean;
  requirements: ActivityRequirement[];
  participants?: ActivityParticipants;
  effects: ContextualActivityEffect[];
  narrative?: {
    campaignId: string;
    eventId: string;
  };
  feedback?: string;
}

interface ActivityParticipants {
  requiredNpcIds: string[];
  optionalNpcIds: string[];
  minOptional: number;
  maxOptional: number;
}
```

Todos os IDs são validados na composição do pack.

---

# 5. Requisitos

O primeiro recorte precisa somente de requisitos reproduzíveis.

```ts
type ActivityRequirement =
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'inventory.has'; itemId: string; quantity?: number }
  | { type: 'relationship.min'; characterId: string; amount: number }
  | { type: 'location.is'; locationId: string }
  | { type: 'world.day.min'; day: number }
  | { type: 'npc.known'; npcId: string }
  | { type: 'npc.present'; npcId: string }
  | { type: 'npc.available'; npcId: string };
```

Não generalizar todos os sistemas numa linguagem universal nesta fatia.

Novos requisitos entram somente quando uma atividade real precisar deles.

---

# 6. Participantes e agência

A UI não decide que um NPC aceitou participar.

Para cada NPC selecionado:

1. o NPC precisa existir no catálogo;
2. precisa estar conhecido quando exigido;
3. precisa estar no local;
4. precisa estar disponível;
5. requisitos específicos da atividade precisam passar.

O pack pode declarar requisitos adicionais por atividade.

Exemplo:

```json
{
  "id": "escort-davi-to-clearing",
  "participants": {
    "requiredNpcIds": ["davi-moura"],
    "optionalNpcIds": ["caio-nascimento", "mira-vale"],
    "minOptional": 0,
    "maxOptional": 1
  }
}
```

Davi faz parte do objeto da atividade.

Caio ou Mira podem acompanhar se estiverem elegíveis.

O cliente não consegue inserir outro NPC arbitrário.

---

# 7. Efeitos

A primeira versão não deve transformar atividades em uma porta para mutar qualquer domínio.

Usar um conjunto fechado:

```ts
type ContextualActivityEffect =
  | { type: 'flag.set'; flag: string; value: boolean }
  | { type: 'relationship.change'; characterId: string; amount: number }
  | { type: 'npc.rememberFact'; npcId: string; factId: string }
  | { type: 'npc.relocate'; npcId: string; locationId: string }
  | { type: 'guidance.unlock'; topicId: string };
```

## Por que `npc.relocate`

O módulo atual de NPC já possui `locationOverrideId`, mas não existe um efeito público apropriado para uma atividade mover um NPC de forma explícita.

A implementação deve adicionar uma operação tipada ao domínio de NPCs.

Ela não pode:

- escrever diretamente no estado pela UI;
- alterar agenda por texto;
- teleportar NPC para local desconhecido/inválido.

## Recursos

No primeiro recorte, atividades **não adicionam recursos diretamente**.

Se a atividade narrativa é “buscar água”, a obtenção da água deve continuar usando:

- recurso;
- inventário;
- coleta;
- condições reais.

A atividade pode envolver companhia e consequências sociais ao redor dessa ação, mas não deve duplicar a ecologia.

Isso evita criar água, comida ou materiais do nada.

---

# 8. Ação de sandbox

Adicionar:

```ts
{
  type: 'activity.perform';
  activityId: string;
  optionalParticipantIds: string[];
}
```

Resultado:

```ts
interface ContextualActivityPlan {
  activityId: string;
  participantNpcIds: string[];
  timeCost: TimeCost;
  effects: ContextualActivityEffect[];
  narrative?: {
    campaignId: string;
    eventId: string;
  };
  feedback?: string;
}
```

`SandboxActionDetail` recebe:

```ts
| {
    type: 'activity.perform';
    plan: ContextualActivityPlan;
  }
```

---

# 9. Tempo e necessidades

Atividade é uma ação normal do sandbox.

Portanto:

- aplica `timeCost` uma única vez;
- aplica desgaste de necessidades uma única vez;
- roda sincronização normal depois;
- atualiza agenda dos NPCs pelo mesmo relógio;
- permite world triggers depois da ação.

Não chamar internamente outra `SandboxAction` com custo.

Isso impediria dupla cobrança de tempo.

---

# 10. Narrativa e prioridade

Uma atividade pode abrir um evento declarado.

Exemplo:

`escort-davi-to-clearing → davi-arrives-clearing`

Regra:

> se a atividade abre narrativa diretamente, essa sessão tem prioridade imediata.

World triggers que se tornarem elegíveis pelo mesmo avanço de tempo são avaliados quando a sessão atual devolver o jogador ao sandbox.

Isso preserva o comportamento já provado no Dia 1, em que a primeira noite não interrompe uma conversa ativa.

---

# 11. Persistência

Proposta:

```ts
interface ContextualActivitiesState {
  consumedActivityIds: string[];
}
```

Nova versão de save proposta para a implementação:

**schema 26**.

Migração 25 → 26:

```ts
activities: {
  consumedActivityIds: []
}
```

Regras:

- migração não avança tempo;
- não executa atividade;
- não move NPC;
- não abre narrativa;
- atividade repetível não entra em `consumedActivityIds`;
- atividade única entra somente após transação concluída.

---

# 12. Composição do pack

Adicionar ao mundo:

```ts
IndexedWorld.activities
SandboxContext.activities
```

Validações cruzadas:

- `locationId` existe;
- todos os NPCs existem;
- fact IDs pertencem ao NPC correto;
- destinos de `npc.relocate` existem;
- tópico de guidance existe;
- evento narrativo existe e pode iniciar sessão;
- IDs de atividade são únicos;
- limites opcionais são coerentes.

O catálogo permanece fora do save.

---

# 13. UI

Não criar nova aba principal.

No painel **Mundo**, quando houver atividades disponíveis no local:

```text
ATIVIDADES

Acompanhar Davi até a Clareira
1 período
Davi · obrigatório
Caio · pode acompanhar

[Executar]
```

Se houver participantes opcionais:

- seleção pequena;
- somente candidatos elegíveis;
- não mostrar NPC secreto;
- escolha acessível em mobile;
- botão desabilitado com motivo quando requisitos falham.

A Central de Ajuda explica a mecânica depois do primeiro desbloqueio.

---

# 14. Dia 2 — primeiras atividades

## 14.1 Acompanhar Davi até a Clareira

ID sugerido:

`escort-davi-to-clearing`

Local:

`rocky-bank`

Duração:

1 período.

Participante obrigatório:

- Davi.

Opcionais:

- Caio;
- Mira.

Efeitos principais:

- mover Davi para a Clareira;
- registrar fato;
- alterar relação conforme conteúdo;
- marcar resolução da situação;
- abrir cena curta de chegada.

## 14.2 Verificar os rastros

ID sugerido:

`check-multiple-human-tracks`

Local:

- Nascente ou Margem Rochosa, conforme implementação final.

Duração:

1 período.

Opcionais:

- Caio;
- Mira.

Resultado:

- fato/flag de que existem mais humanos;
- possível descoberta de passagem;
- narrativa curta.

Não conceder recurso.

## 14.3 Vigia provisória

ID sugerido:

`shared-evening-watch`

Disponível somente se:

- duas ou mais pessoas relevantes estiverem reunidas;
- período apropriado;
- situação do dia tiver sido resolvida.

Ela não cria cargo de vigia.

Pode gerar:

- conversa;
- relação;
- informação;
- gatilho para o encerramento do Dia 2.

---

# 15. Relação com profissões e assentamentos

Atividade contextual não substitui os Sistemas 26 e 28.

Diferença:

```text
atividade contextual
= precisamos fazer algo agora

profissão
= papel praticado e reconhecido

função de assentamento
= atribuição dentro de estrutura organizada
```

Exemplo:

- ajudar a buscar água no Dia 2 não torna o jogador “carregador de água”;
- fazer vigia uma noite não concede cargo de guarda;
- levar Davi para a Clareira não cria party.

Nos Dias 3–5, atividades repetidas podem virar fonte verificável de:

- prática profissional;
- contribuição;
- reputação;
- função social.

Essa ponte deve ser especificada somente quando o conteúdo chegar lá.

---

# 16. Testes obrigatórios

## Catálogo

- rejeita activity ID duplicado;
- rejeita local inexistente;
- rejeita NPC inexistente;
- rejeita efeito com fact/local inválido;
- aceita pack alterado sem mudar engine.

## Planejamento

- atividade indisponível fora do local;
- NPC obrigatório ausente bloqueia;
- NPC opcional inválido é rejeitado;
- limites de participantes são respeitados;
- atividade única consumida não repete.

## Execução

- cobra tempo uma vez;
- aplica necessidades uma vez;
- efeitos são atômicos;
- falha não move NPC;
- `npc.relocate` usa API do domínio;
- evento narrativo abre depois da ação;
- trigger global não atropela narrativa ativa;
- save/reload preserva consumo.

## Integração Dia 2

- Davi pode ser acompanhado com Caio;
- Davi pode ser acompanhado sem Caio;
- Mira não é obrigatória;
- recusar atividade não bloqueia o Dia 2;
- mundo continua para o Dia 3.

---

# 17. Fora do primeiro recorte

- empregos;
- salários;
- contribuição numérica universal;
- produção automática;
- turnos recorrentes;
- atividades offline;
- agenda de trabalho de todos os NPCs;
- tarefas geradas proceduralmente;
- matchmaking de trabalhadores;
- fila de construção;
- simulação de assentamento;
- Sistema 30.

---

# 18. Critério de sucesso

A mecânica está cumprindo seu papel quando o jogo consegue representar:

> “Caio fica de vigia enquanto você e Mira ajudam Davi a chegar à Clareira”

como uma ação real com:

- pessoas;
- localização;
- consentimento;
- tempo;
- consequência;

sem precisar fingir que o grupo já possui emprego, governo ou assentamento.
