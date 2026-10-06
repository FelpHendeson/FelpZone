# Propostas: próximos sistemas

**Estado:** propostas executadas em ordem, a partir da primeira.

- **Item 1:** implementado; veja [Combate por rodadas e Ecos](SYSTEM-ECHOES-ROUND-COMBAT.md), seção 5.
- **Item 2:** implementado; veja a seção 7 do mesmo documento.
- **Item 3:** implementado; veja a seção 8 do mesmo documento.
- **Item 4:** implementado; veja a seção 9 do mesmo documento.
- **Item 5:** implementado; veja a seção 10 do mesmo documento.
- **Item 6:** implementado; veja a seção 11 do mesmo documento.
- **Item 7:** implementado; veja a seção 12 do mesmo documento.
- **Item 8:** implementado; veja a seção 13 do mesmo documento.
- **Item 9:** implementado; veja a seção 14 do mesmo documento.
- **Demais itens:** pendentes.

Cada proposta traz:

- o que é;
- como funciona;
- conteúdo de exemplo;
- como aparece na tela;
- o impacto técnico (módulo, pack e save);
- as decisões que ficam com o autor;
- o tamanho estimado: **P** (uma sessão), **M** (duas ou três), **G** (várias).

Todas seguem as regras do AGENTS:

- as regras ficam fora do React;
- o conteúdo fica no pack;
- os dados são validados na borda;
- o jogo continua funcionando offline;
- nada que altere o equilíbrio do jogo vem de outros jogadores.

| # | Proposta | Tema | Tamanho |
| --- | --- | --- | --- |
| 1 | Galho do arquétipo e evolução para Iniciado | Combate e progressão | G |
| 2 | Combos dentro da rodada | Combate | M |
| 3 | Clima e hora do dia no combate | Combate e mundo | M |
| 4 | Bestiário | Combate e descoberta | M |
| 5 | Eco aliado | Interação entre jogadores | M |
| 6 | Marcas no mundo | Interação entre jogadores | M |
| 7 | Torneio na mesma tela | Interação entre jogadores | P–M |
| 8 | Silhuetas animadas na reprodução da rodada | Estética | M |
| 9 | Som ambiente e de combate | Estética | M |
| 10 | Carta do Desperto compartilhável | Estética e interação | P–M |

---

## 1. Galho do arquétipo e evolução para Iniciado

**Implementado.** Recompensa escolhida: 6 tempos por rodada. O galho de outro arquétipo é permitido, mais caro.

**O que é:** cada arquétipo ganha um galho próprio na Árvore de habilidades, com 3 ou 4 técnicas, e o título evolui de Aprendiz para Iniciado. Hoje cada aprendiz tem uma única técnica de assinatura, que vem da arma.

**Como funciona:**

- **Destrancamento.** As técnicas do galho são habilidades comuns da Árvore e seguem as mesmas regras de requisitos e treino. Cada galho pede o hábito do arquétipo:
  - o mago precisa ter usado Seta de Númen em combate;
  - o arqueiro precisa ter vencido mantendo distância.
- **Caminho aberto.** O galho não é exclusivo, porque o arquétipo não tranca caminhos. Para quem é do arquétipo, ele já começa visível e com requisitos menores. Para os outros, aparece como "caminho distante", mais caro.
- **Evolução para Iniciado.** É um marco, não um nível. Exige:
  - 2 técnicas do galho;
  - uma vitória sobre uma ameaça elite.

  O título muda para "Iniciado de Mago" (ou "Iniciado de Espadachim" e assim por diante), e o Sistema anuncia o marco. O Iniciado ganha:
  - um espaço a mais de tempo na rodada (6 em vez de 5) **ou** uma reação, conforme a decisão do autor;
  - a carta do arquétipo com uma moldura nova.
- **Sem caminho definido.** Não tem galho próprio. Pode virar "Iniciado" de qualquer galho em que dominar 2 técnicas, e é o único que pode misturar galhos sem custo extra.

**Conteúdo de exemplo:**

| Arquétipo | Técnicas do galho |
| --- | --- |
| Mago | Escudo de Númen (guarda que devolve 2 de dano em quem acertar); Seta Dupla (2 setas fracas e rápidas); Foco Arcano (a próxima conjuração da rodada não pode ser interrompida) |
| Espadachim | Aparar (se um golpe corpo a corpo chegar nesse tempo, anula e abre o oponente); Corte Giratório (atinge todos os inimigos próximos); Postura do Duelista (+velocidade enquanto perto) |
| Arqueiro | Tiro Duplo; Flecha que Prende (deixa Exposto e impede Avançar por 1 tempo); Recuo Atirando (recua e atira no mesmo tempo) |
| Assassino | Veneno na Lâmina (aplica veneno ao próximo golpe); Sumir (esquiva longa que também tira o assassino da leitura de intenção do oponente); Golpe na Brecha (dano dobrado contra um alvo que está preparando uma ação) |

**Interface:** na Árvore, uma aba ou faixa colorida para o galho do arquétipo, com as silhuetas das técnicas. Na tela Personagem, o título atual e o progresso até Iniciado.

**Técnico:**

- **Pack:** `archetypes.json` ganha `branchSkillIds` e `initiate` (requisitos); `skills.json` e `combat.json` ganham as técnicas novas.
- **Motor:** os requisitos usam o módulo de progressão que já existe.
- **Save:** a evolução precisa de um campo aditivo `character.rank` (`apprentice` | `initiate`). O histórico de uso das técnicas pode vir do `combat` já registrado no mundo.
- **Ecos:** o Selo do Eco leva a patente e as técnicas do galho, validadas como hoje.

**Decisões do autor:**

- 6 tempos ou reação para o Iniciado;
- se o galho de outro arquétipo é permitido (proposta: sim, mais caro);
- nomes das técnicas.

**Tamanho:** G.

---

## 2. Combos dentro da rodada

**Implementado.** São 9 combos, ocultos até serem descobertos, com a dica de Sentidos Aguçados.

**O que é:** certas sequências de ações, na ordem certa, ganham um efeito extra. Planejar a rodada passa a ser também compor.

**Como funciona:**

- **Quando dispara.** Um combo é uma sequência de 2 ações **seguidas** na mesma rodada, do mesmo lado. O efeito extra acontece quando a segunda ação acerta.
- **O que o anula.** Se a primeira ação for interrompida ou a segunda errar, o combo não acontece.
- **Como se descobre.** Os combos ficam ocultos até serem descobertos:
  - o primeiro uso bem-sucedido anuncia "[ Sistema ] Sequência registrada: Corte em Avanço";
  - a partir daí, o planejador mostra uma marca entre as duas cartas quando a sequência está montada;
  - Sentidos Aguçados revela, no planejador, quando a sequência atual está "a uma ação de um combo".
- **Do lado do oponente.** A IA das criaturas pode ter combos próprios, que o jogador aprende a ler; isso combina com a proposta 4, o Bestiário.

**Conteúdo de exemplo:**

| Sequência | Nome | Efeito extra |
| --- | --- | --- |
| Avançar → Corte Duplo | Corte em Avanço | +2 de dano no primeiro corte |
| Esquivar → Golpe Furtivo | Contra-ataque Sombrio | se a esquiva evitou um golpe, o Golpe Furtivo vira crítico (dano dobrado) |
| Recuar → Tiro Mirado | Distância Segura | o Tiro Mirado não pode ser interrompido |
| Postura Defensiva → Seta de Númen | Conjuração Protegida | a guarda continua valendo durante a preparação da Seta |
| Finta → Golpe Preciso | Brecha Aberta | o Golpe Preciso ignora a guarda |
| Arremessar Pedra → Investida | Distração | a Investida ganha +2 de velocidade |

**Interface:**

- **No planejador:** um elo brilhante entre as duas cartas do combo, já descoberto ou só revelado.
- **Na reprodução da rodada:** destaque do combo, que combina com a proposta 8.
- **Na tela Personagem:** a lista "Sequências registradas".

**Técnico:**

- **Pack:** `combat.json` ganha `combos[]` com `{ id, name, first, second, bonus }`; o bônus usa efeitos que já existem (dano, velocidade, `unblockable`, crítico).
- **Motor:** `resolveRound` checa os combos na linha do tempo, de forma pura e determinística. Por isso a verificação por replay dos Ecos continua funcionando.
- **Save:** um campo aditivo `combat.discoveredCombos`.

**Decisões do autor:**

- combos ocultos até descobertos ou visíveis desde o início (proposta: ocultos, com dica de Sentidos Aguçados);
- quantos combos no primeiro dia (proposta: 6 a 8).

**Tamanho:** M.

---

## 3. Clima e hora do dia no combate

**Implementado.** O clima é derivado e não salvo, com efeitos leves; os duelos de Ecos ficam em campo neutro.

**O que é:** o relógio e as estações que já existem (estação seca e estação úmida no calendário) passam a mudar o combate. Cada arquétipo ganha o seu melhor e o seu pior momento.

**Como funciona:**

- **Clima do dia:** sorteado de forma determinística a partir da semente salva (`rng`) e da estação. Na estação úmida, chuva e névoa são mais comuns.
  - Opções: limpo, nublado, chuva, névoa e vento.
  - Aparece no HUD com um ícone e uma linha do Sistema ao amanhecer.
- **Período:** madrugada, manhã, tarde e noite, que o relógio já conhece.
- **Modificadores:** são pequenos e legíveis. Cada combate mostra no máximo 2 linhas do tipo "Névoa: golpes de longe −2 de dano".

| Condição | Efeito |
| --- | --- |
| Chuva | ataques de longe −2 de dano; Seta de Númen +1 tempo de preparação (Númen dispersa na água) |
| Névoa | a leitura de intenção mostra uma ação a menos; o primeiro golpe furtivo do combate ignora a guarda |
| Vento | Tiro Mirado e Arremessar Pedra têm 1 tempo de janela em que erram |
| Noite | criaturas noturnas +velocidade; o assassino começa a rodada 1 já perto, se quiser |
| Amanhecer (06:00–08:00) | conjurações custam 1 de Númen a menos |
| Tarde limpa | o arqueiro vê a primeira ação do oponente mesmo sem Sentidos Aguçados |

**Interface:** ícone de clima no HUD, ao lado do relógio, e uma faixa no topo do combate com os modificadores ativos. O céu do HUD, que já muda de cor com a hora, ganha uma camada de chuva ou névoa.

**Técnico:**

- **Pack:** `world/weather.json`, com a probabilidade por estação, e os modificadores declarados em `combat.json` (`conditions[]`).
- **Motor:**
  - o clima é derivado, e não salvo: `weatherFor(day, seed)` é uma função pura, então não muda o save;
  - o combate recebe o clima como parte do contexto do encontro;
  - a resolução guarda o clima usado, e o replay confere.
- **Ecos:** a Prova do Eco é em "campo neutro", sem clima, para ser justa. Uma variante "duelo sob chuva" pode vir depois.

**Decisões do autor:**

- quanto o clima pesa (proposta: leve, nunca decisivo sozinho);
- se o clima também afeta a sobrevivência (sede, frio, coleta). Isso já seria uma proposta separada.

**Tamanho:** M.

---

## 4. Bestiário

**Implementado.** As notas de NPCs só aparecem depois que o Desperto conhece a pessoa.

**O que é:** um registro de cada criatura enfrentada, preenchido aos poucos pela observação. Lutar várias vezes vira conhecimento.

**Como funciona:**

- **A ficha:** cada criatura tem uma ficha com até 4 níveis de conhecimento:
  1. **Avistada:** nome, região e imagem.
  2. **Enfrentada:** vitalidade aproximada e o elemento de defesa.
  3. **Estudada:** as ações que ela usa e quanto tempo cada uma leva. Exige ter visto cada ação acontecer.
  4. **Dominada:** o padrão, por exemplo "Depois de Recuar, o Javali sempre prepara a Carga". Exige 3 vitórias ou Sentidos Aguçados.
- **Efeitos no combate:**
  - no nível 3, o planejador mostra a duração das ações do oponente na leitura de intenção;
  - no nível 4, a leitura de intenção mostra uma ação a mais contra aquela criatura.
- **Fonte de lore:** cada ficha traz um parágrafo do Sistema e, depois, uma nota da Mira, se o jogador tiver vínculo com ela.

**Interface:**

- **Onde fica:** uma nova entrada no Menu, "Bestiário", com uma grade de cartas. Criaturas não vistas aparecem como silhuetas escuras com "???".
- **A ficha:** imagem, nível de conhecimento em estrelas e o que já se sabe.

**Técnico:**

- **Pack:** `combatants` ganha `bestiary` (texto por nível, imagem, região e padrão em texto) e `combat.json` declara os padrões. A IA já planeja por estilo; o padrão vira regra declarada que a IA segue e que o Bestiário revela.
- **Save:** campo aditivo `bestiary: { [combatantId]: { seen, actionsSeen[], victories } }`.

**Decisões do autor:** se o nível 4 também pode vir de NPCs, como uma conversa com o Caio sobre o Javali (proposta: sim, mais lore).

**Tamanho:** M. A arte das criaturas pode ser feita em paralelo, com os prompts no mesmo padrão dos outros.

---

## 5. Eco aliado

**Implementado.** Vale com 60% da vitalidade, uma vez por dia, também contra ameaças de elite.

**O que é:** você cola o Selo do Eco de um amigo e chama o Eco dele para lutar ao seu lado. É cooperação sem servidor.

**Como funciona:**

- **Como entra:** em Ecos, o novo botão "Chamar como aliado" registra o Eco no "Círculo de Ecos", com até 3 Ecos aliados guardados.
- **Quando pode ser chamado:**
  - uma vez por dia de jogo;
  - antes de um confronto, você escolhe um Eco aliado para entrar como companheiro.
- **Como luta:** usa o sistema de grupo que já existe (Sistema 23) e a IA pelo estilo tático que o dono escolheu.
  - O Eco entra com vitalidade reduzida (60%) e as ações do Selo, incluindo a técnica do arquétipo.
  - Ele não ganha experiência nem itens.
- **Ponte de volta:** depois da luta, você pode gerar um código "Agradecimento". Quando o amigo cola esse código, ele vê "Seu Eco lutou ao lado de Ana contra o Javali de Espinhos e venceram". Isso conta no vínculo entre os dois Ecos, numa nova aba "Laços de Eco" ao lado de Rivalidades.
- **Equilíbrio:** o Eco aliado ajuda, mas não substitui o jogador. Ele só usa o banco de ações do Selo e não pode ser chamado em lutas da história principal marcadas como "solo".

**Interface:** cartão do Eco aliado no Círculo de Ecos; no combate, o Eco aparece como companheiro, com a silhueta na cor do arquétipo dele.

**Técnico:**

- **Engine:** `allyRoundPlan` já planeja aliados; o Eco vira um combatente montado a partir do Selo (`combatantFromSeal`).
- **Save:** campo aditivo `echoes.allies[]` (até 3 Selos) e `echoes.lastAllyDay`.
- **Verificação:** a resolução do mundo guarda o Selo do aliado usado, e o replay refaz a luta com ele.

**Decisões do autor:**

- 60% de vitalidade e uma vez por dia (ajustável);
- se o aliado pode entrar em lutas elite (proposta: sim).

**Tamanho:** M.

---

## 6. Marcas no mundo

**Implementado.** Só frases pré-montadas, sem texto livre.

**O que é:** você deixa uma marca num local do seu mundo e a compartilha por código. Quem importa encontra a marca no próprio jogo, como se outro Desperto tivesse passado por ali. Isso amarra com a lore das "Marcas no tronco".

**Como funciona:**

- **Deixar uma marca:** em qualquer local já visitado, a ação "Deixar marca" (5 minutos de jogo) abre a escolha:
  - **Tipo:** Aviso, Dica, Desafio ou Saudação.
  - **Mensagem:** escolhida de **frases pré-montadas**, no estilo "Perigo adiante: [criatura]", "Água limpa: [direção]" ou "Tente vencer [criatura] sem se curar".

  Texto livre fica de fora para evitar abuso e manter a lore. A marca gera um código `MRC1.…`.
- **Importar marcas:** em Ecos, "Marcas recebidas", você cola o código.
  - A marca aparece naquele local como um ponto de interesse "Marca de [nome]", com a silhueta do arquétipo dela.
  - Ler a marca leva 1 minuto de jogo.
- **Desafios:** uma marca de Desafio, quando cumprida, gera um código de resposta para o autor da marca, no mesmo modelo de verificação dos Ecos. Ela dá reconhecimento, nunca itens.
- **Limite:** até 10 marcas recebidas ativas; as mais antigas somem, como se a chuva as apagasse.

**Interface:** ícone de marca no mapa e na tela do local; a marca abre num cartão de casca de árvore com a frase e o nome.

**Técnico:**

- **Novo módulo:** `src/modules/marks`, com o código, a validação e o catálogo de frases do pack (`system/marks.json`).
- **Save:** campo aditivo `marks: { left[], received[], answered[] }`.
- **Validação:** só locais e criaturas que existem no pack, e só frases do catálogo.

**Decisões do autor:** frases pré-montadas, sem texto livre (proposta: sim, pelo menos na primeira versão).

**Tamanho:** M.

---

## 7. Torneio na mesma tela

**Implementado.** Aprendizes criados na hora também podem participar.

**O que é:** de 4 a 8 pessoas num aparelho só, em chave eliminatória, usando o duelo na mesma tela que já existe. Bom para jogar com amigos ao vivo.

**Como funciona:**

- **Montagem:** em Ecos, "Torneio". Cada participante entra:
  - com o Selo do Eco dele, colado, **ou**
  - com um aprendiz criado na hora: nome, arquétipo e retrato, sem habilidades além da técnica do arquétipo.
- **Chave:** sorteada, eliminatória simples (quartas, semifinal e final). Quem fica sem par avança direto.
- **Cada duelo:**
  - acontece no modo de passar o aparelho: a sequência fica oculta até os dois declararem pronto;
  - os dois lados começam com vitalidade igual (30), em campo neutro, para ser justo.
- **Fim:** tela de campeão com retrato e arquétipo, e um "Registro do Torneio" que pode ser compartilhado.
- **Sem efeito no mundo:** nada do torneio entra no save da partida, a não ser o registro, que é opcional.

**Interface:** a chave em árvore vertical, adequada para celular; entre duelos, a tela "Passe o aparelho para…".

**Técnico:**

- **Reaproveitamento:** usa `createDuel` e `resolveRound` do jeito que estão.
- **Estado:** um estado de torneio puro (`src/modules/echoes/tournament.ts`), mantido só enquanto a tela está aberta. Um rascunho opcional pode ficar no aparelho, para retomar se fechar sem querer.
- **Save:** sem mudança.

**Decisões do autor:** permitir aprendizes criados na hora (proposta: sim, assim ninguém precisa ter partida salva para jogar).

**Tamanho:** P–M.

---

## 8. Silhuetas animadas na reprodução da rodada

**Implementado.** Velocidades 1× e 2×, e "Pular" faz o papel do instantâneo. O "Reduzir movimento" segue o do aparelho.

**O que é:** hoje a reprodução da rodada é texto e barra de tempos. A proposta é que as duas silhuetas se movam a cada ação: avançam, cortam, esquivam, recuam, tomam o golpe. As 14 poses já existem.

**Como funciona:**

- **Palco:** uma faixa no topo do combate, com o jogador à esquerda e o oponente à direita.
  - A distância (perto ou longe) é a distância real entre as figuras na tela.
  - Ao Avançar, a figura desliza para frente; ao Recuar, para trás.
- **Cada evento da linha do tempo vira um momento:**
  1. **Preparação:** a figura vai para a pose de preparo, com um brilho fraco na cor do arquétipo.
  2. **Execução:** a pose da ação acontece, com o rastro do golpe (arco do corte, linha da flecha, esfera de Númen).
  3. **Acerto:** o alvo recua um pouco e pisca; um número de dano sobe.
  4. **Erro, esquiva ou guarda:** o golpe atravessa o vazio, a figura esquiva para o lado ou aparece um escudo.
  5. **Interrupção:** a preparação "quebra" com estilhaços.
  6. **Combo** (proposta 2): um flash com o nome do combo.
- **Velocidade:**
  - cerca de 600 ms por evento, com botão "Pular" e opção de velocidade 1×, 2× ou instantânea;
  - "Reduzir movimento", do aparelho ou do jogo, troca a animação por cortes secos entre poses.
- **Criaturas:** silhuetas de criatura (corvo, serpente, javali, predador) no mesmo estilo vetorial.

**Interface:** o palco fica acima do planejador e se recolhe enquanto você monta a rodada. Ele reaparece na reprodução.

**Técnico:**

- **Origem dos dados:** a animação lê `lastRound`, que já existe, sem mudar nenhuma regra.
- **Implementação:** componente `RoundStage.tsx`, que interpola as articulações entre poses. As poses já são tabelas de articulações, então dá para interpolar ângulos com CSS ou `requestAnimationFrame`.
- **Arte nova:** silhuetas de 4 a 5 criaturas em SVG, desenhadas por mim.
- **Testes:** a sequência de momentos gerada a partir de `lastRound` é uma função pura e testada; o componente é testado por renderização.

**Decisões do autor:** velocidade padrão (proposta: 1×, com pular sempre disponível).

**Tamanho:** M.

---

## 9. Som ambiente e de combate

**Implementado.** Os sons são sintetizados pelo próprio jogo (Web Audio), sem arquivos: a decisão entre CC0 e IA fica para quando quiser trocar por gravações. Começa com ambiente baixo e efeitos médios, só depois do primeiro toque.

**O que é:** ambiente sonoro que muda com a hora do dia e sons curtos nas ações. É o que mais aumenta a imersão, com pouco código.

**Como funciona:**

- **Ambiente:** 1 trilha em loop por período, com transição suave quando o relógio muda de período.
  - Madrugada: vento baixo e corujas.
  - Manhã: pássaros e folhas.
  - Tarde: insetos e brisa.
  - Noite: grilos e estalos de mata.
  - Com chuva (proposta 3), uma camada de chuva por cima.
- **Locais especiais:** a Nascente tem água correndo e a Caverna tem eco e gotejamento.
- **Efeitos:** um som curto por tipo de pose, não por técnica. São 12 a 15 arquivos no total:
  - corte, estocada, flecha, conjuração;
  - guarda, esquiva, passo, acerto, erro;
  - interrupção, vitória, derrota.
  - Mais: o "ding" do Sistema nas janelas e um som de página na visual novel.
- **Controles:** em Configurações, volume de ambiente e de efeitos separados. **Começa desligado ou baixo** e só toca depois do primeiro toque na tela, como os navegadores exigem.
- **Offline:** os arquivos ficam no pacote, em `.ogg` ou `.mp3` curtos, com cerca de 1 a 2 MB no total, e entram no cache da PWA.

**Técnico:**

- **Implementação:** módulo de interface `src/ui/audio.ts`, com Web Audio API para efeitos e um elemento de áudio com fade para o ambiente.
- **Regras e save:** o som não toca nas regras; a preferência fica no aparelho, como as outras configurações.
- **Origem dos sons:**
  - bibliotecas gratuitas com licença CC0, por exemplo Freesound filtrado por CC0 ou Kenney;
  - ou geração por IA, a decidir.

  Um arquivo `docs/AUDIO-CREDITS.md` guarda a origem de cada som.

**Decisões do autor:**

- origem dos sons (CC0 ou IA);
- se começa ligado ou desligado (proposta: ambiente baixo, efeitos ligados, tudo só depois do primeiro toque).

**Tamanho:** M (a maior parte é escolher os sons).

---

## 10. Carta do Desperto compartilhável

**O que é:** uma imagem pronta do seu personagem para postar ou mandar a amigos.

**Como funciona:**

- **Conteúdo da carta:**
  - retrato (pronto, montado ou próprio);
  - nome, arquétipo e patente (Aprendiz ou Iniciado);
  - a silhueta da técnica de assinatura;
  - 3 conquistas (título mais recente, maior vitória, dias sobrevividos);
  - a moldura na cor do arquétipo e, quando houver, a textura das cartas.
- **Formato:** 1080×1350 (formato de post vertical), em PNG.
- **Ligação com os Ecos:**
  - o código do Selo do Eco vai no rodapé, em letra pequena;
  - um QR code opcional abre o jogo com o Selo já colado.

  Quem recebe pode enfrentar o seu Eco direto.
- **Onde fica:** na tela Personagem, o botão "Gerar carta" mostra a prévia, com "Compartilhar" (pelo compartilhamento do celular) e "Salvar imagem".
- **Privacidade:** o retrato próprio só entra na carta se o jogador marcar a opção, que vem desmarcada por padrão.

**Técnico:**

- **Geração:** a carta é desenhada num `<canvas>` a partir de um SVG montado com os mesmos componentes, sem servidor.
- **QR code:** precisaria de uma biblioteca pequena ou de um gerador próprio; dá para começar só com o código.
- **Link com o Selo:** se o link do QR code abrir o jogo com o Selo, o jogo passa a ler o Selo na URL, por exemplo `#eco=ECO1…`, e valida como hoje.

**Decisões do autor:**

- incluir o QR code (proposta: segunda etapa);
- incluir o retrato próprio (proposta: opcional e desmarcado).

**Tamanho:** P–M.

---

## Ordem sugerida

1. **8 + 2:** silhuetas animadas e combos. O combate fica bonito e mais rico de planejar, e um reforça o outro.
2. **1:** galho do arquétipo e Iniciado. É a profundidade de longo prazo, e os combos já viram parte do galho.
3. **5:** Eco aliado. Interação cooperativa, com quase toda a base pronta.
4. **9:** som. Imersão alta para pouco código.
5. **4 e 3:** Bestiário e clima, para quando houver mais criaturas e regiões.
6. **10, 7 e 6:** carta, torneio e marcas. Compartilhamento e jogo social.
