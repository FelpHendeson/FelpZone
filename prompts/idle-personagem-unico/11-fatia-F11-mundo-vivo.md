# Fatia F11 — Mundo vivo

> **Situação:** autorizada pelo autor em 24/11/2026 (F7 a F13 "sem parar"). A F10 já está na `main` (commit `18a667c`). Manter o relatório único.

## Contexto

Fontes de verdade: `docs/GDD.md` (§7 bestiário, §8.3 tempo e clima, §10 títulos, §14 sistemas extras, §3.4 ganchos das origens), `docs/DECISOES.md`, `docs/CALIBRACAO.md`. Leia o código da F0 a F10.

## Objetivo

Um mundo que muda com o relógio: **dia e noite** (1 h real = 1 dia do jogo) e **clima**, mexendo em recursos, monstros e no poder de raças e cores; **eventos** com escolhas simples durante o trabalho; a **Crônica** do personagem; **bônus dos títulos** e marcos do **Bestiário**; e os **arcos das origens especiais**.

## Entrega

1. Relógio do mundo e clima como funções do instante (iguais para todos), com o avanço dividido nas viradas (dividir o tempo continua exato).
2. Efeitos: noite fortalece Sangue-Pálido, Lobisomem e Ser das Trevas; dia fortalece a Alma da Luz; à noite os monstros raros e os peixes raros aparecem mais; chuva e neblina mudam coleta, viagem e achados.
3. Eventos sorteados a cada hora de trabalho com semente própria (independente do RNG das atividades); ação de responder; resultado na Crônica.
4. Crônica: marcos (só o que nunca diminui) e registros de escolhas e capítulos.
5. Títulos por mortes com bônus; Bestiário com +5/+10/+15% de dano em 100/1.000/5.000 abates.
6. Arcos: 3 capítulos para cada origem especial, visíveis só para ela.
7. Save v12 com migração; web (relógio na barra, eventos, Crônica, Títulos, Bestiário, Missões → História); bot; testes; docs; relatório.

## Fora do escopo

Profissões secundárias novas (costura); escolhas ramificadas dentro dos arcos; recursos e monstros exclusivos de um clima.
