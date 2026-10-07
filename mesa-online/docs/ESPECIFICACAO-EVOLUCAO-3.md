# Especificação — Evolução 3: leilão, trocas e testes de navegador

## 1. Contexto

Depois das janelas de acontecimento e da câmera (Evolução 2), a família testou a mesa e aprovou a próxima leva:

1. **Trocas entre jogadores:** a parte social do jogo que faltava. Sem elas, ninguém completava cor e as partidas iam até o limite de rodadas.
2. **Leilão quando alguém recusa a compra:** a casa recusada não fica parada no banco.
3. **Ritmo das janelas configurável:** quem lê devagar pede mais tempo; quem já conhece o jogo quer menos.
4. **CI vermelho:** a auditoria do RPG Narrativo falhava (`source-map-js`, alerta GHSA-68fv-2mgg-jv7q).
5. **Testes de navegador no repositório**, rodando no CI, em vez de scripts soltos.
6. **Dividir `MagnataTable`**, que tinha passado de 600 linhas.

## 2. Regras

### 2.1 Leilão

| Tema | Decisão |
| --- | --- |
| Quando | Quem cai numa casa à venda e toca em "Não comprar" abre um leilão, se a sala tiver o leilão ligado (padrão: ligado) e houver mais de um jogador ativo. |
| Quem participa | Todos os jogadores ativos, **inclusive quem recusou**: pode ter recusado o preço de tabela e aceitar pagar menos. |
| Forma | **Lance secreto, uma rodada só.** Cada um dá um valor (ou passa, que é lance 0). Ninguém vê os lances dos outros até o fim: a visão pública (`publicRoom`) esvazia `auction.bids` e mostra só quem ainda falta. Lances abertos com vários turnos exigiriam um relógio por lance, o que a consulta periódica não faz bem. |
| Vencedor | O maior lance; no empate, quem vem primeiro na ordem da mesa a partir de quem está na vez. Paga ao banco. Se todos passam, a casa continua do banco. |
| Limites | Lance inteiro, de 0 até o dinheiro em caixa ("Seu lance passa do dinheiro que você tem."). Cada um dá um lance só ("Você já deu seu lance."). |
| Depois | A vez continua de onde estava (`phaseAfterResolution`): "Passar a vez" ou nova rolagem se tirou dupla. |
| Fim | O resultado mostra todos os lances acima de zero, para ninguém achar que foi enganado. |

### 2.2 Trocas

| Tema | Decisão |
| --- | --- |
| Quem propõe | Quem está na vez, **antes de rolar ou ao terminar** (fases `roll` e `end`). No meio de uma compra ou dívida, não: "Trocas só podem ser propostas no começo ou no fim da sua vez." |
| O que entra | Propriedades e dinheiro dos dois lados. Pelo menos uma propriedade (troca só de dinheiro seria doação ou empréstimo disfarçado). Ruas de uma cor com construções não entram: primeiro vende as construções. Hipotecadas podem entrar e continuam hipotecadas. |
| Uma por vez | A partida fica na fase `trade` até a resposta. Quem propôs pode cancelar; quem recebeu aceita ou recusa. |
| Revalidação | No aceite, o motor confere de novo dono, construções e dinheiro dos dois lados (`tradeError`). Se algo mudou, o aceite é recusado com o motivo e a proposta continua aberta para ser recusada. |
| Depois | Volta para a fase de onde saiu (`resumePhase`). |
| Saída de alguém | Falência ou desistência de um dos dois cancela a proposta; falência no meio de um leilão tira a pessoa da lista de quem falta. |

### 2.3 Quem precisa agir

Antes, só quem estava na vez agia. Agora `actorsNeeded(game)` (em `src/rooms/room.ts`) devolve:

- no leilão: quem ainda não deu lance;
- na troca: quem recebeu a proposta;
- senão: quem está na vez.

Robôs e ausentes entre esses jogam no ritmo da sala, e o prazo por jogada vale para as pessoas entre eles (quem estoura passa ao piloto automático, como antes). Uma jogada de alguém fora da vez também tira a pessoa do piloto automático.

## 3. Interface

- **Lobby:** opção "Leilão ao recusar uma compra" (ligada por padrão), também no resumo de quem não é anfitrião.
- **Leilão:** a janela de acontecimento segura aberta para quem ainda deve lance, **seja de quem for o lance narrado**, com botões rápidos (metade, preço, preço +20%), campo do valor, "Dar lance de $X" e "Passar". Quem já deu lance vê "Seu lance está guardado. Esperando o lance de…". O painel da vez mostra o mesmo, para quem fechou a janela.
- **Proposta:** botão "🤝 Propor troca" junto de "Rolar dados" e de "Passar a vez". Abre uma folha com: com quem trocar, "Você entrega" (propriedades e dinheiro), "Você pede a…", resumo e o motivo quando a troca ainda não vale. A janela de acontecimentos fica escondida enquanto a folha está aberta.
- **Resposta:** quem recebe vê os dois lados e "Aceitar troca" ou "Recusar"; quem propôs vê "Esperando X responder" e "Cancelar proposta".
- **Narração:** "Leilão", "deu um lance"/"passou no leilão", "Fim do leilão" com os lances, "Proposta de troca para X", "Troca feita", "Troca recusada", "Troca cancelada".
- **Tempo das janelas** (Preferências): rápido (×0,6), normal (×1) ou devagar (×1,6) sobre o tempo da Evolução 2. O tempo de 0,7 s do lance da própria pessoa já superado não muda.

## 4. Robôs

Detalhado em [`ROBOS.md`, seção 13.2](ROBOS.md#132-leilões-e-trocas-evolução-3). Resumo da simulação (300 partidas, 4 robôs, 60 rodadas):

| Medida | Antes | Com leilão e trocas |
| --- | --- | --- |
| Partidas decididas por falência | 35 | 167 |
| Média de rodadas | 58,3 | 51,7 |
| Propostas por partida | — | ~8, ~30% aceitas |
| Leilões vencidos | — | 1.003 |
| Ações ilegais | 0 | 0 |

Uma primeira versão da avaliação (só preço das propriedades) fez 12 mil propostas e nenhuma foi aceita, porque cada lado via o ganho do outro como perda igual. A versão final soma um bônus pela cor completa e pesa o ganho do rival por um fator menor que 1, e propõe permutas em que os dois completam uma cor.

## 5. Qualidade

- **CI do RPG:** `npm audit fix` atualizou `source-map-js` para 1.2.2 no `package-lock.json` do RPG; testes, lint, tipos e build do RPG continuam verdes.
- **`MagnataTable` dividido** em `TurnPanel` (painel e decisões da vez, casa atual), `PlayersPanel`, `AssetsPanel` (banco e bens), `HistoryPanel` e `Market` (leilão, resposta e montagem de troca). A mesa ficou com a orquestração: câmera, fila de lances, abas e folhas.
- **Testes do motor** (`src/games/magnata/market.test.ts`): abertura e fechamento do leilão, empate, lance acima do caixa, lances escondidos na visão pública, troca aceita/recusada/cancelada, revalidação no aceite, construções, falência no meio.
- **Testes dos robôs:** partidas com várias pessoas agindo fora da vez (`actorsNeeded`), com trocas e leilões acontecendo e nenhuma ação recusada pelo motor.
- **Testes de navegador** (`e2e/mesa.spec.ts`, Playwright, iPhone 13 simulado no Chromium, contra `next start`):
  1. partida solo: os robôs jogam, as janelas narram, a pessoa joga pelos botões da janela, Escape fecha e a câmera troca de modo;
  2. duas pessoas: sala por código, conversa, opção de leilão, leilão com lance e passe, proposta de troca aceita, Histórico;
  3. preferências: o tempo das janelas fica salvo depois de recarregar.

  Os dados são aleatórios, então os testes jogam em laço até o acontecimento esperado, com prazo, e conferem pela API pública. No CI, rodam depois do build, e o relatório fica guardado por 7 dias quando falham. Passaram 4 vezes seguidas localmente.

## 6. Critérios de aceite

- [x] Recusar uma compra abre um leilão secreto; todos dão lance; o maior leva e paga ao banco.
- [x] Ninguém vê os lances dos outros antes do fim (coberto por teste da visão pública).
- [x] Propor, aceitar, recusar e cancelar trocas, com revalidação no aceite.
- [x] Robôs dão lances e propõem e avaliam trocas; mais partidas terminam por falência.
- [x] Tempo das janelas configurável e salvo no aparelho.
- [x] CI verde no RPG e testes de navegador da Mesa no CI.

**Ainda não validado:** iPhone real com leilão e troca entre duas pessoas de verdade, e leitor de tela nas folhas de troca.
