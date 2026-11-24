# Fatia F8 — Forja, produção e nomeados

> **Situação:** autorizada pelo autor em 24/11/2026 (F7 a F13 "sem parar"). A F7 já está na `main` (commit `646316d`). Manter o relatório único.

## Contexto

Fontes de verdade: `docs/GDD.md` (§6.3, §9.1, §9.2, §9.4, §9.5), `docs/ORIGENS.md` (origens com nomeados e bônus de forja), `docs/DECISOES.md`, `docs/CALIBRACAO.md`. Leia o código da F0 a F7.

## Objetivo

**Produção** (forja, alquimia, culinária) como atividade nos estabelecimentos, **fusão** para subir a raridade (3 → 1, falha parcial, Sorte, *pity*, custo crescente, nomeados fora), **itens nomeados** (das origens e forjáveis com fragmentos de chefe), **acessórios** (2) e **relíquia** (1), consumíveis e os primeiros **ralos de gold** (fusão, ampliação de mochila).

## Entrega

1. Conteúdo: ofícios de produção, receitas, acessórios, relíquias, poções, comida, fragmentos de chefe, nomeados, variantes aprimoradas (+1 a +3).
2. Regras: produção em ciclos (consome e produz; para quando faltam materiais); fusão com RNG do save; poções automáticas no combate; nomeados únicos; ampliação de mochila.
3. Efeitos que passam a valer: bônus de forja e culinária dos berços, Filho do Ferreiro Maldito, Portador da Lâmina Desperta, Náufrago das Estrelas (Bússola Quebrada), Fornalha Interior, Mão Certeira, Intelecto na produção.
4. Save v9 com migração v8 → v9.
5. Web: Atividades → Produção; Ferreiro com fusão; Mercado com ampliação; Mochila → Consumíveis e Nomeados; acessórios e relíquia nos Equipados.
6. Bot; testes; documentação e relatório.

## Fora do escopo

Afixos aleatórios; carpintaria e costura; leilão ou troca entre jogadores (proibido pelo autor).
