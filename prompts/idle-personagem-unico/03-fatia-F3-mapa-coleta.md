# Fatia F3 — Mapa e coleta

> **Situação:** autorizada pelo autor em 24/11/2026 ("Pode seguir para o F3"). A F2 já está na `main` (commit `907153d`). O autor pediu também um **relatório único** na raiz do projeto (`RELATORIO-idle-personagem-unico.md`) com o que foi feito em cada fatia desde a F1, as dúvidas e a solução adotada para cada uma.

## Contexto

Projeto `idle-personagem-unico`. Fontes de verdade: `docs/GDD.md` (§6.2, §8, §9.2, §9.3, §9.5, §16), `docs/ARQUITETURA.md`, `docs/DECISOES.md`, `docs/CALIBRACAO.md`, `docs/ROADMAP.md` e as regras em `.cursor/rules/`. Leia o código da F0 a F2.

## Regras de execução

As mesmas da F2: só `idle-personagem-unico/` (e o job de CI, se preciso), direto na `main` com push, CI verde e Vercel `READY`; TypeScript `strict`; textos em português; motor puro e determinístico (sorteios com o RNG do save); conteúdo como dado; efeitos pelo modelo único de modificadores; números [Calibrar] registrados em `docs/CALIBRACAO.md` e no GDD.

## Objetivo

O personagem passa a existir **num lugar**: uma região com 4 locais (cidade + 3 locais de coleta), subáreas, viagem curta entre locais ("Movendo-se até…", ≤ 10 s, só quando a atividade muda de local) e movimento instantâneo dentro do local. Surgem os **4 ofícios de coleta** (madeira, minério, pesca, agricultura) com nível próprio, recursos por local e por tier, **ferramentas** (básicas no início, melhores compradas no Ferreiro), **mochila** com capacidade e **venda** no Mercado, que é a fonte de gold.

## Entrega

1. **Mapa (dados):** 1 região, 4 locais (cidade com subáreas de estabelecimentos e o Campo de Treino; bosque, mina e lago), tempos de viagem entre locais (3–10 s), local inicial. Treinos da F2 passam a acontecer no Campo de Treino da cidade.
2. **Ofícios e recursos (dados):** Lenhador, Minerador, Pescador e Fazendeiro; 3 recursos por ofício (tiers 1–3, liberados por nível do ofício), com local/subárea, ciclo, rendimento, XP do ofício e do personagem, preço e um **achado raro** opcional por recurso.
3. **Ferramentas e itens (dados):** uma ferramenta por ofício em 3 graus (básica, de ferro, de aço) com raridade, eficiência e velocidade; catálogo de itens (materiais e achados raros) com preço e tamanho de pilha.
4. **Regras (motor):** viagem como parte do avanço do tempo (consistente por partição); coleta em ciclos com rendimento fracionário e achado raro sorteados pelo RNG do save; XP e nível de ofício; status passam a valer na coleta (Agilidade → velocidade, Percepção e Sorte → achados raros, Força → capacidade da mochila); mochila com espaços e pilhas, itens que não cabem são perdidos e contados no resumo; ações `iniciarAtividade` (com viagem automática), `irPara`, `vender`, `venderTudo`, `comprarFerramenta`, com erros tipados.
5. **Efeitos que passam a valer:** bônus de ofício dos berços e origens, Pele de Pedra (mineração), Passo Silvestre (viagem entre locais naturais), Sentidos Aguçados (achados raros), Acampamento nômade (viagem), Cortiço da capital (venda), Náufrago das Estrelas (compra).
6. **Save v4** com migração v3 → v4 (personagem na cidade, ouro 0, mochila vazia, ofícios no nível 1 e ferramentas básicas).
7. **Web:** Atividades → Coleta; Mapa → Região, Local atual e Estabelecimentos (Mercado e Ferreiro); Mochila → Materiais e Ferramentas; barra de atividade com "Movendo-se até…"; resumo offline com itens, perdas por mochila cheia e níveis de ofício; aviso de mochila cheia.
8. **Bot de ritmo** estendido: tempo até os níveis de ofício que liberam os tiers, gold por hora por tier e tempo até comprar cada ferramenta.
9. **Testes** para tudo acima, mantendo os 171 testes anteriores.
10. **Documentação:** README, GDD, ROADMAP, DECISOES, CALIBRACAO, `prompts/.../README.md` e o **relatório único** na raiz do projeto.

## Fora do escopo

Produção, forja e fusão (F8); afixos e itens nomeados (F8); combate e drops (F4); habilidades (F5); pets (F10); dia/noite e clima (F11); baú e ampliação de mochila; mais regiões.

## Critérios de pronto

Os mesmos da F2, mais: trocar para uma atividade em outro local mostra "Movendo-se até…" e o ciclo só começa ao chegar; recursos por local e por tier; venda gera gold; migração v3 → v4 testada com save real.
