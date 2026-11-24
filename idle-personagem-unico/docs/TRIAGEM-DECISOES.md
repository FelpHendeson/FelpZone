# Triagem das 97 decisões do Code (24/11/2026)

As decisões originais estão em [`DECISOES.md`](DECISOES.md) (numeração de 1 a 97). Aqui elas ficam separadas pelo que pedem do autor.

**Como ler:** a triagem foi feita lendo as **descrições** das decisões, o GDD e os números da `CALIBRACAO.md`; **não** reli o código de cada fatia nem joguei. Por isso o Grupo 2 diz "coerente com o que você definiu", não "testado". Se jogar e algo do Grupo 2 incomodar, ele sobe para o Grupo 1.

| Grupo | O que é | Quantidade |
| --- | --- | ---: |
| 1 | Mudam a sensação de jogo: **só o autor decide** | 14 |
| 2 | Técnicas ou coerentes com o GDD: podem ficar como estão | ~55 |
| 3 | Dependem de você escrever, desenhar ou escolher mais tarde | 10 |

---

## Grupo 1 — O que só você decide

Cada linha traz a **recomendação do agente** (a opção que eu escolheria). Responder "ok" aceita a recomendação.

| # | Pergunta | Recomendação | Por que importa |
| ---: | --- | --- | --- |
| **13, 46** | **Treino quase não dá XP**: nível 50 sai em ~5 semanas jogando tudo, mas quem **só treina** leva mais de 200 dias (curva de XP foi ajustada para o combate). O treino é um pilar do GDD. Aceita isso, ou o treino deve render mais XP? | **Dar mais XP ao treino** (sem mudar o combate), para treinar ser uma forma viável de evoluir, só mais lenta. | Define se "escolher atividade" tem valor real no jogo. |
| **14** | **Status lotam depois do nível 20** (77–97% da faixa), então o treino perde peso no meio do Ato I. | **Ver jogando** e só mexer no ganho se parecer sem graça; é ajuste de um número. | Ritmo do meio do Ato I. |
| **20** | **Mochila cheia**: a coleta continua dando XP, mas o que não cabe **se perde**. | **O personagem para de coletar sozinho** e avisa. Perder loot durante a noite é a pior experiência de um idle. | Perda silenciosa em 12 h offline. |
| **21** | **Só dá para vender em Pedravau**; quem coleta longe precisa voltar à cidade. | **Manter por ora**; considerar "vender à distância com taxa" depois de jogar. | Atrito no ciclo coletar → vender. |
| **24** | **Náufrago das Estrelas**: o "−5% no preço de compra" foi lido como **desconto**, mas a lore diz que ele **não entende de moeda**. A ambiguidade veio do **meu texto** em `ORIGENS.md`. | **Trocar para penalidade: paga 5% a mais.** | A lore e o efeito se contradizem. |
| **27** | **Recuos frequentes** (10–25 por hora, mesmo preparado), que tiram ~20–30% do tempo de caça. | **Curar um pouco mais rápido entre lutas** ou baixar o limiar de recuo padrão; depende de como a caça parecer jogando. | Eficiência real do combate. |
| **34** | **Cores de coleta (Andarilho, Sem Chama) são fracos na caça** frente aos de combate. O **Sem Chama** é o core "raro", mas o mais fraco. | **Dar ao Sem Chama uma vantagem própria** (por exemplo, aceita qualquer técnica sem penalidade, que era a ideia do GDD). | Raridade sem recompensa. |
| **68** | **Pet por categoria, não por atividade exata**: vagas de Treino, Coleta, Produção, Combate e Cuidados. Você pediu "1 pet por atividade". | **Manter** (equivale na prática e é mais simples de configurar), se você não sentir falta de escolher por atividade específica. | Desvio da sua regra original. |
| **7** | **Draconato e Silfo nunca tiram dom Primordial**: raça Rara custa 25 e o Primordial 80, com saldo 100. | **Baixar a raça Rara para 20**, para que o Primordial caiba no limite. | As raças mais raras não podem ter o dom mais raro. |
| **8** | **"5 chances"** foi lido como **5 tentativas no total** (1ª + 4 rerolagens). O GDD dizia "5 chances de rerolar". | **Manter 5 tentativas no total**; é só mudar um número se preferir 6. | Quantas vezes dá para rerolar. |
| **62, 63** | **Conta sem e-mail e sem recuperação de senha**; token no `localStorage`. Perder a senha é perder o acesso online (o save local fica). | **Aceitar por enquanto**, porque é projeto pessoal. Tratar antes de abrir para mais gente. | Risco de segurança e de suporte. |
| **74** | **Fruto do Vínculo** (origem que você escreveu): "+Sincronia" virou "**União 50% mais longa**". | **Aceitar**, mas confirme, porque alterou um efeito de uma origem sua. | Fidelidade ao que você definiu. |
| **84–89** | **Competição contra bots no aparelho**; ranking global ficou para quando houvesse banco. **Agora há banco** ativo. | **Planejar um ranking global** como próxima fatia, só com lutas resolvidas no servidor. | É a visão de longo prazo do jogo ("campeonato, temporadas"). |
| **92–97 (resumo)** | **Gold sobra** para quem não usa fusão e mochila (o bot sem ralos acumulava 4,6 milhões em 60 dias; com ralos, 0,5 milhão). | **Ver jogando**: se o gold sobrar, criar mais ralos antes de reduzir ganhos. | Economia do meio do jogo. |

---

## Grupo 2 — Coerentes com o que você definiu (podem ficar)

Resumo por assunto. Vale um "ok geral"; se algo incomodar jogando, sobe para o Grupo 1.

- **Sorteio e conteúdo:** 9 (tags de afinidade), 11 (traço de personalidade), 16 e 18 (frações de piso por raça e efeitos aplicados).
- **Mapa e economia:** 19 (mapa do Ato I), 22 (curva de ofício), 23 (gold sem destino até a F8).
- **Combate:** 15 (trocar atividade descarta o ciclo parcial, no máximo 30 s), 26 (fórmula de dano), 28 (fugir do chefe o adia), 29 (equipamento sem afixos), 31 (bestiário).
- **Habilidades:** 32 (ramos do core), 35 (maestria), 36 (livros), 37 (Órfão do Templo Cinzento nasce sabendo uma técnica).
- **Limiar:** 25 (desmaio provisório, substituído), 38 (atributos reduzidos = 75%), 39 (sem segunda morte no Limiar), 40 (a atividade volta sozinha), 41 (Eco da Morte), 42 (Retornado ~20 h), 43 (Essência não ocupa mochila), 44 (títulos).
- **Missões e guilda:** 45 (autorização F7–F13), 47 (missões contam do aceite), 48 (ranks F → S no Ato I), 49 (bônus por rank), 51 (meta "Ida e volta").
- **Forja:** 52 (3 ofícios), 53 (fusão como "+N"), 54 (falha parcial e *pity*), 55 (poções automáticas), 56 (relíquias nomeadas), 57 (nomeados de origem), 58 ("vender tudo" poupa poções e nomeados).
- **Conta:** 60 e 61 (Upstash em vez de Postgres, já ativo), 64 (primeira sincronização), 65 (Pergaminhos nos ranks C e A), 66 (conquistas), 67 (só o ativo avança).
- **Pets:** 69 (energia e fome), 70 (pets dão bônus, não lutam), 71 (espirituais), 72 (doma), 73 (Laço Firme), 75 (Estábulo).
- **Mundo vivo:** 76 (1 h real = 1 dia), 77 (clima único), 78 (bônus de 5% a 15%), 79 (eventos), 80 (Crônica), 81 (títulos), 83 (Fome da Noite).
- **Competição:** 85 (Arena local, Elo K=32), 86 (pareamento), 87 (torneio de 16), 88 (temporada de 8 semanas), 90 (builds de outros jogadores), 91 (histórico de temporadas).
- **Acabamento:** 92 (service worker só da interface), 93 (sons desligados por padrão), 95 (CSP com `'unsafe-inline'`), 96 (build da Arena vem do servidor).

**Observações do agente sobre o Grupo 2:**
- **#84** (duelo próprio, mais simples que o combate de área) é uma escolha grande de design, mas coerente com "competição leve". Confirme jogando a Arena.
- **#53** (fusão por "+N") muda como a "raridade sobe" aparece, mas cumpre a regra "3 iguais → 1 da raridade seguinte".
- **#95** (CSP) e **#63** (token) são os dois itens de segurança que eu trataria antes de abrir o jogo para outras pessoas.

---

## Grupo 3 — Dependem de você (depois)

| # | O quê | O que fazer |
| ---: | --- | --- |
| 10 | 58 de 65 **Marcas da Anomalia** vêm de um gerador. | Reescrever à mão as que mais saírem (a simulação diz quais). |
| 12, 30, 50, 59 | **Textos escritos pelo agente**: dons, técnicas, traços, áreas, monstros, equipamentos, NPCs e receitas. | Ler e trocar o que não tiver a sua voz; priorize o que aparece no começo. |
| 82 | **22 arcos de origem** gerados a partir do gancho (3 capítulos iguais em estrutura). | Escrever arcos próprios das origens que mais gostar. |
| 94 | **Arte**: só o ícone em SVG; sem ilustrações, trilha ou áudio. | Definir direção de estilo e quem desenha. |
| Perguntas abertas | **Nome do jogo**, **tom** (humor ácido nos textos), **8% de origem especial**, **cuidados do pet** como atividade. | Responder quando quiser. Hoje o tom já segue o sombrio com humor seco. |

---

## Próximo passo sugerido

1. Você joga de 30 a 60 minutos e anota o que sentiu (ritmo, mochila, recuos, Arena).
2. Responde o Grupo 1 com "ok" ou com o que quer diferente.
3. Eu preparo uma **fatia de ajuste** pequena com as mudanças aprovadas (provavelmente: treino com mais XP, mochila cheia, Náufrago, Sem Chama, custo da raça Rara) antes de qualquer F14.
