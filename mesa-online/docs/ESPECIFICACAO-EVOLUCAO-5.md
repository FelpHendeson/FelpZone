# Especificação — Evolução 5: Funcoins, grupos privados, Truco e avisos no celular

## 1. Pedido

1. **Seguir as recomendações:**
   - grupos privados (a praça deixa de ser aberta ao site inteiro);
   - avisos no celular, com o site instalado na tela de início;
   - Truco como próximo jogo.
2. **Moeda Funcoins:** cada conta começa com **100 Funcoins** grátis e pode coletar **mais 100 por dia, durante 7 dias**.
3. **Preço da jogada definido ao criar a sala.**
4. **"Casa de apostas fake":** o termo mais correto é **moeda virtual de jogo** (como as fichas de um jogo de celular).
   - Não é casa de apostas porque a moeda **não se compra, não se saca e não vale dinheiro**.
   - Para continuar assim, Funcoins nunca podem ser vendidas por dinheiro real nem trocadas por prêmios.
   - Se um dia isso mudar, a lei de apostas (Lei 14.790/2023) passa a valer, com licença, verificação de identidade e tudo o mais.

## 2. Funcoins

| Tema | Decisão |
| --- | --- |
| Nome | **Funcoins** (🪙), no lugar de "fichas". Por dentro, o campo continua `chips`. |
| Conta nova | Começa com **100 Funcoins**. |
| Coleta diária | **100 Funcoins por dia, 7 vezes**, no máximo uma por dia (fuso de Brasília). Não precisam ser dias seguidos: pular um dia não faz perder a coleta. Depois da 7ª, acabou. O menu mostra "Coleta 3 de 7". |
| Contas que já existiam | Mantêm o saldo e começam as 7 coletas do zero. |
| Preço da jogada | É escolhido **ao criar a sala**, no menu, ao lado do jogo: **grátis, 10, 25, 50, 100 ou 250 Funcoins** por pessoa. No lobby ele aparece para todos e não muda, para quem entra saber o preço. Convidado sem conta só cria sala grátis. |
| Pote | Continua igual: preço × lugares. Quem vence leva; robôs apostam com Funcoins da casa. |
| Selo "Pote gordo" | Passa de 1.000 para **200 Funcoins** ganhas numa partida, na escala nova. |
| Sem saldo | Depois das 7 coletas, quem perder tudo continua jogando nas salas grátis. Sem compra, de propósito. |

## 3. Grupos privados

**Problema:** hoje qualquer pessoa que cria conta no site vê quem está online, acena, convida e conversa com a família.

| Tema | Decisão |
| --- | --- |
| Grupo | Tem nome (3–30 caracteres), dono, **código de convite** de 6 caracteres e até 30 membros. Cada conta participa de até 5 grupos (por exemplo, "Família" e "Amigos do trabalho"). |
| Entrar | Pelo código ou pelo link `/?grupo=CODIGO`, que abre o menu com o código preenchido. |
| Online | A lista mostra **só quem divide um grupo com você**. Quem não tem grupo vê um convite para criar ou entrar num. |
| Conversa | **Cada grupo tem a própria conversa** (com as últimas 50 mensagens), escolhida por abas. A praça aberta deixa de existir. |
| Aceno e convite | Só para quem divide um grupo com você e não te bloqueou. |
| Bloquear | No perfil de alguém. A pessoa bloqueada não acena nem convida, some da sua lista de online e as mensagens dela não aparecem para você. Dá para desbloquear no mesmo lugar. |
| Sair e remover | Qualquer membro sai do grupo. O dono remove membros. Se o dono sair, o grupo passa para o membro mais antigo; se ninguém sobrar, o grupo acaba. |

## 4. Avisos no celular (site instalado)

- **Site instalado:**
  - manifesto do app, ícones (192, 512 e 180 para o iPhone) e cor do tema;
  - aberto pelo ícone, funciona como app, sem a barra do navegador.
- **Service worker** (`public/sw.js`): mostra o aviso e, ao tocar, abre a sala ou o menu.
- **Ativar:** no menu, cartão "Avisos no celular".
  - No iPhone fora do app instalado, mostra o passo a passo: Compartilhar → Adicionar à Tela de Início → abrir pelo ícone → Ativar avisos (exige iOS 16.4 ou mais novo).
  - Nos outros, um botão pede permissão.
- **Quando avisa:**
  - "Sua vez no Dominó/Magnata/Truco", **só se a pessoa não estiver com aquela sala aberta**. A sala manda sinal a cada 30 s, e o aviso vai se o último sinal tiver mais de 45 s. No máximo um aviso por sala a cada 2 minutos.
  - Convite para uma sala.
  - Aceno.
- **Por dentro:**
  - Web Push com chaves VAPID nas variáveis de ambiente (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Sem elas, o cartão explica que os avisos estão desligados e nada quebra.
  - Até 5 aparelhos por conta. Inscrições recusadas pelo serviço (404 ou 410) são apagadas.
  - O envio roda depois da resposta (`after` do Next), sem atrasar a jogada.
- **Custo:** zero. O Web Push é gratuito nos navegadores.

## 5. Truco

### 5.1 Baralho e força das cartas

- **40 cartas** (sem 8, 9 e 10), em ordem crescente: 4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3.
- **Manilhas:** valem mais que todas as outras.
  - **Paulista:** vira-se uma carta (a **vira**); a manilha é o valor seguinte (vira 3 → manilha 4). Entre as quatro manilhas, a ordem é pelo naipe: ♦ < ♠ < ♥ < ♣ (zap).
  - **Mineiro:** manilhas fixas, sem vira: 4♣ (zap) > 7♥ (copas) > A♠ (espadilha) > 7♦ (pica-fumo).
- **Empate:** cartas comuns do mesmo valor empatam ("cangou").

### 5.2 Mão e rodadas

- **Jogadores:** 2 (1 contra 1) ou 4 (duplas frente a frente: 1º e 3º contra 2º e 4º).
- **Distribuição:** 3 cartas para cada um. Quem dá as cartas gira a cada mão, e começa quem está depois dele.
- **Rodadas:** melhor de 3. Quem ganha a rodada começa a próxima. No empate, começa de novo quem abriu a rodada empatada.
- **Quem ganha a mão:**
  - quem fizer 2 rodadas;
  - se a 1ª empatou, ganha quem vencer a próxima rodada que não empatar;
  - se a 1ª teve vencedor e alguma das seguintes empatou, ganha quem fez a 1ª;
  - se as três empatarem, ninguém marca.
- **Carta coberta:** a partir da 2ª rodada, dá para jogar uma carta virada. Ela perde para qualquer carta e nunca é revelada.

### 5.3 Truco

- **Pedir:** na sua vez, antes de jogar a carta, você pede **Truco** (a mão passa a valer 3). Os pedidos seguintes são Seis, Nove e Doze.
- **Responder:** quem responde é a dupla adversária (no 1x1, o adversário; nas duplas, o próximo adversário na ordem). Pode:
  - **aceitar**: a mão passa a valer o pedido;
  - **correr**: a dupla que pediu ganha a mão com o valor de antes do pedido;
  - **aumentar**: pede o valor seguinte, e quem pediu antes é que responde.
- **Quem pode pedir:** a mesma dupla não pede duas vezes seguidas; só depois de a outra aumentar.

### 5.4 Mão de onze e fim

- **Mão de onze:** quando só uma dupla tem 11 pontos, ela vê as cartas (cada um vê as do parceiro) e decide:
  - **jogar**: a mão vale 3, sem truco;
  - **correr**: a outra dupla ganha 1.
- **As duas duplas com 11:** a mão vale 1, sem truco.
- **Fim da partida:** vence quem chega a **12 pontos**.
- **Desistir:** quem desiste entrega a partida para a outra dupla.

### 5.5 Visão, robôs e selos

- **O que cada um vê:** só a própria mão (e a do parceiro na mão de onze). As cartas jogadas são públicas; as cobertas aparecem viradas.
- **Robôs:**

| Nível | Como joga |
| --- | --- |
| Fácil | Joga a carta mais fraca que vence a rodada (ou a mais fraca de todas). Não pede truco e aceita quando tem manilha. |
| Médio | Pede truco com mão forte, blefa de vez em quando (8%), aceita conforme a força e o valor pedido, joga baixo quando o parceiro já está ganhando a rodada e cobre carta perdida. |
| Difícil | Como o médio, mas também aumenta com mão muito forte, guarda a manilha para a última rodada quando já ganhou a primeira e decide a mão de onze pela força das duas mãos. |

- **Selos novos:**

| Selo | Como ganhar |
| --- | --- |
| 🃏 Truqueiro | Vencer uma partida de truco. |
| 🔔 Doze! | Ganhar uma mão de truco valendo 12. |

## 6. Critérios de aceite

- [x] Conta nova com 100 Funcoins; 7 coletas de 100, uma por dia, e depois acaba (teste de servidor e de navegador).
- [x] Preço escolhido ao criar a sala e mostrado no lobby, sem mudar.
- [x] Online, conversa, aceno e convite só entre membros de um grupo; bloquear funciona (`src/server/social.test.ts`).
- [x] Truco paulista e mineiro, 1x1 e duplas, com as regras cobertas por 17 testes (`src/games/truco/engine.test.ts`), incluindo 100 partidas só de robôs.
- [x] Site instalável (manifesto, ícones, service worker), com avisos de vez, convite e aceno quando houver chaves VAPID.
- [x] Testes de navegador cobrindo Funcoins, grupos e Truco contra robôs (`e2e/contas.spec.ts`).

**Ainda não validado:**

- os avisos num iPhone de verdade: as chaves VAPID precisam ser cadastradas na Vercel (passo a passo no README; a integração da Vercel nesta sessão não tinha permissão para gravar variáveis);
- Truco em duplas com quatro pessoas reais.
