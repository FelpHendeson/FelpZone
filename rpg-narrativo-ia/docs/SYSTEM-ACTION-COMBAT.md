# Sistema 12 — Banco de ações e combate

## Estado da decisão

**Aprovado pelo autor em 15 de setembro de 2026 e implementado nas Fatias 12.1 a 12.7 (autorização explícita para desenvolvimento contínuo do próximo sistema, do início ao fim).**

O núcleo descrito aqui está consolidado. As integrações complementares de descoberta, saúde persistente, tempo e apresentação foram posteriormente definidas nas Fatias 12.8 a 12.12 e estão **especificadas, mas ainda não implementadas**, em [Consolidação do Sistema 12](SYSTEM-12-CONSOLIDATION.md).

Este documento especifica e registra o eixo de combate preparado pela ponte da Fatia 11.7. O combate reutiliza os contratos públicos do Sistema 11 (definições de habilidade, progressão e o molde declarativo de ação com custo e efeitos) sem acessar internos daqueles módulos.

Números, nomes, custos e conteúdo de ações e combatentes são **protótipos** e não são cânone. Balanceamento definitivo, posicionamento, iniciativa por frações de turno, condições de status ricas, grupos e controle de aliados permanecem fora do escopo.

## Problema de diversão e imersão

O protótipo já permite explorar, sobreviver, fabricar, seguir jornadas e desenvolver o próprio poder pelo Sistema. Faltava um momento em que esse poder é testado contra uma ameaça: um confronto com regras claras, decisões táticas e consequências perceptíveis que devolvem o jogador à exploração.

O Sistema 12 cria esse momento:

```text
o mundo apresenta uma ameaça
          ↓
o jogador decide enfrentar, e o combate assume o controle
          ↓
jogador e oponente encadeiam ações declarativas
          ↓
o motor resolve o turno por velocidade e efeitos, de forma determinística
          ↓
vitória, derrota ou fuga geram consequências
          ↓
o controle retorna à exploração
```

## O combate é diegético e determinístico

- O combate é resolvido pelo motor local, determinístico e sem IA generativa em runtime.
- Nenhum oponente é assumido como "monstro": pessoas, criaturas e o personagem compartilham o mesmo contrato de combatente e apenas diferem por conteúdo.
- As decisões do oponente são baseadas em regras validadas e reproduzíveis.
- A interface apresenta o combate como um confronto compreensível; os efeitos são explicados.

## Reuso do Sistema 11

- Uma ação de combate pode declarar `skillId`. Ações com `skillId` só ficam disponíveis para o personagem quando a habilidade correspondente é conhecida na progressão do Sistema 11.
- Assim, treinar e revelar habilidades (Sistema 11) amplia o leque tático do combate (Sistema 12), conectando os dois eixos sem acoplar seus internos.

## Modelo de combate

### Banco de ações declarativo

Uma ação declara identidade, velocidade de execução, alvo e efeitos declarativos:

- `speed`: quem tem maior velocidade age primeiro no turno; empate favorece o jogador.
- `target`: `opponent` (dano) ou `self` (defesa/cura).
- efeitos declarativos fechados: `damage`, `heal`, `guard` (escudo que absorve dano).
- `skillId` opcional liga a ação a uma habilidade conhecida.

### Combatentes

Um combatente tem identidade, vida máxima e atual, escudo e o conjunto de ações que pode usar. O jogador recebe ações base mais as ações liberadas por habilidades conhecidas; oponentes vêm de modelos de conteúdo.

### Resolução de turno

A cada turno o jogador escolhe uma ação (ou fugir) e o oponente escolhe pela IA determinística. As ações são ordenadas por velocidade e aplicadas em sequência; um combatente derrotado no turno não age. Ao final do turno o motor calcula o desfecho: `ongoing`, `victory`, `defeat` ou `fled`.

### Consequências

O desfecho gera efeitos declarativos aplicados ao `GameState` pelos mecanismos existentes: vitória registra uma flag de encontro resolvido e uma pequena recompensa; derrota cobra vitalidade; fuga não deixa marca. O combate não altera o schema: o estado de combate é transitório na sessão e só o desfecho persiste, via flags e atributos.

## Fronteiras conceituais

- **`combat` (motor):** cataloga ações, combatentes e encontros; cria o estado de combate; resolve turnos; decide a ação do oponente; deriva o desfecho e seus efeitos. Funções puras, determinísticas e validadas nas fronteiras. Não contém React.
- **interface de combate:** apresenta vida, escudo, ações e o registro do turno; envia a intenção do jogador ao motor.
- **integração:** o mundo oferece encontros; ao vencer/perder/fugir, os efeitos do desfecho entram no `GameState` e o controle volta à exploração.

## Sequência de fatias

### Fatia 12.1 — Vocabulário e catálogos isolados

**Implementada.** Contratos e catálogos protótipo de ações, combatentes e encontros, com validação profunda, índices imutáveis, cópias defensivas e resolução de referências. Não altera `GameState`, schema, relógio ou UI.

### Fatia 12.2 — Estado de combate e resolução de turno

**Implementada.** Criação do estado de combate, ações disponíveis do jogador (incluindo as liberadas por habilidades conhecidas), aplicação determinística de efeitos por velocidade, escudo que absorve dano, fuga e cálculo do desfecho. Motor puro, sem integração.

### Fatia 12.3 — IA de oponente determinística

**Implementada.** Seleção de ação do oponente por regras reproduzíveis (curar-se quando muito ferido, senão o maior dano disponível, senão defender), sem aleatoriedade nem IA generativa.

### Fatia 12.4 — Integração com o mundo e consequências

**Implementada.** Encontros são derivados por local e filtrados por encontros já resolvidos; o desfecho é convertido em efeitos declarativos aplicados ao `GameState`. Sem alteração de schema.

### Fatia 12.5 — Interface mobile de combate

**Implementada.** Tela de combate a partir de 320 px com barras de vida, escudo, ações compreensíveis com efeito e velocidade, registro do turno e desfecho com retorno ao sandbox.

### Fatia 12.6 — Encontro jogável ponta a ponta

**Implementada.** Um encontro protótipo é acessível no mundo, enfrentado por turnos até a vitória, derrota ou fuga, com consequência perceptível e retorno à exploração — provado por teste e por validação visual.

### Fatia 12.7 — Consolidação

**Implementada.** Bateria de invariantes: determinismo, atomicidade das consequências, imutabilidade dos catálogos, ausência de vazamento e gates verdes.

## Critérios de aceite

- o combate é determinístico e local, sem IA generativa;
- pessoas e criaturas compartilham o contrato de combatente; inimigo não é sinônimo de monstro;
- habilidades conhecidas do Sistema 11 ampliam as ações disponíveis;
- turnos resolvem por velocidade e efeitos declarativos, com fuga possível;
- o desfecho gera consequências no `GameState` sem alterar o schema;
- a interface funciona a partir de 320 px e explica os efeitos;
- testes, lint, tipos e build/PWA passam.

## Fora do Sistema 12

- posicionamento, distância, iniciativa por frações de turno e duração contínua de ações;
- condições de status ricas (veneno, atordoamento etc.) além de escudo, dano e cura;
- grupos, aliados controláveis e múltiplos oponentes simultâneos;
- balanceamento definitivo, fórmulas de atributos e curvas;
- itens, equipamentos, durabilidade e recompensas complexas;
- morte permanente ou perda de save;
- IA generativa, backend ou serviços pagos.
