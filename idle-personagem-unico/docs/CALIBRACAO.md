# Calibração

Registro dos números **[Calibrar]** do jogo (sorteio da F1 ao fim do Ato I: treino, coleta, combate, habilidades, Limiar, missões): valor nominal, o que a simulação observou e propostas de ajuste. Regra: **nenhum número muda sem registrar aqui o antes e o depois** (e no GDD).

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

> **Atenção (F7):** a curva de XP mudou para 150 × L². Os tempos desta seção são da curva antiga; os novos estão na seção da F7.

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

## Habilidades (F5)

Fonte dos números: `packages/motor/src/dados/habilidades.ts` (efeitos no nível 1 de maestria), `dados/aprendizado.ts` e `habilidades/maestria.ts` (`CONFIG_HABILIDADES`). Reproduza com `npm run ritmo`.

### Números em vigor

| Item | Valor | Rótulo |
| --- | --- | --- |
| Slots | 5 ativas; passivas: 3 + 1 a cada 10 níveis (Folha em Branco +1) | GDD §12 [Proposta] |
| Maestria | 1 a 30; XP de M a M+1 = round(20 × M^1,4) | [Calibrar] |
| Efeito por maestria | +2% por nível acima do 1; estágio II (maestria 10) ×1,25 e III (25) ×1,5 | [Calibrar] |
| Aprendizado | ciclo de 30 s no Campo de Treino, 10 de maestria e 5 de XP do personagem por ciclo | [Calibrar] |
| Maestria por uso | ativa disparada +2; passiva em ação (abate, ciclo de coleta ou qualquer ciclo para as gerais) +1 | [Calibrar] |
| Curas | só disparam com a vida abaixo de 50% | GDD §7 [Autor: "como no LionHearth"] |
| Ramo do core | a partir do nível 10, uma vez, ensina uma técnica | [Proposta] |
| Livros | comum 300 g, incomum 900 g no Livreiro; drop de raros 3% e chefes 15% | [Calibrar] |

### Resultado do bot (habilidades)

Maestria pela atividade de Aprendizado (1200 XP de maestria/h, sem bônus): estágio II (maestria 10) em **1,5 h**, estágio III (25) em **15,0 h**, máximo (30) em **23,4 h**. Efeito: ×1,47 na maestria 10, ×2,22 na 25 e ×2,37 na 30.

Combate com as técnicas de cada core (Humano preparado no Juncal Escuro, nível 10, 4 h, recuo 30%): sem habilidades equipadas × técnicas do core na maestria 1 × na maestria 25.

| Core | Abates/h sem | Abates/h (M1) | Abates/h (M25) | Recuos/h sem | Recuos/h (M1) | Recuos/h (M25) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ser das Trevas | 229 | 276 | 328 | 19,3 | 12,8 | 7,5 |
| Portador da Chama | 229 | 377 | 399 | 19,3 | 9,8 | 8,0 |
| Filho da Tempestade | 229 | 350 | 403 | 19,3 | 10,8 | 8,0 |
| Guardião da Terra | 229 | 244 | 258 | 19,3 | 15,8 | 13,3 |
| Alma da Luz | 229 | 297 | 341 | 19,3 | 8,8 | 2,0 |
| Predador Nato | 229 | 329 | 377 | 19,3 | 13,8 | 10,3 |
| Mente Lúcida | 229 | 264 | 284 | 19,3 | 12,0 | 7,3 |
| Alma Antiga | 229 | 313 | 344 | 19,3 | 13,3 | 12,5 |
| Artífice Nato | 229 | 261 | 273 | 19,3 | 16,3 | 15,5 |
| Andarilho | 229 | 232 | 234 | 19,3 | 19,5 | 19,8 |
| Domador | 229 | 360 | 370 | 19,3 | 10,0 | 11,0 |
| Sem Chama | 229 | 229 | 229 | 19,3 | 19,3 | 19,3 |

### Leitura e proposta (F5)

1. **Cores de combate pesam bastante**: as técnicas iniciais aumentam os abates em 7% a 65% (Guardião da Terra a Portador da Chama) e cortam os recuos em até metade; com maestria 25, até +76%. **Portador da Chama, Filho da Tempestade e Domador** ficam no topo (golpes frequentes); **Guardião da Terra** e **Artífice Nato** ajudam pouco no combate.
2. **Cores de coleta e viagem** (Andarilho, Sem Chama) não ajudam no combate, de propósito: o ganho deles está na coleta, na viagem e no treino. Livros de combate equilibram (Golpe Firme e Primeiros Socorros custam 300 g).
3. **Maestria rápida no começo**: o estágio II sai em 1,5 h de prática e o III em 15 h por habilidade. Com 6 a 10 habilidades por personagem, maximizar tudo leva semanas. **Proposta:** manter e rever quando as missões (F7) mudarem o ritmo.
4. **O combate acelera a subida de nível** além do medido na F2 (só treino): no teste do navegador, 12 h caçando levaram do nível 4 ao 13. Os alvos de ritmo da F2 precisam ser medidos de novo com o ciclo completo (bot da cadeia, pendente).
5. As tabelas da F4 mudaram ±2% porque agora cada abate também sorteia um livro (o RNG é consumido em outra ordem). Nenhum número da F4 foi alterado.

## O Limiar (F6)

Fonte dos números: `packages/motor/src/dados/limiar.ts` (`CONFIG_LIMIAR`, sinergias, monstros e O Retornado) e `atividades/limiar.ts`. Reproduza com `npm run ritmo`.

### Números em vigor

| Item | Valor | Rótulo |
| --- | --- | --- |
| Duração | 10 min + 20 s × nível da área, × (1 + 25% por carga de Eco), × reduções; mínimo 1 min | GDD §10 (10 min) + [Calibrar] |
| Eco da Morte | cada outra morte nas últimas 2 h (1 h para o Devedor do Barqueiro) = 1 carga, até 5; drops +25% por carga | [Calibrar] |
| Dentro do Limiar | 75% do ataque e da defesa; monstros no nível de entrada; vida a zero = recompor-se em 3 s contra o mesmo monstro | [Proposta] |
| Chefes raros | 0,5% por busca × (1 + 0,5 por carga); peça de O Retornado em 20% das vitórias, só se faltar | **mudou** no bot |
| Essência | 1 / 3 / 10 por abate (comum / raro / chefe), × Eco | [Calibrar] |
| Pedágio do Barqueiro | 3 de Essência por minuto restante; Devedor sai de graça na primeira vez | [Calibrar] |
| Reduções | Sobrevivente do Vazio −25%; Aldeia à beira do Limiar −5%; Sangue-Pálido e Ser das Trevas −20% (e +20% de ataque lá dentro); O Retornado (4 peças) −20% | ORIGENS.md + [Proposta] |
| O Retornado | 2 peças: +1% de ataque por morte; 4 peças: também +1% de defesa por morte; teto 25% | [Calibrar] |
| Títulos | Visitante Frequente (5 mortes), O Que Voltou (25), Sem Medo da Morte (100) | GDD §10 |

### Resultado do bot (Limiar)

Humano preparado (status em 50% da faixa, equipamento do tier) que morre na área do seu nível: duração da estadia, o que rende lá dentro e o pedágio para sair logo na entrada.

| Nível / área | Eco | Duração | Abates no Limiar | Essência ganha | Pedágio na entrada | XP ganho |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 / 5 | 0 | 11,7 min | 41 | 49 | 36 | 416 |
| 5 / 5 | 3 | 20,4 min | 70 | 145 | 63 | 692 |
| 15 / 15 | 0 | 15,0 min | 53 | 64 | 45 | 928 |
| 15 / 15 | 3 | 26,3 min | 93 | 210 | 81 | 1780 |
| 25 / 25 | 0 | 18,3 min | 72 | 80 | 57 | 1543 |
| 25 / 25 | 3 | 32,1 min | 123 | 261 | 99 | 3019 |

Tempo de Limiar até as 4 peças de O Retornado (nível 25, Eco 3, sempre voltando ao Limiar): **20 h** (chefes a 0,5% por busca × (1 + 0,5 por carga), peça em 20% das vitórias).

### Leitura e proposta (F6)

1. **Bug corrigido pelo bot**: na primeira versão, cair no Limiar descartava o monstro; como os chefes têm 6× mais vida, eles nunca eram vencidos e O Retornado era impossível. Agora o personagem se recompõe e volta a lutar contra o mesmo monstro, ferido.
2. **O Retornado ficou fácil demais** depois da correção (2 h de Limiar com Eco 3). Baixei a chance de chefe de 1% para 0,5% por busca e a de peça de 50% para 20%: agora são **~20 h de Limiar** (umas 40 mortes com Eco alto) até o set completo. É o prêmio de quem aceita morrer.
3. **Morrer custa tempo, não itens**: uma morte na área do próprio nível custa de 12 a 18 min (20 a 32 min com Eco 3), rende Essência suficiente para pagar o pedágio da próxima vez e algum XP. O recuo continua sendo a escolha segura.
4. **O pedágio na entrada** custa um pouco menos do que a Essência que a estadia rende: pagar é trocar o ganho do Limiar por tempo.

## Missões, guilda e cadeia completa (F7)

Fonte dos números: `packages/motor/src/dados/missoes.ts` (`CONFIG_GUILDA`, missões) e `personagem/progressao.ts` (curva de XP). Reproduza com `npm run ritmo`.

### Números em vigor

| Item | Valor | Rótulo |
| --- | --- | --- |
| Mérito para subir de rank (F→E … A→S) | 100, 250, 500, 900, 1.500, 2.500 + a prova do rank (chefe da área do rank) | [Calibrar] |
| Contratos da guilda | 3 por rank, repetíveis a cada 20 h; Mérito 15 a 85 | [Calibrar] |
| Bônus por rank | −2% no preço de compra e +2% de rendimento de coleta por rank | [Proposta] |
| Missões ativas | até 10 | [Proposta] |
| **Curva de XP do personagem** | XP(L → L+1) = **150 × L²** | **mudou** (era 200 × L^1,5) |

### Por que a curva de XP mudou

O bot da cadeia completa (pendente desde a F4) mostrou que, jogando de verdade (caçando, com missões), o personagem chegava ao **nível 50 em 8,8 dias**, contra o alvo de 6 a 8 semanas. Testei três curvas:

| Curva | Nível 10 | Nível 20 | Nível 30 | Nível 50 |
| --- | ---: | ---: | ---: | ---: |
| 200 × L^1,5 (antiga) | 0,8 d | 2,3 d | 4,3 d | 8,8 d |
| **150 × L²** (escolhida) | 1,3 d | 4,8 d | 13,8 d | 37,3 d |
| 120 × L^2,2 | 1,3 d | 6,3 d | 18,8 d | 58,3 d |
| 100 × L^2,3 | 1,3 d | 6,8 d | 19,8 d | — (60 d) |

A escolhida mantém o primeiro dia rápido (nível 10) e leva o nível 50 a ~5 semanas, perto do rank S (~6 semanas). Efeito colateral: quem **só treina** fica bem mais lento (nível 50 em mais de 200 dias). É coerente com o combate ser a principal fonte de XP, mas **os tempos da seção da F2 ficaram desatualizados**; os novos estão abaixo.

### Resultado do bot (cadeia completa)

Bot que usa todos os sistemas (Humano, Predador Nato, 3 sessões por dia): vai à cidade a cada sessão, lê livros, equipa o melhor, vende o resto, compra equipamento, entrega e aceita missões (guilda, provas e NPCs da cidade), pede promoção e caça na área mais forte que não esteja vermelha (senão, treina).

| Dia | Nível | Rank | Gold | Mortes | Metas cumpridas |
| ---: | ---: | --- | ---: | ---: | ---: |
| 1 | 6 | F | 228 | 0 | 2 |
| 3 | 15 | E | 13.366 | 0 | 7 |
| 7 | 23 | D | 58.756 | 0 | 8 |
| 14 | 30 | C | 200.543 | 0 | 8 |
| 30 | 45 | A | 1.490.783 | 0 | 8 |
| 60 | 50 | S | 4.677.363 | 0 | 8 |

Dias até o nível: 10: 1,3 · 20: 4,8 · 30: 13,8 · 40: 23,3 · 50: 37,3.

Dias até o rank: F: 0,3 · E: 2,8 · D: 5,8 · C: 10,8 · B: 18,3 · A: 29,3 · S: 44,5.

#### Só treino, com a curva nova: tempo até o nível (dias corridos desde a criação; horas com atividade)

O XP não depende da raça; o Humano representa todas (exceto origens com bônus de XP).

| Perfil | Nível 5 | Nível 10 | Nível 20 | Nível 30 | Nível 40 | Nível 50 | Horas perdidas pelo limite |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dedicado (3 sessões/dia: 8 h, 13 h, 20 h) | 0,5 d (5 h) | 1,8 d (36 h) | 13,3 d (312 h) | 45,3 d (1080 h) | 107,3 d (2568 h) | 211,3 d (5064 h) | 0 h |
| Casual (1 sessão/dia, às 20 h) | 1,8 d (12 h) | 3,8 d (36 h) | 26,8 d (312 h) | 90,8 d (1080 h) | 214,8 d (2568 h) | — | 4368 h |

### Leitura e proposta (F7)

1. **Rank S em ~6 semanas** para quem faz os contratos e as provas; ranks sobem a cada 3 a 15 dias.
2. **As metas param na 8ª** para quem nunca morre ("Ida e volta" pede voltar do Limiar). É de propósito: a meta ensina que morrer não é o fim. Se o autor achar estranho, ela pode virar opcional.
3. **Gold explode** (5 milhões no 60º dia), porque ainda não há onde gastar. A F8 (forja e fusão) é o ralo previsto.
4. Ninguém morreu no bot: com o recuo em 30% e a regra "não caçar no vermelho", a morte só vem por escolha.

## Produção, fusão e nomeados (F8)

Fonte dos números: `packages/motor/src/dados/producao.ts` (`CONFIG_PRODUCAO`, `CONFIG_FUSAO`, `CONFIG_MOCHILA_EXTRA`, receitas, drops) e `atividades/combate.ts` (poções). Reproduza com `npm run ritmo`.

### Números em vigor

| Item | Valor | Rótulo |
| --- | --- | --- |
| Ofícios de produção | Ferreiro (forja), Alquimista, Cozinheiro; mesma curva de XP da coleta | [Proposta] |
| Receitas | 19 (11 de forja, 4 de alquimia, 4 de culinária); ciclo 20 s a 5 min; saída vale 1,6× a 2,5× os materiais crus | [Calibrar] |
| Intelecto na produção | +1% de velocidade por ponto efetivo | [Calibrar] |
| Fusão | 3 iguais → 1 aprimorado (+1 a +3); chance 70% / 55% / 40%; Sorte +0,3 p.p. por ponto (até +20 p.p.); *pity* depois de 3 falhas seguidas; falha perde 1 dos 3 | [Calibrar] |
| Custo da fusão | gold = preço do item × 4 / 10 / 25; material 10 minério de ferro / 10 minério de prata / 10 cinza de alma | [Calibrar] |
| Bônus por aprimoramento | +20% nos bônus do item por nível | [Calibrar] |
| Ampliação de mochila | +5 espaços por compra, até 6 compras; 500 g × 3ⁿ | [Calibrar] |
| Poções | usadas sozinhas com vida < 40%, recarga 10 s; menor cura 30%, normal 60% | [Calibrar] |
| Fragmento de chefe | 1% por chefe de área abatido | [Calibrar] |
| Relíquias | 5% (Rato-rei) e 10% (demais chefes; Moeda do Barqueiro nos chefes do Limiar), uma de cada | [Calibrar] |

### Resultado do bot (produção e fusão)

Cada receita por 1 h no nível mínimo do ofício (Humano no piso, sem bônus), com material de sobra. Valor agregado = gold da saída − gold das entradas vendidas cruas; Saída ÷ entradas = quanto o produto vale a mais que os materiais (o gargalo real é coletar/caçar os materiais).

| Receita | Ciclo | Saídas/h | Valor agregado/h | Saída ÷ entradas | XP de ofício/h |
| --- | ---: | ---: | ---: | ---: | ---: |
| Forjar: Espada de ferro | 60 s | 64 | 6080 | 1,61× | 1280 |
| Forjar: Elmo de ferro | 60 s | 64 | 4032 | 1,72× | 1280 |
| Forjar: Cota de malha | 60 s | 64 | 8448 | 1,79× | 1600 |
| Forjar: Grevas de ferro | 60 s | 64 | 5440 | 1,74× | 1600 |
| Forjar: Botas ferradas | 60 s | 64 | 4160 | 1,76× | 1280 |
| Forjar: Espada de aço escuro | 120 s | 31 | 24180 | 2,08× | 1860 |
| Forjar: Couraça de aço | 120 s | 31 | 29295 | 2,11× | 1860 |
| Forjar: Anel de cobre | 45 s | 85 | 1700 | 2,00× | 1275 |
| Forjar: Anel de prata | 60 s | 64 | 5120 | 1,67× | 2240 |
| Forjar: Presa da Matriarca | 300 s | 1 | -1290 | 0,00× | 200 |
| Forjar: Coroa do Afogado | 300 s | 1 | -1070 | 0,00× | 200 |
| Preparar: Poção de vida menor (×2) | 30 s | 256 | 2304 | 2,50× | 1024 |
| Preparar: Poção de vida (×2) | 45 s | 170 | 3570 | 1,88× | 1700 |
| Preparar: Amuleto de âmbar | 90 s | 42 | 3696 | 1,67× | 1680 |
| Preparar: Amuleto de pérola | 90 s | 42 | 3696 | 1,67× | 1680 |
| Cozinhar: Pão de trigo (×2) | 20 s | 384 | 1536 | 2,00× | 960 |
| Cozinhar: Ensopado de peixe | 40 s | 96 | 1440 | 1,60× | 1152 |
| Cozinhar: Torta de abóbora | 60 s | 64 | 3200 | 2,25× | 1600 |
| Cozinhar: Ração de viagem (×3) | 20 s | 576 | 1920 | 2,25× | 960 |

Fusão da Espada de ferro (Humano sem Sorte; média de 2.000 simulações para cada alvo, montando a pirâmide desde a espada comum):

| Até | Espadas de ferro gastas | Fusões | Gold |
| --- | ---: | ---: | ---: |
| +1 | 3,4 | 1,4 | 1362 |

Na cadeia completa (60 dias, mesmo bot da F7): **21 fragmentos de chefe** e 3 relíquias (Olho do Rato-Rei, Escama do Afogador, Coração de Casca).

### Leitura e proposta (F8)

1. **Receitas rendem 1,6× a 2,5× o valor dos materiais.** A primeira versão rendia até 7× na forja de aço (o gargalo é coletar, não forjar); dobrei/tripliquei os materiais das receitas de equipamento.
2. **Fragmento de chefe** com 40% dava 1.895 fragmentos em 60 dias; com 1%, 21 (os dois nomeados forjáveis pedem 3 e 4).
3. **Fusão até +3** custa ~51 itens base e ~51 mil gold (Espada de ferro). É o ralo de gold de longo prazo; o bot ainda não funde, então o gold dele continua alto (4,5 milhões no 60º dia).
4. Ninguém morreu no bot; as poções servem a quem caça no amarelo/vermelho.

## Pets (F10)

Fonte: `packages/motor/src/dados/pets.ts` (`CONFIG_PETS`, `CONFIG_CUIDADOS`, espécies, comidas). Reproduza com `npm run ritmo`.

| Item | Valor | Rótulo |
| --- | --- | --- |
| Energia / Fome | 8 h / 12 h de trabalho | [Calibrar] |
| Bônus por nível | +10% do bônus base por nível, até o 20 | [Calibrar] |
| Espirituais | +1% do bônus por ponto de Espírito acima de 10 | [Calibrar] |
| União | Sincronia com 1 h de trabalho; 10 min; bônus ×2 | [Calibrar] |
| Doma | 0,07% por abate domável, com Laço de doma (120 g) | [Calibrar] |
| Cuidados | descansar 30 min de Energia / 5 min; treinar 5 XP e 5 min de Energia / 1 min; XP por nível = 60 × nível | [Calibrar] |
| Estábulo | até 5 pets reais; cão 300 g, mula 400 g, gato 250 g, coruja 600 g | [Calibrar] |

### Resultado do bot (pets)

- Colher trigo por 8 h: 1.038 sem pet, 1.156 com o Javali no nível 10 (+11%). A Energia (8 h) acaba junto com o turno.
- Doma na Trilha dos Lobos (nível 1): 306 lobos e javalis por hora; **um pet a cada ~4,7 h** de caça.
- 1 h de descanso devolve 6 h de Energia; treinar do nível 1 ao 10 leva 9 h de Estábulo.

### Leitura e proposta (F10)

1. **Doma** começou em 3% e dava um pet a cada poucos minutos (o combate do nível 1 é muito rápido); com 0,07%, ~5 h.
2. **Descanso** começou em 1 h de Energia a cada 5 min (12 h por hora, trivial); com 30 min, cuidar custa ~15% do tempo de trabalho.
3. Bônus de pet ficam entre 5% e 11% (até 20% no nível 20), abaixo de um item bom: ajudam sem decidir.

## Mundo vivo (F11)

Fonte: `packages/motor/src/dados/mundo.ts` (`CONFIG_MUNDO`, efeitos, eventos, títulos, bestiário). Reproduza com `npm run ritmo`.

| Item | Valor | Rótulo |
| --- | --- | --- |
| Dia do jogo | 1 h real; noite 19h–5h | [Proposta] |
| Clima | bloco de 2 h; pesos 4/3/2/1 (limpo/nublado/chuva/neblina) | [Calibrar] |
| Noite | +10% ataque, +8% defesa (tags noite, trevas, lua); raros ×2; peixes raros +30% | [Calibrar] |
| Dia | +5% ataque e +10% regeneração (tag luz) | [Calibrar] |
| Chuva / neblina | +15% lavoura e pesca, viagem +10% / +15% achados, +2 p.p. esquiva | [Calibrar] |
| Eventos | 1 sorteio por hora de trabalho; 35%; até 3 esperando | [Calibrar] |
| Títulos | 5 mortes: −5% Limiar; 25: +3% defesa e −5% Limiar; 100: +5% ataque | [Calibrar] |
| Bestiário | 100/1.000/5.000 abates: +5/+10/+15% de dano contra a espécie | [Calibrar] |
| Arcos | nível 10 (1.500 XP, 500 g); Guardião (4.000 XP, 1.500 g); nível 25 (10.000 XP, 5.000 g) | [Calibrar] |

### Resultado do bot (mundo vivo)

- Em 30 dias: noite 42% do tempo; céu limpo 41%, nublado 30%, chuva 19%, neblina 10%.
- Cadeia completa (60 dias), agora respondendo eventos: **389 eventos** (~6,5 por dia de jogo contínuo) e 9 marcos na Crônica. O nível 50 caiu de 37 para **34 dias** (XP dos eventos e bônus de noite e títulos); continua perto do alvo de 5 a 6 semanas.

## Competição (F12)

Fonte: `packages/motor/src/dados/competicao.ts` (`CONFIG_COMPETICAO`, arquétipos, temas). Reproduza com `npm run ritmo`.

| Item | Valor | Rótulo |
| --- | --- | --- |
| Duelo | passos de 0,5 s; até 2 min | [Proposta] |
| Arena | 10 lutas/dia; Elo K=32; vitória 10 pontos e 8 g × nível; derrota 2 pontos | [Calibrar] |
| Bots | nível ±2; treino do jogador ±10% (Arena e Provas); 20–60% nos torneios; kit básico até o nível 4 | [Calibrar] |
| Torneio | 16 lutadores; pontos 300/180/100/50/20; gold 400/200/100/40/10 × nível | [Calibrar] |
| Temporada | 8 semanas; tema +20% de ataque; insígnia com 2.500 pontos | [Calibrar] |

### Resultado do bot (competição)

| Nível | Vitórias na Arena | Colocação média no torneio | Pontos por semana | Semanas até a insígnia |
| ---: | ---: | ---: | ---: | ---: |
| 5 | 55% | 7,1 | 488 | 5,1 |
| 15 | 54% | 7,4 | 478 | 5,2 |
| 30 | 56% | 6,8 | 501 | 5,0 |

### Leitura e proposta (F12)

1. Com a insígnia em 600 pontos, saía em 1,5 semana; com 2.500, em ~5 semanas de 8.
2. Personagem novo perdia todas (bots treinados e com couro contra o kit básico): bots do nível 1 a 4 usam o kit básico, e a Arena e as Provas pareiam pelo treino.
3. O tema pesa (+20% de ataque): na temporada de Pedra e Vento, o Tanque Draconato é o rival mais duro.

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
| 24/11/2026 | F5: números de maestria, slots, livros e efeitos das habilidades definidos (não existiam). | — |
| 24/11/2026 | F6: chefes do Limiar e peças de O Retornado (o set completava em 2 h de Limiar). | chefe 1% → 0,5% por busca; peça 50% → 20% |
| 24/11/2026 | F6: números do Limiar, Eco, pedágio e O Retornado definidos (não existiam). | — |
| 24/11/2026 | F7: curva de XP do personagem (o nível 50 saía em 8,8 dias jogando a cadeia completa). | 200 × L^1,5 → 150 × L² |
| 24/11/2026 | F7: Mérito, contratos e bônus de rank definidos (não existiam). | — |
| 24/11/2026 | F8: materiais das receitas de equipamento (a forja de aço rendia 7× os materiais crus). | espada de aço 10 prata + 5 carvalho escuro + 5 lodo → 30 + 15 + 10; couraça 14 prata + 5 pedra → 40 + 15; ferro ~2× |
| 24/11/2026 | F8: fragmento de chefe (1.895 em 60 dias). | 40% → 1% por chefe |
| 24/11/2026 | F8: números de produção, fusão, ampliação, poções e relíquias definidos (não existiam). | — |
| 24/11/2026 | F9: Pergaminho do Novo Destino nos ranks C e A de cada personagem (máximo 9); limites da API (120 pedidos/min, 10 entradas/min, sessão de 30 dias). | — |
| 24/11/2026 | F10: chance de domar (um pet a cada poucos minutos). | 3% → 0,07% por abate |
| 24/11/2026 | F10: descanso do pet (12 h de Energia por hora de descanso). | 1 h → 30 min por ciclo de 5 min |
| 24/11/2026 | F10: números de pets, cuidados, União e Estábulo definidos (não existiam). | — |
| 24/11/2026 | F11: números de dia/noite, clima, eventos, títulos, bestiário e arcos definidos (não existiam). | — |
| 24/11/2026 | F12: pontos para a insígnia (saía em 1,5 semana). | 600 → 2.500 |
| 24/11/2026 | F12: bots do começo (novato perdia todas). | couro e 30–80% de treino → kit básico até o nível 4, 20–60% e pareamento pelo treino |
| 24/11/2026 | F12: números de duelo, Arena, torneio e temporada definidos (não existiam). | — |
