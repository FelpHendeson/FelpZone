# Fatia F12 — Competição

> **Situação:** autorizada pelo autor em 24/11/2026 (F7 a F13 "sem parar"). A F11 já está na `main` (commit `b74e221`). Manter o relatório único.

## Contexto

Fontes de verdade: `docs/GDD.md` (§15 competição), `docs/ARQUITETURA.md` (§7 competição e infraestrutura), `docs/DECISOES.md`, `docs/CALIBRACAO.md`. Leia o código da F0 a F11.

## Objetivo

Objetivo de longo prazo sem tempo real: **Campo de Provas**, **Arena assíncrona** com **bots por arquétipo**, **torneio semanal** em chave e **temporadas** de 8 semanas com tema, ranking e uma relíquia nomeada. Tudo reproduzível pela semente (replays).

## Restrição

Sem banco ativo (F9), a Arena roda no motor contra bots e o ranking mostra o jogador entre bots. Com banco, jogadores registram o build e outros podem testá-lo no Campo de Provas. Lotes no servidor (cron) ficam para quando houver banco e decisão de infraestrutura.

## Entrega

1. Motor: retrato do personagem, duelo determinístico (passos de 0,5 s, até 2 min, técnicas, crítico, esquiva, tema), bots por arquétipo, Campo de Provas, calendário (semana, temporada, tema), torneio de 16 e ranking.
2. Ações: lutar na Arena (10 por dia, Elo, pontos, gold, replays), inscrever-se e resgatar o torneio; relíquia do tema por pontos. Save v13.
3. API: registrar e listar builds (com banco; 503 sem).
4. Web: Combate → Arena, Provas e Torneio.
5. Bot; testes; documentação e relatório.

## Fora do escopo

Arena contra builds de outros jogadores com ranking global (precisa de banco e de lote no servidor); cosméticos de temporada.
