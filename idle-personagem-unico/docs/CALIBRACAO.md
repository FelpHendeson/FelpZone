# Calibração

Registro dos números **[Calibrar]** do jogo (sorteio da F1, treino da F2, mapa e coleta da F3, combate da F4): valor nominal, o que a simulação observou e propostas de ajuste. Regra: **nenhum número muda sem registrar aqui o antes e o depois** (e no GDD).

## Sorteio do personagem (F1)

Fonte dos números: `packages/motor/src/sorteio/config.ts` (GDD §4.2). Reproduza com:

```bash
cd idle-personagem-unico
npm run simular              # 200.000 primeiras tentativas, sementes simulacao-0 … simulacao-199999
npm run simular -- 50000 70  # opcional: N e um saldo alternativo, só para estudo
```

### Números em vigor

| Passo | Pesos | Custos no orçamento |
| --- | --- | --- |
| Raça (por raridade; uniforme dentro dela) | Comum 70 · Incomum 22 · Rara 8 | 0 · 10 · 25 |
| Core (por compatibilidade; uniforme dentro dela; categoria vazia renormaliza) | Alta 70 · Média 25 · Excêntrica 5 | 0 · 5 · 15 |
| Dom de raça (por raridade; uniforme dentro dela) | Incomum 60 · Raro 28 · Épico 9 · Ancestral 2,5 · Primordial 0,5 | 5 · 15 · 30 · 50 · 80 |
| Origem (especial uniforme entre as compatíveis com a raça) | Comum 92 · Especial 8 | 0 · 15 (+15 com besta vinculada) |
| Orçamento | Saldo inicial **100** | Só entram as opções que cabem no saldo; se nada couber, a de menor custo |
| Chances | **5 tentativas** (a 1ª + 4 rerolagens); a 5ª é obrigatória | — |
| Origem comum | Marca opcional 30%; anos de estrada 1 a 25 (uniforme) | — |

Compatibilidade: **alta** = 2+ tags em comum, **média** = 1, **excêntrica** = 0. Com o catálogo atual, Elfo e Silfo têm 5 e 6 cores excêntricos; as outras raças, 9. **Sem Chama** não tem tags e é excêntrico para todas as raças (é o core "raro" do GDD).

### Simulação de 200.000 sorteios

- Data: 2026-11-23 · motor 0.1.0 · sementes `simulacao-0` a `simulacao-199999` · 2185 ms
- Saldo inicial do orçamento: 100. Gasto médio: **19,05**; máximo: 100.

#### Raça por raridade

| Raridade | Nominal | Observado |
| --- | ---: | ---: |
| Comum | 70,00% | 69,87% |
| Incomum | 22,00% | 22,05% |
| Raro | 8,00% | 8,08% |

| Raça | Raridade | Nominal | Observado |
| --- | --- | ---: | ---: |
| Humano | Comum | 17,50% | 17,52% |
| Anão | Comum | 17,50% | 17,46% |
| Elfo | Comum | 17,50% | 17,56% |
| Orc | Comum | 17,50% | 17,33% |
| Lobisomem | Incomum | 11,00% | 11,03% |
| Sangue-Pálido | Incomum | 11,00% | 11,03% |
| Draconato | Raro | 4,00% | 4,02% |
| Silfo | Raro | 4,00% | 4,06% |

#### Compatibilidade raça × core

Nominal: alta 70%, média 25%, excêntrica 5% (renormalizado quando a raça não tem uma categoria).

| Raça | Alta | Média | Excêntrica |
| --- | ---: | ---: | ---: |
| Humano | 69,51% | 25,47% | 5,03% |
| Anão | 70,08% | 25,09% | 4,82% |
| Elfo | 70,18% | 24,92% | 4,90% |
| Orc | 69,59% | 25,30% | 5,11% |
| Lobisomem | 69,63% | 25,13% | 5,24% |
| Sangue-Pálido | 70,13% | 24,97% | 4,90% |
| Draconato | 69,20% | 25,95% | 4,85% |
| Silfo | 70,15% | 24,87% | 4,97% |
| **Geral** | 69,84% | 25,18% | 4,98% |

#### Raridade do dom

| Raridade | Nominal | Observado |
| --- | ---: | ---: |
| Incomum | 60,00% | 60,14% |
| Raro | 28,00% | 28,05% |
| Épico | 9,00% | 8,86% |
| Ancestral | 2,50% | 2,49% |
| Primordial | 0,50% | 0,46% |

#### Origem

| Tipo | Nominal | Efetivo |
| --- | ---: | ---: |
| Comum | 92,00% | 91,96% |
| Especial | 8,00% | 8,04% |
| (especial com besta vinculada) | — | 0,86% |

#### Orçamento de raridade

Tentativas em que o orçamento cortou alguma opção: **19.319** (9,66%).

| Passo | Tentativas com corte | Trocas forçadas (esperadas) | Fallback de menor custo |
| --- | ---: | ---: | ---: |
| raca | 0 | 0 (0,00%) | 0 |
| core | 0 | 0 (0,00%) | 0 |
| dom | 18.397 | 92 (0,05%) | 0 |
| origem | 1.377 | 33 (0,02%) | 0 |

*Trocas forçadas (esperadas)*: soma, em cada passo cortado, da probabilidade nominal que cairia numa opção acima do saldo. É o número de sorteios em que o resultado mudou por causa do orçamento.

#### Pares excêntricos

9.968 sorteios (4,98%) caíram em 65 pares distintos de 65.

| Par (marca) | Sorteios | % do total |
| --- | ---: | ---: |
| Elfo + Sem Chama (*Folha do Nada*) | 364 | 0,18% |
| Elfo + Artífice Nato (*Canção de Forja*) | 355 | 0,18% |
| Elfo + Portador da Chama (*Outono Eterno*, curada) | 342 | 0,17% |
| Elfo + Ser das Trevas (*Canção do Breu*) | 334 | 0,17% |
| Elfo + Filho da Tempestade (*Folha de Trovão*) | 326 | 0,16% |
| Orc + Domador (*Punho do Laço*) | 221 | 0,11% |
| Anão + Mente Lúcida (*Bigorna em Silêncio*) | 207 | 0,10% |
| Orc + Artífice Nato (*Brado de Forja*) | 206 | 0,10% |
| Orc + Ser das Trevas (*Cicatriz sem Luz*) | 206 | 0,10% |
| Humano + Alma Antiga (*Teimosia dos Ecos*) | 204 | 0,10% |
| Orc + Guardião da Terra (*Brado de Pedra*) | 202 | 0,10% |
| Humano + Ser das Trevas (*Sombra Emprestada*, curada) | 201 | 0,10% |
| Orc + Alma da Luz (*Punho do Meio-Dia*) | 201 | 0,10% |
| Anão + Portador da Chama (*Veio da Cinza Viva*) | 201 | 0,10% |
| Humano + Portador da Chama (*Teimosia da Cinza Viva*) | 200 | 0,10% |
| Humano + Filho da Tempestade (*Teimosia do Céu Partido*) | 200 | 0,10% |
| Humano + Domador (*Promessa de Coleira*) | 196 | 0,10% |
| Anão + Filho da Tempestade (*Bigorna do Trovão*, curada) | 194 | 0,10% |
| Humano + Guardião da Terra (*Teimosia de Raiz*) | 194 | 0,10% |
| Orc + Filho da Tempestade (*Punho de Trovão*) | 193 | 0,10% |
| Humano + Sem Chama (*Teimosia sem Nome*) | 193 | 0,10% |
| Humano + Predador Nato (*Promessa de Dentes*) | 192 | 0,10% |
| Anão + Sem Chama (*Veio sem Nome*) | 192 | 0,10% |
| Anão + Domador (*Juramento de Coleira*) | 191 | 0,10% |
| Orc + Sem Chama (*Cicatriz do Vazio*) | 190 | 0,10% |
| Humano + Mente Lúcida (*Promessa do Pensamento Frio*) | 181 | 0,09% |
| Anão + Andarilho (*Juramento sem Casa*) | 179 | 0,09% |
| Orc + Andarilho (*Cicatriz sem Casa*) | 176 | 0,09% |
| Orc + Mente Lúcida (*Fúria Calculada*, curada) | 176 | 0,09% |
| Anão + Alma Antiga (*Veio de Outra Era*) | 175 | 0,09% |
| Anão + Alma da Luz (*Veio da Luz Torta*) | 173 | 0,09% |
| Anão + Ser das Trevas (*Veio do Breu*) | 173 | 0,09% |
| Lobisomem + Artífice Nato (*Uivo de Forja*) | 163 | 0,08% |
| Sangue-Pálido + Alma Antiga (*Veia de Outra Era*) | 139 | 0,07% |
| Lobisomem + Andarilho (*Lua sem Casa*) | 138 | 0,07% |
| Lobisomem + Alma da Luz (*Presa da Luz Torta*) | 135 | 0,07% |
| Sangue-Pálido + Domador (*Crepúsculo do Laço*) | 133 | 0,07% |
| Lobisomem + Guardião da Terra (*Presa de Raiz*) | 129 | 0,06% |
| Lobisomem + Ser das Trevas (*Lua sem Luz*, curada) | 129 | 0,06% |
| Lobisomem + Sem Chama (*Presa sem Nome*) | 129 | 0,06% |
| Sangue-Pálido + Andarilho (*Sede da Estrada*) | 128 | 0,06% |
| Sangue-Pálido + Predador Nato (*Sede de Caça*) | 125 | 0,06% |
| Sangue-Pálido + Portador da Chama (*Sede de Fogo Frio*) | 121 | 0,06% |
| Lobisomem + Alma Antiga (*Uivo dos Ecos*) | 120 | 0,06% |
| Sangue-Pálido + Filho da Tempestade (*Veia em Relâmpago*) | 114 | 0,06% |
| Sangue-Pálido + Alma da Luz (*Sangue ao Meio-Dia*, curada) | 110 | 0,06% |
| Lobisomem + Portador da Chama (*Presa da Cinza Viva*) | 109 | 0,05% |
| Sangue-Pálido + Sem Chama (*Veia sem Nome*) | 105 | 0,05% |
| Sangue-Pálido + Guardião da Terra (*Crepúsculo de Pedra*) | 105 | 0,05% |
| Lobisomem + Filho da Tempestade (*Lua de Trovão*) | 104 | 0,05% |
| Silfo + Portador da Chama (*Brisa em Brasa*) | 73 | 0,04% |
| Silfo + Predador Nato (*Pluma de Caça*) | 70 | 0,04% |
| Silfo + Mente Lúcida (*Brisa de Vidro*) | 66 | 0,03% |
| Silfo + Ser das Trevas (*Pluma sem Luz*) | 66 | 0,03% |
| Silfo + Artífice Nato (*Brisa da Engrenagem*) | 66 | 0,03% |
| Silfo + Sem Chama (*Sopro do Nada*) | 63 | 0,03% |
| Draconato + Ser das Trevas (*Escama sem Luz*) | 52 | 0,03% |
| Draconato + Sem Chama (*Dragão sem Fogo*, curada) | 49 | 0,02% |
| Draconato + Mente Lúcida (*Garra de Vidro*) | 46 | 0,02% |
| Draconato + Andarilho (*Escama de Poeira*) | 45 | 0,02% |
| Draconato + Artífice Nato (*Brasa Antiga de Bancada*) | 44 | 0,02% |
| Draconato + Alma da Luz (*Escama de Aurora*) | 44 | 0,02% |
| Draconato + Guardião da Terra (*Brasa Antiga de Pedra*) | 41 | 0,02% |
| Draconato + Predador Nato (*Brasa Antiga da Presa Certa*) | 36 | 0,02% |
| Draconato + Domador (*Garra do Laço*) | 33 | 0,02% |


### Leitura e proposta

1. **Os passos isolados batem com o nominal.** Raça, compatibilidade, dom e origem ficam a menos de 0,5 p.p. do nominal; os testes de estatística (`test/sorteio.test.ts`) garantem isso com 200 mil amostras por passo e semente fixa.
2. **O orçamento quase não muda as probabilidades.** Com saldo 100, ele corta opções em cerca de 10% das tentativas, mas só troca o resultado em **~0,07%** dos sorteios (dom ~0,05%, origem ~0,02%) e nunca precisou do fallback de menor custo (os testes provam que, com estes custos, o fallback é impossível). Na prática ele funciona como **teto de combinação**, não como redutor geral:
   - raça **Rara** (25) **nunca** tem dom Primordial (25 + 80 > 100). **Consequência: os Primordiais do Draconato (*O Primeiro Fogo*) e do Silfo (*O Vento que Não Volta*) são hoje inalcançáveis**;
   - raça **Incomum** (10) só tem Primordial com core alto ou médio (10 + 5 + 80 = 95); com core excêntrico, não;
   - raça Rara + core excêntrico (40) + dom Ancestral (50) **não pode** ter origem especial;
   - dom Primordial (80) só convive com origem especial (15) se raça e core somarem no máximo 5, e nunca com besta vinculada (30).
3. **Estudo de saldo menor (não aplicado):** com saldo **70** ou **60**, o dom Primordial **some por completo** (custa 80) e o Ancestral cai para ~2,3% e ~2,1%. Por isso **não recomendo** baixar o saldo sem baixar o custo do Primordial.

**Proposta (aguarda o autor):**

- **Decidir sobre os Primordiais das raças raras.** Se a intenção é que existam, a menor mudança é baixar o custo da raça Rara de **25 para 20** (20 + 0 + 80 = 100: Primordial possível só com core de afinidade alta). Não apliquei: muda um número [Calibrar] que afeta o desenho do orçamento.
- No resto, manter os números atuais.

O orçamento já cumpre o papel do GDD ("não tirar tudo raro de uma vez") nas combinações extremas, sem distorcer as chances do dia a dia. Se o autor quiser que ele pese mais, a alternativa coerente é **subir custos de combinação**, e não baixar o saldo: por exemplo, core excêntrico a **25** faz excêntrico e Primordial nunca saírem juntos (0 + 25 + 80 > 100), mantendo o Primordial possível nas outras combinações. Qualquer mudança será registrada aqui com o antes e o depois.

## Treino e progressão (F2)

Fonte dos números: `packages/motor/src/personagem/progressao.ts` (`CONFIG_PROGRESSAO`) e `packages/motor/src/dados/status.ts` (perfis por raça e atividades). Reproduza com:

```bash
cd idle-personagem-unico
npm run ritmo
```

### Números em vigor

| Item | Valor | Rótulo |
| --- | --- | --- |
| Ciclo de treino | 30 s (todas as 8 atividades); ÷ velocidade, mínimo 1 s | [Calibrar] |
| XP por ciclo | 10 (1.200 XP/h sem bônus) | [Calibrar] |
| XP para ir de L a L+1 | round(200 × L^1,5); nível máximo 50 (total 1.379.031 XP) | [Calibrar] |
| Teto | base_raça × (1 + 0,10 × (L − 1)) × (1 + Σ% de `teto` e `teto.<status>`) | fórmula do GDD; [Calibrar] |
| Piso | fração_da_raça × teto | **mudou**: era 0,55 fixo |
| Ganho por ciclo | 0,6% do teto (sem modificadores) × (1 − posição na faixa)^0,6 × (1 + Σ% de `ganho-treino`) | [Calibrar] |
| Perfis por raça | destaque 13, fraqueza 7, resto 10; Draconato 11 com destaques 14; Lobisomem 12 nos destaques secundários | [Calibrar] |
| Fração de piso | Humano 0,65 · Silfo 0,50 · Draconato 0,45 · demais 0,55 | [Calibrar] |

### Alvos de ritmo propostos (aguardam o autor)

| Alvo | Perfil dedicado (3 sessões/dia) | Resultado |
| --- | --- | --- |
| Nível 10 no primeiro dia de jogo | ≤ 1,5 dia corrido | 1,3 d ✅ |
| Nível 20 na primeira semana | ≤ 7 d | 5,3 d ✅ |
| Nível 50 (fim do Ato I) em 6 a 8 semanas | 42–56 d | 48,3 d ✅ |
| Quem abre 1×/dia leva no máximo ~2× o tempo | ≤ 2× | ~2× (o limite de 12 h corta metade do dia) ✅ |

Os números iniciais já ficaram dentro dos alvos; **não houve ajuste**.

### Resultado do bot

- Data: 2026-11-24 · motor 0.1.0 · limite offline 12 h
- Números: ciclo 30 s, 10 XP/ciclo, XP(L→L+1) = round(200 × L^1,5), teto +10%/nível, ganho base 0,60% do teto por ciclo, expoente 0,6, nível máximo 50.
- XP total até o nível 50: 1.379.031 (1149 h de atividade sem bônus).

Estratégia: em cada sessão, treina o status mais longe do teto; entre sessões, o offline trabalha (até 12 h).

#### Tempo até o nível (dias corridos desde a criação; horas com atividade)

O XP não depende da raça; o Humano representa todas (exceto origens com bônus de XP).

| Perfil | Nível 5 | Nível 10 | Nível 20 | Nível 30 | Nível 40 | Nível 50 | Horas perdidas pelo limite |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dedicado (3 sessões/dia: 8 h, 13 h, 20 h) | 0,5 d (5 h) | 1,3 d (24 h) | 5,3 d (120 h) | 13,5 d (317 h) | 27,8 d (660 h) | 48,3 d (1152 h) | 0 h |
| Casual (1 sessão/dia, às 20 h) | 1,8 d (12 h) | 2,8 d (24 h) | 10,8 d (120 h) | 27,8 d (324 h) | 55,8 d (660 h) | 96,8 d (1152 h) | 1152 h |

#### Ocupação média da faixa piso → teto dos 8 status ao chegar ao nível (perfil dedicado)

| Raça | Nível 5 | Nível 10 | Nível 20 | Nível 30 | Nível 40 | Nível 50 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Humano | 12% | 22% | 77% | 89% | 93% | 95% |
| Draconato | 12% | 28% | 85% | 93% | 96% | 97% |
| Silfo | 13% | 28% | 84% | 92% | 95% | 97% |

#### Treino de um status num nível fixo (Humano, partindo do piso)

Quantas horas de treino levam um status do piso a 50% e a 90% da faixa, sem subir de nível no meio.

| Nível | Faixa piso → teto (Força) | Ganho no 1º ciclo | Até 50% | Até 90% |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 6,50 → 10,00 | +0,060 | 0,30 h | 0,73 h |
| 10 | 12,35 → 19,00 | +0,114 | 0,30 h | 0,73 h |
| 25 | 22,10 → 34,00 | +0,204 | 0,30 h | 0,73 h |
| 50 | 38,35 → 59,00 | +0,354 | 0,30 h | 0,73 h |

XP por hora de treino: 1200 (sem bônus).

### Leitura e proposta (F2)

1. **Os primeiros níveis são muito rápidos** (nível 5 em menos de 3 h de atividade). É de propósito para o primeiro dia ter recompensa, mas faz os status ficarem para trás no começo: no nível 10, a faixa piso → teto está só ~22–28% ocupada em média.
2. **Depois do nível 20 os status quase lotam** (77–97% da faixa), porque levar um status do piso a 90% custa sempre ~0,73 h e cada nível passa a durar horas. O treino de status perde peso no meio do Ato I.
3. **Proposta (não aplicada):** quando chegarem as próximas fontes de XP (coleta e combate, F3–F4), revisar junto: (a) baixar o ganho base para ~0,4% do teto, ou (b) fazer o custo de encher a faixa crescer com o nível. Mudar agora, só com treino, calibraria um jogo que ainda não existe.
4. **Silfo** sobe de nível ~10% mais rápido por causa do Corpo de Vento (ciclos mais curtos, mesmo XP por ciclo). Se isso for indesejado, a velocidade pode valer só para o ganho de status.

## Mapa e coleta (F3)

Fonte dos números: `packages/motor/src/dados/mapa.ts`, `dados/coleta.ts`, `personagem/progressao.ts` (`CONFIG_OFICIOS`, `CONFIG_MOCHILA`) e `atividades/ciclos.ts` (bônus de status). Reproduza com `npm run ritmo`.

### Números em vigor

| Item | Valor | Rótulo |
| --- | --- | --- |
| Viagem entre locais | 4 a 9 s (Pedravau ↔ Bosque 4, ↔ Lago 5, ↔ Mina 6; Bosque ↔ Lago 4, ↔ Mina 8; Lago ↔ Mina 9); mínimo 1 s com bônus | [Calibrar]; teto de 10 s é [Autor] |
| Recursos por tier | tier 1: nível 1, ciclo 30 s, 5 XP de ofício · tier 2: nível 10, 36 s, 9 XP · tier 3: nível 20, 42 s, 14 XP; 5 XP do personagem por ciclo | [Calibrar] |
| Rendimento | 1 item por ciclo × eficiência da ferramenta × bônus; a fração é sorteada (RNG do save) | [Calibrar] |
| Achado raro | 1% por ciclo × (1 + 1% por ponto de Percepção + Sorte efetivas) × bônus (Lobisomem +50%) | [Calibrar] |
| Agilidade | +1% de velocidade de coleta por ponto efetivo | [Calibrar] |
| Ferramentas | básica ×1/×1 (kit inicial) · ferro ×1,25 rendimento / ×1,1 velocidade, 400 g, ofício 5 · aço ×1,5 / ×1,2, 2.500 g, ofício 15 | [Calibrar] |
| XP de ofício (L → L+1) | round(150 × L^1,5), nível máximo 50 | **mudou** no bot: 40 → 150 |
| Mochila | 20 espaços + 0,5 por ponto de Força efetiva; pilha de 100 materiais ou 20 achados raros | [Calibrar] |
| Preços de venda | tier 1: 2 g · tier 2: 5 g · tier 3: 12 g · achados raros: 60 g | [Calibrar] |

### Alvos de ritmo propostos (aguardam o autor)

| Alvo | Resultado (dedicado, 1 ofício) |
| --- | --- |
| Ferramenta de ferro no primeiro dia | 0,5 d ✅ |
| Tier 2 (ofício 10) no primeiro ou segundo dia | 1,3 d ✅ |
| Tier 3 (ofício 20) dentro da primeira semana | 4,3 d ✅ (com 40 de base eram 1,5 d ❌) |
| Ferramenta de aço na primeira semana | 2,5 d ✅ |

### Resultado do bot (coleta)

Rendimento por hora de um Humano sem bônus, com a ferramenta básica e com a de aço (Agilidade no piso do nível 1):

| Recurso | Tier | Nível | Itens/h (básica) | Gold/h (básica) | Gold/h (aço) | XP de ofício/h | XP do personagem/h |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Cortar pinho | 1 | 1 | 128 | 316 | 502 | 640 | 640 |
| Cortar carvalho | 2 | 10 | 106 | 590 | 1035 | 954 | 530 |
| Cortar carvalho escuro | 3 | 20 | 91 | 1152 | 2052 | 1274 | 455 |
| Minerar cobre | 1 | 1 | 128 | 436 | 640 | 640 | 640 |
| Minerar ferro | 2 | 10 | 106 | 710 | 1220 | 954 | 530 |
| Minerar prata | 3 | 20 | 91 | 1152 | 2004 | 1274 | 455 |

Os quatro ofícios têm os mesmos números por tier; Lenhador e Minerador representam todos.

Pessoa dedicada (3 sessões/dia) focada num ofício: vende tudo a cada sessão, compra a próxima ferramenta quando pode e coleta o maior tier liberado.

| Ofício | Nível 5 | Nível 10 | Nível 15 | Nível 20 | Nível 30 | Ferramenta de ferro | Ferramenta de aço | Gold no 7º dia | Nível do personagem no 7º dia | Itens perdidos/dia |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Lenhador | 0,5 d | 1,3 d | 2,5 d | 4,3 d | 8,8 d | 0,5 d | 2,5 d | 241651 | 18 | 0 |
| Minerador | 0,5 d | 1,3 d | 2,5 d | 4,3 d | 8,8 d | 0,5 d | 2,5 d | 241605 | 18 | 0 |
| Pescador | 0,5 d | 1,3 d | 2,5 d | 4,3 d | 8,8 d | 0,5 d | 2,5 d | 241629 | 18 | 0 |
| Fazendeiro | 0,5 d | 1,3 d | 2,5 d | 4,3 d | 8,8 d | 0,5 d | 2,3 d | 243075 | 18 | 0 |

### Leitura e proposta (F3)

1. **A curva de ofício foi o único ajuste**: com `xpBase` 40, o tier 3 abria em 1,5 dia; com 150, abre em ~4 dias. Testei também 100 (3,3 dias).
2. **Gold sobra.** No 7º dia a pessoa dedicada tem ~240 mil de gold e nada em que gastar além das duas ferramentas (2.900 g por ofício). É esperado: os ralos de gold (produção, fusão, ampliação de mochila, estábulo) chegam na F8 e na F10. **Proposta:** recalibrar preços quando houver o que comprar; até lá, os preços são provisórios.
3. **Achados raros pesam no começo**: com a ferramenta básica no tier 1, ~20–30% do gold por hora vem deles (60 g cada). Se o autor achar muito, baixar o preço para 30 g.
4. **Mochila cheia** só acontece para quem fica mais de ~16 h sem vender no tier 1; o bot dedicado nunca perdeu itens. Para quem abre 1×/dia, a noite de 12 h enche ~16 dos 23 espaços.

## Combate (F4)

Fonte dos números: `packages/motor/src/dados/combate.ts` (monstros, equipamentos, áreas) e `atividades/combate.ts` (`CONFIG_COMBATE`). Reproduza com `npm run ritmo`.

### Números em vigor

| Item | Valor | Rótulo |
| --- | --- | --- |
| Passo da simulação | 0,5 s, igual aberto ou fechado | [Proposta] |
| Busca entre lutas | 3 s | [Calibrar] |
| Vida máxima | 40 + 8 × Vigor efetivo + bônus de vida | [Calibrar] |
| Ataque | 2 + Força efetiva + bônus de ataque | [Calibrar] |
| Defesa | 0,5 × Resistência efetiva + bônus de defesa | [Calibrar] |
| Intervalo de ataque | 2 s ÷ (1 + 1% por ponto de Agilidade) | [Calibrar] |
| Esquiva / crítico | 0,4% por ponto de Agilidade / 0,5% por ponto de Percepção (máx. 50%); crítico ×1,5 | [Calibrar] |
| Dano | ataque² ÷ (ataque + defesa), mínimo 1 | [Proposta] |
| Monstro (nível L) | vida 45, ataque 7, defesa 2, todos × (1 + 0,15 × (L − 1)); perfis ágil, tanque, raro (×2 vida) e chefe (×6 vida); XP 5 + 0,5 × L (raro ×4, chefe ×15) | **mudou** no bot |
| Aparição | comuns 47,5% cada, raro 5%; chefe a cada 50 abates (fugir dele o adia) | [Calibrar] |
| Drops | material da área (70% comuns, 1× / raro 3× / chefe 10×); equipamento do tier da área: 1,5% comum, 15% raro, 60% chefe | [Calibrar] |
| Recuperação de vida | fora do combate 2%/s; procurando 1%/s | **mudou** no bot (0,5 → 1%/s procurando) |
| Recuo | padrão 30%, de 0 a 90%; recuo = ida e volta à cidade + cura | [Proposta] |
| Desmaio (sem Limiar até a F6) | acorda em Pedravau com 50% da vida, ocioso, sem perder nada | [Proposta, provisório] |
| Equipamento | tier 1 (couro) e 2 (ferro) no Ferreiro; tier 3 (aço) só por drop | [Calibrar] |

### Alvos propostos (aguardam o autor)

| Alvo | Resultado |
| --- | --- |
| Personagem preparado (status em 50% da faixa + equipamento do tier) fica verde ou amarelo na área do seu nível | ✅ 5–13% de vida por luta |
| Despreparado (piso + kit) fica vermelho a partir da 3ª área | ✅ 47–69% |
| Combate rende mais XP que o treino no nível certo | ✅ 1,5× a 3,5× (1.800–4.200 XP/h contra 1.200) |
| Nenhum desmaio com o recuo padrão | ✅ 0 em todas as simulações |

### Resultado do bot (combate)

Humano caçando por 4 h no nível de entrada da área (sem subir de nível no meio), recuo em 30%. "Preparado" = status em 50% da faixa e equipamento do tier indicado; "despreparado" = status no piso e só o kit básico.

| Área | Nível | Perfil | Risco (perda por luta) | Abates/h | XP/h | Gold/h (drops) | Recuos/h | Desmaios em 4 h |
| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Trilha dos Lobos | 1 | preparado (tier 1) | verde (5%) | 323 | 2195 | 470 | 9,3 | 0 |
| Trilha dos Lobos | 1 | despreparado | amarelo (18%) | 130 | 831 | 376 | 33,8 | 0 |
| Galeria dos Ratos | 5 | preparado (tier 1) | amarelo (11%) | 208 | 1798 | 879 | 20,3 | 0 |
| Galeria dos Ratos | 5 | despreparado | amarelo (33%) | 75 | 600 | 285 | 39,3 | 0 |
| Juncal Escuro | 10 | preparado (tier 2) | verde (9%) | 234 | 2689 | 2241 | 18,5 | 0 |
| Juncal Escuro | 10 | despreparado | vermelho (47%) | 54 | 567 | 585 | 44,5 | 0 |
| Coração do Bosque | 15 | preparado (tier 2) | amarelo (13%) | 188 | 2745 | 2616 | 24,3 | 0 |
| Coração do Bosque | 15 | despreparado | vermelho (57%) | 48 | 643 | 612 | 48,5 | 0 |
| Margem Afogada | 20 | preparado (tier 3) | verde (8%) | 242 | 4204 | 9012 | 18,8 | 0 |
| Margem Afogada | 20 | despreparado | vermelho (64%) | 35 | 548 | 821 | 48,5 | 0 |
| Poço sem Fundo | 25 | preparado (tier 3) | amarelo (10%) | 205 | 4187 | 9844 | 22,0 | 0 |
| Poço sem Fundo | 25 | despreparado | vermelho (69%) | 30 | 549 | 1144 | 47,8 | 0 |

Referência: treino dá 1200 XP/h; coleta tier 1, 640 XP/h.

### Leitura e proposta (F4)

1. **Monstros reescalados.** Na primeira versão, o ataque dos monstros crescia ×9,5 do nível 1 ao 25 (contra ×3,4 do personagem): toda área depois da primeira ficava vermelha mesmo para quem estava preparado. Agora os monstros crescem × (1 + 0,15 × (L − 1)), o ritmo de um personagem treinado e equipado.
2. **Bug corrigido pelo bot:** fugir do chefe fazia ele reaparecer em toda busca e a caça travava (12 abates/h). Agora o chefe "vai embora" e só volta após mais 50 abates.
3. **Recuos frequentes:** mesmo preparado, o personagem recua 10 a 25 vezes por hora (cada recuo leva ~40–60 s), porque a cura entre lutas (3% em 3 s de busca) é menor que a perda por luta (5–13%). Isso dá peso ao Vigor e à defesa, mas tira ~20–30% do tempo de caça. **Proposta:** se o autor achar lento, subir a cura procurando para 2%/s ou a busca para 5 s.
4. **Gold de drops de equipamento domina nas áreas de aço** (~9 mil/h, quase todo de peças tier 3 vendidas). Gold continua sem destino até a F8.
5. **XP:** o combate passa a ser a principal fonte de XP depois do nível 10 (até 3,5× o treino). O ritmo de nível da F2 (só treino) fica como piso; o ritmo real com combate deve ser medido de novo quando houver missões (F7).

## Histórico

| Data | Mudança | Antes → depois |
| --- | --- | --- |
| 23/11/2026 | Primeira calibração (F1). Custos do orçamento definidos (o GDD não tinha números). | — |
| 24/11/2026 | F2: fração de piso por raça (pedida pelo GDD: Humano piso alto, Draconato piso baixo). | piso = 0,55 × teto para todas → Humano 0,65, Silfo 0,50, Draconato 0,45, demais 0,55 |
| 24/11/2026 | F2: números de ciclo, XP, ganho e perfis por raça definidos (não existiam). | — |
| 24/11/2026 | F3: XP de ofício. Com a base 40, o tier 3 abria em 1,5 dia (alvo: primeira semana). | `xpBase` 40 → 150 |
| 24/11/2026 | F3: números de viagem, recursos, ferramentas, mochila, preços e bônus de status definidos (não existiam). | — |
| 24/11/2026 | F4: escala dos monstros (as áreas 2–6 ficavam vermelhas até para quem estava preparado). | vida 25 + 15L, ataque 4 + 2,2L, defesa 1 + 0,8L, XP 4 + 1,2L → (45, 7, 2) × (1 + 0,15(L − 1)), XP 5 + 0,5L |
| 24/11/2026 | F4: cura procurando monstro. | 0,5%/s → 1%/s |
| 24/11/2026 | F4: números de combate, equipamentos, drops, recuo e desmaio definidos (não existiam). | — |
