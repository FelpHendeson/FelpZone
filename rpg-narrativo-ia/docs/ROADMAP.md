# Roadmap de evolução sandbox

## Princípio

O motor narrativo consolidado será mantido como camada de eventos e diálogos. A exploração será construída por sistemas independentes, um de cada vez, sempre seguindo o ciclo:

```text
especificar → implementar → testar → revisar → corrigir → consolidar → próxima etapa
```

Não iniciar duas etapas simultaneamente. Cada sistema deve estar estável antes de servir de dependência para o seguinte.

## Sequência aprovada

### Etapa 1 — Horário e data

Implementar um relógio determinístico por períodos e avanço de dias, sem ainda aplicar rotinas, sobrevivência ou navegação.

Fonte: `SYSTEM-TIME-AND-DATE.md`.

### Etapa 2 — Ciclo diário

**Implementado.** O módulo `modules/day-cycle` interpreta o avanço do relógio e produz eventos de início e encerramento de períodos e dias, além da fase visual derivada. Ainda não aplica sobrevivência, agenda, clima, gatilhos de mundo nem tema na interface.

Fonte: `SYSTEM-DAY-CYCLE.md`.

### Etapa 3 — Navegação hierárquica

**Implementado.** O módulo `modules/navigation` carrega o mapa JSON aninhado, controla localização, descoberta, bloqueios e movimento entre pai, filhos diretos e irmãos. Ainda não aplica custo ao relógio, não altera o save principal e não introduz tela de mapa.

Fonte: `SYSTEM-NAVIGATION.md`.

### Etapa 4 — Exploração e descobertas

**Implementado.** O módulo `modules/exploration` aumenta o percentual de conhecimento de cada local, revela conteúdo dirigido por dados e deriva a conclusão da zona. Ainda não coleta recursos, não aplica o custo ao relógio, não altera o save principal e não introduz botão de explorar.

Fonte: `SYSTEM-EXPLORATION.md`.

### Etapa 5 — Recursos e ecologia

**Implementado.** O módulo `modules/resources` modela pontos de coleta com capacidade limitada, coleta atômica, renovação curta ou longa e populações que podem ser pressionadas ou extintas localmente. Ainda não aplica o custo ao relógio, não altera o save principal e não introduz interface de coleta.

Fonte: `SYSTEM-RESOURCES.md`.

### Etapa 6 — Crafting e cozinha

**Implementado.** O módulo `modules/crafting` declara receitas, consome materiais atomicamente, constrói estruturas no local atual e cozinha quando há estação ativa. Ainda não aplica o custo ao relógio, não altera o save principal e não introduz interface de crafting.

Fonte: `SYSTEM-CRAFTING.md`.

### Etapa 7 — Integração explorável

Fonte: `SYSTEM-INTEGRATION.md`.

#### Fatia 7.1 — Estado integrado e persistência principal

**Implementada.** `GameState` inclui `sandbox`, o save usa `schemaVersion: 2` e partidas v1 válidas são migradas na leitura. A interface narrativa não mudou.

#### Fatia 7.2 — Orquestrador de ações e tempo

**Implementada.** `executeSandboxAction` aplica o custo uma vez, recupera populações, sincroniza renovação e reavalia descobertas e receitas sem alterar a interface.

#### Fatia 7.3 — Da introdução à exploração livre

**Implementada.** Depois da capacidade inicial o jogador permanece `playing` sem sessão narrativa, na Clareira do Despertar. A interface mostra só uma tela mínima. Os menus reais ficam na Fatia 7.4.

#### Fatia 7.4 — Superfície mobile

Ainda não implementada. Expor destinos, explorar, coletar e fabricar na interface.

O marco do Sistema 7 só termina quando o jogador desperta, escolhe uma capacidade, explora livremente e encontra pelo menos um NPC ou criatura por meio das próprias ações. Esse marco ainda não foi atingido.

## Etapas posteriores, ainda não especificadas

1. Interações avançadas com elementos do cenário.
2. Agenda, presença e progressão de NPCs.
3. Criaturas e encontros por habitat e período.
4. Sobrevivência: fome, energia, água, descanso e abrigo.
5. Testes de capacidade, risco e consequências.
6. Ferramentas, durabilidade e crafting avançado.
7. Relações e grupo.
8. Conflitos e combate.
9. Assentamentos e facções.
10. Progresso de rotas e conclusão de 100% do mundo.

Esses itens não autorizam implementação. Cada um será discutido e especificado quando sua etapa chegar.

## Regra de entrada de um sistema

Antes de implementar, definir:

1. problema de diversão ou imersão resolvido;
2. estado lido e alterado;
3. contratos públicos;
4. apresentação mobile;
5. relação com tempo, navegação e narrativa;
6. menor sequência jogável;
7. testes e critérios de aceite;
8. itens explicitamente fora da etapa.
