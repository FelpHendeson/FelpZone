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
- A Fatia 7.2 — orquestrador de ações e tempo — está implementada: `executeSandboxAction` aplica movimento, exploração, coleta e crafting sobre o `GameState`, com custo único, recuperação, renovação e reavaliações gratuitas. Não persiste.
- A Fatia 7.3 — da introdução à exploração livre — está implementada: `schemaVersion: 3`, `narrativeSession` opcional e retorno à exploração depois da capacidade inicial.
- A Fatia 7.4 — superfície mobile — está implementada: destinos, explorar, coletar e fabricar na tela de exploração, via `executeSandboxAction` e o mesmo `SandboxContext` da persistência.
- A Fatia 7.5 — gatilho de mundo e primeiro encontro — está implementada: explorar a Clareira revela `first-priority-event`, abre `first-priority` e devolve o jogador ao sandbox depois da noite. O consumo fica em `GameState.flags`.
- O marco mínimo do Sistema 7 foi atingido. Não há Sistema 8 aprovado. Encontrar e interagir com NPCs e criaturas é uma direção confirmada; a forma técnica dos sistemas seguintes ainda precisa ser discutida.
- `docs/PROJECT-STATUS.md` é a fonte principal para separar decisões do autor, protótipos, temas em discussão e hipóteses dos agentes.

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
- todos os arquivos em docs/, começando por PROJECT-STATUS.md, PRODUCT.md, ARCHITECTURE.md, SANDBOX-FLOW.md, ROADMAP.md e SYSTEM-INTEGRATION.md;
- os módulos e testes relacionados à tarefa atual.

Estado conhecido:

- Sistemas 1 a 6 estão consolidados;
- a Fatia 7.1 persistiu o sandbox no GameState;
- a Fatia 7.2 orquestra movimento, exploração, coleta e crafting com aplicação única do tempo;
- a Fatia 7.3 devolve o jogador à exploração depois da capacidade inicial, com schema 3 e sessão narrativa opcional;
- a Fatia 7.4 expõe destinos, explorar, coletar e fabricar na superfície mobile;
- a Fatia 7.5 abre o primeiro encontro pelo gatilho de descoberta `first-priority-event` e devolve o jogador ao sandbox;
- o marco mínimo do Sistema 7 foi atingido;
- não há Sistema 8 aprovado;
- presença e interação com NPCs e criaturas são metas definidas pelo autor;
- persistência própria, agendas, comportamento autônomo, sobrevivência e combate ainda não foram discutidos nem autorizados.

Sua primeira tarefa é verificar o estado do repositório e usar docs/PROJECT-STATUS.md para recapitular ao autor o que está implementado, o que está em discussão e o que ainda não foi decidido. Não proponha uma solução técnica como requisito aprovado.

Execute:

npm test
npm run lint
npm run typecheck
npm run build

Se precisar rever a Fatia 7.5, confira especialmente:

- descoberta `event` declarativa, sem hardcode de limiar na UI;
- catálogo de gatilhos validado (IDs únicos, descoberta e evento existentes, `canStartSession`, sem ambiguidade);
- `startNarrativeSession` puro: sem avanço de tempo, sem mutar sandbox/inventário/`updatedAt`;
- consumo em `world.trigger.<id>.consumed` e composição atômica ação → gatilho → uma persistência;
- retorno de `night-together` / `night-alone` à exploração, com saves `completed` legados preservados;
- o encontro não se repete; saves da Fatia 7.4 com descoberta revelada disparam na próxima ação válida.

Não corrija achados silenciosamente. Primeiro apresente a revisão com severidade e localização. Não numere, especifique nem implemente um novo sistema até o autor discutir o resultado desejado e autorizar a documentação da etapa.

Preserve o ciclo de trabalho:

especificar → implementar → testar → revisar → corrigir → consolidar → próxima etapa

Não faça push sem minha autorização. Preserve alterações existentes e mantenha a conversa em português do Brasil.
```

## Próxima decisão depois da revisão

O marco mínimo do Sistema 7 já foi atingido, mas não há próxima etapa autorizada. A conversa deve escolher qual problema de diversão ou imersão resolver. Encontrar e interagir com NPCs e criaturas é uma direção confirmada; `NPCState` persistente, agenda, movimentação, comportamento de criatura e combate são apenas possibilidades até nova decisão do autor.
