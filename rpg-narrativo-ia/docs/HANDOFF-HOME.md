# Continuação do projeto em outro computador

Este documento serve como contexto para abrir um novo chat de desenvolvimento depois de clonar ou atualizar o repositório em outra máquina.

## Estado no momento da passagem

- Repositório: `https://github.com/FelpHendeson/FelpZone.git`
- Branch: `main`
- Último commit observado: `77d83fe feat: add deterministic resource nodes and ecology`
- Sistemas 1 a 4 foram implementados, revisados e consolidados:
  - horário e data;
  - ciclo diário;
  - navegação hierárquica;
  - exploração e descobertas.
- O Sistema 5 — pontos de recurso e ecologia — está implementado e commitado, mas ainda precisa passar pela revisão independente do novo chat antes de ser considerado consolidado.
- O Sistema 6 — crafting e cozinha — está apenas especificado. Não começar sua implementação antes de validar e, se necessário, corrigir o Sistema 5.

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

- Sistemas 1 a 4 estão consolidados: horário/data, ciclo diário, navegação e exploração;
- o Sistema 5 — pontos de recurso e ecologia — foi implementado no commit 77d83fe;
- a implementação relata 186 testes, mas ainda não passou pela revisão independente deste novo chat;
- crafting, cozinha e integração visual ainda não devem ser implementados.

Sua primeira tarefa é validar e revisar o Sistema 5 contra docs/SYSTEM-RESOURCES.md.

Use o Bugbot para revisar as alterações do Sistema 5 e execute:

npm test
npm run lint
npm run typecheck
npm run build

Revise especialmente:

- coleta atômica e segurança das quantidades do inventário;
- exigência da descoberta correta e da localização atual;
- renovação none, short e long baseada somente no relógio do jogo;
- idempotência ao restaurar ou sincronizar no mesmo horário;
- recuperação populacional exclusivamente por day.started;
- replay de eventos sem recuperação duplicada;
- saltos de vários dias;
- thresholds e estados abundant, stable, declining, threatened e exhausted;
- pressão populacional e extinção local;
- pontos diferentes compartilhando a mesma população;
- imutabilidade de estado, definições, condições e inventário;
- proteção contra overflow de inteiros;
- roundtrip JSON;
- ausência de crafting, combate, ferramentas, UI e integração ao save principal.

Não corrija achados silenciosamente. Primeiro apresente a revisão com severidade e localização. Se houver problemas, prepare um prompt corretivo limitado ao Sistema 5. Se não houver problemas, declare o Sistema 5 consolidado e então prepare, somente quando eu pedir, o prompt do Sistema 6 — crafting e cozinha.

Preserve o ciclo de trabalho:

especificar → implementar → testar → revisar → corrigir → consolidar → próxima etapa

Não faça push sem minha autorização. Preserve alterações existentes e mantenha a conversa em português do Brasil.
```

## Próxima decisão depois da revisão

Se o Sistema 5 passar sem achados, a próxima etapa autorizável é o Sistema 6 — crafting e cozinha, definido em `docs/SYSTEM-CRAFTING.md`. Depois dele ainda haverá uma etapa separada para integrar tempo, navegação, exploração, recursos, crafting, persistência e interface em um fluxo jogável.
