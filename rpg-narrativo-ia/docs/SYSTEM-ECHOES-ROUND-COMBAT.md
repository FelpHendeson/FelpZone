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
| Aprendiz sem caminho definido | nenhum (2 frutos e 1 água limpa) | nenhuma: liberdade para seguir qualquer caminho |

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
