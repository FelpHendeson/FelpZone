# Sistema 16 — Jardim de habilidades

## Estado da decisão

**Aprovado, especificado e implementado pelo autor em 15 de setembro de 2026.**

O Jardim é a superfície do Sistema dedicada a integrar caminhos. Enquanto a Árvore mostra habilidades, requisitos e progressões reconhecidas, o Jardim permite cultivar combinações autorizadas entre habilidades conhecidas para produzir técnicas híbridas declaradas em catálogo.

O primeiro recorte é determinístico, não destrutivo e dirigido por receitas. Ele não gera habilidades por IA, não combina textos livremente e não cria um editor de poderes.

## Problema de diversão e identidade

A progressão atual fortalece habilidades individualmente e revela caminhos. Falta uma forma de o jogador expressar como seus aprendizados se relacionam:

```text
aprender habilidades de caminhos diferentes
        ↓
o Sistema reconhece uma possibilidade de cultivo
        ↓
consultar requisitos sem vazar combinações ocultas
        ↓
investir tempo e um recurso de cultivo
        ↓
desbloquear uma técnica híbrida curada
        ↓
usar a técnica no mundo ou combate
        ↓
desenvolver a nova habilidade pelo Sistema 13
```

O Jardim deve recompensar construção de personagem sem apagar escolhas anteriores ou virar uma fábrica infinita de habilidades.

## Decisões confirmadas

### 1. Árvore e Jardim têm papéis diferentes

- **Árvore:** apresenta caminhos, habilidades e requisitos de progressão;
- **Jardim:** apresenta possibilidades de integração entre habilidades já conhecidas;
- uma habilidade híbrida continua pertencendo ao catálogo de habilidades;
- o Jardim não muda o significado de Eteris, Númen, Corpo ou Poder;
- consultar qualquer uma das superfícies não consome tempo.

### 2. Combinações são receitas declarativas

```ts
interface GardenRecipeDefinition {
  id: string;
  name: string;
  description: string;
  sourceSkillIds: readonly string[];
  requirements: readonly GardenRequirement[];
  cost: GardenCost;
  resultSkillId: string;
  visibility: GardenVisibilityRule;
}
```

Cada resultado é escrito e validado previamente. Não existe concatenação automática de efeitos, nomes ou números.

### 3. Cultivo inicial é não destrutivo e irreversível

No primeiro recorte:

- habilidades de origem permanecem conhecidas e inalteradas;
- concluir uma receita ensina a habilidade resultante;
- a mesma receita não pode ser concluída duas vezes;
- o resultado não pode ser removido ou convertido de volta;
- não há falha aleatória;
- não há escolha entre resultado bom ou ruim.

Essas regras protegem saves e tornam o primeiro ciclo compreensível. Reversão, sacrifício e mutação permanecem fora do escopo.

### 4. O custo usa tempo e um recurso próprio do Sistema

O Jardim introduz `cultivationPoints`, uma quantidade inteira persistida e concedida somente por marcos explícitos do Sistema.

```ts
interface GardenCost {
  cultivationPoints: number;
  timeCost: TimeCost;
}
```

- pontos não são comprados nem recebidos por toda vitória;
- o primeiro ponto vem de um marco protótipo declarado;
- cultivar consome pontos e tempo na mesma transação;
- Númen continua conceito energético, não vira automaticamente moeda numérica;
- consultar receitas não consome ponto ou tempo.

### 5. Requisitos são fechados e verificáveis

```ts
type GardenRequirement =
  | { type: 'skill.known'; skillId: string }
  | { type: 'skill.proficiency'; skillId: string; minimum: number }
  | { type: 'level.minimum'; level: number }
  | { type: 'milestone.reached'; milestoneId: string };
```

Requisitos usam fontes canônicas dos Sistemas 11 e 13. React não informa proficiência, nível ou marco.

### 6. Sigilo é parte do contrato

Uma receita pode estar:

- oculta, sem aparecer nem em contagem;
- percebida, mostrando somente uma possibilidade e requisitos já conhecidos;
- disponível;
- cultivada.

Nome, fontes e resultado permanecem ocultos até a regra de visibilidade permitir. Erros, índices e mensagens também respeitam o sigilo.

### 7. O resultado entra nos sistemas existentes

Ao ser ensinada, a habilidade híbrida:

- entra em `GameState.system.entries` com proficiência inicial declarada;
- aparece na Árvore e no Jardim conforme contratos públicos;
- pode liberar ações declaradas no catálogo de combate;
- recebe prática pelas regras do Sistema 13;
- pode possuir elemento ou condição do Sistema 15;
- não ganha exceções codificadas no React.

## Estado e persistência

A implementação evolui o save para `schemaVersion: 10`.

```ts
interface GardenState {
  cultivationPoints: number;
  completedRecipeIds: readonly string[];
}
```

- receitas, requisitos, textos e resultados não entram no save;
- habilidades conhecidas continuam em `GameState.system.entries`;
- saves v1–v9 migram com zero ponto e nenhuma receita concluída;
- migração não concede marco, habilidade, ponto ou progresso;
- um save que satisfaz requisitos reconhece a possibilidade na próxima consulta, sem concluir cultivo;
- IDs repetidos, receita inexistente, ponto negativo ou habilidade resultante ausente falham de forma controlada;
- leitura não regrava `localStorage`.

## Transação de cultivo

```text
validar receita conhecida e requisitos
        ↓
validar ponto e custo temporal
        ↓
ensinar habilidade resultante
        ↓
marcar receita concluída
        ↓
consumir ponto de cultivo
        ↓
aplicar tempo uma vez
        ↓
sincronizar necessidades, recursos, objetivos e marcos
        ↓
produzir feedback estruturado e um único GameState
```

Qualquer falha reverte habilidade, receita, ponto, tempo e sistemas derivados.

## Primeiro ciclo jogável do protótipo

1. conhecer e desenvolver duas habilidades de caminhos compatíveis;
2. atingir o marco protótipo que concede um ponto de cultivo;
3. perceber uma receita no Jardim;
4. consultar fontes, requisitos, custo e resultado autorizado;
5. cultivar a receita, consumindo um ponto e períodos declarados;
6. aprender uma habilidade híbrida protótipo;
7. usar a nova técnica em combate ou treino;
8. receber prática normalmente pelo Sistema 13;
9. salvar e recarregar sem duplicar ponto, receita ou habilidade.

A primeira receita combinará habilidades já presentes nos caminhos de Corpo e percepção/Poder. Nome, limiares e efeito serão conteúdo de protótipo, mas deverão reutilizar contratos dos Sistemas 13 e 15.

## Fronteiras dos módulos

### `garden`

- valida receitas, requisitos, custo, visibilidade e estado;
- deriva receitas conhecidas sem vazar conteúdo;
- planeja cultivo e produz resultado estruturado;
- não avança tempo nem altera `GameState` diretamente.

### `mastery` e `skills`

- continuam fontes de verdade para marcos, nível, conhecimento e proficiência;
- expõem operações públicas para concessão autorizada;
- não interpretam receitas do Jardim.

### `sandbox-actions`

- executa `garden.cultivate` atomicamente;
- aplica habilidade, ponto, tempo e sincronizações;
- rejeita resultado informado pela UI.

### `system-interface` e React

- apresentam Árvore e Jardim como superfícies relacionadas;
- enviam somente `recipeId` e confirmação;
- não calculam requisito, custo, resultado ou visibilidade.

## Apresentação mobile

O Jardim entra dentro da aba `Sistema`, sem criar um quinto destino principal.

```text
┌──────────────────────────────────┐
│ SISTEMA · JARDIM                 │
│ Pontos de cultivo: 1             │
├──────────────────────────────────┤
│ Integração percebida             │
│ Sentidos Aguçados + Corpo Firme  │
│ Requisitos atendidos             │
│ Custo: 1 ponto · 2 períodos      │
│ [Cultivar integração]            │
└──────────────────────────────────┘
```

- alternância clara entre Status, Árvore, Treino e Jardim;
- receitas ocultas não alteram contadores;
- confirmação explica custo e permanência;
- 320 px sem overflow e alvos de 48 px;
- resultado usa feedback diegético curto;
- detalhes ficam sob demanda.

## Relação com objetivos

O Sistema 10 pode observar ponto adquirido, receita concluída ou habilidade conhecida depois da transação. Objetivos não concedem receita diretamente nem duplicam o ponto.

## Sequência de fatias

### Fatia 16.1 — Catálogo e estado isolado

Receitas, requisitos, custos, visibilidade, estado e validação profunda.

### Fatia 16.2 — Derivação segura e planejamento

Estados oculto/percebido/disponível/cultivado, sigilo e plano puro.

### Fatia 16.3 — Pontos e integração com marcos

Concessão idempotente por marco explícito e prevenção de duplicação.

### Fatia 16.4 — Persistência e ação atômica

Schema 10, migrações v1–v9 e `garden.cultivate` com custo único.

### Fatia 16.5 — Habilidade híbrida e combate

Ensino da habilidade, ação/efeito declarativo e prática pelo Sistema 13.

### Fatia 16.6 — Interface diegética mobile

Jardim dentro da aba Sistema, confirmação e feedback sem vazamento.

### Fatia 16.7 — Ciclo ponta a ponta e consolidação

Desenvolver fontes → obter ponto → cultivar → usar → progredir → salvar/recarregar, seguido de todos os gates.

## Critérios de aceite

- receitas são curadas, declarativas e profundamente validadas;
- fontes permanecem conhecidas após cultivo;
- resultado é único, determinístico e irreversível no primeiro recorte;
- ponto só nasce de marco explícito e não duplica;
- cultivo consome ponto e tempo exatamente uma vez;
- conteúdo oculto não vaza em consultas, contagens, erros ou UI;
- habilidade resultante usa catálogos e progressão existentes;
- UI não calcula requisito nem resultado;
- schema 10 migra sem gameplay;
- reload não duplica ponto, receita ou habilidade;
- suíte, lint, tipos, build/PWA, revisão funcional, segurança e visual passam.

## Fora do Sistema 16

- geração procedural ou por IA;
- combinação livre de qualquer habilidade;
- sacrifício, destruição, reversão ou mutação aleatória;
- falha de cultivo e resultados secretos negativos;
- árvore procedural, classes ou raças;
- marketplace, monetização ou editor;
- NPCs usando Jardim no primeiro recorte;
- agenda e mundo vivo, pertencentes ao Sistema 17;
- balanceamento definitivo.
