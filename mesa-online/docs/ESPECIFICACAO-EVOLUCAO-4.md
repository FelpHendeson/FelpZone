# Especificação — Evolução 4: dominó, contas, fichas, apostas, conquistas e quem está online

## 1. Pedido

1. **Um novo jogo: dominó, em várias modalidades.**
2. **Escolher no menu de qual jogo será a sala.**
3. **Contas:** e-mail em formato válido, conta única por e-mail e apelido único.
4. **Dinheiro ligado à conta.**
5. **Apostas** em cada partida de cada jogo.
6. **Contadores de vitórias e selos de conquistas**, exibidos na sala e no menu.
7. **Ver quem está online e interagir** já no menu.

## 2. Decisões que valem para tudo

| Tema | Decisão | Por quê |
| --- | --- | --- |
| Dinheiro | **Fichas virtuais**, sem valor real: não se compram, não se sacam e não se trocam por nada. Cada conta começa com **1.000 fichas** e pode pegar um **bônus diário de 100**. | Apostar dinheiro de verdade exige licença de apostas no Brasil, meios de pagamento, verificação de idade e identidade, e tem custo, o que o projeto não pode ter. As fichas dão a graça da aposta sem nenhum desses riscos. |
| Contas | Opcionais. **Convidado** continua jogando como hoje, sem cadastro. Aposta, vitórias, selos, lista de online, praça e convites exigem conta. | Ninguém da família perde o jeito simples que já usa. |
| E-mail | O formato é validado e o e-mail é único (sem diferenciar maiúsculas), mas **não é confirmado** (não enviamos e-mail). | Mandar e-mail tem custo e exige provedor. Por isso também não existe "esqueci a senha": a página avisa isso no cadastro. |
| Apelido | De 3 a 16 caracteres: letras (com acento), números, `_` ou `.`, começando por letra. É único, sem diferenciar maiúsculas nem acentos ("Jose" e "josé" são o mesmo). Nomes de sistema, como "robo", "admin", "banco" e "casa", são reservados. | Evitar se passar por outra pessoa ou pelo sistema. |
| Senha | Mínimo de 8 caracteres. Guardada só como hash `scrypt` com sal. A sessão fica num cookie `httpOnly` com validade de 30 dias e, no servidor, só o hash do token. | Proteger a senha mesmo se o banco vazar, e sem o JavaScript da página ver o token. |
| Abuso | Limites de frequência: 10 cadastros por hora por IP (a família costuma dividir o mesmo Wi-Fi); 10 tentativas de login a cada 10 min por IP e outras 10 por e-mail; 10 mensagens por minuto na praça; 20 convites ou acenos a cada 10 min. | |
| Privacidade | O repositório é público e nada sensível fica no código. O e-mail nunca aparece para outras pessoas: o perfil público tem só apelido, retrato, vitórias e selos. | |

## 3. Dominó

### 3.1 Peças e mão

- **Peças:** as 28 pedras de duplo-seis (0–0 a 6–6).
- **Linha:** a mesa é uma linha com duas pontas, sem "spinner": a carroça não abre quatro pontas.
- **Distribuição:**

| Modalidade | Jogadores | Pedras por pessoa | Monte |
| --- | --- | --- | --- |
| Bloqueio | 2–4 | 7 | Sem monte (o que sobra "dorme") |
| Compra | 2–4 | 7 com 2 pessoas; 5 com 3 ou 4 | Compra do monte |
| Pontos (5 em 5) | 2–4 | 7 com 2 pessoas; 5 com 3 ou 4 | Compra do monte |
| Duplas | 4 (2×2, parceiros frente a frente) | 7 | Todas as pedras são distribuídas |

- **Quem começa a primeira mão:** quem tem a maior carroça (6–6, depois 5–5…) começa e é obrigado a jogá-la. Se ninguém tiver carroça, começa quem tiver a pedra mais alta.
- **Quem começa as outras mãos:** quem ganhou a mão anterior, com qualquer pedra. Se a mão anterior empatou, começa quem estava depois de quem começou.

### 3.2 A vez

- A pessoa encaixa uma pedra numa das pontas. Se ela servir nas duas pontas e elas forem diferentes, a pessoa escolhe o lado.
- **Sem pedra que sirva,** o próprio sistema resolve, porque não há escolha a fazer:
  - nas modalidades com compra, compra do monte até poder jogar ou o monte acabar;
  - se ainda assim não puder jogar, **passa**.
  - Isso aparece na narração ("Ana comprou 2", "Bia passou").
- **Bater:** quem fica sem pedras bate e encerra a mão.
- **Trancar:** se todos passam seguidos, a mão está trancada e ninguém mais joga.

### 3.3 Pontuação

- **Bloqueio e Compra:**
  - quem bate ganha a soma dos pontos das mãos de todos os adversários;
  - na mão trancada, ganha quem tiver menos pontos na mão, levando a soma dos outros. Empate entre os menores: ninguém pontua.
  - Meta da partida: **50 (padrão), 100 ou 150 pontos**, ou **mão única**.
- **Pontos (5 em 5):**
  - a cada pedra jogada, se a soma das pontas for múltiplo de 5, quem jogou marca essa soma;
  - uma carroça na ponta conta pelos dois lados, e a primeira pedra da mão conta pelo seu total;
  - ao bater ou na mão trancada, a pessoa leva os pontos dos adversários arredondados para o múltiplo de 5 mais próximo.
  - Meta: **100 (padrão), 150 ou 200**. A partida termina na hora em que alguém chega à meta.
- **Duplas** (o jogo de mesa de bar), para a dupla que bate:

| Batida | Pontos |
| --- | --- |
| Simples | 1 |
| Carroça (a última pedra é uma carroça) | 2 |
| Lá-e-lô (a última pedra serve nas duas pontas, que são diferentes) | 3 |
| Cruzada (a última pedra é uma carroça que serve nas duas pontas) | 4 |

  - Mão trancada: a dupla com menos pontos somados nas mãos ganha 1 ponto. Empate: ninguém pontua.
  - Meta: **6 pontos (padrão), 3 ou 12**, ou mão única.
- **Fim da mão:** a mão termina numa tela de resultado com as pedras de todos à mostra. Qualquer pessoa toca em "Próxima mão"; com robôs ou ausentes, a próxima mão começa sozinha depois de 6 s.
- **Fim da partida:** vence quem (ou a dupla que) tiver mais pontos ao atingir a meta. Em mão única, vence quem ganhou a mão; se ela empatou, todos os empatados vencem.
- **Desistência:**
  - no individual, quem desiste sai e suas pedras dormem;
  - em duplas, quem desiste entrega a partida para a outra dupla.

### 3.4 Visão de cada um

- O servidor é a autoridade, como no Magnata.
- **Cada pessoa vê só a própria mão.** A consulta da sala manda o token do assento, e a resposta mostra a mão de quem consultou, a quantidade de pedras dos outros e o tamanho do monte.
- As mãos só aparecem para todos no resultado da mão.

### 3.5 Robôs

| Nível | Como joga |
| --- | --- |
| Fácil | Uma pedra válida qualquer. |
| Médio | A pedra mais pesada, com preferência para carroças. É também o piloto automático de quem está ausente. |
| Difícil | Pesa os pontos da jogada (no 5 em 5), o peso da pedra, se é carroça e quantas pedras dele continuam servindo nas novas pontas. Não vê a mão de ninguém. |

## 4. Contas, fichas e apostas

### 4.1 Carteira

- `fichas` é o saldo disponível. Ao começar uma partida com aposta, a entrada sai do saldo e vira uma **retenção** (`hold`) ligada à partida (`matchId`).
- **Liquidação:**
  - **Fim da partida:** cada retenção é liquidada de forma idempotente (só quando ainda existe): o pote vai para quem venceu e as estatísticas são atualizadas.
  - **Partida sumida:** se a sala expirou ou a partida não existe mais, a entrada volta para a pessoa.
- **Quando liquida:** logo depois que a partida termina e, de novo, sempre que a conta é lida. Assim, uma falha no meio nunca deixa ficha presa nem paga duas vezes.
- **Partidas sem aposta** também criam uma retenção de 0 fichas: é ela que garante contar a vitória uma vez só.

### 4.2 Aposta por partida

- **Valor:** o anfitrião escolhe a aposta no lobby: sem aposta, 50, 100, 250, 500 ou 1.000 fichas por pessoa.
- **Quem pode estar na mesa:**
  - com aposta, todas as pessoas precisam de conta: convidado não entra, e o anfitrião não liga a aposta com convidados na mesa;
  - **robôs apostam com fichas da casa**: se um robô ganha, a parte dele fica com a casa. Isso deixa apostar jogando sozinho.
- **Saldo:** ao começar, todos precisam ter o valor ("Ana não tem fichas suficientes"). Se faltar para alguém, ninguém é cobrado.
- **Pote:** `aposta × lugares na mesa`. Quem vence divide em partes iguais. No empate, o pote é dividido entre os empatados e o resto da divisão fica com a casa. Em duplas, as duas pessoas da dupla vencedora dividem.
- **Desistir ou sair** no meio é perder a aposta.

### 4.3 Vitórias e selos

- **Estatísticas:** partidas e vitórias, no total e por jogo, sequência atual e melhor sequência, e fichas ganhas.
- **Selos:**

| Selo | Como ganhar |
| --- | --- |
| 🏅 Primeira vitória | Vencer uma partida. |
| 🥈 Dez vitórias | Vencer 10 partidas. |
| 🥇 Cinquenta vitórias | Vencer 50 partidas. |
| 🔥 Em chamas | Vencer 3 partidas seguidas. |
| 🎖️ Veterano | Jogar 25 partidas. |
| 🏙️ Magnata | Vencer uma partida de Magnata. |
| 🏨 Hoteleiro | Terminar uma partida de Magnata com um hotel. |
| 🁫 Bom de pedra | Vencer uma partida de dominó. |
| 🤝 Dupla afinada | Vencer uma partida de dominó em duplas. |
| ↔️ Lá-e-lô | Bater de lá-e-lô. |
| ✖️ Cruzada | Bater de cruzada. |
| 🎲 Apostador | Ganhar uma partida com aposta. |
| 💰 Pote gordo | Ganhar 1.000 fichas ou mais numa partida. |

- **Onde aparecem:**
  - no menu: perfil com vitórias, fichas e todos os selos;
  - na lista de online, na sala e no lobby: vitórias e até 3 selos, os mais raros primeiro, ao lado do nome;
  - no perfil público de cada jogador.

## 5. Online e praça

- **Presença:**
  - quem tem conta e está com o site aberto aparece online. O menu atualiza a cada 10 s, e a sala manda um sinal a cada 30 s;
  - fica online por até 60 s depois do último sinal, com onde está: "no menu" ou "jogando Dominó";
  - para caber no plano gratuito do Redis, cada atualização do menu é **um único comando** (script Lua): registra a presença e devolve quem está online, a praça e os avisos recebidos.
- **Interações no menu:**
  - **Praça:** conversa geral, com as últimas 50 mensagens;
  - **👋 Acenar:** aparece como aviso para a pessoa;
  - **Convidar:** chama alguém para a sua sala que está no lobby. O convite tem botão "Entrar";
  - **Ver perfil:** vitórias por jogo, selos e sequência.

## 6. Menu e salas

- **Novo jogo:** escolha do jogo (Magnata ou Dominó). No dominó, também a modalidade. Depois, "Jogar com amigos" ou "Jogar contra robôs":
  - no Magnata, a sala tem 3 robôs;
  - no dominó individual, 2 robôs;
  - nas duplas, 3 robôs (um é seu parceiro).
- **No lobby:**
  - o anfitrião ainda pode trocar a modalidade e a meta do dominó, e a aposta vale para os dois jogos;
  - com 4 pessoas, a posição na lista define as duplas: a 1ª e a 3ª contra a 2ª e a 4ª.
- **Conta e assento:** quem tem conta entra com o apelido e o retrato da conta, e o assento fica ligado a ela (`userId`).

## 7. Arquitetura

- `src/games/domino/` tem o motor puro: modalidades, pontuação, visão por jogador e robôs.
- `src/games/modules.ts` tem o adaptador de jogos. A sala (`rooms/room.ts`) deixa de conhecer o Magnata diretamente e chama, por `gameId`:
  - `start`, `act`, `actorsNeeded`, `autoplay`, `resign`, `outcome` e `view`.
- `src/accounts/` tem regras puras de conta: validação, carteira, liquidação, selos e cartão público.
- `src/server/accounts.ts` e `src/server/kv.ts` cuidam do armazenamento (memória no desenvolvimento, Redis em produção), das sessões, da presença e da praça.
- **Resultados das partidas:** ficam guardados na própria sala (`room.results`), com os vencedores, o pote, os pagamentos e os feitos de cada um. É isso que permite liquidar depois.
- **Rotas:**
  - `/api/conta` (cadastro, `GET` da própria conta), `/api/conta/entrar`, `/api/conta/sair`, `/api/conta/bonus` e `/api/conta/retrato`;
  - `/api/praca` (`GET` atualiza presença, online, praça e avisos; `POST` conversa, aceno e convite);
  - `/api/jogadores/[apelido]` (perfil público).

## 8. Critérios de aceite

- [x] Criar sala de Magnata ou de dominó pelo menu, nas quatro modalidades, contra pessoas ou robôs.
- [x] As regras do dominó estão cobertas por testes (`src/games/domino/engine.test.ts`, 24 testes): distribuição, quem começa, compra e passe automáticos, batida, tranca, as quatro batidas das duplas, pontos do 5 em 5, metas, desistência e mais de 170 partidas só de robôs.
- [x] Cada pessoa vê só a própria mão (teste da sala e no navegador).
- [x] Cadastro recusa e-mail mal formado, e-mail repetido e apelido repetido, inclusive com acento ou maiúscula diferente (`src/server/accounts.test.ts`).
- [x] Aposta: cobra a entrada ao começar, paga o pote a quem vence uma única vez, não cobra ninguém se faltar ficha para alguém e devolve a entrada se a sala sumir.
- [x] Vitórias e selos aparecem no menu e na sala.
- [x] Duas pessoas logadas se veem online, conversam na praça e trocam aceno e convite (teste de navegador).
- [x] Testes de navegador (`e2e/contas.spec.ts`) cobrem cadastro, apelido repetido, bônus, dominó contra robô com aposta e a praça com convite até o lobby.

**Ainda não validado:**

- iPhone real (Safari) com duas pessoas no dominó em duplas;
- o script Lua da praça no Upstash de produção. Se o Upstash recusar o acesso a chaves não declaradas, o servidor faz o mesmo em passos separados (o resultado é igual, só gasta mais comandos).
