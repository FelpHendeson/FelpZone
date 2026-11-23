# Decisões e perguntas abertas

Mantém separado o que o **autor decidiu** do que é **proposta**. Em divergência, a solicitação mais recente do autor prevalece.

## Decisões do autor (23/11/2026)

1. Projeto **novo**, independente do LionHearth (`idle-guilda`).
2. Nome de pasta de trabalho: `idle-personagem-unico` (pode ser trocado; o autor ainda não escolheu o nome do jogo).
3. **Primeiro 100% web, depois port mobile.**
4. **Uma atividade por vez** (combate também é atividade).
5. Offline: **12 horas**.
6. O jogo **não tem fim**; mais conteúdo entra sempre. Combinações livres, bots, torneios, rankings, temporadas e recompensas.
7. **Sem permadeath.** Morte leva a um reino da morte onde só se combate, com itens e um set nomeado único. (Nome, duração, Barqueiro, Eco da Morte e *O Retornado* são propostas do agente.)
8. Sorteio **ponto a ponto**, com chances limitadas; pode aceitar antes; permite combinações excêntricas; **até 3 personagens por conta**, via item de reroll.
9. Itens **nomeados** estão fora da raridade convencional; **uma unidade de cada** por personagem.
10. Gold: entra por venda aos estabelecimentos do jogo; sai em produção, fusões e estabelecimentos.
11. Habilidades ativas **como no LionHearth**.
12. Viagem entre locais ≤ 10 s com "Movendo-se até…"; dentro da cidade, instantânea.
13. Estrutura de interface: abas inferiores + sub-abas no topo; abas Atividades, Combate, Inventário, Mapa, Missões.
14. Ranks da guilda **F → SSS → Lendário → Mítico → Supremo → Divino**.
15. Habilidades: físicas e mágicas (subtipos), passivas/ativas, permanentes/com duração, podem afetar coleta e produção.
16. Pets: reais e espirituais, raridade, nome, atividades próprias, modo União.
17. Acessórios e relíquias no mesmo molde do resto.

## Propostas do agente aguardando aprovação

| # | Proposta | Onde |
| --- | --- | --- |
| P1 | **5 chances** no sorteio (a última é obrigatória). | GDD §4.1 |
| P2 | **Raridades**: Comum → Incomum → Raro → Épico → **Ancestral** → **Primordial**, para não colidir com os ranks Lendário/Mítico. | GDD §9.1 |
| P3 | Oito raças e doze cores iniciais. | GDD §3 |
| P4 | **Marca da Anomalia** para combinações excêntricas. | GDD §4.2 |
| P5 | **Orçamento de raridade** na cascata do sorteio. | GDD §4.2 |
| P6 | Oito status; fórmula de piso/teto. | GDD §5 |
| P7 | Viagem **só ao mudar de local** (não a cada ciclo). | GDD §8.1 |
| P8 | **O Limiar**, Barqueiro, Eco da Morte, set *O Retornado*. | GDD §10 |
| P9 | **Recuo automático** por % de vida. | GDD §7 |
| P10 | Postgres (Neon) + Redis; **adiar banco até a F9**. | ARQUITETURA §6 |
| P11 | Motor com ciclos para atividades e passos de 0,5 s para combate. | ARQUITETURA §3.1 |
| P12 | Nível máximo 50 no Ato I. | GDD §5.3 |

## Perguntas abertas

1. **Personagens múltiplos**: só o ativo progride (proposta), ou os três progridem juntos com uma atividade cada?
2. **Pets em paralelo**: pets com atividades próprias rodam ao mesmo tempo que o personagem (proposta)?
3. **Nome do jogo.** Só para trocar o nome de trabalho e o projeto Vercel.
4. **Arte**: pixel art? Sem gráficos no começo, mas qual direção de estilo futura?
5. **Competição na infraestrutura**: ok adiar a decisão para a F12?
6. **Hobby da Vercel**: ok seguir enquanto o jogo for pessoal e não comercial?
7. **Tom**: o autor gosta de humor ácido e temas sombrios; os textos devem seguir esse tom (Limiar, Barqueiro, Trevas)?
