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

Adicionar percentual por local, ações de exploração e revelação determinística de marcos, passagens, subáreas, pontos de recurso, NPCs e criaturas.

Fonte: `SYSTEM-EXPLORATION.md`.

### Etapa 5 — Recursos e ecologia

Adicionar pontos de coleta com capacidade, renovação curta ou longa e populações que podem ser pressionadas ou esgotadas.

Fonte: `SYSTEM-RESOURCES.md`.

### Etapa 6 — Crafting e cozinha

Transformar materiais por receitas e estruturas, começando por fogueira e preparo de alimento.

Fonte: `SYSTEM-CRAFTING.md`.

### Etapa 7 — Integração explorável

Após consolidar os seis sistemas:

- manter a introdução narrativa atual;
- devolver o jogador à exploração depois da capacidade inicial;
- permitir caminhar pela primeira região;
- fazer movimento consumir tempo;
- descobrir e mapear locais;
- aumentar o percentual de exploração de cada ambiente;
- revelar ao menos uma subárea bônus e pontos de coleta;
- coletar recursos limitados e observar sua disponibilidade;
- construir uma fogueira e preparar alimento;
- acionar eventos por entrada, interação ou período;
- retornar à exploração após narrativas e diálogos.

O marco termina quando o jogador desperta, escolhe uma capacidade, explora livremente e encontra pelo menos um NPC ou criatura por meio das próprias ações.

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
