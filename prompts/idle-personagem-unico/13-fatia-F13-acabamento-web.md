# Fatia F13 — Acabamento web

> **Situação:** autorizada pelo autor em 24/11/2026 (F7 a F13 "sem parar"). A F12 já está na `main` (commit `a87880f`). Última fatia da web antes do port mobile (F14). Manter o relatório único.

## Contexto

Fontes de verdade: `docs/GDD.md` (§16 interface), `docs/ARQUITETURA.md` (§4 web, §8 segurança, §9 qualidade), `docs/CALIBRACAO.md`, `docs/DECISOES.md`. Leia o código da F0 a F12.

## Objetivo

Deixar o jogo pronto para ser usado no celular: **PWA** instalável que abre sem rede, **sons** opcionais, **arte** (ícone do app), **acessibilidade** (auditoria automática e correções), **balanceamento final** com o bot e **auditoria de ritmo e de segurança**.

## Entrega

1. PWA: manifesto, ícones (normal, maskable, Apple), service worker (interface em cache, API nunca).
2. Sons sintetizados (Web Audio), desligados por padrão, com preferência no aparelho.
3. Acessibilidade: axe-core em todas as telas, zero violações; "pular para o conteúdo"; foco visível; movimento reduzido.
4. Segurança: cabeçalhos (CSP e outros), revisão da API e do save, `docs/SEGURANCA.md`.
5. Ritmo: bot da cadeia completa usando os ralos de gold; leitura final em `docs/CALIBRACAO.md`.
6. Documentação e relatório (com o resumo do que fica para o autor).

## Fora do escopo

Arte desenhada à mão (ilustrações de monstros e personagens), trilha sonora, notificações push, port mobile (F14).
