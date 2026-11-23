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

### Decisões de 23/11 (tarde)

18. **Cada personagem é separado**: ficha, mochila, gold, missões e rank de guilda próprios. Só um joga por vez.
19. **Pets por atividade**: 1 pet por atividade (inicialmente), o mesmo pet pode estar em todas, e ele só trabalha quando o personagem trabalha naquela atividade. Treino, descanso e alimentação do pet são separados.
20. **Origens**: personagens comuns têm lore básica; personagens **especiais** têm lore única e podem nascer com **besta espiritual vinculada** (exemplos: *Fruto do Vínculo*, *12º Filho do Clã Ironblood*). **Mecânicas de história** podem vir depois.
21. **Aprovou as propostas do agente** listadas abaixo (P1 a P12), exceto o que estiver em "Perguntas abertas".
22. O trabalho pode ir direto para a `main`.

### Decisões de 23/11 (fim da tarde)

23. **Conta compartilhada** (conquistas e o que o agente achar justo): cada personagem é uma existência diferente. Ver GDD §4.1 para a divisão conta × personagem.
24. **Cuidados do pet dependem da atividade**: se o pet está na atividade de descanso, o personagem não está trabalhando ali. São atividades do personagem, uma de cada vez.
25. **Origens** inspiradas em obras de ficção, com origens próprias criadas; catálogo em `ORIGENS.md`.

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
| P13 | Origem comum gerada por modelo (92%) e origem especial escrita à mão (8%), com restrições de raça. | GDD §3.4 e §4.2 |
| P14 | Pets com **Fome** e **Energia**; cuidados por cronômetro próprio. | GDD §13 |

## Perguntas abertas

1. **Origens especiais**: 8% de chance e restrição por raça (proposta) estão bons? Das 22 origens do catálogo, quais cortar, trocar ou reescrever?
2. **Cuidados do pet**: confirme a leitura de "depende da atividade": alimentar, descansar e treinar são atividades do personagem (uma de cada vez), e o pet só rende onde o personagem está.
3. **Nome do jogo.** Só para trocar o nome de trabalho e o projeto Vercel.
3. **Arte**: pixel art? Sem gráficos no começo, mas qual direção de estilo futura?
4. **Competição na infraestrutura**: ok adiar a decisão para a F12?
5. **Hobby da Vercel**: ok seguir enquanto o jogo for pessoal e não comercial?
6. **Tom**: o autor gosta de humor ácido e temas sombrios; os textos devem seguir esse tom (Limiar, Barqueiro, Trevas)?
