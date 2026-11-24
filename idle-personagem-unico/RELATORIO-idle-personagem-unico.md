# Relatório — Idle de Personagem Único

Relatório de execução do projeto `idle-personagem-unico` (nome de trabalho do jogo: **Idle de Personagem Único**). Cada fatia tem:

- **O que foi executado**, marcado item por item;
- **Como foi validado** (testes, navegador, CI e deploy);
- **Números principais**;
- **Dúvidas e soluções adotadas**: cada dúvida que apareceu, a solução que usei e se ela já foi aprovada pelo autor ou ainda aguarda conferência;
- **O que ficou de fora**.

Documentos de referência: [GDD](docs/GDD.md), [Decisões](docs/DECISOES.md), [Calibração](docs/CALIBRACAO.md), [Roadmap](docs/ROADMAP.md). Site publicado: [idle-personagem-unico.vercel.app](https://idle-personagem-unico.vercel.app).

## Situação geral

| Fatia | Nome | Situação | Commit | Testes ao final |
| --- | --- | --- | --- | ---: |
| F0 | Fundação | ✅ Concluída (antes deste relatório) | `293c932` | 57 |
| F1 | Sorteio do personagem | ✅ Concluída em 23/11/2026; aprovada "por ora" pelo autor em 24/11 | `c025163` | 140 |
| F2 | Loop de atividade e treino | ✅ Concluída em 24/11/2026 | `907153d` | 171 |
| F3 | Mapa e coleta | ✅ Concluída em 24/11/2026 | `a400963` | 196 |
| F4 | Combate por área | ⏳ Aguardando autorização | — | — |

Legenda das dúvidas: **Aprovada por ora** = o autor aceitou o conjunto da fatia sem pedir mudança; **Aguarda o autor** = decisão minha que ainda vale conferir (também listada em `docs/DECISOES.md`).

---

## F1 — Sorteio do personagem

**Pedido:** criação do personagem com sorteio em cascata, orçamento de raridade, 5 chances, nome, aparência e ficha.

### O que foi executado

- [x] Conteúdo como dado, com tipos fortes e ids estáveis em kebab-case:
  - [x] escala de raridades (Comum → Primordial);
  - [x] 8 raças com raridade, tags de afinidade, perfil e habilidade comum;
  - [x] 104 dons (13 por raça: 5 Incomum, 4 Raro, 2 Épico, 1 Ancestral, 1 Primordial), incluindo os exemplos do GDD para o Lobisomem;
  - [x] 12 cores com descrição, tags e 2 a 3 técnicas em texto; **Ser das Trevas com o texto exato do autor**;
  - [x] compatibilidade raça × core por tags (alta, média, excêntrica); toda raça tem core de afinidade alta ou média;
  - [x] 65 Marcas da Anomalia (uma por par excêntrico): 7 escritas à mão, incluindo **Lua sem Luz**, e as demais por gerador determinístico;
  - [x] 22 origens especiais, 3 bestas vinculadas e o gerador de origem comum (berço, motivação, marca opcional, anos de estrada), com o bônus de ofício do berço como dado;
  - [x] 12 traços de personalidade e paletas de 12 cores de cabelo e 12 de roupa.
- [x] Cascata raça → core → dom → origem → traço, com os pesos e custos do prompt, orçamento de 100 e troca pela opção de menor custo quando nada cabe.
- [x] 5 tentativas guardadas no save; a 5ª obriga a aceitar; recarregar não devolve chance.
- [x] Ações puras com erros tipados: `iniciarSorteio`, `rerolar`, `aceitarSorteio` e `definirNomeEAparencia`.
- [x] Save v2 com a primeira migração real (v1 → v2): conta com até 3 personagens, personagem ativo e sorteio.
- [x] Validação do nome (3 a 20 caracteres; letras com acento, números, espaço, hífen e apóstrofo).
- [x] Miniatura de perfil em SVG gerada por código, que varia com raça, core e cores.
- [x] Web: tela de criação com cartões, Aceitar/Rerolar, etapa de nome e cores com prévia ao vivo, ficha em Personagem → Status.
- [x] Simulação de 200 mil sorteios (`npm run simular`) registrada em `docs/CALIBRACAO.md`.
- [x] Documentação: README, ROADMAP, GDD, DECISOES, CALIBRACAO e o README dos prompts.

### Como foi validado

- `npm ci`, `npm audit --audit-level=high` (0 vulnerabilidades), `npm test`, `npm run lint`, `npm run typecheck` e `npm run build`: todos passando.
- **140 testes** ao final. Três testes da F0 foram ajustados porque supunham o save v1; os outros 54 ficaram iguais.
- Navegador em 360 px, 390 px e desktop: criação → rerolar → recarregar (mesma tentativa) → 5ª tentativa sem botão de rerolar → aceitar → nome inválido recusado → nome e cores → ficha → recarregar. Console limpo, sem rolagem lateral.
- CI do projeto verde e deploy da Vercel em `READY`; fluxo repetido no site publicado.

### Números principais

Sorteio em 200 mil tentativas, comparado com os pesos definidos:

| Passo | Definido | Observado |
| --- | --- | --- |
| Raça | 70 / 22 / 8 | 69,9 / 22,1 / 8,1 |
| Core | 70 / 25 / 5 | 69,8 / 25,2 / 5,0 |
| Origem especial | 8% | 8,0% |

O orçamento troca o resultado em só ~0,07% dos sorteios.

### Dúvidas e soluções adotadas

| # | Dúvida | Solução adotada | Situação |
| --- | --- | --- | --- |
| 1 | "5 chances" são 5 rerolagens ou 5 tentativas? | **5 tentativas no total** (a 1ª + 4 rerolagens), como no prompt ("a 5ª é obrigatória"). Um número só em `CONFIG_SORTEIO.tentativas`. | Aprovada por ora |
| 2 | Com os custos do prompt (raça Rara 25, Primordial 80, saldo 100), Draconato e Silfo **nunca** tiram dom Primordial. | Mantive os custos do prompt e registrei o efeito. Proposta: baixar a raça Rara para 20, se o autor quiser. | Aprovada por ora (mantido) |
| 3 | O GDD não define as tags de cada raça e core. | Criei um vocabulário de 30 tags. Chequei que o Lobisomem + Ser das Trevas sai excêntrico (exemplo do GDD). O Orc ficou sem core de afinidade média, então ganhou a tag `ancestral`. | Aprovada por ora |
| 4 | O core "Sem Chama" ("nenhuma afinidade") tem tags? | **Nenhuma**: é excêntrico para todas as raças e sempre traz uma Marca da Anomalia. | Aprovada por ora |
| 5 | Como criar uma marca para todo par excêntrico sem escrever 65 textos? | 7 escritas à mão e um **gerador determinístico** (núcleo da raça + complemento do core, escolhidos por hash dos ids, sem RNG). O gerador criava erros de concordância ("Canção Forjado"); troquei os complementos por locuções ("de Forja", "dos Ecos"). | Aprovada por ora |
| 6 | O que são os "detalhes finais" da cascata? | Só o **traço de personalidade** (narrativo). "Dons menores" ficaram para quando houver conteúdo. | Aprovada por ora |
| 7 | A restrição de raça da origem filtra o sorteio de raça? | Filtra **o passo de origem** (raça e core vêm antes, como manda a ordem do prompt). | Aprovada por ora |
| 8 | Como impedir que recarregar ou editar o save devolva chances ou troque o resultado? | O save guarda, para cada tentativa, o **estado do RNG no início** e um resumo. Ao carregar, a tentativa é **reproduzida** e conferida com o resumo; se não bater, o save é recusado. Efeito colateral: mudar o catálogo com um sorteio aberto exige migração. | Aprovada por ora |
| 9 | A lore comum tem gênero ("nascido/nascida")? | Frase neutra: "*Brenna vem de um porto de pescadores. Há 9 anos na estrada…*". Para raças longevas com poucos anos de estrada, entra "quase nada para um povo tão longevo". | Aprovada por ora |
| 10 | Como rodar o script de simulação em TypeScript sem dependência nova? | Remoção de tipos nativa do Node mais um resolvedor de imports de 15 linhas (`scripts/resolver-ts.mjs`). | Aprovada por ora |
| 11 | Id em kebab-case para "12º Filho do Clã Ironblood". | `12o-filho-do-cla-ironblood`. | Aprovada por ora |

### O que ficou de fora

Status, treino e atividades (F2). Técnicas equipáveis (F5). 2º e 3º personagem com Pergaminho (F9). Besta vinculada funcionando (F10). Dons menores.

---

## F2 — Loop de atividade e treino

**Pedido:** uma atividade por vez em ciclos, treino dos 8 status com piso e teto, nível e XP, offline de até 12 h e o resumo "Enquanto você estava fora". Escrevi o prompt da fatia (`prompts/idle-personagem-unico/02-fatia-F2-atividade-treino.md`), e o autor autorizou.

### O que foi executado

- [x] 8 status, perfil numérico de cada raça e fração de piso por raça.
- [x] Fórmulas do GDD §5.2 (teto cresce 10% por nível; ganho cai perto do teto); curva de XP até o nível 50.
- [x] 8 atividades de treino (uma por status), ciclo de 30 s e 10 XP por ciclo.
- [x] `avancar(estado, agora)`:
  - por ciclos, guardando o que sobra do ciclo incompleto;
  - limite de 12 h;
  - relógio que volta no tempo não dá ganho;
  - só o personagem ativo trabalha;
  - devolve o resumo do tempo fora.
- [x] Ações `iniciarAtividade` e `pararAtividade` com erros tipados; trocar de atividade descarta o ciclo parcial.
- [x] Efeitos de raça, origem e dom que mexem em status, teto, treino, XP ou velocidade passaram a valer, inclusive efeitos que só valem "até o nível N".
- [x] Save v3 com migração v2 → v3 e validação de status, XP, nível e atividade.
- [x] Web: barra fixa da atividade atual, Atividades → Treino, painel de status com piso e teto, diálogo "Enquanto você estava fora". Grava a cada 15 s, ao esconder a página e ao sair.
- [x] Bot de ritmo (`npm run ritmo`) e calibração.
- [x] Documentação atualizada.

### Como foi validado

- Todos os critérios de pronto passando a partir de instalação limpa; **171 testes**.
- Testes de propriedade:
  - avançar 3 h de uma vez dá o mesmo estado que 3 × 1 h ou 10.800 × 1 s, inclusive subindo de nível no meio;
  - 30 sementes com partições aleatórias do tempo dão o mesmo resultado;
  - 12 h são calculadas em menos de 50 ms.
- Navegador em 360 px, 390 px e desktop:
  - **migração real** de um save v2 criado no site publicado (que ainda rodava a F1);
  - treino com a página aberta;
  - resumo de 3 h fora (nível 1 → 5);
  - recarregar sem ganho duplicado.
- CI do projeto verde, Vercel `READY` e o fluxo repetido no site publicado.

### Números principais

| Quem joga | Nível 10 | Nível 20 | Nível 50 |
| --- | ---: | ---: | ---: |
| Abre 3×/dia | 1,3 dia | 5,3 dias | 48 dias |
| Abre 1×/dia | 2,8 dias | 11 dias | 97 dias |

### Dúvidas e soluções adotadas

| # | Dúvida | Solução adotada | Situação |
| --- | --- | --- | --- |
| 1 | O GDD pede "Humano piso alto, Draconato piso baixo", mas a fórmula usa 0,55 fixo. | **Fração de piso por raça**: Humano 0,65, Silfo 0,50, Draconato 0,45, demais 0,55. Registrado no GDD e na calibração com o antes e o depois. | Aguarda o autor |
| 2 | Quais alvos de ritmo usar? | Nível 10 no 1º dia, nível 20 na 1ª semana, nível 50 em 6 a 8 semanas (dedicado). Os números iniciais já bateram, então não mudei nada. | Aguarda o autor |
| 3 | O que acontece com o ciclo em andamento ao trocar de atividade? | **Descarta** (no máximo 30 s). É mais simples e dá um pequeno custo à troca. | Aguarda o autor |
| 4 | Depois do nível 20, os status lotam (77–97% da faixa). | Não mudei agora: rever junto com as outras fontes de XP (coleta e combate). | Aguarda o autor (revisitar na F4) |
| 5 | O Corpo de Vento (Silfo) acelera também o XP? | Sim: ciclos mais curtos dão mais ciclos por hora (~10% mais XP). Registrado. | Aguarda o autor |
| 6 | Como aplicar efeitos que valem só "até o nível 20" (O Despertado Tardio)? | Campo novo no efeito: `temporario: { ateNivel, modificadores }`. Os modificadores são recalculados a cada subida de nível. | Aprovado na prática |
| 7 | "+2 Espírito" muda o valor treinado ou o efetivo? | Muda o **valor efetivo** (o que outros sistemas usam). O valor treinado continua entre piso e teto; a tela mostra os dois quando diferem. | Aprovado na prática |
| 8 | Relógio que volta no tempo e depois avança: conta o tempo duas vezes? | `ultimoTick` **nunca recua**: o personagem só volta a ganhar quando o relógio passa do último instante já contado. | Aprovado na prática |
| 9 | XP com bônus de +50% vira fração. | O XP é guardado como número com casas decimais (a tela arredonda para baixo). | Aprovado na prática |
| 10 | No teste no navegador, o resumo offline não aparecia. | O app estava certo: ao fechar a página, o `pagehide` grava o estado atual por cima do save que o teste tinha editado. Ajustei o **teste** para editar o save numa página sem o jogo. | Resolvido |
| 11 | Atividades combinadas ("Corrida de resistência", Vigor + Agilidade)? | Opcionais no prompt; ficaram para depois. | Aguarda o autor |

### O que ficou de fora

Mapa, coleta e venda (F3); combate (F4). Efeitos *Centelha Humana* e *Sangue de Lua*, que dependem de regra por faixa de nível e de dia/noite.

---

## F3 — Mapa e coleta

**Pedido do autor (24/11/2026):** "Pode seguir para o F3" e manter este relatório. Escrevi o prompt da fatia (`prompts/idle-personagem-unico/03-fatia-F3-mapa-coleta.md`) para manter o histórico e executei.

### O que foi executado

- [x] **Mapa:**
  - região Vale de Pedravau com 4 locais: Pedravau (cidade com Praça, Mercado, Ferreiro, Campo de Treino, Hortas do Muro, Guilda e Taverna), Bosque Raso, Mina Velha e Lago Espelho;
  - viagens de 4 a 9 s entre locais e movimento instantâneo dentro do local.
- [x] **Ofícios:** Lenhador, Minerador, Pescador e Fazendeiro, com nível e XP próprios.
- [x] **Recursos:** 12, três por ofício, liberados nos níveis 1, 10 e 20 do ofício, cada um com local e subárea.
- [x] **Itens:** 12 materiais e 4 achados raros, com preço e pilha.
- [x] **Ferramentas:** 3 graus por ofício (básica no kit inicial, de ferro e de aço no Ferreiro).
- [x] **Avanço do tempo:**
  - consome primeiro a viagem; o ciclo só começa ao chegar;
  - coleta com rendimento fracionário e achado raro sorteados pelo RNG do save, um ciclo de cada vez (a consistência por partição continua valendo);
  - a coleta dá XP de ofício e XP do personagem.
- [x] **Status passam a valer na coleta:** Agilidade dá velocidade, Percepção e Sorte aumentam achados raros e Força aumenta a mochila.
- [x] **Mochila:** espaços e pilhas; o que não cabe se perde e aparece no resumo.
- [x] **Ações com erros tipados:**
  - `iniciarAtividade` agora com viagem automática e checagem de nível de ofício;
  - `irPara`, `vender`, `venderTudo` e `comprarFerramenta` são novas.
- [x] **Efeitos que passaram a valer:** bônus de ofício dos berços, Liberto das Minas, Pele de Pedra, Passo Silvestre, Sentidos Aguçados, Acampamento nômade, Cortiço da capital e Náufrago das Estrelas.
- [x] **Save v4** com migração v3 → v4: quem estava treinando vai para o Campo de Treino.
- [x] **Web:**
  - Atividades → Coleta;
  - Mapa → Região, Local atual e Estabelecimentos (Mercado e Ferreiro);
  - Mochila → Materiais e Ferramentas;
  - barra com "Movendo-se até…", gold e aviso de mochila cheia;
  - resumo do tempo fora com itens, perdas e níveis de ofício.
- [x] **Bot de ritmo** estendido para a coleta; calibração do XP de ofício.
- [x] **Documentação** e este relatório.

### Como foi validado

- **Verificações locais**, a partir de instalação limpa: `npm ci`, `npm audit --audit-level=high` (0 vulnerabilidades), `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` passando. São **196 testes** (187 no motor, 9 na web).
- **Testes novos**:
  - catálogo do mapa e da coleta;
  - viagem: chegar, trocar de destino no meio, voltar à origem, Elfo e Acampamento nômade;
  - coleta: itens, XP, tiers bloqueados, bônus de berço e origem, determinismo, médias de rendimento em 10 mil ciclos;
  - mochila cheia, Mercado e Ferreiro (com os bônus de preço);
  - save v4: ida e volta, migração e 12 adulterações recusadas.
- **Teste de propriedade** de partição do tempo, agora incluindo viagem e coleta com sorteio.
- **Navegador**, em 360 px, 390 px e desktop, com console limpo e sem rolagem lateral:
  - **migração real** de um save v3 criado no site publicado (que ainda rodava a F2): o personagem que meditava foi parar no Campo de Treino;
  - coletar pinho: "Movendo-se até Bosque Raso…", chegada e ciclo;
  - 2 h fora: o resumo mostrou toras, âmbar e +5 níveis de Lenhador;
  - Estabelecimentos fora da cidade: "Ir para Pedravau", viagem, "Vender tudo" (0 g → ~500–690 g);
  - recarregar mantém tudo.
- **CI e Vercel**: job do projeto verde no commit `a400963` e deploy em `READY`. O fluxo de coleta, viagem, resumo do tempo fora e venda foi repetido no site publicado em 360 px, com console limpo.

### Números principais

| Alvo (pessoa dedicada, 1 ofício) | Resultado |
| --- | ---: |
| Ferramenta de ferro | 0,5 dia |
| Tier 2 (ofício 10) | 1,3 dia |
| Ferramenta de aço | 2,5 dias |
| Tier 3 (ofício 20) | 4,3 dias |

Gold por hora com a ferramenta básica: ~320–440 g no tier 1, ~600–700 g no tier 2 e ~1.150 g no tier 3.

### Dúvidas e soluções adotadas

| # | Dúvida | Solução adotada | Situação |
| --- | --- | --- | --- |
| 1 | O GDD pede 1 região com 4 locais, mas não diz quais. | Vale de Pedravau: a cidade e um local para cada tipo de coleta (bosque, mina, lago). A **agricultura fica nas Hortas do Muro**, dentro da cidade, para a cidade também ter coleta. Nomes e textos meus, no tom sombrio com humor seco. | Aguarda o autor |
| 2 | Onde acontecem os treinos da F2 agora que existe mapa? | No **Campo de Treino de Pedravau**. A migração leva quem estava treinando para lá. | Aguarda o autor |
| 3 | O que acontece com a mochila cheia? | A coleta **continua dando XP**, mas os itens que não cabem **se perdem**, contados no resumo e com aviso na barra. Alternativa: o personagem para de coletar. | Aguarda o autor |
| 4 | Dá para vender longe da cidade? | Não: o Mercado fica em Pedravau (GDD §8.1: "usar exige estar na subárea"). Criei a ação **Ir para**, que para a atividade e viaja. Dentro da cidade, ir ao Mercado é instantâneo e não interrompe o treino. | Aguarda o autor |
| 5 | O que fazer se o destino muda no meio de uma viagem? | Durante a viagem o personagem **continua no local de origem**: mudar o destino recomeça a viagem dali, e voltar à origem cancela. Simples de explicar e de validar no save. | Aprovado na prática |
| 6 | A curva de XP de ofício abria o tier 3 em 1,5 dia. | Ajustei pelo bot: base **40 → 150**; o tier 3 abre em ~4 dias. Registrado com o antes e o depois. | Aguarda o autor |
| 7 | O gold sobra (~240 mil no 7º dia) e não há onde gastar. | Esperado: os gastos chegam na F8 e na F10. Preços marcados como provisórios, para recalibrar quando houver o que comprar. | Aguarda o autor |
| 8 | "Náufrago das Estrelas: −5% no preço de compra por não entender de moeda": é bônus ou fraqueza? | Li o texto **literalmente** (paga 5% menos). Se for fraqueza, basta trocar o sinal. | Aguarda o autor |
| 9 | Quais ferramentas entram? O GDD lista 7 (inclui faca de coleta, martelo de forja e caldeirão). | Só as **4 de coleta**; as de produção entram com a produção (F8). Ao comprar uma melhor, a antiga fica com o Ferreiro (ainda não há inventário de equipamentos). | Aguarda o autor |
| 10 | Como manter "3 h de uma vez = 3 × 1 h" com sorteios na coleta? | Os sorteios usam o RNG do save **um ciclo de cada vez, sempre na mesma ordem**, e o estado do RNG vai para o save. Testado por propriedade. | Resolvido |
| 11 | A coleta deve dar XP de personagem? | Sim, **5 por ciclo** (metade do treino), para coletar não travar o nível. | Aguarda o autor |
| 12 | Quais status passam a valer? | Agilidade (+1% de velocidade de coleta por ponto), Percepção e Sorte (+1% na chance de achado raro por ponto) e Força (+0,5 espaço de mochila por ponto), seguindo o GDD §5.1. | Aguarda o autor |
| 13 | O Elfo tem "bônus em colheita" no texto da raça. | Virou **+10% de rendimento na agricultura**, junto com o Passo Silvestre (viagem −30% entre locais naturais). | Aguarda o autor |
| 14 | No teste no navegador, o fluxo de venda precisava esperar a viagem. | O teste espera o Ferreiro aparecer (fim da viagem) antes de vender. Os 404 no console vêm da página inexistente que o teste usa de propósito e foram filtrados. | Resolvido |

### O que ficou de fora

Combate e drops (F4). Habilidades e técnicas (F5). Produção, forja, fusão, afixos e nomeados (F8). Pets (F10). Dia/noite e clima (F11). Baú, ampliação de mochila e mais regiões.

---

## Próximo passo

**F4 — Combate por área** (primeiro marco "jogável completo": treinar → coletar → vender → equipar → caçar). Só começa com autorização do autor. Antes, vale conferir as dúvidas marcadas como "Aguarda o autor" acima.
