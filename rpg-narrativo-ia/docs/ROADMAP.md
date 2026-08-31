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

Fazer o mundo reagir à passagem do tempo: mudança de dia, início e encerramento de períodos, gatilhos e apresentação visual do ciclo.

Fonte: `SYSTEM-DAY-CYCLE.md`.

### Etapa 3 — Navegação hierárquica

Carregar mapas aninhados, controlar localização, descoberta, bloqueios e movimento entre pai, filhos diretos e irmãos.

Fonte: `SYSTEM-NAVIGATION.md`.

### Etapa 4 — Integração explorável

Após consolidar os três sistemas:

- manter a introdução narrativa atual;
- devolver o jogador à exploração depois da capacidade inicial;
- permitir caminhar pela primeira região;
- fazer movimento consumir tempo;
- descobrir e mapear locais;
- acionar eventos por entrada, interação ou período;
- retornar à exploração após narrativas e diálogos.

O marco termina quando o jogador desperta, escolhe uma capacidade, explora livremente e encontra pelo menos um NPC ou criatura por meio das próprias ações.

## Etapas posteriores, ainda não especificadas

1. Interações com itens e elementos do cenário.
2. Agenda, presença e progressão de NPCs.
3. Criaturas e encontros por habitat e período.
4. Sobrevivência: fome, energia, água, descanso e abrigo.
5. Testes de capacidade, risco e consequências.
6. Inventário e criação simples.
7. Relações e grupo.
8. Conflitos e combate.
9. Assentamentos e facções.
10. Progresso de região, rotas e conclusão de 100%.

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
