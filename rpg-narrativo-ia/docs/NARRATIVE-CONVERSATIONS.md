# Conversas com personagens

As cenas do primeiro arco agora têm falas em modo visual novel (`script`). As conversas opcionais aprofundam cada personagem e só aparecem quando a história chega nelas (`hideUntilReady`).

## Cenas do arco com falas

Os 42 eventos da campanha têm roteiro de cena. O `body` corrido continua no pack como resumo (histórico e crônica).

- **Vozes:**
  - **Mira** é cuidadosa e prática, fala "a gente" e usa a enfermagem como referência.
  - **Caio** tem frases curtas, pensa em procedimento e segurança, e é cansado e protetor.
  - **Davi** é falante, faz referências de jogos, faz piada de si mesmo e insiste em decidir por conta própria.
- **Reatividade:** as linhas condicionais respondem a:
  - a aptidão escolhida (`ability.has`);
  - a confiança em Mira (`relationship.min`);
  - fogueira acesa e energia baixa;
  - escolhas anteriores (vigília, cuidado com Davi, postura do dia 5);
  - a sensação da Etéris (pressão, calor ou vibração).

## Conversas opcionais

| Conversa | Onde | Quando aparece | Flag gravada | Tema |
| --- | --- | --- | --- | --- |
| O que ficou do outro lado (Mira) | Clareira | a partir do dia 2, se o contato com Mira não foi encerrado | `mira.talk.before` | o plantão em que ela estava; o Seu Lauro |
| Mãos que tremem (Mira) | Nascente | dia 3, depois da anterior | `mira.talk.fear` | travar diante de um ferimento; virar "só a enfermeira" |
| Um lugar para ficar (Mira) | Clareira | dia 5, depois da anterior | `mira.talk.roots` | a enfermaria fixa; criar raízes ou explorar |
| Por que ele não dorme (Caio) | Margem Rochosa | dia 3, com contato com os sobreviventes | `caio.talk.nights` | o turno da noite em que cochilou |
| Força demais (Caio) | Nascente | dia 5, depois da anterior | `caio.talk.strength` | ser o mais forte sem querer mandar |
| As teorias do Davi (Davi) | Margem Rochosa ou Clareira | dia 3, com contato | `davi.talk.system` | jogo, simulação ou um Sistema que aprende |
| O que o Davi deixou (Davi) | Margem Rochosa ou Clareira | dia 4, depois da anterior | `davi.talk.home` | a irmã Bia, de nove anos |

Cada conversa tem três respostas. Elas mudam a confiança (de −4 a +10) e gravam uma flag do tom escolhido, para cenas futuras:

- **Mira:** `mira.infirmary.supported`, `mira.infirmary.explorer` e `mira.infirmary.doubted`.
- **Caio:** `caio.strength.separate` e `caio.strength.lead`.
- **Davi:** `davi.home.promised`.

## Onde as conversas voltam

- **Dia 5:** depois de ouvir o Caio, o protagonista lembra que ele não quer mandar em ninguém.
- **Dia 6:** quando se discute poupar Davi, o protagonista lembra da irmã dele.
- **Dia 7, no Registro regional:**
  - Davi pensa na irmã, se você prometeu procurá-la;
  - Caio teme alguém forte "sem ninguém pra dizer não";
  - Mira lembra da enfermaria, se você apoiou a ideia.

## Ainda não escrito

- Variação de tom por postura no dia 6.
- Conversas com Rowan, que chega depois do primeiro arco.
- Uma consequência mecânica da enfermaria, como uma estrutura ou um bônus de cura.
