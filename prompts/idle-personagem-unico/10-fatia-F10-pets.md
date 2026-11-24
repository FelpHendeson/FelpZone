# Fatia F10 — Pets

> **Situação:** autorizada pelo autor em 24/11/2026 (F7 a F13 "sem parar"). A F9 já está na `main` (commit `332069a`). Manter o relatório único.

## Contexto

Fontes de verdade: `docs/GDD.md` (§6.6 cuidados do pet, §13 pets), `docs/ORIGENS.md` (bestas vinculadas, Fruto do Vínculo), `docs/DECISOES.md`, `docs/CALIBRACAO.md`. Leia o código da F0 a F9.

## Objetivo

Pets **reais** (domados em combate com Laço de doma ou comprados no Estábulo) e **espirituais** (as bestas vinculadas), com nome, nível, Energia e Fome. **1 pet por atividade** (o mesmo pode estar em todas), que só trabalha e só cansa quando o personagem trabalha ali. **Cuidados** (alimentar, descansar, treinar) como atividades do personagem. **Modo União** para os espirituais.

## Entrega

1. Conteúdo: espécies (domáveis, do Estábulo e espirituais), Laço de doma, comidas, cuidados, subárea Estábulo.
2. Regras: bônus por nível (ou por Espírito nos espirituais); gasto exato de Energia/Fome pelo tempo de trabalho, com o avanço dividido onde o bônus muda (dividir o tempo continua dando o mesmo resultado); doma por abate com o RNG do save; União (Sincronia cheia, 10 min, bônus dobrado).
3. Efeitos que passam a valer: bestas vinculadas, Fruto do Vínculo, Voz Mansa e Laço Firme (Domador).
4. Ações serializadas novas (comprar pet e laço, nomear, atribuir, soltar, União). Save v11 com migração v10 → v11.
5. Web: Personagem → Pets (vagas, pets, barras, União) e Atividades → Pets (cuidados e Estábulo); domas no resumo do tempo fora.
6. Bot; testes; documentação e relatório.

## Fora do escopo

Habilidades próprias dos pets; pets em combate como lutadores (só bônus); mais de 1 vaga por atividade.
