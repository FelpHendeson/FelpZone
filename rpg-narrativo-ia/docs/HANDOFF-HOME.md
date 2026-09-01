# Continuação do projeto em outro computador

Este documento serve como contexto para abrir um novo chat de desenvolvimento depois de clonar ou atualizar o repositório em outra máquina.

## Estado no momento da passagem

- Repositório: `https://github.com/FelpHendeson/FelpZone.git`
- Branch: `main`
- Sistemas 1 a 6 estão implementados, testados e consolidados:
  - horário e data;
  - ciclo diário;
  - navegação hierárquica;
  - exploração e descobertas;
  - pontos de recurso e ecologia;
  - crafting, estruturas locais e cozinha.
- A Fatia 7.1 — estado integrado e persistência principal — está implementada: `GameState.sandbox` e migração de saves antigos.
- A Fatia 7.2 — orquestrador de ações e tempo — está implementada: `executeSandboxAction` aplica movimento, exploração, coleta e crafting sobre o `GameState`, com custo único, recuperação, renovação e reavaliações gratuitas. Não persiste e não altera a interface.
- A Fatia 7.3 — da introdução à exploração livre — está implementada: `schemaVersion: 3`, `narrativeSession` opcional, retorno à exploração depois da capacidade inicial e tela mínima. Os menus reais do sandbox ainda não.
- A Fatia 7.4 ainda não foi implementada. O Sistema 7 não está concluído.

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
cd FelpZone/rpg-narrativo-ia
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
- todos os arquivos em docs/, começando por PRODUCT.md, ARCHITECTURE.md, SANDBOX-FLOW.md, ROADMAP.md e SYSTEM-INTEGRATION.md;
- os módulos e testes relacionados à tarefa atual.

Estado conhecido:

- Sistemas 1 a 6 estão consolidados;
- a Fatia 7.1 persistiu o sandbox no GameState;
- a Fatia 7.2 orquestra movimento, exploração, coleta e crafting com aplicação única do tempo;
- a Fatia 7.3 devolve o jogador à exploração depois da capacidade inicial, com schema 3 e sessão narrativa opcional;
- a tela atual de exploração é mínima: sem destinos, explorar, coleta ou crafting;
- o Sistema 7 não está concluído.

Sua primeira tarefa é validar e revisar a Fatia 7.3 contra docs/SYSTEM-INTEGRATION.md.

Execute:

npm test
npm run lint
npm run typecheck
npm run build

Revise especialmente:

- schema 3 e NarrativeSession;
- migração v1/v2 → v3 sem gameplay e sem mutar o save antigo;
- retorno à exploração após choose-ability;
- preservação dos eventos posteriores e de first-priority como entrada adicional;
- bindSavedState aceitando exploração livre;
- compatibilidade com executeSandboxAction sem reabrir narrativa;
- tela mínima sem chamar o orquestrador.

Não corrija achados silenciosamente. Primeiro apresente a revisão com severidade e localização. Se houver problemas, prepare um prompt corretivo limitado à Fatia 7.3. Se não houver problemas, declare a Fatia 7.3 consolidada e então prepare, somente quando eu pedir, o prompt da Fatia 7.4 — superfície mobile.

Preserve o ciclo de trabalho:

especificar → implementar → testar → revisar → corrigir → consolidar → próxima etapa

Não faça push sem minha autorização. Preserve alterações existentes e mantenha a conversa em português do Brasil.
```

## Próxima decisão depois da revisão

Se a Fatia 7.3 passar sem achados, a próxima etapa autorizável é a Fatia 7.4 — superfície mobile, descrita em `docs/SYSTEM-INTEGRATION.md` e `docs/ROADMAP.md`. O Sistema 7 ainda não está implementado por completo.
