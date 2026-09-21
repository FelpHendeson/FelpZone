# Mecânica — Orientação e Central de Ajuda do Sistema

## Estado

**Especificada e implementada em 21 de setembro de 2026.**

Esta mecânica cria onboarding contextual e uma Central de Ajuda diegética sem transformar tutorial em regra de gameplay.

Ela nasce da necessidade narrativa do novo Dia 1, mas deve ser reutilizável por qualquer pack.

## Objetivo

O jogador deve aprender uma mecânica quando ela passa a fazer sentido no mundo.

Fluxo:

```text
mecânica ganha contexto
↓
tópico é desbloqueado
↓
popup curto aparece uma vez
↓
jogador entende o mínimo necessário
↓
conteúdo completo permanece na Central de Ajuda
```

Consultar ajuda nunca consome tempo.

## Catálogo

Novo conteúdo de pack sugerido:

`content/<pack>/ui/guidance.json`

Contrato conceitual:

```ts
type GuidanceCategory =
  | 'system'
  | 'world'
  | 'survival'
  | 'progression'
  | 'social'
  | 'society';

interface GuidanceTopicDefinition {
  id: string;
  title: string;
  summary: string;
  body: string[];
  category: GuidanceCategory;
  popupOnUnlock?: boolean;
}
```

O texto é conteúdo do pack.

React não deve conter cópias canônicas das explicações.

## Estado persistido

```ts
interface GuidanceState {
  unlockedTopicIds: string[];
  seenTopicIds: string[];
}
```

Regras:

- IDs precisam existir no catálogo ativo;
- `seenTopicIds` deve ser subconjunto de `unlockedTopicIds`;
- ordem segue o catálogo;
- desbloqueio é idempotente;
- marcar como visto é idempotente;
- consultar tópico não altera tempo, necessidades ou mundo.

O estado entra no save porque o jogador não deve receber o mesmo popup invasivo após cada reload.

## Operações

O módulo deve expor funções puras equivalentes a:

```ts
createInitialGuidanceState()
unlockGuidanceTopic(catalog, state, topicId)
markGuidanceTopicSeen(catalog, state, topicId)
listUnlockedGuidanceTopics(catalog, state)
listUnseenGuidanceTopics(catalog, state)
```

A UI nunca manipula arrays diretamente.

## Integração com campanha

Adicionar efeito declarativo fechado:

```ts
{ type: 'guidance.unlock'; topicId: string }
```

Isso permite que uma cena ou escolha desbloqueie ajuda sem criar flags artificiais.

Exemplos do Dia 1:

- despertar → `choices-and-consequences`;
- Sistema inicializado → `system-basics`;
- Etéris apresentada → `eteris`;
- Númen apresentado → `numen`;
- primeiro treino disponível → `training`;
- primeira presença humana descoberta → `relationships-basics`.

O efeito precisa validar o ID contra o catálogo ativo.

## Marcar como visto

Marcar tutorial como visto é uma ação de interface sem custo temporal.

Não deve passar pela pipeline de desgaste do sandbox.

A aplicação pode possuir um handler específico que delega a uma função pura do módulo e persiste o novo estado.

## Popup

Quando existe tópico desbloqueado e ainda não visto:

- mostrar no máximo um por vez;
- ordem do catálogo;
- não abrir no meio de uma decisão narrativa;
- não abrir sobre combate;
- aguardar retorno a uma superfície segura;
- permitir `Entendi`;
- permitir `Ver detalhes`;
- ambas as ações marcam o tópico como visto.

Se vários tópicos forem desbloqueados juntos, entram numa pequena fila derivada de `unlocked - seen`; não é necessário persistir fila separada.

## Central de Ajuda

A Central de Ajuda mostra somente tópicos desbloqueados.

Recorte inicial:

- O Sistema;
- escolhas e consequências;
- tempo e períodos;
- exploração;
- necessidades;
- inventário;
- Etéris;
- Númen;
- treinamento;
- jornadas;
- relações básicas.

Sistemas futuros entram por conteúdo, não por alteração da tela estrutural.

## Relação com descoberta progressiva

Nesta primeira implementação, Orientação **não bloqueia regras do motor**.

Ela controla:

- ensino;
- conteúdo consultável;
- indicador de novidade.

Não esconder mecanicamente inventário, Sistema ou ações válidas apenas porque o tutorial ainda não apareceu.

Se o playtest mostrar sobrecarga visual, uma segunda fatia poderá adicionar descoberta progressiva de superfícies.

## Schema

Esta mecânica adiciona `GameState.guidance`.

O schema 24 foi publicado pela Fatia A para persistir `character.sex`. `GameState.guidance` foi publicado no schema 25.

## Migração

Saves schema 24 migram sem perder progresso.

Para saves antigos do protótipo:

- criar `GuidanceState`;
- desbloquear os tópicos básicos que correspondem a sistemas que o save já necessariamente conheceu;
- marcar esses tópicos como vistos para evitar bombardear uma partida antiga com tutoriais;
- tópicos narrativos novos do Dia 1 podem permanecer bloqueados se o save já passou daquele conteúdo.

A função de migração não avança tempo nem executa efeitos.

## Pack e composeWorld

O pack passa a carregar `guidance.json`.

`composeWorld()`:

- valida catálogo;
- indexa IDs;
- entrega catálogo no mundo ativo;
- garante que efeitos `guidance.unlock` referenciem tópicos existentes.

O catálogo não entra no save.

## Testes mínimos

- catálogo inválido falha na borda;
- ID duplicado falha;
- unlock é idempotente;
- seen antes de unlock falha;
- seen é idempotente;
- `seen ⊆ unlocked`;
- efeito de campanha desbloqueia tópico;
- abrir ajuda não avança relógio;
- popup aparece uma vez;
- reload não repete tópico visto;
- pack alternativo troca textos sem alterar motor;
- save schema 24 migra para schema 25.

## Fora do escopo inicial

- tours com setas sobre cada botão;
- vídeo;
- tutorial animado;
- analytics;
- telemetria;
- recompensa por ler tutorial;
- bloqueio obrigatório de UI;
- IA em runtime.
