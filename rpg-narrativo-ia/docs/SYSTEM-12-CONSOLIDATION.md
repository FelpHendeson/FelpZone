# Sistema 12 — Consolidação de combate e integração com o mundo

## Estado da decisão

**Definido pelo autor e especificado em 15 de setembro de 2026. Implementação ainda não iniciada.**

O núcleo do Sistema 12 permanece **implementado e consolidado nas Fatias 12.1 a 12.7**. Este documento aprova o recorte complementar das Fatias 12.8 a 12.12 para transformar a prova de combate existente em uma parte coerente do loop de exploração e sobrevivência.

Esta etapa não cria um Sistema 13. Ela fecha integrações que o protótipo atual ainda simula de forma isolada.

## Problema de experiência

Hoje o jogador consegue encontrar uma ameaça, lutar por turnos e retornar ao mundo. Entretanto:

- a vitalidade interna do combate começa em um valor fixo e não representa a `saude` atual;
- dano sofrido numa vitória não permanece no mundo;
- o confronto não avança o relógio nem aplica desgaste de necessidades;
- a ameaça aparece apenas por estar no local, antes de ser descoberta;
- fugir não possui custo persistente;
- a tela funciona, mas ainda não segue plenamente a hierarquia “aventura primeiro, dados sob demanda”.

O resultado desejado é:

```text
explorar e encontrar sinais
          ↓
ameaça revelada no local
          ↓
consultar risco e entrar no confronto
          ↓
resolver turnos no estado transitório
          ↓
finalizar vitória, derrota ou fuga
          ↓
aplicar UMA transação no mundo:
tempo + necessidades + saúde + desfecho
          ↓
retornar ao mesmo local com feedback claro
```

## Decisões confirmadas

### 1. Descoberta antes da ameaça

Um encontro pode declarar pré-requisitos de descoberta. Estar fisicamente no local não basta para exibi-lo.

O encontro protótipo `clearing-predator` deverá exigir a nova descoberta de conteúdo `wary-predator-tracks`, revelada na Clareira do Despertar com **30% de exploração**. Nome e limiar continuam conteúdo de protótipo, mas estabelecem o contrato ponta a ponta.

O catálogo de combate poderá declarar:

```ts
interface EncounterDefinition {
  id: string;
  locationId: string;
  opponentId: string;
  name: string;
  description: string;
  timeCost: TimeCost;
  requiredDiscoveryIds?: string[];
}
```

Regras:

- todos os requisitos declarados precisam estar revelados no estado de exploração do local;
- encontros sem requisitos continuam permitidos para usos narrativos futuros;
- referências entre catálogo de combate e catálogo de exploração são validadas na camada de composição, não dentro dos módulos isolados;
- encontro resolvido permanece oculto pelo `combat.<encounterId>.resolved` já existente;
- conteúdo oculto não pode vazar por contadores, mensagens ou ações desabilitadas.

### 2. Saúde do mundo como vitalidade de entrada

O personagem inicia o combate com:

```text
combat.player.health    = GameState.attributes.saude
combat.player.maxHealth = GameState.attributes.saude
```

O máximo da sessão representa a vitalidade disponível ao entrar no confronto. Cura durante o combate não pode elevar o personagem acima desse valor de entrada nem curar gratuitamente ferimentos anteriores do mundo.

Ao finalizar:

- vitória persiste a saúde restante;
- fuga persiste a saúde restante;
- derrota persiste `1` de saúde, evitando morte permanente e save irrecuperável neste recorte;
- a antiga penalidade fixa de `-8 saude` na derrota deixa de existir para impedir dano duplicado;
- a alteração é calculada como diferença entre a saúde de entrada e a saúde terminal e aplicada pelos efeitos públicos existentes;
- oponente e demais combatentes continuam usando o mesmo contrato genérico, sem depender de atributos humanos.

O confronto deve ser bloqueado quando a saúde atual for menor que `1`, com motivo visível antes da ação.

### 3. Tempo cobrado uma única vez

Cada definição de encontro declara um `TimeCost`. O encontro protótipo custa **1 período**, independentemente da quantidade de turnos.

O custo é aplicado somente quando o combate chega a vitória, derrota ou fuga. Turnos individuais não avançam o relógio.

A finalização deve reutilizar a composição existente de avanço temporal para produzir, uma única vez:

- mudança de período ou dia;
- desgaste de fome, sede e energia;
- renovação de recursos e recuperação de populações;
- eventos derivados do ciclo diário;
- sincronização de jornadas e demais reavaliações já acionadas por uma ação temporal.

Fechar ou recarregar a aplicação durante o combate reinicia o confronto transitório e não cobra tempo. Persistir combate em andamento e impedir reinício por recarga ficam fora desta consolidação.

### 4. Uma única transação terminal

O React não deve montar manualmente efeitos a partir de um texto de resultado. A integração recebe um `CombatState` terminal validado e deriva a transação completa no domínio.

```ts
interface CombatResolution {
  encounterId: string;
  outcome: 'victory' | 'defeat' | 'fled';
  turns: number;
  entryHealth: number;
  remainingHealth: number;
}
```

`CombatResolution` é uma saída produzida pelo domínio a partir do `CombatState` terminal. A UI não pode construir nem editar livremente esse objeto e entregá-lo como fonte de verdade.

A operação de conclusão deve:

1. rejeitar estado `ongoing`, encontro inexistente, resultado incompatível ou números malformados;
2. validar que a resolução pertence ao encontro iniciado;
3. calcular a variação persistente de saúde;
4. aplicar o custo temporal uma vez;
5. aplicar consequências do desfecho;
6. sincronizar sistemas derivados;
7. persistir um único `GameState` final;
8. retornar feedback estruturado para a interface.

Se qualquer etapa falhar, nenhuma consequência parcial pode permanecer.

### 5. Consequências por desfecho

| Desfecho | Saúde | Tempo | Encontro | Consequência adicional do protótipo |
| --- | --- | --- | --- | --- |
| Vitória | Persiste saúde restante | 1 período | Marca como resolvido | `cautela +2` |
| Derrota | Retorna ao mundo com saúde `1` | 1 período | Continua disponível | Nenhuma penalidade fixa adicional |
| Fuga | Persiste saúde restante | 1 período | Continua disponível | Nenhuma recompensa |

Todos os valores desta tabela pertencem ao conteúdo protótipo e poderão ser balanceados posteriormente sem alterar o contrato.

## Apresentação e UI/UX

O combate assume temporariamente o controle da experiência. A barra inferior do mundo não aparece durante o confronto, mas a tela deve continuar coerente com a identidade visual do Sistema.

### Ameaça no mundo

- aparece somente depois da descoberta exigida;
- fica próxima de presenças e mapa, sem deixar colunas vazias no desktop;
- informa nome, descrição e custo temporal antes de `Enfrentar`;
- não inventa nível, raridade, poder recomendado ou chance de vitória;
- desaparece depois da vitória e continua disponível depois de derrota ou fuga.

### Tela de combate

```text
┌──────────────────────────────────┐
│ CONFRONTO · turno atual          │
│ nome da ameaça                   │
├──────────────────────────────────┤
│ ameaça              vida/escudo │
│ personagem           vida/escudo│
├──────────────────────────────────┤
│ último turno                    ▾│
│ ação do inimigo → consequência   │
│ ação do jogador → consequência   │
├──────────────────────────────────┤
│ AÇÕES DISPONÍVEIS                │
│ [Golpe] [Defender] [Habilidade]  │
│ [Fugir — custa o confronto]      │
└──────────────────────────────────┘
```

- combatentes e condição atual formam a primeira hierarquia;
- cada ação mostra efeito, velocidade e eventual habilidade de origem antes do toque;
- o último turno fica visível; o histórico anterior pode ser expandido;
- ações preservam alvos de toque de pelo menos 48 px;
- resultado explica saúde persistida, tempo transcorrido, recompensa e estado da ameaça;
- deve funcionar sem rolagem horizontal desde 320 px;
- desktop limita a largura de leitura e não espalha controles em espaços excessivos;
- nenhum indicador novo entra na tela sem existir no domínio.

## Contratos e responsabilidades

### `combat`

- continua responsável por catálogos, estado transitório, ações, IA e resolução determinística de turnos;
- recebe a saúde de entrada por opção explícita;
- valida e expõe uma resolução terminal, sem acessar `GameState`, relógio, exploração ou persistência.

### composição de catálogos

- valida `requiredDiscoveryIds` contra as definições de exploração;
- impede referências inexistentes e duplicadas;
- não torna os dois módulos dependentes de internos um do outro.

### integração sandbox

- consulta disponibilidade com local, descobertas e flags;
- converte uma resolução terminal na transação atômica de mundo;
- aplica tempo, necessidades, saúde, flag, recompensa e sincronizações exatamente uma vez.

### React

- mantém apenas a seleção e apresentação do combate transitório;
- envia intenções e apresenta resultados;
- não calcula dano, disponibilidade, recompensa, tempo ou efeitos persistentes.

## Persistência e compatibilidade

- `CombatState` continua transitório e não entra no save;
- `GameState` permanece no schema 7;
- a flag de vitória existente continua compatível;
- saves atuais carregam sem migração;
- um save que já derrotou `clearing-predator` não volta a mostrar a ameaça;
- nenhum catálogo, definição ou índice é serializado.

## Sequência de fatias

### Fatia 12.8 — Descoberta e disponibilidade

Adicionar requisitos declarativos aos encontros, validação de composição e a descoberta protótipo da ameaça. Provar ausência de vazamento e compatibilidade de encontros sem requisito.

### Fatia 12.9 — Ponte de vitalidade e resolução terminal

Inicializar o jogador pela saúde do mundo, produzir resolução terminal validada e persistir a saúde final sem penalidade duplicada.

### Fatia 12.10 — Tempo e consequência atômica

Aplicar um único `TimeCost` ao desfecho e compor relógio, necessidades, renovações, saúde, flags, recompensas e sincronizações numa operação indivisível.

### Fatia 12.11 — Consolidação visual

Integrar ameaça e combate à hierarquia de UI/UX, apresentar custos e consequências, compactar o histórico e validar 320 px e desktop.

### Fatia 12.12 — Prova ponta a ponta e consolidação

Cobrir descoberta → combate → vitória/derrota/fuga → tempo/saúde → retorno ao mundo, executar todos os gates e atualizar a documentação para estado implementado somente depois da aprovação.

## Critérios de aceite

- a ameaça não aparece antes da descoberta exigida;
- saúde de entrada vem do mundo e dano terminal persiste em todos os desfechos;
- derrota retorna com saúde `1` e não aplica o antigo dano fixo;
- vitória resolve o encontro; derrota e fuga não resolvem;
- todos os desfechos consomem exatamente 1 período no conteúdo protótipo;
- desgaste e renovações derivados acontecem uma vez, nunca por turno;
- a finalização é atômica e não aceita resolução forjada ou em andamento;
- saves schema 7 permanecem compatíveis;
- conteúdo oculto não vaza;
- interface explica custo e consequência, funciona desde 320 px e não cria overflow;
- motor continua determinístico, local e sem IA generativa;
- testes, lint, tipos e build/PWA passam.

## Fora desta consolidação

- persistir ou retomar combate em andamento;
- morte permanente, tela de game over ou perda de save;
- posicionamento, distância, múltiplos combatentes e grupos;
- equipamentos, ferramentas, durabilidade e itens usados em combate;
- condições de status além de dano, cura e escudo;
- fórmulas definitivas de atributos, nível, dano, defesa ou velocidade;
- recompensas materiais, experiência ou loot;
- comportamento autônomo de ameaças no mapa;
- animações complexas, arte final, áudio ou efeitos hápticos;
- novo sistema numerado depois do Sistema 12.

Esses tópicos continuam em discussão ou sem certeza de implementação e exigem decisão própria.
