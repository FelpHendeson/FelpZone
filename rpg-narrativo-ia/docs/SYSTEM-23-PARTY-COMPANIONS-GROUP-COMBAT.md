# Sistema 23 — Party, companheiros e combate coletivo

> **Estado:** definido e especificado pelo autor em 17 de setembro de 2026. Ainda não implementado.

## Objetivo

Permitir que o jogador explore e lute ao lado de personagens persistentes, formando grupos com papéis, táticas e consequências relacionais.

## Decisões confirmadas

- Party é uma especialização de grupo, não uma lista solta na tela de combate.
- Companheiros continuam sendo NPCs completos e não extensões descartáveis do inventário do jogador.
- O combate aceita múltiplos participantes nos dois lados usando o mesmo contrato de combatente.
- O jogador define ordens permitidas ou uma tática; não controla decisões que o companheiro recusaria segundo as regras de agência.
- A primeira versão usa posições e alvos abstratos, sem grade espacial.
- Saúde, condições, prática, relações e resultados persistentes são resolvidos em uma única transação terminal.

## Contrato conceitual

O pack declara funções de party, táticas disponíveis, preferências de companheiros, formações abstratas e encontros multialvo. O estado registra party ativa, função de cada membro, tática escolhida e consequências persistentes — nunca uma cópia completa do NPC.

O combate trabalha com equipes e uma fila determinística de ações. Entrada, saída, incapacitação, vitória, derrota ou fuga possuem regras explícitas.

## Integrações

- **Grupos e organizações:** composição e permissões da party.
- **Relacionamentos:** confiança pode habilitar ordens; resultados podem modificar vínculos.
- **NPCs e agenda:** o companheiro precisa estar disponível.
- **Númen e combate:** ações, velocidade, alvo e resolução.
- **Necessidades e tempo:** o desfecho cobra tempo uma vez e atualiza o mundo.
- **Progressão:** prática é concedida apenas a participações verificadas.

## Primeiro ciclo jogável

Jogador e Mira formam uma party e enfrentam duas criaturas. O jogador escolhe sua ação e uma orientação para Mira. O motor resolve ordem, alvos e consequências; ao final, ambos retornam ao mundo com saúde, condições, prática e relação coerentes.

## Fatias propostas

1. Party ativa construída sobre o Sistema 21.
2. Equipes, alvos e ordem multiautor.
3. Táticas, papéis e agência de companheiro.
4. IA determinística para múltiplos combatentes.
5. Resolução terminal e integração de consequências.
6. Interface mobile de equipe, fila e seleção de alvo.
7. Encontro vertical com Mira e testes de persistência.

## Critérios de aceite

- Um ator não ocupa duas equipes nem age depois de incapacitado.
- Alvos inválidos são rejeitados antes de qualquer custo.
- Companheiros não executam ordens bloqueadas por contrato.
- O tempo do mundo avança uma vez por confronto, nunca por turno.
- Prática e recompensas correspondem ao resultado reproduzido.
- Salvar e carregar preserva party e consequências, não um combate intermediário inconsistente.

## Fora do escopo inicial

- batalhas de exércitos;
- PvP ou multiplayer;
- grade tática e distância geométrica;
- controle irrestrito de NPCs;
- morte permanente;
- romance automático por lutar junto.
