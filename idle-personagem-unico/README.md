# Idle de Personagem Único (nome de trabalho)

Idle RPG em que o jogador **sorteia um único personagem** (raça, habilidade core e dons raros) e o acompanha para sempre. Você não controla as ações do personagem: escolhe **a atividade** que ele executa (treinar, coletar, produzir, aprender, combater) e **onde**. Ele trabalha sozinho, até 12 horas com o jogo fechado.

O jogo **não tem fim**: o conteúdo cresce por atualizações, e bots, torneios, rankings e temporadas dão objetivo de longo prazo.

**Versão publicada (acompanhamento a cada fatia):** [idle-personagem-unico.vercel.app](https://idle-personagem-unico.vercel.app/). Projeto Vercel `idle-personagem-unico`, diretório raiz `idle-personagem-unico/apps/web`, deploy automático a cada push na `main`.

> Projeto **novo**, independente do LionHearth (`idle-guilda`). Aproveita as boas ideias técnicas dele (motor em TS puro, simulação determinística, offline), mas é outro jogo.

## Estado atual

**F0 (Fundação) concluída.** Existe a base técnica, ainda **sem nenhuma regra de jogo**: workspace npm, motor com RNG, tempo, modificadores e save versionado, e um app web com as abas vazias. O design completo e o plano de construção estão em:

- **[GDD](docs/GDD.md)**: personagem, sorteio, status, atividades, combate, mapa, itens, forja, morte (O Limiar), missões, guilda, habilidades, pets, competição e interface.
- **[Origens](docs/ORIGENS.md)**: gerador de origem comum e 22 origens especiais com lore, efeito e gancho de história.
- **[Arquitetura](docs/ARQUITETURA.md)**: motor TS puro, web Next, API, banco, segurança e port mobile.
- **[Roadmap](docs/ROADMAP.md)**: fatias F0 a F14.
- **[Decisões](docs/DECISOES.md)**: o que o autor decidiu, o que é proposta e as perguntas abertas.

Prompts de implementação ficam em [`prompts/idle-personagem-unico/`](../prompts/idle-personagem-unico/README.md).

### O que a F0 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/rng.ts` | Gerador **sfc32** com semente (inteiro ou texto) e estado serializável; `inteiro`, `flutuante`, `escolhaPonderada`, `embaralhar`. |
| `packages/motor/src/tempo.ts` | Relógio injetável (`Relogio.agora()`), passo de **0,5 s**, limite offline de **12 h** (86.400 passos) e `calcularPassos(desde, ate)`. |
| `packages/motor/src/modificadores.ts` | Modelo único de modificadores (`somar`, `percentual`, `multiplicar`) e a composição `(base + Σsomar) × (1 + Σpercentual) × Πmultiplicar`. Sem conteúdo. |
| `packages/motor/src/save.ts` | Save com `versao`, tabela de migrações (vazia), limite de **512 KiB**, validação e rejeição de entrada malformada. `carregarSave` nunca lança: devolve estado ou erro. |
| `packages/motor/src/armazenamento.ts` | Interface `Armazenamento` (assíncrona, para servir também ao mobile), versão em memória e `salvarJogo`/`lerJogo`. |
| `apps/web` | Next (App Router), mobile-first: abas inferiores (Atividades, Combate, Mapa, Mochila, Missões, Personagem) e sub-abas do GDD §16, vazias. Cria, salva e carrega o estado vazio em `localStorage` pela interface `Armazenamento`; save inválido vira cópia em `idle-pu:save-invalido` e o jogo recomeça. |

O motor não importa React, Next, DOM nem módulos do Node, e não usa `Math.random`. Isso é garantido três vezes: `tsconfig` do motor sem tipos de DOM/Node, regras do ESLint e um teste que varre `packages/motor/src`.

### Versões escolhidas (23/11/2026)

| Pacote | Versão | Observação |
| --- | --- | --- |
| Node | ≥ 22.12 (CI usa 24) | Exigência do Vitest 5. |
| Next | 16.4.6 | |
| React / React DOM | 19.3.1 | |
| TypeScript | 6.0.3 | A 7.0 já saiu, mas o `typescript-eslint` só aceita até a 6.0. |
| ESLint | 9.39.5 | O 10 já saiu, mas os plugins do `eslint-config-next` ainda não o aceitam. |
| eslint-config-next | 16.4.6 | |
| typescript-eslint | 8.74.0 | Lint do motor. |
| Vitest | 5.1.1 | |

## Plataformas e stack (proposta)

| Camada | Escolha |
| --- | --- |
| Web | Next (App Router), mobile-first, PWA |
| Mobile | Expo (React Native), **depois** da web completa |
| API | TypeScript/Node, rotas do Next em `/api/v1` (Vercel) |
| Banco | Postgres (Neon) + Redis (Upstash); banco só a partir da F9; antes disso, save local |
| Motor | `packages/motor`, TS puro e determinístico, compartilhado por web, API e mobile |

## Como executar

Na pasta do projeto:

```bash
cd idle-personagem-unico
npm install
npm run dev        # app web em http://localhost:3000
```

Verificações (as mesmas do CI, job `idle-personagem-unico` em `.github/workflows/quality.yml`):

```bash
npm audit --audit-level=high
npm test           # Vitest no motor e na web
npm run lint       # ESLint (motor com regras de pureza; web com eslint-config-next)
npm run typecheck  # tsc no motor (código e testes) e na web
npm run build      # build de produção do Next
```

Não há variáveis de ambiente nem `.env` nesta fatia.

## Próximo passo

A **F1 (Sorteio do personagem)** só começa com autorização do autor.
