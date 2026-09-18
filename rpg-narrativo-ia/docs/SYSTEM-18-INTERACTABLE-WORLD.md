# Sistema 18 — Cenário interativo e pontos de interesse

> **Estado:** implementado e consolidado nas Fatias 18.1 a 18.7 em 17 de setembro de 2026.

## Objetivo

Fazer cada local parecer um espaço habitável, e não apenas um menu de exploração. O jogador deve descobrir, examinar e manipular elementos do cenário que podem revelar informações, passagens, recursos ou acontecimentos.

## Decisões confirmadas

- Um ponto de interesse é diferente de um recurso coletável, uma presença e uma estrutura construída.
- O conteúdo vive no pack e referencia um local existente.
- Ações disponíveis dependem de descoberta, estado, itens, habilidades, horário e outros requisitos declarativos.
- O JSON descreve dados e efeitos tipados; não contém scripts.
- Um objeto pode mudar de estágio, ser resolvido, revelar uma passagem ou disparar narrativa.
- Segredos não aparecem na interface antes da descoberta explícita.

## Contrato conceitual

O catálogo deve conseguir expressar:

- `interactableId`, local e apresentação;
- estágios possíveis do objeto;
- regras de descoberta e visibilidade;
- ações por estágio;
- requisitos, custo temporal e efeitos permitidos;
- consequências narrativas ou desbloqueios referenciados por ID.

A versão definitiva do schema é `schemaVersion: 12`. Saves v1–v11 migram com lista vazia de objetos, sem conceder descobertas.

## Integrações

- **Exploração:** descobre o objeto.
- **Navegação:** uma ação pode revelar uma passagem já declarada no mapa.
- **Itens e preparação:** ferramentas podem habilitar ações.
- **Tempo e necessidades:** uma interação cobra um único custo por meio do orquestrador.
- **Narrativa e objetivos:** a resolução pode emitir fatos tipados.
- **Recursos e crafting:** um objeto pode revelar um nó; não substitui a coleta.

## Primeiro ciclo jogável

Na Grande Árvore, o jogador descobre marcas no tronco, examina-as e, caso cumpra o requisito apropriado, revela uma passagem ou pista. A interação altera o estado do objeto e permanece após recarregar a partida.

## Fatias propostas

1. Catálogo, tipos, validação e índices imutáveis.
2. Estado mínimo, migração e persistência.
3. Descoberta integrada à exploração.
4. Executor atômico de ações e efeitos permitidos.
5. Integração com passagens, itens, fatos e objetivos.
6. Painel mobile do local com descrição e ações contextuais.
7. Conteúdo vertical da Grande Árvore e testes de jornada.

## Critérios de aceite

- Conteúdo inválido falha na composição do pack.
- A UI não consegue inventar custo, efeito ou estágio.
- Uma ação inválida não altera parcialmente o mundo.
- Estado secreto não vaza por rótulos, contadores ou erros.
- O ciclo completo sobrevive a salvar e carregar.
- O motor aceita outros objetos sem código específico para a Grande Árvore.

## Fora do escopo inicial

- física ou movimentação livre;
- quebra-cabeças procedurais;
- minijogos gráficos;
- construção de estruturas;
- recursos coletáveis disfarçados de pontos de interesse.
