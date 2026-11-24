# Fatia F4 — Combate por área

> **Situação:** autorizada pelo autor em 24/11/2026 ("Pode seguir"). A F3 já está na `main` (commit `a400963`). Manter o relatório único `idle-personagem-unico/RELATORIO-idle-personagem-unico.md` com a seção da F4 (executado, validado, dúvidas e soluções).

## Contexto

Fontes de verdade: `docs/GDD.md` (§5.1, §6.5, §7, §9.2, §10, §16), `docs/ARQUITETURA.md` (§3.1), `docs/DECISOES.md`, `docs/CALIBRACAO.md`, `docs/ROADMAP.md` e as regras em `.cursor/rules/`. Leia o código da F0 a F3.

## Regras de execução

As mesmas das fatias anteriores: só `idle-personagem-unico/` (e o job de CI, se preciso); direto na `main` com push; CI verde e Vercel `READY`; TypeScript `strict`; textos em português; motor puro e determinístico (sorteios com o RNG do save); conteúdo como dado; efeitos pelo modelo único de modificadores; números [Calibrar] registrados em `docs/CALIBRACAO.md` e no GDD.

## Objetivo

**Primeiro marco jogável completo**: treinar → coletar → vender → equipar → caçar. O personagem caça sozinho numa área escolhida (combate é uma atividade, exclusiva), em **passos de 0,5 s** iguais com o jogo aberto ou fechado, com monstros de taxa de aparição própria, chefes, drops, equipamento de combate e **recuo automático** por % de vida.

## Entrega

1. **Conteúdo:** 6 áreas de combate (subáreas de Bosque Raso, Mina Velha e Lago Espelho) com nível recomendado; por área, 2 monstros comuns, 1 raro e 1 chefe (a cada N abates), com taxa de aparição, status e tabela de drops (material vendável e chance de equipamento). Equipamentos de combate por slot (arma, elmo, peitoral, calças, botas) em 3 tiers, mais o **kit básico** (arma e roupa simples, GDD §4.1).
2. **Status de combate** derivados dos status e do equipamento via modificadores: vida máxima (Vigor), ataque (Força), defesa (Resistência), velocidade de ataque e esquiva (Agilidade), crítico (Percepção).
3. **Simulação** em passos de 0,5 s dentro do avanço do tempo: procurar → lutar → abater (XP, drops, bestiário) ou recuar; estado completo da luta no save; consistente por partição do tempo; 12 h em menos de 1 s.
4. **Recuo automático** configurável; **morte** sem Limiar ainda (F6): o personagem desmaia, volta a Pedravau e fica ocioso, sem perder nada.
5. **Vida** persistente entre lutas, recuperada fora do combate.
6. **Equipar e desequipar** a partir da mochila; Ferreiro vende equipamento dos primeiros tiers.
7. **Risco** da área (verde/amarelo/vermelho) calculado pelos status de verdade.
8. **Save v5** com migração v4 → v5 (kit básico equipado, vida cheia, bestiário vazio, recuo padrão).
9. **Web:** Combate → Áreas e Bestiário; Mochila → Equipados e Equipáveis; status de combate na ficha; barra e resumo do tempo fora com abates, drops, recuos e desmaios.
10. **Bot de ritmo** do combate e do ciclo completo; testes; documentação e relatório.

## Fora do escopo

Habilidades ativas/passivas e elementos (F5); O Limiar, Barqueiro e Eco da Morte (F6); missões e guilda (F7); afixos, fusão e nomeados (F8); pets (F10); bônus de marcos do bestiário e clima/dia-noite (F11); acessórios, relíquias, manoplas e mão secundária.

## Critérios de pronto

Os mesmos das fatias anteriores, mais: a cadeia treinar → coletar → vender → equipar → caçar funciona no navegador; recuo e desmaio testados; migração v4 → v5 com save real.
