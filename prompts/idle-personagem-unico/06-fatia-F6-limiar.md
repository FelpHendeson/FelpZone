# Fatia F6 — O Limiar

> **Situação:** autorizada pelo autor em 24/11/2026 ("Pode seguir"). A F5 já está na `main` (commit `3759090`). Manter o relatório único `idle-personagem-unico/RELATORIO-idle-personagem-unico.md` com a seção da F6.

## Contexto

Fontes de verdade: `docs/GDD.md` (§2 decisão 4, §9.5, §10), `docs/ORIGENS.md` (origens 3 e 20), `docs/ARQUITETURA.md` (§3.2 `limiar{ativo,fimEm,cargasEco}`), `docs/DECISOES.md`, `docs/CALIBRACAO.md`, `docs/ROADMAP.md`. Leia o código da F0 a F5.

## Regras de execução

As mesmas das fatias anteriores.

## Objetivo

Substituir o desmaio provisório da F4 pela **morte sem permadeath** do autor: o personagem atravessa para **O Limiar**, onde só combate por um tempo, com drops exclusivos, o **Barqueiro Sem Rosto** (pedágio para sair antes), o **Eco da Morte** (risco e recompensa), o set nomeado **O Retornado** e as sinergias de Ser das Trevas e Sangue-Pálido. Ao sair, a atividade anterior volta sozinha. Tudo igual com o jogo fechado.

## Entrega

1. **Conteúdo:** Almas Penadas, Ceifeiros Menores e um raro, que acompanham o nível do personagem; chefes raros *O Cobrador* e *A Rainha Pálida*; **Essência do Limiar** (moeda) e um material exclusivo vendável; as 4 peças de *O Retornado* (nomeadas, uma de cada por personagem), com bônus que crescem com as mortes; sinergias; títulos por mortes.
2. **Regras:** morte → Limiar (duração base 10 min + perigo da área, × Eco, × reduções); combate contínuo com atributos reduzidos e sem segunda morte; Eco da Morte por mortes recentes, com decaimento; pedágio do Barqueiro (Devedor do Barqueiro sai de graça na primeira vez); retorno com a atividade anterior; consistência por partição do tempo.
3. **Efeitos que passam a valer:** Sobrevivente do Vazio, Aldeia à beira do Limiar, Devedor do Barqueiro.
4. **Save v7** com migração v6 → v7.
5. **Web:** Combate → O Limiar (estado, Barqueiro, Eco, set, mortes); Personagem → Títulos; barra e resumo do tempo fora com mortes e Limiar.
6. **Bot de ritmo** do Limiar; testes; documentação e relatório.

## Fora do escopo

Bônus de títulos (F11); arcos de história das origens (F11); acessórios e relíquias (F8).

## Critérios de pronto

Os mesmos das fatias anteriores, mais: morrer leva ao Limiar e o tempo lá é simulado também offline; ao sair, a atividade anterior volta; migração v6 → v7 com save real.
