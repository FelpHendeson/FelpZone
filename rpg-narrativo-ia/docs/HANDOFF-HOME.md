# Continuação do projeto em outro computador

Este documento serve como contexto para abrir um novo chat de desenvolvimento depois de clonar ou atualizar o repositório em outra máquina.

## Estado no momento da passagem

- Repositório: `https://github.com/FelpHendeson/FelpZone.git`
- Branch: `main`
- Sistemas 1 a 5 foram implementados, revisados e consolidados:
  - horário e data;
  - ciclo diário;
  - navegação hierárquica;
  - exploração e descobertas;
  - pontos de recurso e ecologia.
- O Sistema 6 — crafting, estruturas locais e cozinha — está implementado de forma isolada. Não integrar ainda à interface, ao save global ou ao loop completo do jogo.
- O Sistema 7 — integração explorável — ainda não foi implementado.

## Como preparar a máquina

```bash
git clone https://github.com/FelpHendeson/FelpZone.git
cd FelpZone/rpg-narrativo-ia
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

Se o repositório já existir:

```bash
git pull --ff-only
cd rpg-narrativo-ia
npm install
```

## Prompt para o novo chat

Copie o texto abaixo para o novo chat aberto na pasta `rpg-narrativo-ia`:

```text
Estamos continuando o projeto Reset — RPG Narrativo Modular, disponível em:

https://github.com/FelpHendeson/FelpZone.git

Trabalhe dentro da pasta rpg-narrativo-ia deste clone local.

O projeto é um RPG narrativo sandbox mobile-first feito com React, TypeScript e Vite. A IA participa apenas da criação e manutenção do projeto; o jogo não chama APIs de IA, não possui backend, login ou custo operacional inicial.

Premissa resumida:

A existência passou por um Reset. Os planetas cresceram, a geografia foi refeita, os vestígios materiais da civilização desapareceram e os humanos foram espalhados pelo mundo com poderes e acesso a um Sistema. O jogador é um jovem que acabou de atingir a maioridade, desperta sozinho e precisa explorar, sobreviver e construir sua trajetória nesse novo mundo.

Direção de produto:

- depois da introdução narrativa, o jogador deve ficar livre em um mundo navegável;
- narrativa e escolhas aparecem por encontros, descobertas, interações e gatilhos;
- os sistemas são construídos e consolidados separadamente antes da integração;
- a experiência prioriza celular;
- imagens finais ainda são placeholders;
- não expandir o escopo sem autorização explícita.

Antes de agir, leia integralmente:

- AGENTS.md
- README.md
- todos os arquivos em docs/, começando por PRODUCT.md, ARCHITECTURE.md, SANDBOX-FLOW.md e ROADMAP.md;
- os módulos e testes relacionados à tarefa atual.

Estado conhecido:

- Sistemas 1 a 5 estão consolidados: horário/data, ciclo diário, navegação, exploração e recursos;
- o Sistema 6 — crafting, estruturas locais e cozinha — está implementado de forma isolada;
- crafting ainda não entra na interface, no save global nem no loop completo do jogo;
- o Sistema 7 ainda não foi implementado.

Sua primeira tarefa é validar e revisar o Sistema 6 contra docs/SYSTEM-CRAFTING.md.

Execute:

npm test
npm run lint
npm run typecheck
npm run build

Revise especialmente:

- receitas conhecidas e descoberta por flags, sem avançar o tempo;
- execução atômica: falha não consome, não produz e não cria estrutura parcial;
- fogueira única por local, ativa ao construir, sem consumo de combustível nesta etapa;
- cozinha exigindo tag cooking e estação ativa no currentLocationId;
- consulta de disponibilidade sem mutação;
- persistência isolada do CraftingState;
- imutabilidade de estado, inventário, navegação, GameState e definições;
- ausência de UI, save principal, advanceTime e integração ao schema global.

Não corrija achados silenciosamente. Primeiro apresente a revisão com severidade e localização. Se houver problemas, prepare um prompt corretivo limitado ao Sistema 6. Se não houver problemas, declare o Sistema 6 consolidado e então prepare, somente quando eu pedir, o prompt do Sistema 7 — integração explorável.

Preserve o ciclo de trabalho:

especificar → implementar → testar → revisar → corrigir → consolidar → próxima etapa

Não faça push sem minha autorização. Preserve alterações existentes e mantenha a conversa em português do Brasil.
```

## Próxima decisão depois da revisão

Se o Sistema 6 passar sem achados, a próxima etapa autorizável é o Sistema 7 — integração explorável, definida em `docs/ROADMAP.md`. Essa etapa deve conectar tempo, navegação, exploração, recursos, crafting, persistência e interface em um fluxo jogável. O Sistema 7 ainda não está implementado.
