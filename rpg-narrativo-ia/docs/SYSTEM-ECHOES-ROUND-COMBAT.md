# Combate por rodadas e Ecos (interação entre jogadores)

## Estado da decisão

**Implementado.** Decisões do autor (outubro de 2026):

- investir em combate, habilidades e interação entre jogadores, com tudo amarrado à lore;
- voltar ao modelo de combate idealizado no início: **um banco de ações por rodada**. Cada lado monta uma sequência de ações de acordo com a situação; quando os dois se declaram **prontos**, as ações acontecem;
- a proibição de backend caiu. Seguindo a recomendação, a primeira entrega de interação entre jogadores é **assíncrona por código** e funciona sem servidor. O duelo online ao vivo fica planejado neste documento e entra depois que hospedagem e custos forem escolhidos.

## 1. Combate por rodadas (`src/modules/combat/engine.ts`)

### A rodada

- Cada lado tem **5 tempos** por rodada (`ROUND_TICKS`).
- A duração de uma ação é `preparação + execução + recuperação`, no mínimo 1 tempo. Por exemplo: Golpe dura 2 tempos, Postura Defensiva 1, Golpe Preciso 3 e Centelha de Númen 4.
- A sequência é validada por `checkRoundPlan` contra:
  - o orçamento de tempos;
  - recarga e reserva de Númen acumuladas ao longo da sequência;
  - ações de recarga e consumíveis preparados, que só podem entrar uma vez por rodada.
- **Pronto:** no encontro contra criaturas, o oponente planeja a rodada inteira pela IA por regras (`planCombatantRound`). No duelo na mesma tela, a outra pessoa monta a sequência dela (`opponentPlan`).
- **Linha do tempo:**
  - cada ação acontece no tempo `início + preparação`;
  - os dois lados se intercalam por esse tempo, depois pela velocidade e, num empate, pelo jogador primeiro;
  - `lastRound` guarda os acontecimentos para a interface reproduzir.

### Regras de cada momento

- **Distância (`near` / `far`):**
  - o confronto começa longe (`startDistance` do encontro, padrão `far`);
  - golpes corpo a corpo erram de longe;
  - Avançar e Recuar mudam a distância no tempo em que acontecem;
  - a Investida aproxima e golpeia no mesmo impulso.
- **Esquiva (`evade`):** golpes que caem dentro da janela da esquiva erram.
- **Interrupção:** um golpe que fere durante a preparação de uma ação `interruptible` cancela essa ação. O efeito `interrupt` (Finta) cancela mesmo sem ferir. A Postura Defensiva absorve o golpe e, sem ferimento, não há interrupção.
- **Postura Defensiva:** vale só durante a rodada em que foi erguida.
- **Condições:** contam no começo e no fim de cada rodada, como antes.
- **Leitura do Sistema:** a interface mostra a primeira ação planejada pelo oponente (`readOpponentIntent`). Quem tem **Sentidos Aguçados** vê as duas primeiras. No duelo entre pessoas não há leitura.

### Integração com o mundo

- O desfecho continua sendo uma única transação de mundo, com custo de tempo único.
- `CombatResolution.playerPlans` guarda a sequência do jogador em cada rodada. `verifyCombatResolution` refaz o combate rodada a rodada, com a mesma IA, e recusa qualquer adulteração.
- Orientações à Mira (Sistema 23) continuam valendo: a ação pedida abre a sequência dela na rodada.
- `resolveTurn`, o modelo antigo de uma ação por turno, continua exportado para compatibilidade, mas a interface não o usa mais.

### Conteúdo novo (`content/first-day/system/combat.json`)

| Tipo | Itens |
|---|---|
| Ações base | Avançar, Recuar, Esquivar, Investida, Arremessar Pedra |
| Ações de habilidade | Finta (Sentidos Aguçados), Firmar os Pés (Corpo Firme), Reflexo Sentinela (Sentinela Interior), Dardo de Fagulha (Fagulha Condutora) |
| Ações só de criaturas (`playerUsable: false`) | Corte em Brasa, Mergulho de Bico, Picada Venenosa, Enrodilhar, Carga de Espinhos |

Ameaças por área:

| Área | Ameaça | Comportamento |
|---|---|---|
| Grande Árvore | Corvo-de-Casca | ataca de longe e volta a se afastar |
| Nascente | Serpente da Nascente | deixa o alvo Exposto |
| Mata Densa | Javali de Espinhos (elite) | carga lenta e interrompível |

## 2. Ecos (`src/modules/echoes`)

### Lore

Todo Desperto deixa um **Eco**: a marca das escolhas que o Sistema registrou em combate. Em Basilis, Despertos de ilhas distantes só se cruzam assim. A **Prova do Eco** é um duelo reconhecido pelo Sistema: ninguém morre, mas o Registro lembra. O Eco nasce da primeira vitória num confronto do mundo. Nesse momento o Sistema anuncia "Seu Eco foi registrado" e o Menu ganha a entrada **Ecos**.

### O que existe

- **Selo do Desperto** (`ECO1.…`):
  - guarda nome, habilidades conhecidas, banco de ações (base + habilidades) e estilo tático do Eco (Equilibrado, Agressivo ou Defensivo);
  - o código traz uma verificação de integridade;
  - um Selo com ações que as habilidades declaradas não liberam é recusado.
- **Enfrentar o Eco:** duelo 1x1 com 30 de vitalidade para os dois lados. A IA joga pelo estilo escolhido pelo dono do Eco.
- **Código de resultado** (`RES1.…`):
  - traz o Selo de quem desafiou e as sequências de cada rodada;
  - o dono do Eco cola o código e o jogo refaz o duelo; o resultado só é aceito se o desfecho conferir;
  - o mesmo código não conta duas vezes.
- **Duelo na mesma tela:**
  - as duas pessoas montam a rodada no mesmo aparelho, uma de cada vez;
  - a sequência fica oculta ("Passe o aparelho…") até os dois declararem pronto.
- **Rivalidades:**
  - vitórias e derrotas por rival ficam em `GameState.echoes`, um campo opcional e aditivo, sem mudar a versão do save;
  - o campo é validado na carga e preservado pelas ações do mundo.
- **Preferência do aparelho:** o estilo do Eco fica em `reset.echo.style`.

### Limites honestos

Os códigos podem ser editados por quem quiser trapacear. Por isso a Prova do Eco dá rivalidade e reconhecimento, nunca itens, níveis ou recompensas que alterem o equilíbrio. A Prova também não fere: saúde, tempo e mundo não mudam.

## 3. Próximo passo: duelo online ao vivo (planejado, não implementado)

O modelo de rodadas já é o protocolo certo para o online:

1. Cada lado envia a sequência da rodada já "lacrada" (*commit*: hash da sequência mais um sal).
2. Quando os dois lacres chegam, cada lado revela a sequência (*reveal*).
3. O servidor confere os lacres e roda o mesmo motor determinístico (`resolveRound`). O resultado é idêntico nos dois aparelhos.

O que é preciso decidir antes de construir:

- **Hospedagem:**
  - uma função com WebSocket ou um serviço de tempo real (salas de 2 jogadores);
  - o mais simples seria um servidor Node com o mesmo pacote de regras (`src/modules/combat` é puro e roda no servidor sem React).
- **Identidade:** apelido mais código de sala (sem login) na primeira versão.
- **Custo e privacidade:** não guardar nada além do resultado do duelo.

O jogo continua funcionando sem rede: o online é uma camada opcional sobre os Ecos.

## 4. Arquétipos de aprendiz, silhuetas e retratos

**Decisão do autor:** começar pelos arquétipos de aprendiz, escolhidos na criação do personagem.

**Lore:** o Sistema não atribui classes (evento "Aptidão inicial"). O arquétipo é **quem a pessoa era antes do Reset**: o jeito de lutar que trouxe da vida de antes e a arma que improvisou ao acordar. As aptidões continuam sendo identificadas pelo Sistema durante o jogo. Para as imagens, seguir a recomendação: silhuetas em vetor sem rosto, retrato montável, imagem própria do aparelho e prompts para IA.

### Arquétipos (`content/first-day/system/archetypes.json`, módulo `src/modules/archetypes`)

| Arquétipo | Equipamento de assinatura (já equipado) | Técnica concedida |
| --- | --- | --- |
| Aprendiz de Mago | Cajado de Galho Vivo | Seta de Númen: 2 tempos, alcança de longe, 6 de dano, 2 de Númen, interrompível |
| Aprendiz de Espadachim | Lâmina de Pedra Lascada | Corte Duplo: 2 tempos, corpo a corpo, 4 + 3 de dano |
| Aprendiz de Arqueiro | Arco Rústico | Tiro Mirado: 3 tempos, alcança de longe, 8 de dano, interrompível |
| Aprendiz de Assassino | Adaga de Osso | Golpe Furtivo: 1 tempo, velocidade 17, 2 de dano + Sangramento |
| Aprendiz sem caminho | nenhum (2 frutos e 1 água limpa) | nenhuma: liberdade para seguir qualquer caminho |

Regras:

- **O arquétipo é identidade e não tranca caminhos.** As técnicas de assinatura são `equipmentOnly`: só entram no banco quando o equipamento as concede (`combat.action.available`). Trocar de arma muda o banco.
- **O catálogo é validado contra itens e combate.** Toda técnica de assinatura precisa vir do equipamento inicial, e todo item equipado precisa estar entre os itens iniciais.
- **Persistência:** `GameState.character.archetypeId` e `character.portrait` são opcionais e aditivos, sem mudar a versão do save. Saves antigos seguem válidos.
- **Ecos:** o Selo do Desperto leva o arquétipo e a técnica de assinatura. Um Selo com a técnica, mas sem o arquétipo que a concede, é recusado.

### Silhuetas (`src/ui/components/Silhouette.tsx`)

- **A figura:** sem rosto e sem gênero, montada por articulações, com 14 poses (`ACTION_POSES`) e adereços (lâmina, adaga, arco, cajado).
- **Origem da pose:**
  - cada ação de combate pode declarar `pose` no pack;
  - sem ela, a pose é deduzida dos efeitos;
  - as habilidades usam a pose da primeira técnica que liberam.
- **Onde aparecem:**
  - nas cartas do banco de ações, com as técnicas de assinatura primeiro;
  - na Árvore de habilidades;
  - na escolha de arquétipo e na tela Personagem.
- **Cor:** acompanha a paleta do arquétipo.

### Retrato (`src/ui/components/PortraitAvatar.tsx`)

- **Retratos prontos:** 5 por arquétipo (`portraits` no pack), com arte opcional e um busto montável equivalente enquanto a arte não existe. O save guarda `{ kind: 'preset', id }`.
- **Retrato montável:** busto em silhueta sem rosto, com 6 tons de pele, 6 cortes (incluindo capuz) e 6 cores de cabelo. A capa e o contorno usam a cor do arquétipo.
- **Imagem própria:**
  - é recortada para 192 px e fica só no aparelho (`reset.portrait.custom`); o save guarda apenas `{ kind: 'custom' }`;
  - sem a imagem, aparece o busto padrão;
  - não viaja no Selo do Eco.
- **Onde aparece:** no topo da tela (com o nome do arquétipo), na tela Personagem e na confirmação da criação.
- **Arte por IA:** a carta de arquétipo aceita `image` no pack, que substitui a silhueta quando existir. Os prompts estão em [Prompts para geração de arte](ART-GENERATION-PROMPTS.md), seção 8A.
- **Fundos da criação:** o pack aceita arte para cada passo (`creation.awakening`, `creation.reflection`, `creation.registry`, `creation.cardTexture`) e um `backdrop` por arquétipo. A tela troca os fundos com esmaecimento, sob um véu que mantém o texto legível; o passo sem imagem continua com o fundo liso. Os prompts estão em [Prompts: criação de personagem](ART-PROMPTS-CHARACTER-CREATION.md).

## 5. Galho do arquétipo e evolução para Iniciado

**Decisão do autor:** executar as propostas em ordem a partir da primeira ([Propostas](PROPOSALS-NEXT-SYSTEMS.md), item 1). Como o autor não escolheu a recompensa do Iniciado, ficou a da proposta: **6 tempos por rodada**. O galho de outro arquétipo é permitido, mas custa mais.

### Galhos (`content/first-day/system/archetypes.json`, `branch`)

| Arquétipo | Galho | Técnicas (em ordem) |
| --- | --- | --- |
| Mago | Caminho do Númen Moldado | Escudo de Númen (guarda 8, 2 Númen) → Seta Dupla (3 + 3 de longe) → Explosão de Númen (10 + Exposto, lenta e interrompível) |
| Espadachim | Caminho da Lâmina | Aparar (guarda e esquiva de 1 tempo) → Corte que Abre (4 + Exposto) → Estocada do Duelista (aproxima e estoca 7) |
| Arqueiro | Caminho do Arco | Tiro Duplo (3 + 3) → Flecha que Prende (3 + Exposto + Impedido) → Recuo Atirando (afasta e atira 4) |
| Assassino | Caminho da Sombra | Veneno na Lâmina (1 + Envenenado por 4 turnos) → Sumir (esquiva de 3 tempos e afasta) → Golpe na Brecha (5 e interrompe, uma vez por rodada) |

As técnicas são ações de combate `equipmentOnly`: só entram no banco quando aprendidas. A condição nova **Envenenado** causa 1 de dano por turno.

### Requisitos e treino (`branchRules`, módulo `src/modules/archetypes/branch.ts`)

- **Ordem:** cada técnica exige a anterior do mesmo galho.
- **Galho próprio:**
  - técnica 1: usar a técnica de assinatura 3 vezes em combate;
  - técnica 2: 2 vitórias;
  - técnica 3: 4 vitórias e nível 2.
- **Galho aberto** (para o Aprendiz sem caminho e para saves anteriores aos arquétipos):
  - técnica 1: 2 vitórias;
  - técnica 2: 4 vitórias;
  - técnica 3: 6 vitórias e nível 2.
- **Galho distante** (de outro arquétipo): os mesmos requisitos do galho aberto, com o **dobro do tempo** de treino e **+1 de nível**.
- **Tempo de treino:** 60, 90 e 120 minutos.
- **Ação:** o treino é a ação `archetype.train`, feita na Árvore. Ela custa tempo de jogo e passa pelas mesmas validações das outras ações.
- **Contadores:** o confronto do mundo (`combat.resolve`) conta os usos da assinatura, as vitórias e as vitórias de elite. Encontros com `elite: true` contam como elite; hoje só o Javali de Espinhos.

### Iniciado

- **Requisito:** 2 técnicas do próprio galho e 1 vitória de elite. Só quem já tem um caminho pode ser Iniciado (veja a seção 6). Técnicas de galho distante não contam.
- **Título:** muda conforme o sexo do personagem, por exemplo "Espadachim Iniciado", "Espadachim Iniciada", "Maga Iniciada" ou "Arqueiro Iniciado".
- **Anúncio:** o Sistema anuncia a patente quando ela é alcançada.
- **Recompensa:** o Iniciado monta a rodada com **6 tempos**. É um valor por combatente (`roundTicks`, teto `MAX_ROUND_TICKS`), passado ao combate pelo mundo e conferido no replay.
- **Patente derivada:** a patente não fica salva; ela é calculada a partir do progresso.

### Persistência e Ecos

- **Save:** `GameState.archetypeProgress` é opcional e aditivo, com `techniqueIds`, `signatureUses`, `victories` e `eliteVictories`. É validado na carga: só técnicas que existem, sem repetição, e no máximo tantas vitórias de elite quanto vitórias.
- **Selo do Eco:** leva `techniqueIds` e `rank: 'initiate'`.
  - O Selo é recusado se tiver técnica que não existe, se a patente não conferir com as técnicas, ou se trouxer ação de galho fora das técnicas declaradas.
  - Selos sem galho mantêm a mesma identidade de antes.
  - A vitória de elite não viaja no Selo. Como nos outros códigos, a Prova do Eco não dá recompensas.
- **Duelo:** o Iniciado também duela com 6 tempos.

### Interface

- **Árvore:**
  - um cartão de patente, com o progresso até Iniciado e os contadores;
  - o galho próprio (ou os abertos), com silhuetas, requisitos marcados e o botão "Treinar";
  - os galhos distantes ficam recolhidos.
- **Topo da tela e tela Personagem:** mostram o título da patente.
- **Combate:** a trilha mostra os tempos do combatente, 5 ou 6.

## 6. Aprendiz sem caminho: a fase dos primeiros dias

**Decisão do autor:** o Aprendiz sem caminho é um **estágio anterior** aos outros quatro, o estado do sobrevivente nos primeiros dias. Ele não concorre com os quatro arquétipos. O nome é "Aprendiz sem caminho", e tudo é apresentado como guia do Sistema. A escolha aparece depois de **3 vitórias**, como recomendado.

### Etapas

1. **Na criação**, quem ainda não sabe escolhe "Aprendiz sem caminho". Saves anteriores aos arquétipos também são tratados assim.
2. **Nos primeiros dias:**
   - qualquer galho fica aberto sem custo extra;
   - cada ação de combate registra uma inclinação, pelas poses declaradas em `affinityPoses`.

   | Caminho | Inclinação | Poses |
   | --- | --- | --- |
   | Mago | com Númen | conjurar, curar |
   | Espadachim | de perto | cortar, golpear, investir, guardar, avançar |
   | Arqueiro | de longe | atirar, arremessar, recuar |
   | Assassino | pelas brechas | estocar, fintar, esquivar |

3. **Quando o caminho se forma** (após `branchRules.path.victories` vitórias, hoje 3):
   - o Sistema avisa e abre o tópico **Caminhos** do guia (`archetype-paths`);
   - a Árvore mostra os quatro caminhos com a parcela de ações de cada um;
   - o caminho com mais ações aparece como **Sugerido pelo Sistema**, com o motivo, por exemplo "75% das suas ações foram de longe". Num empate, nada é sugerido;
   - a escolha é livre e pode ser adiada.
4. **Ao escolher** (ação `archetype.choose`, 10 minutos):
   - o personagem recebe a arma e a técnica de assinatura do caminho, já equipadas;
   - o galho daquele caminho passa a ser o seu;
   - técnicas já aprendidas de outros galhos continuam no banco, e os galhos dos outros arquétipos passam a ser distantes;
   - a escolha é única: quem já tem caminho não escolhe de novo.
5. **Iniciado** só existe depois do caminho. A progressão fica: Aprendiz sem caminho → Aprendiz de um caminho → Iniciado.

### Persistência

- **Save:** `archetypeProgress.affinity` é aditivo. Saves sem o campo começam do zero, e o campo é validado contra os caminhos do pack.
- **Personagem:** `character.archetypeId` muda uma única vez, de sem caminho para um dos quatro, pela ação validada no motor.


## 7. Combos dentro da rodada

**Decisão:** segunda proposta da lista ([Propostas](PROPOSALS-NEXT-SYSTEMS.md), item 2). Os combos ficam ocultos até serem descobertos, com a dica de Sentidos Aguçados, como recomendado.

### Regra (`resolveRound`, `content/first-day/system/combat.json`, `combos`)

- **O que é um combo:** duas ações **seguidas** do mesmo combatente, na mesma rodada.
- **Quando vale:** a primeira ação precisa ter acontecido (não foi interrompida, não errou o alcance e não foi esquivada) e a segunda precisa chegar ao alvo.
- **Efeitos extras possíveis:** `damage` (soma ao primeiro golpe), `critical` (dano dobrado), `ignore-guard` (atravessa a Postura Defensiva) e `uninterruptible` (a segunda ação não pode ser interrompida).
- **Condição extra `requiresEvade`:** o combo só vale se a esquiva de quem o faz já evitou um golpe nesta rodada.
- **Validação do pack:** ações inexistentes ou exclusivas de criaturas são recusadas, assim como bônus de dano em ação sem golpe, inabalável em ação que não pode ser interrompida, condição de esquiva sem esquiva na primeira ação e duplas repetidas.
- **Duelos:** os combos valem também nos duelos de Ecos e nas criaturas, porque são regra do motor.

| Sequência | Combo | Efeito extra |
| --- | --- | --- |
| Avançar → Corte Duplo | Corte em Avanço | +2 de dano |
| Esquivar → Golpe Furtivo | Contra-ataque Sombrio | dano dobrado, se a esquiva evitou um golpe |
| Recuar → Tiro Mirado | Distância Segura | não pode ser interrompido |
| Postura Defensiva → Seta de Númen | Conjuração Protegida | não pode ser interrompida |
| Finta → Golpe Preciso | Brecha Aberta | atravessa a Postura Defensiva |
| Arremessar Pedra → Investida | Distração | +2 de dano |
| Aparar → Corte que Abre | Resposta Imediata | dano dobrado, se o Aparar desviou um golpe |
| Tiro Duplo → Flecha que Prende | Rajada Curta | +2 de dano |
| Escudo de Númen → Explosão de Númen | Explosão Protegida | não pode ser interrompida |

### Descoberta e verificação

- **Verificação:** os combos acionados ficam em `CombatState.triggeredCombos` e vão para a resolução (`combos`) **pelo replay**. O que o cliente declarar em `combos` é ignorado.
- **Save:** `GameState.combos.discovered` é opcional e aditivo. É validado na carga: só combos do pack, sem repetição.
- **Aviso:** na primeira vez que um combo acontece num confronto do mundo, o Sistema avisa "Sequência registrada: …".

### Interface

- **Planejador:** um combo já descoberto aparece nomeado entre as duas cartas ("◆ Corte em Avanço"). Com Sentidos Aguçados, um combo ainda desconhecido aparece como "◇ Sequência possível", e há uma dica quando a última ação planejada abre um combo desconhecido.
- **Reprodução da rodada:** o combo tem uma linha em destaque.
- **Tela Personagem:** a seção "Sequências registradas" lista os combos descobertos (x/9).

## 8. Clima e hora do dia no combate

**Decisão:** terceira proposta da lista ([Propostas](PROPOSALS-NEXT-SYSTEMS.md), item 3). O efeito é leve e nunca decide o combate sozinho. Os duelos de Ecos são em campo neutro, e o clima ainda não afeta a sobrevivência.

### Clima do dia (`content/first-day/world/weather.json`, módulo `src/modules/weather`)

- **Os cinco climas:** Céu limpo, Nublado, Chuvoso, Névoa e Ventania.
- **Sorteio:** o clima é **derivado, não salvo**. Sai da semente da partida (`rng.seed`) e do dia, pesado pela estação do calendário. É o mesmo ao recarregar e no replay do combate.
- **Estações:** na estação úmida chove e há névoa com mais frequência; na seca, o tempo fica limpo ou com vento.
- **Primeiro dia:** é sempre de céu limpo (`firstDay`), para não atrapalhar os primeiros confrontos.
- **Onde aparece:** no topo da tela, ao lado da hora (ícone e nome, com a descrição ao passar o dedo ou o mouse).

### Efeitos de campo (`fieldEffects`)

Cada efeito declara quando vale (`when`: clima e/ou períodos), a quem (`side`: jogador, criaturas ou todos) e a quais ações (`match`: alcance, pose ou tipo de energia). O efeito soma dano ao primeiro golpe (nunca abaixo de 1), tempos de preparação, custo de energia, velocidade ou ações visíveis na leitura do oponente.

| Quando | Efeito |
| --- | --- |
| Chuvoso | golpes de longe causam 2 a menos; conjurações preparam 1 tempo a mais |
| Névoa | a leitura do oponente mostra uma ação a menos; golpes pelas brechas causam 1 a mais |
| Ventania | tiros e arremessos causam 1 a menos |
| Noite e madrugada | criaturas com +2 de velocidade |
| Alvorecer | conjurações do jogador custam 1 de Númen a menos |
| Tarde limpa | tiros do jogador causam 1 a mais |

### Motor e verificação

- **No combate:** `CombatState.environment` guarda o rótulo e os efeitos. O planejador, a IA, a duração das ações, o custo e a leitura de intenção usam o mesmo cálculo (`roundTiming`).
- **No confronto do mundo:** o ambiente é montado com o clima e o período do momento, tanto ao abrir o combate quanto na verificação por replay. Um resultado só confere se tiver sido jogado com o mesmo ambiente.
- **Na tela de combate:** uma faixa abaixo do título mostra o clima, o período e os efeitos ativos.

## 9. Bestiário

**Decisão:** quarta proposta da lista ([Propostas](PROPOSALS-NEXT-SYSTEMS.md), item 4). Como recomendado, o nível mais alto também traz uma nota de alguém que o Desperto conheceu, mas só depois de conhecê-lo.

### Fichas (`content/first-day/system/bestiary.json`, módulo `src/modules/bestiary`)

São cinco fichas: Predador Arisco, Predador Menor, Corvo-de-Casca, Serpente da Nascente e Javali de Espinhos. Cada ficha tem região, resumo, história, repertório e padrão, e algumas trazem uma nota de Mira, Caio ou Davi.

Os padrões descrevem o que a IA de combate realmente faz, conferido por simulação. Exemplos:

- O Corvo-de-Casca dá dois Mergulhos de Bico por rodada e, a cada duas rodadas, abre com uma esquiva.
- O Javali de Espinhos abre de longe com a Carga de Espinhos, que é interrompível.

### Níveis (derivados, não salvos)

| Nível | Quando | O que revela |
| --- | --- | --- |
| 1 · Avistada | as pistas de algum encontro com a criatura foram reveladas no mundo | nome, região e resumo |
| 2 · Enfrentada | houve pelo menos um confronto | história, vitalidade, afinidade, confrontos e vitórias |
| 3 · Estudada | a criatura já mostrou todas as suas ações | repertório com a duração de cada ação; em combate, a leitura mostra a duração das ações dela |
| 4 · Dominada | estudada e `masteryVictories` vitórias (3), ou 1 vitória com Sentidos Aguçados | padrão de comportamento, nota de quem já foi conhecido; em combate, a leitura mostra **uma ação a mais** dela |

### Registro e verificação

- **Save:** `GameState.bestiary` é aditivo e guarda, por criatura, confrontos, vitórias e ações vistas. É validado na carga: só criaturas do pack, só ações daquela criatura e no máximo tantas vitórias quanto confrontos.
- **Ações vistas:** vêm da resolução verificada (`foeActionIds`, tiradas das sequências do oponente no replay). O que o cliente declarar é ignorado.
- **Leitura extra do nível 4:** entra como efeito no ambiente do confronto (`bestiary-pattern`), montado igual na abertura do combate e no replay.

### Interface

- **Menu:** a entrada **Bestiário** aparece com a primeira criatura avistada.
- **Cartas:** as criaturas não vistas aparecem como "???". As demais mostram estrelas de 1 a 4 e só o que o nível já revelou, com dicas do próximo passo.
- **Avisos:** o Sistema avisa quando uma criatura sobe para Enfrentada, Estudada ou Dominada.

## 10. Eco aliado

**Decisão:** quinta proposta da lista ([Propostas](PROPOSALS-NEXT-SYSTEMS.md), item 5). Ficaram os valores recomendados: 60% da vitalidade de duelo e uma chamada por dia de jogo. O aliado pode entrar também contra ameaças de elite.

### Círculo de Ecos

- **Como entra:** em **Ecos**, depois de colar o Selo de alguém, o botão **Chamar como aliado** guarda o Selo no Círculo. Cabem até 3 (`MAX_ECHO_ALLIES`), e o mais antigo sai quando passa do limite.
- **Tirar do Círculo:** o botão "Tirar", na lista.
- **Antes de um confronto do mundo:** se houver Eco no Círculo, se nenhum foi chamado hoje e se o encontro não tem companheiros de grupo, o Sistema pergunta **"Chamar um Eco aliado?"**. As opções são os Ecos do Círculo, "Lutar sozinho" ou voltar.

### O aliado em combate

- **Como o Eco entra:** como companheiro (`echoAllySnapshot`), com **18 de vitalidade** (60% de `DUEL_HEALTH`) e o banco de ações do Selo, incluindo a técnica e o galho do arquétipo. Joga com o **estilo tático escolhido pelo dono**: o motor passou a aceitar estilo por companheiro, e o Eco Iniciado tem 6 tempos.
- **Sem ganhos:** o Eco não ganha experiência nem itens, e a vitalidade dele não é gravada no grupo.
- **Verificação:** a resolução leva o Selo usado (`echoAlly`), e o mundo confere que:
  - o Selo está no Círculo;
  - nenhum Eco foi chamado hoje;
  - o encontro não tem companheiros de grupo;
  - o replay foi jogado com o mesmo aliado.

  Depois disso, grava `echoes.lastAllyDay`.

### Laços de Eco

- **Agradecimento:** depois da luta, Ecos mostra um **código de agradecimento** (`AGR1.…`) para enviar ao dono.
- **Registro:** o dono cola o código em "Círculo de Ecos". O jogo confere que o agradecimento é para o Eco dele e registra o laço em **Laços de Eco**, com quantas vezes lutaram juntos e quantas venceram.
- **Duplicados:** o mesmo código não conta duas vezes.

### Persistência

`EchoesState` ganhou `allies`, `lastAllyDay` e `bonds`, todos opcionais e aditivos. São validados na carga: Selos legíveis, no máximo 3 aliados e nunca mais vitórias do que lutas juntos.
