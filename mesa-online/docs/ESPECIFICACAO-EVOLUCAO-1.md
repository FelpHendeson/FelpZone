# Especificação — Evolução 1 do Mesa Online

Base: [`docs/mesa-online-analise-e-roadmap.md`](../../docs/mesa-online-analise-e-roadmap.md) (análise da versão `af6933f`).
Este documento registra:

1. o veredito sobre cada problema apontado na análise;
2. as decisões que a análise deixou em aberto (seção 15 dela);
3. a especificação das funções pedidas por Felipe, já com modelo de dados, API, interface, casos-limite, testes e critérios de aceite.

Tudo o que está marcado como **escopo desta evolução** foi implementado em seguida. O que ficou de fora está na seção 11.

## 1. Leitura da análise

A análise é sólida e quase toda verificável no código. Concordo com a tese central: tornar o Magnata confiável e comunicativo antes de multiplicar jogos e regras.

Há três pontos em que a execução diverge do roadmap proposto, por decisão consciente:

- **Ausência entra já, não só na etapa 3.** A análise classifica a ausência como problema de prioridade alta (3.3), e a solução (piloto automático) reaproveita os robôs que já existem. Seria incoerente corrigir o resto da etapa 0 e deixar a mesa travável.
- **Temas e crédito entram nesta evolução**, porque foram pedidos explicitamente. Temas são só visuais e não tocam as regras. O crédito entra como **regra opcional desligada por padrão**, com limites que impedem dinheiro infinito e adiamento eterno da falência. Respondo às perguntas da seção 9.2 da análise na seção 9 abaixo.
- **Tema "Naruto" não será publicado.** Pela mesma razão apontada na análise (8.3), personagens, nomes e símbolos da obra têm dono. Entra um tema ninja **original** ("Vila Ninja"), que explora a mesma atmosfera sem usar material protegido.

## 2. Veredito sobre os problemas apontados

| # | Problema (análise) | Veredito | Evidência no código | Ação |
| --- | --- | --- | --- | --- |
| 3.1 | Ordem das cartas exposta | **Válido, grave** | `readRoom`/`runRoomCommand` devolviam `room` inteiro, inclusive `game.decks` | Visão pública da sala (seção 3.1) |
| 3.2 | Identidade depende de armazenamento que pode falhar | **Válido** | `writeStorage` engolia o erro e `useSeat` relia do mesmo `localStorage` | Memória de sessão + aviso + link de retomada (3.2) |
| 3.3a | Lobby oferece "Sair" que o servidor recusa | **Válido** | botão aparecia com `players.length > 1`, contando robôs | Mostrar só quando há outra pessoa; explicar alternativa (3.3) |
| 3.3b | Anfitrião ausente impede revanche | **Válido** | `rematch` exigia `hostId` | Qualquer pessoa da mesa pode pedir revanche (3.3) |
| 3.3c | Ausência trava a partida | **Válido** | sem prazo por jogada | Prazo + piloto automático (seção 7) |
| 3.4 | Robôs dependem das consultas; GET altera estado | **Válido como limitação, não como erro** | decisão de custo zero documentada | Mantém; aviso explícito na mesa e indicador de reconexão (3.4) |
| 3.5 | Tabuleiro pequeno no celular | **Válido (risco)** | casas de ~30 px e fonte de 5,5–9 px | Cartão da casa atual + modo ampliado (6.3) |
| 3.6 | Sem limitação de frequência | **Válido** | nenhuma verificação nas rotas | Limites por IP e por jogador (3.5) |
| 3.7 | "Até alguém falir" impreciso | **Válido** | a partida acaba quando resta um jogador | "Até restar um jogador" |
| 3.7 | "Link copiado!" mesmo com falha | **Válido** | `setCopied(true)` após `catch(() => {})` | Confirmar só em sucesso; campo manual como alternativa |
| 3.7 | Janela de detalhes sem foco/Escape | **Válido** | `TileSheet` sem gestão de foco | Foco inicial, Escape, retorno de foco (3.6) |
| 3.7 | Abas sem relação com painéis | **Válido** | `role="tab"` sem `aria-controls` | `aria-controls`, `tabpanel` e setas (3.6) |
| 3.7 | Informação só por cor | **Parcialmente válido** | dono da casa aparecia só como faixa colorida | Retrato do dono na casa e nome no detalhe (6.3) |
| 10.3 | "30 rodadas" virava turnos pelo nº inicial de jogadores | **Válido** | `turnLimit = rounds × jogadores iniciais`; com falências, cada rodada tem menos turnos | Contador real de rodadas no motor (3.7) |
| 11.2 | Falta de Redis em produção vira memória isolada silenciosa | **Válido** | só um `console.warn` | Em produção sem Redis, a API responde 503 com mensagem clara (3.8) |
| 11.2 | Comandos reenviados podem repetir efeito | **Válido (risco)** | sem identificador de comando | `commandId` idempotente (3.9) |
| 11.3 | Estimativa de consumo tratada como medição | **Válido** | README dizia "15 mil comandos por hora" sem medição | Texto do README passa a dizer "estimativa" e o que mede |
| 2.1 | "Cópia local não continha `mesa-online`" | Observação do ambiente do analista, não do projeto | — | Nenhuma |

Um ponto da análise que **não** se confirma como erro: "a saída do último humano no lobby foi recusada" é o comportamento correto do servidor, porque uma sala precisa de alguém para iniciar. O erro real era a interface oferecer o botão. Fica corrigido em 3.3.

## 3. Correções essenciais (escopo desta evolução)

### 3.1 Visão pública da sala

- Nova função pura `publicRoom(room): PublicRoom` em `src/rooms/public.ts`. Ela remove:
  - `game.decks` (ordem das cartas);
  - `room.recentCommands` (seção 3.9);
  - qualquer dado interno do motor que o cliente não precise.
- **Todas** as respostas usam `publicRoom`: criação, entrada, consulta e comandos. As rotas recebem `PublicRoom` por tipo, então é impossível devolver a sala crua sem erro de compilação.
- A carta revelada continua visível: o estado guarda a última carta (`lastCard`) com `deck` e `cardId`.
- **Teste:** a resposta serializada de cada rota não contém `decks`, nenhum `cardId` futuro, token nem hash.

### 3.2 Identidade resiliente

- `src/client/seats.ts` passa a ter uma camada em memória. `saveSeat` grava na memória **e** tenta o `localStorage`; `useSeat` lê primeiro a memória. A sessão atual continua jogável mesmo sem armazenamento.
- `storageAvailable()` testa gravação e remoção. Sem armazenamento, a sala mostra um aviso: "Este navegador não está guardando dados. Se recarregar a página, use o link de retomada."
- **Link de retomada:** o menu da sala oferece "Continuar em outro aparelho" e copia `/sala/CODIGO#retomar=<playerId>.<token>`.
  - O fragmento `#` não é enviado ao servidor nem aparece em logs.
  - Ao abrir o link, o cliente grava o assento e limpa o fragmento com `history.replaceState`.
  - O link dá o controle do assento, por isso vem com o aviso "não compartilhe".
- Recuperar um assento nunca depende só do nome: exige o token.

### 3.3 Saída e revanche

- **Lobby:** "Sair da sala" só aparece quando há outra pessoa (não robô). Para a única pessoa com robôs, aparece "Voltar ao início", com a explicação de que a sala expira sozinha.
- **Revanche:** qualquer pessoa ativa na sala pode pedir. O anfitrião continua sendo quem inicia a partida no lobby.
- Se o anfitrião sair do lobby, o comando passa para a próxima pessoa (já implementado).

### 3.4 Robôs e consultas

- Mantém o modelo atual (custo zero). A mesa mostra "Os robôs jogam enquanto alguém estiver com a sala aberta".
- O cliente mostra "Reconectando…" quando a última consulta falhou e retoma imediatamente ao voltar para a aba (já existia o retorno; falta o indicador).

### 3.5 Limitação de frequência

- `RoomStore.hit(key, limit, windowSeconds): Promise<boolean>`: no Redis usa `INCR` + `EXPIRE` atômicos via Lua; na memória usa um mapa com janela.
- Limites, todos em janela fixa:

| Operação | Chave | Limite |
| --- | --- | --- |
| Criar sala | IP | 12 / 10 min |
| Entrar em sala | IP | 30 / 10 min |
| Comandos de jogo | jogador | 90 / min |
| Mensagens de chat | jogador | 15 / min |

- **Consultas periódicas não são limitadas:** várias pessoas da mesma casa compartilham IP, e a consulta já é barata.
- IP: primeiro valor de `x-forwarded-for` (a Vercel preenche), com `x-real-ip` como alternativa.
- Resposta 429 com "Muitas ações em pouco tempo. Aguarde alguns segundos."

### 3.6 Acessibilidade imediata

- **Detalhe da casa:**
  - foco no título ao abrir;
  - Escape fecha;
  - o foco volta ao elemento que abriu;
  - `aria-modal="true"`.
- **Abas:** `id`/`aria-controls`, painel com `role="tabpanel"` e `aria-labelledby`, setas ←/→ trocando de aba.
- **Avisos de acontecimento:** região `aria-live="polite"`. O foco nunca é deslocado por jogada de outra pessoa.

### 3.7 Rodadas de verdade

- O motor ganha `round` (começa em 1) e `roundLimit`.
- A rodada avança quando a vez volta ao primeiro jogador ativo na ordem da mesa.
- Com `roundLimit`, a partida termina ao final da última rodada e vence o maior patrimônio.
- `turnLimit` continua existindo para os robôs e testes (spec ROBOS).
- A sala passa a usar `roundLimit`. O contador na mesa mostra "Rodada X de Y".

### 3.8 Armazenamento em produção

- Em produção (`VERCEL=1` ou `NODE_ENV=production` fora de testes) **sem** variáveis do Redis, as rotas respondem 503: "O servidor está sem banco de dados configurado."
- O desenvolvimento local continua usando memória.

### 3.9 Comandos idempotentes

- O cliente envia `commandId` (UUID) em cada comando.
- A sala guarda os últimos 40 ids em `recentCommands`. Um id repetido devolve a sala atual **sem** reaplicar o comando.
- Comandos sem `commandId` continuam aceitos, por compatibilidade com scripts.

## 4. Decisões que a análise deixou em aberto (seção 15)

| Pergunta | Decisão |
| --- | --- |
| 1. Durações e apresentação dos avisos | Aviso rápido: 2,5 s. Cartão de acontecimento: 4,5 s ou toque para fechar. Resultado da partida: fica até ser fechado. Decisões continuam no painel do turno, sem janela obrigatória. |
| 2. Identidade | Perfil **local** nesta etapa, mais o link de retomada para trocar de aparelho. Conta com recuperação fica para depois. |
| 3. Ausência | O anfitrião escolhe o prazo no lobby: desligado, 1, 2 ou 5 min (padrão **2 min**). Ao estourar, o **piloto automático** joga pela pessoa até ela voltar. É regra anunciada no lobby, sem votação. |
| 4. Temas | Clássico, Maceió, São Paulo, Brasil (capitais) e Vila Ninja (original). Todos só visuais. |
| 5. Regras | Modo clássico por padrão. Regra opcional "Empréstimos do banco", identificada como **variante** no lobby. |
| 6. Crédito | Seção 9: banco único credor, um empréstimo por vez, limite pela garantia, taxa fixa e prazo em turnos próprios. |
| 7. Robôs | Continuam pausando sem página aberta, com aviso explícito (3.4). |

## 5. Acontecimentos compartilhados (pedido de Felipe)

### 5.1 Modelo

O motor deixa de produzir frases e passa a emitir **eventos estruturados**. O texto é montado no cliente, com o tema escolhido. O antigo `log` de texto é substituído por `events`.

```ts
interface GameEventBase { seq: number; round: number; actorId: string | null }
type GameEvent = GameEventBase & (
  | { type: "game-start"; order: string[] }
  | { type: "turn-start"; playerId: string }
  | { type: "roll"; playerId: string; dice: [number, number]; doubles: boolean }
  | { type: "move"; playerId: string; from: number; to: number; via: "dice" | "card" }
  | { type: "salary"; playerId: string; amount: number }
  | { type: "buy"; playerId: string; tile: number; price: number }
  | { type: "decline"; playerId: string; tile: number }
  | { type: "rent"; playerId: string; ownerId: string; tile: number; amount: number;
      basis: "base" | "group" | "houses" | "stations" | "utility" }
  | { type: "rent-waived"; playerId: string; ownerId: string; tile: number }
  | { type: "tax"; playerId: string; tile: number; amount: number }
  | { type: "card"; playerId: string; deck: DeckId; cardId: string }
  | { type: "card-money"; playerId: string; amount: number }   // + recebe, − paga
  | { type: "jail"; playerId: string; reason: "tile" | "card" | "doubles" }
  | { type: "jail-stay"; playerId: string; attempt: number }
  | { type: "jail-release"; playerId: string; method: "doubles" | "fine" | "card" | "served"; amount: number }
  | { type: "build" | "sell-building"; playerId: string; tile: number; houses: number; amount: number }
  | { type: "mortgage" | "unmortgage"; playerId: string; tile: number; amount: number }
  | { type: "debt"; playerId: string; creditorId: string | null; amount: number; shortfall: number }
  | { type: "debt-paid"; playerId: string; creditorId: string | null; amount: number }
  | { type: "bankrupt"; playerId: string; creditorId: string | null; resigned: boolean }
  | { type: "loan-taken"; playerId: string; amount: number; due: number; turns: number }
  | { type: "loan-repaid"; playerId: string; amount: number; early: boolean }
  | { type: "loan-due"; playerId: string; amount: number }
  | { type: "away" | "back"; playerId: string }
  | { type: "game-end"; winnerId: string; reason: "bankruptcy" | "turn-limit" | "round-limit"; netWorth: number | null }
);
```

- `seq` é sequencial por partida. O estado guarda os últimos **120** eventos.
- Eventos são gravados no mesmo `state` da jogada, portanto na mesma escrita otimista por versão. Mudança e eventos são atômicos.
- Nenhum evento carrega a ordem dos baralhos nem tokens. `card` revela só a carta já sorteada.

### 5.2 Apresentação no cliente

`describeEvent(event, ctx)` devolve `{ icon, title, text, level: "quick" | "card" | "result", tone }`.

| Nível | Eventos | Comportamento |
| --- | --- | --- |
| `quick` | `turn-start`, `roll`, `move`, `salary`, `decline`, `jail-stay`, `back` | Pílula no topo, 2,5 s, não bloqueia nada |
| `card` | compra, aluguel, aluguel suspenso, imposto, carta, prisão, saída da prisão, construção, venda, hipoteca, quitação, dívida, falência, empréstimos, `away` | Cartão com retrato, valores e motivo, 4,5 s, toque fecha |
| `result` | `game-end` | Janela de resultado; fica até fechar |

- **Fila:** os avisos aparecem em ordem, no máximo 2 visíveis. Os avisos rápidos são agrupados quando há muitos.
- **Sem repetição:** o cliente guarda o último `seq` exibido por sala, em memória. Uma atualização recebida por comando e depois por consulta não repete avisos.
- **Entrada ou recarga:** quem chega não vê a fila antiga; ela vai para o histórico.
- **Volta depois de muito tempo:** se faltarem mais de 8 eventos, ou se a sequência já tiver saído da janela de 120, aparece um resumo ("12 acontecimentos enquanto você estava fora — veja o Histórico").
- **Histórico:** a aba Histórico lista os eventos formatados, o mais recente primeiro.
- O aluguel explica o cálculo: "aluguel dobrado: cor completa", "3 casas", "2 estações", "4× o valor dos dados".

### 5.3 Preferências

Guardadas no perfil local (seção 6):

- **Avisos:** "detalhados" (padrão) ou "só o essencial". O segundo esconde os `quick` e mostra os `card` da própria pessoa e os que a envolvem.
- **Movimento reduzido:** segue `prefers-reduced-motion` por padrão, com opção manual.
- **Som:** desligado por padrão. Usa sons curtos sintetizados com Web Audio, sem arquivos. Só toca em eventos `card`/`result` que envolvem a pessoa.
- Nada importante é comunicado só por som ou animação: tudo também está no histórico.

### 5.4 Critérios de aceite

- [ ] Em dois aparelhos, uma compra gera exatamente um aviso por aparelho, com os mesmos dados.
- [ ] A resposta do comando e a consulta seguinte não duplicam avisos.
- [ ] Recarregar não reexibe avisos antigos; voltar depois de muitos eventos mostra um resumo.
- [ ] Avisos de outra pessoa não roubam o foco nem bloqueiam os botões de quem está jogando.
- [ ] Aluguel informa pagador, recebedor, valor e motivo do cálculo.

## 6. Perfil, retratos, menu e partida (pedido de Felipe)

### 6.1 Perfil de visitante

```ts
interface Profile {
  name: string;                 // até 20 caracteres
  avatar: AvatarId;             // da biblioteca
  prefs: { notices: "all" | "essential"; reducedMotion: boolean | null; sound: boolean };
}
```

- Guardado em `localStorage` (`mesa:perfil`), com a mesma camada de memória do 3.2.
- **Biblioteca:** 24 retratos em emoji: animais, profissões e personagens originais. Funcionam em qualquer iPhone/Android, sem baixar imagens.
- O servidor valida `avatar` contra a lista. Valor desconhecido vira o padrão.
- Robôs têm retrato 🤖 e o selo "robô".
- Retrato aparece no lobby, na lista de jogadores, no painel da vez, nos avisos, no chat e no resultado.
- **Salas recentes:** lista local das últimas 5 salas com assento salvo. A tela inicial mostra "Continuar partida" para a mais recente que ainda existe.
- Texto explícito: "Seu perfil fica salvo neste navegador."

### 6.2 Menu principal

Ordem:

1. Marca (FelpZone → **Mesa Online**).
2. Cartão do perfil, com retrato e nome editáveis.
3. "Continuar partida", quando houver.
4. Ações principais: "Jogar com amigos" (cria sala) e "Jogar contra robôs".
5. Entrar com código.
6. Cartão do Magnata.
7. "Como jogar" (regras resumidas) e "Preferências".

### 6.3 Lobby e partida

- **Lobby:**
  - jogadores com retrato;
  - opções agrupadas em "Mesa": tema com prévia, duração, prazo por jogada e a regra opcional de empréstimos, marcada como **variante**;
  - "o que falta para começar".
- **Partida:**
  - **cartão da casa atual** sob o painel da vez: nome no tema, dono com retrato, aluguel atual e situação;
  - **modo ampliado** do tabuleiro: botão "🔍 Ampliar" dobra o tamanho, com rolagem horizontal;
  - cada casa com dono mostra a inicial do retrato do dono, para não depender só da cor;
  - "Rodada X de Y" quando há limite;
  - indicador "Reconectando…".

## 7. Ausência e piloto automático

- `room.options.turnTimeout`: `null | 60 | 120 | 300` segundos (padrão 120).
- **Disparo:** na consulta, se é a vez de uma **pessoa** e `agora − room.updatedAt ≥ turnTimeout`, ela entra em `room.away` e um evento `away` é emitido.
- **Enquanto ausente:** o assento joga como o robô Conservador, com o mesmo ritmo dos robôs (uma jogada por consulta, no ritmo escolhido no lobby: 1 s, 2,5 s ou 4 s entre elas). Nas vezes seguintes, o piloto já assume sem esperar o prazo de novo.
- **Volta:** qualquer comando de jogo da pessoa a tira de `away` e emite `back`. A mesa mostra "Voltar a jogar" para ela.
- **Dívida no piloto automático:** o piloto age como o Conservador: vende, hipoteca e só declara falência quando não há outra saída. É regra anunciada no lobby.
- Chat também conta como atividade (atualiza `updatedAt`). Quem está conversando não é considerado ausente.
- **Testes:**
  - prazo estourado → `away` + jogada automática;
  - comando da pessoa → `back`;
  - prazo desligado → nunca assume;
  - robôs não entram em `away`.

## 8. Temas visuais (pedido de Felipe)

### 8.1 Modelo

```ts
interface Theme {
  id: ThemeId; version: number; name: string; emoji: string; description: string;
  criterion: string;                         // critério de agrupamento das casas
  tiles: Partial<Record<number, string>>;    // nome por índice (ruas, estações, companhias)
  palette: { felt: string; feltDark: string; accent: string };
  bank: string;                              // nome do banco nos textos ("Banco", "Tesouro do Clã"…)
}
```

- O motor não conhece nomes. `BOARD` mantém tipos, preços e grupos.
- Os nomes vêm do tema por índice, com fallback para o Clássico. Um tema incompleto nunca quebra a partida.
- Cartas com destino usam o modelo `{casa}` no texto, resolvido pelo tema ("Vá até {casa}.").
- O tema é escolhido no lobby (`room.options.themeId`) e fixado no início (`game.themeId`). Todos recebem o mesmo tema e versão.
- A paleta muda o feltro e o destaque via variáveis CSS. Falha de tema → Clássico.

### 8.2 Temas iniciais

| Tema | Critério | Observação |
| --- | --- | --- |
| Clássico | Ruas fictícias da cidade do Magnata | Atual |
| Maceió | Bairros, do mais acessível ao mais disputado da orla | Estações: Rodoviária, Porto, Aeroporto e Estação Central |
| São Paulo | Bairros e avenidas, da periferia ao centro expandido | Estações: Luz, Sé, Tietê e Congonhas |
| Brasil | 22 capitais em ordem aproximada de população (Censo 2022) | Estações: rodovias e porto |
| Vila Ninja | Lugares de uma vila ninja **original** | Sem personagens, nomes ou símbolos de obras existentes |

**Critério de aceite:** a mesma semente e as mesmas ações produzem estados idênticos com dois temas, exceto `themeId`. Isso é coberto por teste.

## 9. Empréstimos do banco (regra opcional; pedido de Felipe)

Respostas às perguntas da análise (9.2):

| Pergunta | Resposta |
| --- | --- |
| Quem empresta? | Só o banco do jogo. Dinheiro fictício, sem relação com crédito real. |
| Limite e garantia? | Múltiplos de $100, até **50% do valor das propriedades não hipotecadas**, com teto de **$1.000**. Sem propriedades não há crédito, o que preserva o risco de falência. |
| Custo? | Taxa fixa de **20%** sobre o valor, cobrada no vencimento ou na quitação antecipada. Valores sempre inteiros ($100 → $120). |
| Quando contratar? | Na própria vez, nas fases rolar, comprar ou fim de turno. **Nunca durante uma dívida**, para não adiar a falência. |
| Vencimento? | Em **8 turnos próprios**. No início do 8º turno, o valor é cobrado. Sem dinheiro, vira dívida com o banco pelo fluxo normal (vender, hipotecar ou falir) antes de rolar. |
| Quitação antecipada? | Sim, a qualquer momento da própria vez, fora de dívida, pagando o total com taxa. |
| Patrimônio? | O total devido é descontado do patrimônio. |
| Falência, desistência e limite? | Na falência ou desistência, o empréstimo é cancelado (o banco absorve) e não passa ao credor. No fim por limite, entra no cálculo do patrimônio. |
| Refinanciamento infinito? | Impossível: **um empréstimo por vez**, vedado durante dívida, e o novo limite depende de propriedades não hipotecadas. |

- **Interface:**
  - em "Meus bens", o quadro "Banco" mostra limite, condições ("Recebe $X agora, paga $Y em 8 turnos seus") e confirmação explícita;
  - empréstimo ativo aparece com contagem regressiva e botão "Quitar $Y";
  - na fase de compra sem dinheiro, uma dica aponta o empréstimo.
- **Robôs:**
  - Investidor e Colecionador pegam empréstimo apenas para **completar uma cor** que não conseguiriam pagar;
  - quitam antes do vencimento quando sobra caixa acima da reserva;
  - o Conservador nunca pega.
- **Testes:**
  - limite e garantia;
  - proibido em dívida;
  - um por vez;
  - vencimento com e sem dinheiro;
  - quitação antecipada;
  - patrimônio;
  - falência cancela;
  - simulação sem erros e sem crescimento de caixa sem fim.

## 10. Ordem de implementação

1. Correções essenciais (seção 3) e eventos no motor (seção 5.1), juntos, porque mexem nas mesmas funções.
2. Avisos e histórico no cliente (5.2–5.3).
3. Perfil, retratos, menu, lobby e partida (6).
4. Ausência e piloto automático (7).
5. Temas (8).
6. Empréstimos (9).
7. Testes ponta a ponta no navegador, documentação e publicação.

Cada passo termina com `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` verdes.

**Compatibilidade:** o formato da sala muda (eventos, opções, perfis). As chaves no Redis passam de `mesa:sala:*` para `mesa:v2:sala:*`. Salas antigas, que eram de teste e expiram em 48 h, deixam de ser lidas, em vez de quebrar.

## 11. Fora do escopo desta evolução

Ficam para depois:

- trocas de propriedades;
- leilões;
- conta com recuperação por e-mail;
- envio de foto como retrato;
- PWA;
- segundo jogo;
- execução autônoma de robôs sem página aberta;
- métricas de produto (seção 14 da análise).

As trocas e os leilões continuam sendo o maior ganho de jogabilidade pendente.

## 12. Resultado da implementação

Tudo das seções 3 a 9 foi implementado. Diferenças em relação ao texto acima:

- **Avisos:** no máximo **2** visíveis ao mesmo tempo, em formato compacto. Com 3, no teste em largura de iPhone, os cartões cobriam os botões da vez.
- **Sem repetição de avisos:** o último `seq` exibido fica só em memória. Recarregar a página sempre começa do estado atual, sem fila antiga.
- **Chat:** o nome deixou de ser pintado com a cor do peão (o amarelo ficava ilegível no fundo branco); agora aparece com o retrato.
- **Textos neutros:** "na prisão" em vez de "preso", porque o jogo não sabe o gênero de ninguém.
- **Carta "empréstimo para construção venceu":** renomeada para "Seu investimento rendeu", para não confundir com a regra de empréstimos.

**Verificação:**

- **Testes automatizados (70):** motor (acontecimentos, rodadas, empréstimos), temas (mesmo resultado em qualquer tema), textos, robôs (com e sem crédito, invariantes) e salas (visão pública, idempotência, limites, revanche, opções e piloto automático).
- **Navegador com iPhone simulado:**
  - dois aparelhos receberam os mesmos 7 avisos de compra, sem repetição;
  - com armazenamento bloqueado, a sessão continuou jogável e o aviso apareceu;
  - o link de retomada reconheceu o assento e limpou o fragmento;
  - a seta do teclado troca de aba;
  - o detalhe da casa abre como diálogo e fecha com Escape;
  - a resposta pública não tem `decks`;
  - a partida solo andou com os robôs.
- **Simulação de empréstimos:** seção 13.1 de `docs/ROBOS.md`.

**Ainda não validado:** Safari de um iPhone real (hifenização, áreas seguras e som), Android real, leitor de tela e uma partida completa com a família. Essa partida é a próxima etapa recomendada.

### 12.1 Ajuste depois da entrega: ritmo dos robôs

A pedido de Felipe, as jogadas automáticas passaram de 900 ms para **2,5 s** entre uma ação e outra. O anfitrião pode trocar no lobby, em "Ritmo dos robôs": rápido (1 s), normal (2,5 s) ou lento (4 s). A escolha fica em `room.options.botPace` e vale também para o piloto automático. Medido no navegador: 2,5–2,6 s entre ações dos robôs. Com a consulta a cada 1 s do celular, o intervalo real fica entre 2,5 e 3,5 s.
