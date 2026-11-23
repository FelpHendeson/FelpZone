# Calibração

Registro dos números **[Calibrar]** do jogo: valor nominal, o que a simulação observou e propostas de ajuste. Regra: **nenhum número muda sem registrar aqui o antes e o depois** (e no GDD).

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

### Histórico

| Data | Mudança | Antes → depois |
| --- | --- | --- |
| 23/11/2026 | Primeira calibração (F1). Custos do orçamento definidos (o GDD não tinha números). | — |
