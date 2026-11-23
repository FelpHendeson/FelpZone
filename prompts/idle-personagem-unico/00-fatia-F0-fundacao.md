# Fatia F0 — Fundação

> **Situação:** **autorizada pelo autor em 23/11/2026.** Execute somente esta fatia.

## Contexto

Projeto `idle-personagem-unico`: idle RPG de personagem único sorteado, uma atividade por vez. Leia antes: `idle-personagem-unico/README.md`, `docs/GDD.md`, `docs/ARQUITETURA.md`, `docs/DECISOES.md`, `docs/ROADMAP.md` e `.cursor/rules/idle-personagem-unico.mdc`.

## Regras de execução

- Leia `.cursor/rules/felpzone.mdc` e `.cursor/rules/idle-personagem-unico.mdc` antes de começar.
- Trabalhe somente dentro de `idle-personagem-unico/` (e do job de CI). **Não altere outros projetos.**
- TypeScript em modo `strict`. Dependências na versão estável mais recente compatível; registre no README as versões escolhidas.
- Textos de interface em português do Brasil.
- Nada de `Math.random` no motor, nem em testes de regra (use o RNG com semente).
- Faça um commit pequeno ao final, no estilo do repositório (`feat(idle-personagem-unico): ...`), **sem push**, a menos que o autor peça.

## Objetivo

Criar a base técnica **sem nenhuma regra de jogo ainda**, para que as próximas fatias encaixem sem retrabalho.

## Entrega

1. **Workspace npm** em `idle-personagem-unico/` com `packages/motor` e `apps/web`.
2. **`packages/motor`** (TypeScript puro, sem DOM e sem APIs do Node):
   - `rng.ts`: gerador determinístico com semente (por exemplo, `mulberry32` ou `sfc32`), com estado serializável; funções para inteiro, ponto flutuante, escolha ponderada e *shuffle*.
   - `tempo.ts`: relógio injetável (`agora()`), constantes de passo (0,5 s), limite offline de **12 h** e função que calcula passos entre dois instantes.
   - `modificadores.ts`: tipo base do modelo único de modificadores e função de composição (sem conteúdo ainda).
   - `save.ts`: serialização, **campo `versao`**, tabela de migrações (vazia, com um teste de migração fictícia), validação de tamanho máximo e rejeição de entrada malformada.
   - `index.ts`: API pública.
3. **`apps/web`** (Next, App Router, mobile-first): shell com **abas inferiores** (Atividades, Combate, Mapa, Mochila, Missões, Personagem) e **sub-abas no topo** vazias; sem regras de jogo; salva e carrega um estado vazio pelo `save.ts` em `localStorage` atrás de uma interface `Armazenamento`.
4. **Testes (Vitest)** para: determinismo do RNG (mesma semente, mesma sequência; estado serializado retoma a sequência), limite de 12 h, migração de save, rejeição de save inválido/grande.
5. **CI**: job em `.github/workflows/quality.yml` para o projeto (audit → test → lint → typecheck → build), no padrão dos outros.
6. `README.md` do projeto atualizado com comandos reais e estado.

## Fora do escopo

Raças, cores, sorteio, atividades, combate, mapa, itens, API, banco, conta, mobile, arte. **Não antecipe a F1.**

## Critérios de pronto

- `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` passam na raiz do projeto.
- O motor **não importa** `react`, `next`, `window`, `document` nem módulos do Node.
- Nenhum segredo ou `.env` versionado; `.env.example` só se necessário, com valores fictícios.
- Relatório final com o que foi validado e o que ficou de fora, e confirmação de que nada fora de `idle-personagem-unico/` (e do job de CI) foi alterado.
