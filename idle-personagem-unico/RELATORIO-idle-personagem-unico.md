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
| F4 | Combate por área | ✅ Concluída em 24/11/2026 | `84edc9b` | 218 |
| F5 | Habilidades e core | ✅ Concluída em 24/11/2026 | `3759090` | 242 |
| F6 | O Limiar | ✅ Concluída em 24/11/2026 | `7275030` | 263 |
| F7 | Missões e Guilda | ⏳ Aguardando autorização | — | — |

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

## F4 — Combate por área

**Pedido do autor (24/11/2026):** "Pode seguir". Escrevi o prompt (`prompts/idle-personagem-unico/04-fatia-F4-combate.md`) e executei. É o **primeiro marco jogável completo**: treinar → coletar → vender → equipar → caçar.

### O que foi executado

- [x] **Conteúdo de combate:**
  - 6 áreas (subáreas de Bosque Raso, Mina Velha e Lago Espelho), níveis 1, 5, 10, 15, 20 e 25;
  - 24 monstros, por área 2 comuns (um ágil, um resistente), 1 raro (5% de aparição) e 1 chefe a cada 50 abates;
  - 6 materiais de combate e 17 equipamentos: kit básico (porrete e gibão) e couro, ferro e aço em 5 slots.
- [x] **Status de combate** vindos dos status e do equipamento, pelo modelo de modificadores:
  - vida (Vigor), ataque (Força), defesa (Resistência);
  - velocidade de ataque e esquiva (Agilidade), crítico (Percepção).
- [x] **Simulação em passos de 0,5 s** dentro do avanço do tempo (procurar → lutar → abater ou recuar), com o estado completo da luta no save. Aparição, crítico, esquiva e drops usam o RNG do save, e dividir o tempo continua dando o mesmo resultado.
- [x] **Recuo automático** de 0 a 90% (padrão 30%) e **desmaio provisório** (sem Limiar até a F6).
- [x] **Vida** guardada entre lutas e recuperada fora do combate.
- [x] **Ações:**
  - caçar (`iniciarAtividade` numa área, com viagem);
  - `equipar` e `desequipar`;
  - `comprarEquipamento` no Ferreiro (tiers 1 e 2);
  - `definirRecuo`.
- [x] **Risco da área** (verde/amarelo/vermelho) calculado com os status de verdade.
- [x] **Save v5** com migração v4 → v5.
- [x] **Web:**
  - Combate → Áreas e Bestiário (O Limiar continua "Em construção");
  - Mochila → Equipados e Equipáveis;
  - Ferreiro com armas e armaduras;
  - vida e status de combate na ficha;
  - barra com a luta ao vivo (vida do personagem e do monstro);
  - resumo do tempo fora com abates, recuos e desmaios.
- [x] **Bot de ritmo** do combate e calibração (duas mudanças de número e um bug corrigido).
- [x] **Documentação** e esta seção.

### Como foi validado

- **Verificações locais**, a partir de instalação limpa: `npm ci`, `npm audit --audit-level=high` (0 vulnerabilidades), `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` passando. São **218 testes** (209 no motor, 9 na web).
- **Testes novos**:
  - catálogo de combate;
  - fórmulas de status, dano e risco;
  - viagem até a área e primeira luta;
  - uma hora de caça (abates, XP, drops, bestiário);
  - chefe a cada 50, e fugir do chefe o adia;
  - recuo e desmaio;
  - cura fora do combate;
  - equipar, desequipar, comprar e recuo;
  - save v5: ida e volta no meio de uma luta, migração e 10 adulterações recusadas.
- **Teste de propriedade**: 18 sementes, todas as áreas, recuo 0/30/60%, partições aleatórias do tempo, todas com o mesmo resultado. 12 h de combate em menos de 1 s.
- **Navegador**, em 360 px, 390 px e desktop, com a cadeia completa:
  - 1 h de treino;
  - 3 h colhendo trigo;
  - vender tudo (~1.000 g);
  - comprar espada, gibão e calças de couro e equipar;
  - caçar na Trilha dos Lobos (risco "Tranquilo", Poço sem Fundo "Perigoso");
  - ver "Lutando com Lobo cinzento" e as duas barras de vida;
  - 1 h fora: 300 a 426 abates, chefe abatido, recuos, drops de equipamento;
  - bestiário preenchido;
  - recarregar no meio da luta mantém a luta.

  Também a **migração real** de um save v4 criado no site publicado (que ainda rodava a F3). Console limpo, sem rolagem lateral.
- **CI e Vercel**: job do projeto verde no commit `84edc9b` e deploy em `READY`. A cadeia completa (treinar → coletar → vender → equipar → caçar, 1 h fora e recarregar durante o recuo) foi repetida no site publicado em 360 px, com console limpo.

### Números principais

| Área (nível) | Preparado: risco, XP/h | Despreparado: risco |
| --- | --- | --- |
| Trilha dos Lobos (1) | verde 5%, 2.195 XP/h | amarelo 18% |
| Galeria dos Ratos (5) | amarelo 11%, 1.798 XP/h | amarelo 33% |
| Juncal Escuro (10) | verde 9%, 2.689 XP/h | vermelho 47% |
| Coração do Bosque (15) | amarelo 13%, 2.745 XP/h | vermelho 57% |
| Margem Afogada (20) | verde 8%, 4.204 XP/h | vermelho 64% |
| Poço sem Fundo (25) | amarelo 10%, 4.187 XP/h | vermelho 69% |

Nenhum desmaio com o recuo padrão. Referência: o treino dá 1.200 XP/h.

### Dúvidas e soluções adotadas

| # | Dúvida | Solução adotada | Situação |
| --- | --- | --- | --- |
| 1 | O que acontece na morte se o Limiar só vem na F6? | **Desmaio provisório**: acorda em Pedravau com 50% da vida, ocioso, sem perder nada. Registrado no GDD §10 como provisório. | Aguarda o autor |
| 2 | Como fazer o combate offline ser igual ao online? | Os mesmos passos de 0,5 s nos dois casos. O estado da luta (fase, monstro, vida dele, recargas, contador do chefe) vai para o save, e o que sobra de meio passo também. Testado por propriedade. | Resolvido |
| 3 | Vida guardada em pontos ou em fração? | **Fração da vida máxima** (0 a 1). Assim, subir de nível ou trocar de equipamento não deixa a vida inválida, e a cura fora do combate fica linear (dividir o tempo não muda nada). | Aprovado na prática |
| 4 | Dano = ataque − defesa? | Não: **ataque² ÷ (ataque + defesa)**, mínimo 1. Com a subtração, a armadura anulava golpes inteiros e o equilíbrio quebrava. | Aguarda o autor |
| 5 | Primeira versão dos monstros: todas as áreas depois da primeira ficavam vermelhas mesmo para quem estava preparado. | O bot mostrou que os monstros cresciam ×9,5 do nível 1 ao 25, contra ×3,4 do personagem. Reescalei para × (1 + 0,15 × (L − 1)), o ritmo de quem treina e se equipa. Antes e depois na calibração. | Aguarda o autor |
| 6 | O bot mostrou uma caça travada em 12 abates/h. | **Bug**: ao recuar da luta com o chefe, ele reaparecia em toda busca. Correção: fugir do chefe faz ele ir embora até mais 50 abates. Teste novo para isso. | Resolvido |
| 7 | Recuos frequentes (10–25/h, mesmo preparado). | Subi a cura entre lutas de 0,5%/s para 1%/s; os recuos caíram um pouco. Deixei como está e registrei: dá valor a Vigor e defesa. Alternativa: 2%/s ou busca mais longa. | Aguarda o autor |
| 8 | Um personagem nível 1 sem equipamento e sem recuo desmaia na primeira área depois de ~10 lutas. | É o ciclo pretendido (treinar → coletar → vender → equipar → caçar): despreparado fica "Arriscado" e o recuo padrão de 30% evita o desmaio. Com equipamento de couro, a área fica "Tranquila". | Aguarda o autor |
| 9 | Quantos slots e afixos? | 5 slots (arma, elmo, peitoral, calças, botas), **sem afixos** (F8). Manoplas, mão secundária, acessórios e relíquia ficam para depois. O tier 3 só cai de monstros. | Aguarda o autor |
| 10 | O bestiário dá bônus? | Na F4 só conta abates (e esconde "???" quem nunca foi abatido). Os marcos com bônus ficam para a F11, como no roadmap. | Aguarda o autor |
| 11 | Como mostrar o risco sem enganar? | É a vida média perdida por luta contra os comuns, calculada com os status e o equipamento atuais: verde < 10%, amarelo < 35%, vermelho acima. | Aguarda o autor |
| 12 | Combate tem ciclos? O resumo "Enquanto você estava fora" não aparecia para quem só caçou. | Combate não tem ciclos; o resumo agora aparece também quando há abates, recuos ou desmaio. | Resolvido |
| 13 | Equipar no meio da caça? | Permitido em qualquer lugar (é um jogo idle); os status de combate valem a partir do próximo avanço. | Aprovado na prática |
| 14 | Bot do ciclo completo (treinar → coletar → vender → equipar → caçar). | Validei a cadeia completa no navegador nas três larguras. O bot mede cada parte separada (treino, coleta e combate por área); um bot da cadeia inteira fica para quando houver missões (F7), que mudam o ritmo. | Parcial |

### O que ficou de fora

Habilidades, técnicas e elementos (F5). O Limiar, Barqueiro e Eco da Morte (F6). Missões e guilda (F7). Afixos, fusão, nomeados, acessórios e relíquias (F8). Pets (F10). Bônus do bestiário, dia/noite e clima (F11). Bot da cadeia completa.

---

## F5 — Habilidades e core

**Pedido do autor (24/11/2026):** "Pode seguir". Escrevi o prompt (`prompts/idle-personagem-unico/05-fatia-F5-habilidades.md`) e executei.

### O que foi executado

- [x] **66 habilidades** com os quatro eixos do GDD §12 (natureza, modo, duração, escopo):
  - as **31 técnicas** que a F1 tinha só como texto ganharam efeito; o Ser das Trevas mantém o texto do autor;
  - **24 técnicas de ramo**, 2 ramos por core: o "core abre ramos" do roadmap;
  - **11 habilidades de livro**: combate, coleta e viagem.
- [x] **Slots:** 5 ativas; passivas começam com 3 e ganham +1 a cada 10 níveis.
- [x] **Ações:** equipar, desequipar e mudar a ordem de prioridade.
- [x] **Ativas automáticas no combate**, como no LionHearth:
  - prioridade pela ordem dos slots e recarga;
  - golpe, cura (só abaixo de 50% de vida), reforço, enfraquecimento e atordoamento;
  - recargas e efeitos em curso ficam no save, e dividir o tempo continua dando o mesmo resultado.
- [x] **Passivas** como modificadores e **auras** que valem só com pouca vida. As passivas de coleta afetam a coleta e as de viagem afetam a viagem.
- [x] **Maestria** de 1 a 30:
  - sobe por uso (ativa disparada, passiva em ação) e pela atividade de **Aprendizado**;
  - **evolução** em estágios II (maestria 10) e III (maestria 25), com o numeral no nome.
- [x] **Ramo do core:** escolha única a partir do nível 10, que ensina a técnica do ramo.
- [x] **Livros:** à venda no Livreiro (Mercado) e deixados por monstros raros (3%) e chefes (15%). Ler um livro ensina a habilidade.
- [x] **Efeitos que passaram a valer:** Adaptável (Humano), Mosteiro de aldeia, O Reencarnado, Aprendiz do Mago Morto e Órfão do Templo Cinzento.
- [x] **Save v6** com migração v5 → v6.
- [x] **Web:**
  - Personagem → Habilidades (ramo, slots, prioridade, conhecidas, livros);
  - Atividades → Aprendizado;
  - Livreiro;
  - barra de "Praticando…";
  - resumo do tempo fora com a maestria ganha.
- [x] **Bot de ritmo** das habilidades, **documentação** e esta seção.

### Como foi validado

- **Verificações locais**, a partir de instalação limpa: `npm ci`, `npm audit --audit-level=high` (0 vulnerabilidades), `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` passando. São **242 testes** (233 no motor, 9 na web).
- **Testes novos:**
  - catálogo (técnicas da F1 com o mesmo nome e modo, 2 ramos por core, livros);
  - curva e estágios de maestria; slots;
  - personagem novo já equipado; auras;
  - equipar, prioridade, ramo, comprar e ler livro;
  - Aprendizado; Adaptável (+8% medido);
  - **habilidade de coleta aumentando a coleta**;
  - **ativas disparando sozinhas** (mais abates que sem ativas); cura só quando precisa;
  - save v6: ida e volta no meio de uma luta com efeitos, migração e 9 adulterações recusadas.
- **Teste de propriedade:** 12 sementes, 4 combinações de habilidades (reforços, enfraquecimentos, atordoamento, curas, auras), partições aleatórias do tempo, todas com o mesmo resultado.
- **Navegador**, em 360 px, 390 px e desktop:
  - habilidades do core equipadas;
  - praticar 1 h (Leitura Fria +8 de maestria);
  - colher e vender, comprar e ler o livro Golpe Firme, equipar;
  - caçar 12 h (nível 4 → 13, as ativas ganhando maestria) e mais 12 h na Galeria dos Ratos;
  - **escolher o ramo do core** no nível 10+;
  - recarregar.

  Também a **migração real** de um save v5 criado no site publicado (que ainda rodava a F4) com **uma luta em andamento**: a luta continuou e as técnicas do core foram equipadas. Console limpo, sem rolagem lateral.
- **CI e Vercel**: job do projeto verde no commit `3759090` e deploy em `READY`. O fluxo (praticar, livro, caçar 24 h, escolher o ramo, recarregar) foi repetido no site publicado em 360 px, com console limpo.

### Números principais

- Maestria pela prática: estágio II em **1,5 h**, estágio III em **15 h** e máximo em **23 h**, por habilidade.
- Ganho de abates com as técnicas do core no Juncal Escuro: de **+7%** (Guardião da Terra) a **+65%** (Portador da Chama). Andarilho e Sem Chama ~0% (são cores de coleta e treino).

### Dúvidas e soluções adotadas

| # | Dúvida | Solução adotada | Situação |
| --- | --- | --- | --- |
| 1 | O que é "core abre ramos" (GDD §3.2: "o core tem ramos de técnicas; o personagem escolhe por onde seguir")? | **2 ramos por core**, escolha **única** a partir do nível 10; cada ramo ensina uma técnica nova. Os 24 ramos e técnicas são meus. | Aguarda o autor |
| 2 | As técnicas da F1 eram só texto; algumas dependem de sistemas que não existem. | Viraram habilidades com números. As que dependiam de durabilidade, pets ou tipos de criatura foram reinterpretadas (Improviso, Ordem de Ataque, Voto de Aurora). As de produção e de pets ficaram **sem efeito**, marcadas como pendentes e fora do equipamento automático. | Aguarda o autor |
| 3 | Folha em Branco ("aceita qualquer técnica") como passiva que dá +1 slot ocuparia o próprio slot que dá. | Ela dá **+1 slot só por ser conhecida**, sem precisar ser equipada. | Aguarda o autor |
| 4 | Ativas: quando disparam? | A cada passo de 0,5 s, a **primeira ativa pronta na ordem dos slots** dispara (uma por passo), antes do ataque básico. Curas só com vida abaixo de 50% (GDD §7). | Aprovado na prática |
| 5 | Recolocar uma ativa zera a recarga (abuso)? | Não: a recarga continua correndo mesmo fora do slot. | Resolvido |
| 6 | Como a maestria sobe? | Pela atividade de **Aprendizado** (10 por ciclo de 30 s) e por uso: ativa +2 por disparo; passiva +1 quando está em ação (abate, ciclo de coleta ou qualquer ciclo para as "gerais"). | Aguarda o autor |
| 7 | Evolução "em marcos" (GDD §6.4). | Estágios **II** na maestria 10 (×1,25) e **III** na 25 (×1,5), mais +2% por nível. O nome ganha o numeral ("Bote III"). Versões com nome e efeito próprios por habilidade ficam para quando houver conteúdo. | Aguarda o autor |
| 8 | De onde vêm habilidades novas além do core? | **Livros**: Livreiro no Mercado e drops de raros e chefes. Mestres NPC e guilda ficam para a F7. | Aguarda o autor |
| 9 | Personagem novo e saves antigos começam com o quê? | Conhecendo as técnicas do próprio core, com as ativas e até 3 passivas úteis **já equipadas**, para quem não mexer nas habilidades não ficar sem nada. | Aprovado na prática |
| 10 | O equilíbrio entre cores no combate ficou desigual. | Medido pelo bot (+7% a +65%). Mantive: Andarilho e Sem Chama ganham na coleta, na viagem e no treino, e os livros de combate custam 300 g. Registrado para o autor. | Aguarda o autor |
| 11 | No teste no navegador, os títulos "Ativas"/"Passivas" quebravam no meio da palavra em 360 px. | Corrigi o CSS: a linha do título quebra inteira e o texto ao lado desce. | Resolvido |
| 12 | O resumo dizia "O limite é de 12 h: 0 s não contaram" quando a diferença era de milissegundos. | Só aparece com diferença de 1 s ou mais. | Resolvido |
| 13 | As tabelas de combate da F4 mudaram um pouco. | Cada abate agora também sorteia um livro, o que muda a ordem do RNG (±2% nos números). Nenhum número da F4 foi alterado. | Resolvido |
| 14 | O combate acelera a subida de nível além do ritmo medido na F2 (só treino). | Registrado: os alvos de ritmo precisam ser medidos de novo com a cadeia completa (bot pendente desde a F4). | Pendente |

### O que ficou de fora

Elementos e resistências. Habilidades de produção (F8) e de pets (F10) funcionando. Mestres NPC e habilidades da guilda (F7). Versões evoluídas com nome próprio. Bot da cadeia completa.

---

## F6 — O Limiar

**Pedido do autor (24/11/2026):** "Pode seguir". Escrevi o prompt (`prompts/idle-personagem-unico/06-fatia-F6-limiar.md`) e executei. O desmaio provisório da F4 deixou de existir.

### O que foi executado

- [x] **Morte sem permadeath** (decisão do autor): com a vida a zero, o personagem atravessa para **O Limiar**. A atividade fica guardada e **volta sozinha** ao sair, com viagem se for longe.
- [x] **Duração:** 10 min + perigo da área, × Eco da Morte, × reduções de origem, raça, core e set.
- [x] **Dentro do Limiar:**
  - combate contínuo contra Almas Penadas, Ceifeiros Menores e o raro Eco Faminto, que acompanham o nível do personagem;
  - o personagem luta com 75% do ataque e da defesa;
  - não há segunda morte: ele se recompõe e volta à luta contra o mesmo monstro.
- [x] **Drops exclusivos:**
  - **Essência do Limiar** (moeda);
  - Cinza de alma (vendável);
  - chefes raros (O Cobrador, A Rainha Pálida) deixam as **4 peças nomeadas de O Retornado**, uma de cada por personagem, com bônus que crescem com as mortes.
- [x] **O Barqueiro Sem Rosto:** pedágio em Essência para sair antes; o Devedor do Barqueiro sai de graça na primeira vez.
- [x] **Eco da Morte:** mortes recentes alongam a estadia e melhoram os drops; as cargas expiram em 2 h (1 h para o Devedor).
- [x] **Sinergias:** Sangue-Pálido e Ser das Trevas (Limiar mais curto e mais ataque lá dentro). **Títulos** por mortes.
- [x] **Ações de fora bloqueadas no Limiar**, exceto equipar, habilidades e recuo.
- [x] **Efeitos que passaram a valer:** Sobrevivente do Vazio, Aldeia à beira do Limiar e Devedor do Barqueiro.
- [x] **Save v7** com migração v6 → v7.
- [x] **Web:**
  - Combate → O Limiar (estadia, Barqueiro, Eco, set);
  - Personagem → Títulos;
  - barra "No Limiar · volta em…";
  - resumo do tempo fora com mortes, saídas e Essência.
- [x] **Bot de ritmo** do Limiar (um bug e uma calibração), **documentação** e esta seção.

### Como foi validado

- **Verificações locais**, a partir de instalação limpa: `npm ci`, `npm audit --audit-level=high` (0 vulnerabilidades), `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` passando. São **263 testes** (254 no motor, 9 na web).
- **Testes novos:**
  - catálogo; duração com cada redução; cargas do Eco (e o Devedor);
  - entrar; lutar lá dentro sem segunda morte; ações bloqueadas; sair retomando a atividade com viagem;
  - **morrer, passar pelo Limiar e voltar a caçar no mesmo avanço offline**;
  - Eco alongando a estadia; pedágio; Devedor; peças de O Retornado sem cópia dupla; bônus do set;
  - save v7: ida e volta dentro do Limiar, migração e 8 adulterações recusadas.
- **Teste de propriedade:** 10 sementes com mortes, Limiar e retorno, partições aleatórias do tempo, todas com o mesmo resultado.
- **Navegador**, em 360 px, 390 px e desktop:
  - caçar no Poço sem Fundo sem recuo e morrer de verdade;
  - "No Limiar · volta em 14 min 40 s" (Ser das Trevas, −20%);
  - o Barqueiro com o pedágio indisponível sem Essência;
  - "No Limiar só se combate" ao tentar treinar;
  - 30 min fora: saiu do Limiar, voltou ao Poço, morreu de novo e a segunda estadia ficou mais longa pelo Eco;
  - títulos e recarregar.

  Também a **migração real** de um save v6 criado no site publicado (que ainda rodava a F5). Console limpo, sem rolagem lateral.
- **CI e Vercel**: job do projeto verde no commit `7275030` e deploy em `READY`. O fluxo (morrer no Poço, Limiar, bloqueio, 30 min fora com retorno, recarregar) foi repetido no site publicado em 360 px, com console limpo.

### Números principais

- Uma morte na área do próprio nível custa **12 a 18 min** (20 a 32 min com Eco 3).
- A estadia rende Essência um pouco acima do pedágio.
- O Retornado completo leva **~20 h de Limiar**.

### Dúvidas e soluções adotadas

| # | Dúvida | Solução adotada | Situação |
| --- | --- | --- | --- |
| 1 | "Combate contra Almas Penadas e Ceifeiros Menores, **com atributos reduzidos**, mas drops exclusivos": reduzidos de quem? | Do **personagem** (75% de ataque e defesa), compensados pelos drops exclusivos. Os monstros acompanham o nível em que ele entrou. | Aguarda o autor |
| 2 | O GDD diz que a atividade "volta sozinha" e também que o resto do offline "vira espera na cidade". | Segui "volta sozinha": ao sair, acorda em Pedravau e retoma (com viagem). O custo continua sendo o tempo no Limiar. | Aguarda o autor |
| 3 | Morrer de novo dentro do Limiar? | Não existe segunda morte: com a vida a zero ele se **recompõe em 3 s** e volta a lutar contra o mesmo monstro, que continua ferido. | Aguarda o autor |
| 4 | O bot mostrou 0 chefes vencidos em 10 h de Limiar. | **Bug**: ao se recompor, o monstro era descartado; com 6× mais vida, o chefe sempre escapava e O Retornado era impossível. Correção: a luta continua contra o mesmo monstro. | Resolvido |
| 5 | Depois da correção, o set completava em 2 h de Limiar. | Chefe de 1% → 0,5% por busca e peça de 50% → 20%: ~20 h de Limiar. Registrado com o antes e o depois. | Aguarda o autor |
| 6 | Como guardar o Eco da Morte sem quebrar a regra de que dividir o tempo não muda o resultado? | Em vez de um contador que decai, guardo o **instante de cada morte recente**; as cargas são as mortes dentro da janela (2 h). O instante vem do relógio do save, igual com o jogo aberto ou fechado. | Resolvido |
| 7 | O fim do Limiar acontecia meio passo (500 ms) antes. | Erro de um passo: eu descontava o tempo antes de rodar o passo. Corrigi e o teste de retorno com viagem confere o tempo exato. | Resolvido |
| 8 | Essência é item ou moeda? | **Moeda** do personagem (GDD §9.5), fora da mochila. Por enquanto só paga o pedágio. | Aguarda o autor |
| 9 | O que dá para fazer dentro do Limiar? | Só lutar. Equipar, mexer nas habilidades, mudar o recuo e pagar o Barqueiro continuam valendo; o resto devolve "No Limiar só se combate". | Aguarda o autor |
| 10 | Bônus do set O Retornado "mais fortes quanto mais mortes". | 2 peças: +1% de ataque por morte; 4 peças: também +1% de defesa por morte e Limiar 20% mais curto; teto de 25%. | Aguarda o autor |
| 11 | Sinergias "Ser das Trevas e Sangue-Pálido têm bônus no Limiar". | Limiar 20% mais curto e +20% de ataque lá dentro, para cada um (somam). | Aguarda o autor |
| 12 | Títulos. | Calculados pelas mortes (5, 25, 100) e mostrados em Personagem → Títulos; o bônus dos títulos fica para a F11. | Aguarda o autor |
| 13 | Saves antigos com "desmaios". | A migração zera mortes e Essência: desmaios antigos não contam como mortes. | Aguarda o autor |

### O que ficou de fora

Bônus dos títulos e a Crônica (F11). Livro ou habilidade específica para encurtar o Limiar (as reduções vêm de origens, raça, core e set). Bot da cadeia completa (pendente desde a F4).

---

## Próximo passo

**F7 — Missões e Guilda**: missões de NPC, metas, quadro da Guilda de Aventureiros, ranks F → Divino, Mérito, provas de promoção e subáreas de NPC. Só começa com autorização do autor. Antes, vale conferir as dúvidas marcadas como "Aguarda o autor" acima.
