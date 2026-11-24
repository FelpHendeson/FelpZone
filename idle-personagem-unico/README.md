# Idle de Personagem Único (nome de trabalho)

Idle RPG em que o jogador **sorteia um único personagem** (raça, habilidade core e dons raros) e o acompanha para sempre. Você não controla as ações do personagem: escolhe **a atividade** que ele executa (treinar, coletar, produzir, aprender, combater) e **onde**. Ele trabalha sozinho, até 12 horas com o jogo fechado.

O jogo **não tem fim**: o conteúdo cresce por atualizações, e bots, torneios, rankings e temporadas dão objetivo de longo prazo.

**Versão publicada (acompanhamento a cada fatia):** [idle-personagem-unico.vercel.app](https://idle-personagem-unico.vercel.app/). Projeto Vercel `idle-personagem-unico`, diretório raiz `idle-personagem-unico/apps/web`, deploy automático a cada push na `main`.

> Projeto **novo**, independente do LionHearth (`idle-guilda`). Aproveita as boas ideias técnicas dele (motor em TS puro, simulação determinística, offline), mas é outro jogo.

## Estado atual

**F11 (Mundo vivo) concluída.** O mundo tem relógio (1 h real = 1 dia, noite das 19h às 5h) e clima, que mudam o poder de raças e cores, os monstros raros e a coleta; **eventos** com escolhas aparecem enquanto o personagem trabalha; a **Crônica** conta a história; títulos e Bestiário dão bônus; e cada origem especial tem seu **arco** de 3 capítulos.

**F10 (Pets) concluída.** Pets reais (domados com Laço de doma ou comprados no Estábulo) e as bestas vinculadas das origens especiais, com nome, nível, Energia e Fome; 1 pet por atividade, que só cansa quando o personagem trabalha ali; cuidados (alimentar, descansar, treinar) como atividades; e o modo União das bestas.

**F9 (Conta e sincronização) concluída** (o banco ainda precisa ser ativado na Vercel: veja `docs/DECISOES.md`, item 60). Agora há **até 3 personagens** por conta (o 2º e o 3º com o Pergaminho do Novo Destino, ganho na guilda), o **Cofre da Conta** (conquistas e Álbum de Descobertas) e uma **conta opcional** que sincroniza o jogo entre aparelhos, com o servidor aplicando as ações. Sem conta, tudo continua local.

**F8 (Forja, produção e nomeados) concluída.** O personagem treina, coleta, vende, equipa, caça, usa habilidades, volta do Limiar e cumpre missões da guilda (F1 a F7), e agora **produz**: forja equipamentos e anéis, prepara poções e amuletos, cozinha, **funde** 3 itens iguais numa versão melhor (+1 a +3), usa **2 acessórios e 1 relíquia**, bebe poções sozinho no combate e guarda **itens nomeados** únicos. Ainda não há conta online nem pets (F9 em diante).

O relatório de cada fatia (o que foi feito, validado, dúvidas e soluções) está em **[`RELATORIO-idle-personagem-unico.md`](RELATORIO-idle-personagem-unico.md)**. O design completo e o plano de construção estão em:

- **[GDD](docs/GDD.md)**: personagem, sorteio, status, atividades, combate, mapa, itens, forja, morte (O Limiar), missões, guilda, habilidades, pets, competição e interface.
- **[Origens](docs/ORIGENS.md)**: gerador de origem comum e 22 origens especiais com lore, efeito e gancho de história.
- **[Arquitetura](docs/ARQUITETURA.md)**: motor TS puro, web Next, API, banco, segurança e port mobile.
- **[Roadmap](docs/ROADMAP.md)**: fatias F0 a F14.
- **[Decisões](docs/DECISOES.md)**: o que o autor decidiu, o que é proposta e as perguntas abertas.
- **[Calibração](docs/CALIBRACAO.md)**: números [Calibrar], simulação de 200 mil sorteios e propostas de ajuste.

Prompts de implementação ficam em [`prompts/idle-personagem-unico/`](../prompts/idle-personagem-unico/README.md).

### O que a F0 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/rng.ts` | Gerador **sfc32** com semente (inteiro ou texto) e estado serializável; `inteiro`, `flutuante`, `escolhaPonderada`, `embaralhar`. |
| `packages/motor/src/tempo.ts` | Relógio injetável (`Relogio.agora()`), passo de **0,5 s**, limite offline de **12 h** (86.400 passos) e `calcularPassos(desde, ate)`. |
| `packages/motor/src/modificadores.ts` | Modelo único de modificadores (`somar`, `percentual`, `multiplicar`) e a composição `(base + Σsomar) × (1 + Σpercentual) × Πmultiplicar`. Sem conteúdo. |
| `packages/motor/src/save.ts` | Save com `versao`, tabela de migrações (vazia), limite de **512 KiB**, validação e rejeição de entrada malformada. `carregarSave` nunca lança: devolve estado ou erro. |
| `packages/motor/src/armazenamento.ts` | Interface `Armazenamento` (assíncrona, para servir também ao mobile), versão em memória e `salvarJogo`/`lerJogo`. |
| `apps/web` | Next (App Router), mobile-first: abas inferiores (Atividades, Combate, Mapa, Mochila, Missões, Personagem) e sub-abas do GDD §16, vazias. Cria, salva e carrega o estado vazio em `localStorage` pela interface `Armazenamento`; save inválido vira cópia em `idle-pu:save-invalido` e o jogo recomeça. |

O motor não importa React, Next, DOM nem módulos do Node, e não usa `Math.random`. Isso é garantido três vezes: `tsconfig` do motor sem tipos de DOM/Node, regras do ESLint e um teste que varre `packages/motor/src`.

### O que a F1 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/dados/` | Conteúdo como dado: raridades, **8 raças** (tags, perfil, habilidade comum), **104 dons** (13 por raça), **12 cores** com 2–3 técnicas em texto (Ser das Trevas com o texto do autor), compatibilidade por tags, **65 Marcas da Anomalia** (7 curadas + gerador determinístico por modelos), **22 origens especiais**, 3 bestas vinculadas, gerador de origem comum (10 berços com bônus de ofício como modificador, 10 motivações, 5 marcas), 12 traços e paletas de 12 cores de cabelo e de roupa. Efeitos sem sistema ainda ficam em `efeitoPendente` (não aplicados). |
| `packages/motor/src/sorteio/` | `config.ts` (pesos e custos [Calibrar]), `cascata.ts` (sorteio com orçamento e fallback de menor custo; tentativa reproduzível pelo estado do RNG) e `acoes.ts` (`iniciarSorteio`, `rerolar`, `aceitarSorteio`, `definirNomeEAparencia`, erros tipados). |
| `packages/motor/src/personagem/` | Conta (até 3 personagens; só o 1º nesta fatia), ficha inicial, validação do nome, lore da origem e **miniatura SVG** determinística. |
| `packages/motor/src/save.ts` | **Save v2** com migração real v1 → v2 (`conta` com `personagens[]`, `personagemAtivoId`, `sorteio`). O sorteio guarda o estado do RNG de cada tentativa e um resumo, conferido contra a reprodução ao carregar. |
| `packages/motor/scripts/simular-sorteio.ts` | Simulação em massa (`npm run simular`). |
| `apps/web` | Tela de criação mobile-first (cartões, Aceitar/Rerolar, nome e paletas com miniatura ao vivo) e ficha na aba Personagem. Cada ação é gravada antes de aparecer na tela. |

Sem dependências novas.

### O que a F2 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/dados/status.ts` | 8 status, perfil numérico de cada raça (base e fração de piso) e 8 atividades de treino (ciclo de 30 s, 10 XP). |
| `packages/motor/src/personagem/progressao.ts` | Curva de XP até o nível 50, piso/teto, ganho decrescente perto do teto, valor efetivo e coleta dos modificadores de raça, dons e origem (inclusive temporários "até o nível N"). |
| `packages/motor/src/atividades/` | Ciclos e `avancar(estado, agora)` (limite de 12 h, relógio que volta, só o ativo trabalha, resumo do tempo fora) e as ações `iniciarAtividade`/`pararAtividade` com erros tipados. |
| `packages/motor/src/save.ts` | **Save v3** com migração v2 → v3 (status iniciais no piso e personagem ocioso). Validação de status, XP, nível e atividade. |
| `packages/motor/scripts/ritmo.ts` | Bot de ritmo (`npm run ritmo`). |
| `apps/web` | Barra fixa da atividade atual, Atividades → Treino, painel de status e o diálogo "Enquanto você estava fora". Avança a cada 1 s com a página aberta, grava a cada 15 s, ao esconder a página e ao sair. |

**Efeitos que passaram a valer na F2:** Corpo de Vento (Silfo, +10% de velocidade), Órfão do Templo Cinzento (+2 Espírito), A Voz do Poço (+2 Percepção), Soldado de uma Guerra Perdida (+2 Resistência), Cria da Matilha (+2 Agilidade), O Reencarnado (−5% Vigor), O Despertado Tardio (teto −10%; +50% de XP e de treino até o nível 20) e o dom Coração de Dragão (teto de Força e Espírito +10%). **Continuam pendentes** (só texto): ofícios e bônus de berço (F3), combate (F4), técnicas e maestria (F5), Limiar (F6), guilda e reputação (F7), itens nomeados (F8), pets (F10), dia/noite e Crônica (F11).

### O que a F3 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/dados/mapa.ts` | Região, 4 locais com subáreas, viagens de 4 a 9 s e local inicial. |
| `packages/motor/src/dados/coleta.ts` | 4 ofícios, 12 recursos (3 tiers), 16 itens (12 materiais + 4 achados raros) e 12 ferramentas (3 graus por ofício). |
| `packages/motor/src/atividades/` | Viagem e coleta no avanço do tempo (RNG do save, consistente por partição), XP de ofício, mochila cheia, e as ações `iniciarAtividade` (com viagem automática), `irPara`, `vender`, `venderTudo` e `comprarFerramenta`. |
| `packages/motor/src/personagem/mochila.ts` | Espaços, pilhas e capacidade pela Força. |
| `packages/motor/src/save.ts` | **Save v4** com migração v3 → v4. |
| `apps/web` | Atividades → Coleta; Mapa → Região, Local atual e Estabelecimentos (Mercado e Ferreiro); Mochila → Materiais e Ferramentas; barra com viagem, gold e aviso de mochila cheia; resumo do tempo fora com itens e níveis de ofício. |

**Efeitos que passaram a valer na F3:** bônus de ofício dos berços (+1 nível) e de Liberto das Minas (+2 Mineração), Pele de Pedra (Anão, +10% de minério), Passo Silvestre (Elfo, viagem entre locais naturais −30% e +10% na agricultura), Sentidos Aguçados (Lobisomem, +50% de achados raros), Acampamento nômade (viagem −10%), Cortiço da capital (venda +3%) e Náufrago das Estrelas (compra −5%).

### O que a F4 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/dados/combate.ts` | 17 equipamentos (kit básico + 3 tiers × 5 slots), 6 materiais de combate, 24 monstros e 6 áreas. |
| `packages/motor/src/atividades/combate.ts` | Status de combate, dano, risco da área e a simulação em passos de 0,5 s (procurar, lutar, abater, recuar, desmaiar). |
| `packages/motor/src/atividades/acoes.ts` | `equipar`, `desequipar`, `comprarEquipamento` e `definirRecuo`; caçar é `iniciarAtividade` numa área. |
| `packages/motor/src/save.ts` | **Save v5** com migração v4 → v5. |
| `apps/web` | Combate → Áreas (risco, recuo, caçar) e Bestiário; Mochila → Equipados e Equipáveis; Ferreiro com armas e armaduras; vida e status de combate na ficha; barra com a luta ao vivo; resumo do tempo fora com abates, recuos e desmaios. |

### O que a F5 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/dados/habilidades.ts` | 66 habilidades com os 4 eixos do GDD §12: 31 técnicas dos cores, 24 técnicas de ramo (2 ramos por core) e 11 de livro. |
| `packages/motor/src/dados/aprendizado.ts` | A atividade de Aprendizado (praticar uma habilidade). |
| `packages/motor/src/habilidades/` | Maestria, estágios, slots, modificadores das passivas e auras; ações `equiparHabilidade`, `desequiparHabilidade`, `moverPrioridade`, `escolherRamo`, `lerLivro`, `comprarLivro` e `iniciarAprendizado`. |
| `packages/motor/src/atividades/combate.ts` | Ativas no combate (golpe, cura, reforço, enfraquecimento, atordoamento), auras e drops de livros. |
| `packages/motor/src/save.ts` | **Save v6** com migração v5 → v6. |
| `apps/web` | Personagem → Habilidades (ramo, slots, prioridade, conhecidas, livros); Atividades → Aprendizado; Livreiro no Mercado; barra e resumo com maestria. |

**Efeitos que passaram a valer na F5:** Adaptável (Humano, +8% de XP de maestria), Mosteiro de aldeia (+5%), O Reencarnado (+10%), Aprendiz do Mago Morto (+15% de maestria e −10% de vida) e Órfão do Templo Cinzento (nasce sabendo Eco dos Antigos).

### O que a F6 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/dados/limiar.ts` | `CONFIG_LIMIAR`, monstros do Limiar (acompanham o nível), Cinza de alma, as 4 peças de O Retornado, sinergias, títulos e falas do Barqueiro. |
| `packages/motor/src/atividades/limiar.ts` | Entrar ao morrer, duração, Eco da Morte, sair (com retorno da atividade), pedágio e títulos. |
| `packages/motor/src/atividades/combate.ts` | O combate dentro do Limiar (atributos reduzidos, recompor-se, Essência, chefes raros e peças nomeadas). |
| `packages/motor/src/atividades/acoes.ts` | `pagarPedagio`; ações bloqueadas no Limiar (exceto equipar, habilidades e recuo). |
| `packages/motor/src/save.ts` | **Save v7** com migração v6 → v7. |
| `apps/web` | Combate → O Limiar (estadia, Barqueiro, Eco, O Retornado); Personagem → Títulos; barra e resumo do tempo fora com mortes e saídas do Limiar. |

**Efeitos que passaram a valer na F6:** Sobrevivente do Vazio (Limiar −25%), Aldeia à beira do Limiar (−5%), Devedor do Barqueiro (primeira saída de graça e Eco que decai em 1 h), e as sinergias de Sangue-Pálido e Ser das Trevas.

### O que a F7 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/dados/missoes.ts` | Ranks do autor, `CONFIG_GUILDA`, 4 NPCs, 10 metas, 9 missões de NPC, 21 contratos e 6 provas. |
| `packages/motor/src/missoes/missoes.ts` | Progresso por contadores, `aceitarMissao`, `entregarMissao`, `abandonarMissao` e `promover`. |
| `packages/motor/src/personagem/conta.ts` | Contadores de itens obtidos e treinos, missões e guilda no personagem. |
| `packages/motor/src/save.ts` | **Save v8** com migração v7 → v8. |
| `packages/motor/scripts/ritmo.ts` | **Bot da cadeia completa** (treinar, coletar, caçar, vender, comprar, livros e missões). |
| `apps/web` | Missões → NPC, Metas e Guilda; NPCs no Mapa; selo de missões prontas na aba. |

**Efeitos que passaram a valer na F7:** Soldado de uma Guerra Perdida (rank inicial E). **A curva de XP mudou** para 150 × L² (ver `docs/CALIBRACAO.md`).

### O que a F8 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/dados/producao.ts` | Ofícios de produção, 19 receitas, acessórios, relíquias, nomeados, consumíveis, fragmento de chefe, variantes +1 a +3 e os números da fusão e da ampliação. |
| `packages/motor/src/atividades/ciclos.ts` | Produção em ciclos (consome, produz, dá XP de ofício e para sem material). |
| `packages/motor/src/atividades/acoes.ts` | `fundir` (RNG do save, falha parcial, Sorte, *pity*), `ampliarMochila`, acessórios nos 2 slots, nomeados únicos e fora da venda. |
| `packages/motor/src/atividades/combate.ts` | Poções automáticas, fragmentos e relíquias dos chefes. |
| `packages/motor/src/save.ts` | **Save v9** com migração v8 → v9 (nomeado da origem na mochila). |
| `apps/web` | Atividades → Produção; Ferreiro com Fusão; Mercado com ampliação; Mochila → Consumíveis e Nomeados; slots de acessório e relíquia. |

**Efeitos que passaram a valer na F8:** Portador da Lâmina Desperta, Filho do Ferreiro Maldito (Martelo do Pai e +2 de forja), Náufrago das Estrelas (Bússola Quebrada), berços Oficina de ferreiro e Taverna de estrada, Fornalha Interior, Mão Certeira e Intelecto na produção.

### O que a F11 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/dados/mundo.ts` | Relógio, climas e efeitos, eventos, marcos da Crônica, bônus de títulos e do Bestiário. |
| `packages/motor/src/mundo` | Estado do mundo, sorteio de eventos, Crônica, validação e a ação de responder evento. |
| `packages/motor/src/dados/missoes.ts` | Arcos de 3 capítulos para as 22 origens especiais. |
| `packages/motor/src/save.ts` | **Save v12** com migração v11 → v12. |
| `apps/web` | Hora e clima na barra; eventos no topo; Personagem → Crônica; bônus em Títulos e no Bestiário; Missões → História. |

### O que a F10 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/dados/pets.ts` | Espécies, Laço de doma, comidas, cuidados e os números dos pets. |
| `packages/motor/src/pets` | Estado e validação dos pets, bônus, gasto exato de Energia/Fome e as ações (Estábulo, nomes, vagas, soltar, União). |
| `packages/motor/src/atividades` | Avanço dividido onde o bônus do pet muda; cuidados nos ciclos; doma no combate. |
| `packages/motor/src/save.ts` | **Save v11** com migração v10 → v11 (a besta vinculada vira pet). |
| `apps/web` | Personagem → Pets e Atividades → Pets (cuidados e Estábulo); domas no resumo. |

**Efeitos que passaram a valer na F10:** bestas vinculadas (Besta do Estudo, Filhote do Altar, Espírito do Rio), Fruto do Vínculo (União mais longa), Voz Mansa e Laço Firme.

### O que a F9 entregou

| Onde | O quê |
| --- | --- |
| `packages/motor/src/acoes.ts` | Ações serializáveis: `validarAcao`, `aplicarAcao` (a mesma porta para cliente e servidor) e `trocarPersonagem`. |
| `packages/motor/src/personagem/cofre.ts` | Cofre da Conta: conquistas, Pergaminhos do Novo Destino e Álbum de Descobertas. |
| `packages/motor/src/save.ts` | **Save v10** com migração v9 → v10. |
| `apps/web/src/servidor` | Regras da API (conta, sessão, jogo, ação, importação), armazém Upstash/memória, limites. |
| `apps/web/src/app/api/v1` | Rotas `saude`, `auth/*`, `jogo`, `jogo/acao`, `jogo/importar`. |
| `apps/web` | Personagem → Conta (personagens, cofre, sincronização); todas as ações da interface no formato serializado. |

**Para ativar a sincronização:** Vercel → projeto → Storage → Upstash (Redis) → ligar ao projeto (cria `KV_REST_API_URL` e `KV_REST_API_TOKEN`) → novo deploy. Sem isso, `GET /api/v1/saude` responde `banco: false` e o resto, 503.

### Versões escolhidas (23/11/2026)

| Pacote | Versão | Observação |
| --- | --- | --- |
| Node | ≥ 22.12 (CI usa 24) | Exigência do Vitest 5. |
| Next | 16.4.6 | |
| React / React DOM | 19.3.1 | |
| TypeScript | 6.0.3 | A 7.0 já saiu, mas o `typescript-eslint` só aceita até a 6.0. |
| ESLint | 9.39.5 | O 10 já saiu, mas os plugins do `eslint-config-next` ainda não o aceitam. |
| eslint-config-next | 16.4.6 | |
| typescript-eslint | 8.74.0 | Lint do motor. |
| Vitest | 5.1.1 | |

## Plataformas e stack (proposta)

| Camada | Escolha |
| --- | --- |
| Web | Next (App Router), mobile-first, PWA |
| Mobile | Expo (React Native), **depois** da web completa |
| API | TypeScript/Node, rotas do Next em `/api/v1` (Vercel) |
| Banco | Postgres (Neon) + Redis (Upstash); banco só a partir da F9; antes disso, save local |
| Motor | `packages/motor`, TS puro e determinístico, compartilhado por web, API e mobile |

## Como executar

Na pasta do projeto:

```bash
cd idle-personagem-unico
npm install
npm run dev        # app web em http://localhost:3000
```

Verificações (as mesmas do CI, job `idle-personagem-unico` em `.github/workflows/quality.yml`):

```bash
npm audit --audit-level=high
npm test           # Vitest no motor e na web
npm run lint       # ESLint (motor com regras de pureza; web com eslint-config-next)
npm run typecheck  # tsc no motor (código e testes) e na web
npm run build      # build de produção do Next
npm run simular    # simulação de 200 mil sorteios (Markdown para docs/CALIBRACAO.md)
npm run ritmo      # bot de ritmo do treino, da coleta, do combate, das habilidades e do Limiar (Markdown para docs/CALIBRACAO.md)
```

`npm run simular -- 50000 70` aceita o número de sorteios e um saldo de orçamento alternativo (só para estudo). O script roda TypeScript direto no Node (remoção de tipos nativa, Node ≥ 22.18) com um resolvedor de imports em `packages/motor/scripts/resolver-ts.mjs`.

Não há variáveis de ambiente nem `.env` nesta fatia.

## Próximo passo

O autor autorizou seguir até a **F13** sem parar. Próxima: **F12 (Competição)**.
