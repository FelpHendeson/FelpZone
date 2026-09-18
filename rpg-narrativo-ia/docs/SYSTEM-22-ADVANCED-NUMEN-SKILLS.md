# Sistema 22 — Númen avançado, habilidades e execução

> **Estado:** implementado e consolidado nas Fatias 22.1 a 22.7 em 18 de setembro de 2026.

## Objetivo

Dar profundidade ao fortalecimento do personagem usando Eteris e Númen como leis do mundo. Habilidades deixam de ser apenas botões: possuem condições de ativação, preparação, custo, execução, recuperação e possibilidade de interrupção.

## Base canônica

- Eteris é a energia ambiental.
- Númen é Eteris interiorizado e individualizado por um ser vivo.
- Corpo e magia são aplicações diferentes do mesmo fundamento; o catálogo pode classificá-las sem criar dois motores incompatíveis.
- O Sistema pode ensinar métodos de treino e explicar requisitos, mas não cria poder sem uma fonte de progressão validada.

## Decisões confirmadas

- Habilidades são declaradas em dados e compostas por efeitos tipados.
- Uma ação pode possuir preparação, execução e recuperação medidas pelo relógio abstrato do combate, não por tempo real.
- Velocidade de execução ou conjuração modifica fases segundo uma regra declarada e limitada.
- Custos, recargas, condições de ativação, alvos e interrupções são validados pelo motor.
- Pessoas e criaturas usam o mesmo contrato de ação.
- O conteúdo decide quais habilidades existem; o motor não gera magias proceduralmente.

## Contrato conceitual

Uma definição de habilidade deve conseguir declarar classificação, origem energética, fases, custo, alvo, alcance abstrato, requisitos, condições de interrupção, recarga e efeitos. Modificadores só podem atuar sobre campos registrados e dentro de limites definidos.

O estado mutável contém reservas atuais, recargas e consequências persistentes necessárias. Canalização de preparação ocorre no relógio abstrato do combate e não é copiada para o save. O catálogo e as fórmulas não são copiados para o save.

A versão definitiva do schema é `schemaVersion: 16`. Saves v1–v15 migram com reserva de Númen cheia e sem recargas. A UI envia apenas o `actionId`; fases, custo, ordem e interrupção saem do motor.

## Integrações

- **Energetics, skills, training e mastery:** fonte dos conceitos e progressão existente.
- **Combate:** agenda e resolve ações.
- **Condições e elementos:** aplicam modificadores e consequências.
- **Equipamento e preparação:** concedem ou modificam capacidades válidas.
- **Jardim:** produz habilidades que obedecem ao mesmo contrato.
- **Sistema:** explica por que uma ação está disponível ou bloqueada.

## Primeiro ciclo jogável

O jogador escolhe entre uma ação física rápida e uma técnica de Númen mais lenta. Um inimigo pode interromper a preparação, enquanto uma melhoria de velocidade reduz a fase permitida sem produzir duração negativa ou ação gratuita.

## Fatias propostas

1. Contrato ampliado de ação e habilidade.
2. Reserva, custo, recarga e persistência.
3. Fases de preparação, execução e recuperação.
4. Velocidade, limites e interrupção determinística.
5. Integração com condições, equipamento, Jardim e IA inimiga.
6. Feedback mobile de linha temporal, custo e bloqueios.
7. Duelo vertical e testes de ordem, interrupção e recarga.

## Critérios de aceite

- A mesma habilidade produz o mesmo resultado com o mesmo estado e a mesma semente.
- Uma ação impossível não consome recurso nem altera parcialmente o combate.
- Modificadores nunca geram custo, fase ou recarga inválidos.
- A UI não calcula velocidade, dano, custo ou ordem.
- A IA inimiga escolhe apenas ações realmente disponíveis.
- Habilidades de pessoas e criaturas passam pelo mesmo executor.

## Fora do escopo inicial

- fórmulas definitivas de balanceamento;
- combate em tempo real;
- posicionamento em grade;
- criação livre de feitiços;
- efeitos JSON executáveis;
- combate coletivo, tratado no Sistema 23.
