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
- A Fatia 7.3 — da introdução à exploração livre — está implementada: `narrativeSession` opcional e retorno à exploração depois da capacidade inicial.
- A Fatia 7.4 — superfície mobile — está implementada: destinos, explorar, coletar e fabricar na tela de exploração, via `executeSandboxAction` e o mesmo `SandboxContext` da persistência.
- A Fatia 7.5 — gatilho de mundo e primeiro encontro — está implementada: explorar a Clareira revela `first-priority-event`, abre `first-priority` e devolve o jogador ao sandbox depois da noite. O consumo fica em `GameState.flags`.
- O marco mínimo do Sistema 7 foi atingido.
- A Fatia 8.1 — catálogo e estado isolado de presenças — está implementada em `modules/presences`.
- A Fatia 8.2 — sincronização com descobertas — está implementada: operação pura e consulta de presenças conhecidas.
- A Fatia 8.3 — interações dirigidas por dados — está implementada: catálogo, consulta e planejamento puro.
- A Fatia 8.4 — estado integrado, save e orquestração — está implementada: `sandbox.presences`, `schemaVersion: 4`, migração v1/v2/v3 e `presence.interact` atômico. O gatilho da 7.5 permanece, mas conversar e o gatilho se excluem para não reabrir `first-priority`. Sem UI de presenças.
- As Fatias 8.5 e 8.6 continuam aguardando autorização. Agenda, comportamento autônomo, sobrevivência e combate não estão aprovados para implementação.
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
- todos os arquivos em docs/, começando por PROJECT-STATUS.md, SYSTEM-PRESENCES.md, PRODUCT.md, ARCHITECTURE.md, SANDBOX-FLOW.md, ROADMAP.md e SYSTEM-INTEGRATION.md;
- os módulos e testes relacionados à tarefa atual.

Estado conhecido:

- Sistemas 1 a 6 estão consolidados;
- a Fatia 7.1 persistiu o sandbox no GameState;
- a Fatia 7.2 orquestra movimento, exploração, coleta e crafting com aplicação única do tempo;
- a Fatia 7.3 devolve o jogador à exploração depois da capacidade inicial, com sessão narrativa opcional;
- a Fatia 7.4 expõe destinos, explorar, coletar e fabricar na superfície mobile;
- a Fatia 7.5 abre o primeiro encontro pelo gatilho de descoberta `first-priority-event` e devolve o jogador ao sandbox;
- o marco mínimo do Sistema 7 foi atingido;
- a Fatia 8.1 isolou o catálogo e o estado de presenças em `modules/presences`;
- a Fatia 8.2 sincroniza descobertas reveladas com presenças conhecidas;
- a Fatia 8.3 planeja interações dirigidas por dados;
- a Fatia 8.4 persiste `sandbox.presences` no schema 4 e executa `presence.interact` no orquestrador;
- as Fatias 8.5 e 8.6 continuam aguardando autorização;
- presença e interação com NPCs e criaturas são metas definidas pelo autor;
- o estado mínimo de ocorrências descobertas e resolvidas foi aprovado no Sistema 8;
- `NPCState` completo, agendas, comportamento autônomo, sobrevivência e combate continuam sem implementação autorizada.

Sua primeira tarefa é validar e revisar a Fatia 8.4 contra docs/SYSTEM-PRESENCES.md.

Execute:

npm test
npm run lint
npm run typecheck
npm run build

Revise especialmente:

- `PresenceState` persistido em `sandbox.presences` com schema 4;
- migração v1/v2/v3 sem regravar `localStorage` e sem inventar resoluções;
- `presence.interact` atômico, com custo único e abertura de narrativa só quando o plano declarar;
- falha não altera nem persiste estado parcial;
- o gatilho da Fatia 7.5 permanece;
- a UI ainda não expõe presenças.

Não corrija achados silenciosamente. Primeiro apresente a revisão com severidade e localização. Se houver problemas, prepare um prompt corretivo limitado à Fatia 8.4. Se não houver problemas, declare a Fatia 8.4 consolidada e então prepare, somente quando eu pedir, o recorte da Fatia 8.5.

Preserve o ciclo de trabalho:

especificar → implementar → testar → revisar → corrigir → consolidar → próxima etapa

Não faça push sem minha autorização. Preserve alterações existentes e mantenha a conversa em português do Brasil.
```

## Próxima decisão depois da Fatia 8.4

Revisar e corrigir a integração de estado, save e orquestração. A Fatia 8.5 só começa depois da consolidação e de nova autorização do autor. `NPCState` completo, agenda, movimentação autônoma, comportamento de criatura e combate permanecem fora do Sistema 8 aprovado.
