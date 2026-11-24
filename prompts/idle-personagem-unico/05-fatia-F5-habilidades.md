# Fatia F5 — Habilidades e core

> **Situação:** autorizada pelo autor em 24/11/2026 ("Pode seguir"). A F4 já está na `main` (commit `84edc9b`). Manter o relatório único `idle-personagem-unico/RELATORIO-idle-personagem-unico.md` com a seção da F5.

## Contexto

Fontes de verdade: `docs/GDD.md` (§3.2, §3.3, §6.4, §7, §12), `docs/ARQUITETURA.md`, `docs/DECISOES.md`, `docs/CALIBRACAO.md`, `docs/ROADMAP.md` e as regras em `.cursor/rules/`. Leia o código da F0 a F4.

## Regras de execução

As mesmas das fatias anteriores (só `idle-personagem-unico/`; direto na `main` com push; CI verde e Vercel `READY`; TypeScript `strict`; português; motor puro e determinístico; conteúdo como dado; efeitos pelo modelo único de modificadores; números [Calibrar] registrados).

## Objetivo

Habilidades com os **quatro eixos** do GDD §12 (natureza, modo, duração, escopo), **slots** (5 ativas; passivas começam em 3 e crescem com o nível), **ativas automáticas** no combate (prioridade + recarga, curas só quando precisam, como no LionHearth), **passivas** que afetam combate, coleta e viagem, **maestria** com **evolução** em marcos, a atividade de **Aprendizado** e o **core abrindo ramos**.

## Entrega

1. **Conteúdo:** as técnicas dos 12 cores (escritas como texto na F1) viram habilidades com efeito; cada core ganha **2 ramos** (direções), cada um com uma técnica nova, escolhidos a partir do nível 10; **livros** de habilidades gerais (combate, coleta, viagem) vendidos no Mercado e deixados por monstros raros e chefes.
2. **Regras:** slots e equipar/desequipar com prioridade; ativas no combate (golpe, cura, reforço, enfraquecimento, atordoamento) com recarga e estado no save; passivas e auras como modificadores; maestria por uso e pela atividade de Aprendizado; evolução em estágios (I, II, III); escolha de ramo; ler livro.
3. **Efeitos que passam a valer:** Adaptável (Humano, +XP de maestria) e o que as técnicas descrevem quando o sistema já existe. O que depende de produção (F8) ou de pets (F10) continua pendente.
4. **Save v6** com migração v5 → v6 (personagem conhece as técnicas do próprio core, já equipadas).
5. **Web:** Personagem → Habilidades (conhecidas, maestria, slots, prioridade, ramos); Atividades → Aprendizado; livros no Mercado; resumo e barra com o que mudou.
6. **Bot de ritmo** da maestria e do ganho das habilidades no combate e na coleta; testes; documentação e relatório.

## Fora do escopo

Elementos e resistências; habilidades de produção funcionando (F8); de pets (F10); de dia/noite (F11); mestres NPC e habilidades da guilda (F7); O Limiar (F6).

## Critérios de pronto

Os mesmos das fatias anteriores, mais: habilidades de coleta afetam a coleta; o core abre ramos; ativas disparam sozinhas no combate, também offline, com resultado igual ao dividir o tempo; migração v5 → v6 com save real.
