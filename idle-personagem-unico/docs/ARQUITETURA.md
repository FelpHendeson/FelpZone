# Arquitetura (proposta)

Rótulos como no GDD: **[Autor]**, **[Proposta]**, **[Em discussão]**, **[Calibrar]**. Documento originalmente proposto antes do código; registra decisões e implementação das fatias de `ROADMAP.md`. As diretrizes pós-auditoria abaixo prevalecem sobre propostas anteriores conflitantes.

## 1. Princípios

1. **Motor em TypeScript puro**, sem React, sem DOM, sem APIs só do Node. Ele roda no navegador, no servidor e, depois, no app React Native. [Proposta]
2. **Determinístico**: todo sorteio usa um gerador com **semente guardada no save**; nada de `Math.random` nas regras. Isso permite reproduzir sorteios, validar no servidor e fazer replays de torneio. [Proposta, herdado do LionHearth]
3. **Ações puras**: cada ação do jogador recebe o estado e devolve **novo estado ou erro**. A interface só exibe estado e dispara ações.
4. **Um único modelo de modificadores** para habilidades, equipamentos, ferramentas, pets, relíquias, títulos, clima e hora do dia. Sistema novo deve **produzir modificadores**, não valores soltos.
5. **Local-first**: o jogo funciona com save local; a conta sincroniza depois. Sem banco, o jogo continua jogável.
6. **Servidor como autoridade** quando houver conta: o cliente manda **ações**, o servidor aplica no mesmo motor e guarda o estado. Tempo é o do servidor.
7. **Saves versionados com migração** desde o primeiro dia (no LionHearth, saves antigos ficaram incompatíveis; aqui isso é evitável).
8. **Menor solução primeiro**: nenhum sistema entra antes da fatia que o pede.

## 2. Estrutura de pastas [Proposta]

```text
idle-personagem-unico/
├── README.md
├── docs/            GDD.md · ARQUITETURA.md · ROADMAP.md · DECISOES.md
├── package.json     npm workspaces
├── packages/
│   ├── motor/       TS puro (regras, dados, simulação, save)
│   └── ui/          (opcional, depois) componentes compartilháveis web/mobile
├── apps/
│   ├── web/         Next (App Router) + rotas de API em app/api/v1/...
│   └── mobile/      Expo (RN) — só depois da web completa
└── scripts/         bot de ritmo, utilitários
```

- Na **Vercel**: um projeto novo apontando para `apps/web` (diretório raiz). O plano Hobby tem **1 build simultâneo**; fazer *push* em dois projetos ao mesmo tempo enfileira.
- Idioma: **português** no domínio e na interface (`motor/dados`, textos); identificadores técnicos podem ser em inglês onde for comum, mantendo coerência com `idle-guilda`. [Proposta]

## 3. Motor (`packages/motor`)

```text
src/
├── rng.ts                gerador com semente
├── tempo.ts              relógio do jogo, passos, dia/noite, clima
├── modificadores.ts      modelo único de modificadores
├── personagem/           ficha, status, piso/teto, nível
├── sorteio/              cascata raça → core → dom → detalhes; orçamento de raridade
├── atividades/           ciclos (treino, coleta, produção, aprendizado)
├── combate/              passos de 0,5 s, habilidades, drops, bestiário
├── limiar/               reino da morte
├── mapa/                 regiões, locais, subáreas, viagem
├── itens/                itens, raridades, afixos, conjuntos, nomeados
├── forja/                produção e fusão
├── habilidades/          eixos, maestria, evolução
├── missoes/              NPC, metas, guilda, provas
├── guilda/               ranks e mérito
├── pets/                 tipos, atividades, união
├── economia/             preços, ralos
├── offline.ts            simulação de até 12 h
├── save.ts               serialização, versão, migrações, limite de tamanho
├── armazenamento.ts      interface Armazenamento (localStorage na web, AsyncStorage no mobile)
├── dados/                conteúdo (raças, cores, dons, monstros, itens, mapa, missões)
└── index.ts              API pública do motor
```

### 3.1 Simulação

- **Combate:** passos de 0,5 s. 12 h = 86.400 passos; o objetivo é simular em **< 1 s** (o LionHearth faz 8 h em < 1 s). [Calibrar]
- **Treino/coleta/produção:** **por ciclos** (matemática fechada: ciclos completos × rendimento esperado, com RNG semeado para o que for sorteio). Evita 86.400 passos para tarefas que são só um relógio.
- **Mistura:** a atividade atual define o integrador. Troca de atividade ou de local é um **evento** na linha do tempo.
- **Offline:** `avancar(estado, agora)` limita a 12 h e devolve o novo estado + um **resumo** (o que foi ganho, se houve Limiar) para a tela "enquanto você estava fora".

### 3.2 Estado (campos principais)

`versao`, `semente`, `ultimoTick`, `conta` (id, personagens[≤3], `personagemAtivoId`, **`cofre`** (conquistas, cosméticos, Pergaminhos do Novo Destino, álbum de descobertas, histórico de temporadas); **cada personagem tem estado totalmente independente**), por personagem: `origem{tipo,id,loreGerada}`, `bestaVinculadaId?`, `nome`, `nivel`, `xp`, `racaId`, `coreId`, `dons[]`, `status{valor,piso,teto}`, `habilidades[]` (maestria), `slots`, `equipamento`, `ferramentas`, `mochila`, `ouro`, `moedas`, `localAtual`, `atividadeAtual`, `viagem`, `missoes`, `guilda{rank,merito}`, `pets[]` (com `fome`, `energia`, atribuição por atividade), `limiar{ativo,fimEm,cargasEco}`, `cronica[]`, `titulos[]`, `bestiario`.

## 4. Web (`apps/web`)

- Next, App Router, **mobile-first**; validar também em tablet/desktop.
- A interface é só exibição: lê o estado do motor e dispara ações. Navegação por **abas inferiores** e **sub-abas no topo** (GDD §16).
- **PWA** instalável; o service worker guarda a interface para abrir offline; o save local usa o armazenamento do navegador e a API não entra no cache.
- Estado no cliente: **Zustand** ou contexto simples. Evitar bibliotecas pesadas. [Proposta]
- Textos de jogo em português, com *i18n* só se um dia houver outro idioma.

## 5. API (rotas do Next) [Proposta]

API em TypeScript, **versionada** em `/api/v1`, consumível pelo app mobile no futuro (não depende de cookie de página; aceita *bearer token*).

| Rota | Função |
| --- | --- |
| `POST /auth/registrar`, `POST /auth/entrar`, `POST /auth/sair` | Conta. Senha com `scrypt` + sal. |
| `GET /jogo` | Estado do personagem ativo + resumo offline (servidor calcula). |
| `POST /jogo/acao` | Aplica **uma ação** (trocar atividade, equipar, aceitar missão, forjar...). |
| `POST /personagem/sorteio` / `/aceitar` / `/rerolar` | Criação com cascata e contagem de chances. |
| `GET /ranking`, `GET /arena/...` | Depois (Fatia de competição). |
| `GET /saude` | Verificação. |

- **Entrada não confiável:** valida tudo com **Zod** (ou equivalente); limita tamanho do save/ação.
- **Rate limit** por IP e por conta (Redis).
- Cookie `httpOnly` para web **e** token para mobile.
- Sem banco configurado: API devolve 503 e o jogo segue em modo local.

**Implementado na F9:** as rotas ficaram `GET /saude`, `POST /auth/registrar`, `POST /auth/entrar`, `POST /auth/sair`, `GET /jogo`, `POST /jogo/acao` e `POST /jogo/importar` (primeira sincronização com o save do aparelho). A ação é um objeto serializável (`{ tipo: "equipar", itemId }`…) validado pelo motor (`validarAcao`/`aplicarAcao`); o mesmo formato roda no cliente sem conta. O sorteio também passa por `/jogo/acao`. Autenticação só por *bearer token* (serve à web e ao mobile; o cookie ficou de fora). Senha com `scrypt` + sal; o token é guardado só como hash SHA-256, com validade de 30 dias. Limite de 120 pedidos/min por IP e 10 tentativas de entrada/min. Uma ação por vez por conta (trava de 10 s). O relógio de um save importado é limitado ao do servidor.

## 6. Banco de dados [Decidido na F9: Upstash; Postgres adiado]

**Proposta:** **Postgres (Neon, pela Vercel Marketplace)** para contas, personagens (estado em **JSONB versionado**), builds de arena, temporadas e rankings; **Redis (Upstash)** só para rate limit e caches.

Por que Postgres e não só Redis: temporadas, torneios e rankings pedem consultas e histórico que ficam simples em SQL. Para o MVP local-first dá para **adiar o banco** até a fatia de conta (`ROADMAP.md`, F9).

Alternativa mais barata e conhecida: **reusar o Upstash** que o LionHearth já usa (com prefixo de chaves próprio, por exemplo `idle-pu:`). Serve para conta+save, mas é ruim para ranking histórico e arena. Decidir na F9.

**Decisão da F9:** **Redis da Upstash** (pela integração da Vercel), com prefixo `idle-pu:` e chaves `conta:<nome>`, `sessao:<hash do token>`, `save:<id da conta>`, `trava:<id>` e `rl:<chave>:<janela>`. Basta para conta e save; Postgres fica para quando a competição (F12) pedir ranking histórico. **O banco não foi criado** (o autor não autorizou custo): sem as variáveis `KV_REST_API_URL`/`KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`), a API responde 503 e o jogo segue local. Ver `apps/web/.env.example`.

Esboço de tabelas: `contas`, `sessoes`, `personagens(estado jsonb, versao, atualizado_em)`, `acoes_log` (opcional), `temporadas`, `builds_arena`, `partidas`, `ranking`.

## 7. Competição e infraestrutura [Proposta]

- **Campo de Provas** (simulação do seu build contra bots) pode rodar **no cliente**, pois usa o motor determinístico; o servidor só valida o resultado oficial.
- **Arena/Torneios** rodam **no servidor** em lote. Limites do plano Hobby: *cron* diário e tempo máximo de função curto. Se não couber, opções: (a) simular sob demanda quando o jogador abre a arena, em lotes pequenos; (b) mover o lote para um worker externo; (c) subir para o plano Pro. **Decidir quando a fatia chegar.**
- **Replays**: guardar `semente + buildA + buildB + versão do motor`; reproduzir no cliente.

## 8. Segurança [Proposta]

- Senhas só como hash `scrypt`; cookie `httpOnly`; limite de tentativas; exclusão de conta remove dados.
- Save de nuvem com limite de tamanho; cliente nunca decide o resultado de sorteio/drop quando houver conta (o servidor é a autoridade).
- Repositório **público**: nenhum segredo, `.env` ou dado pessoal; só `.env.example` com valores fictícios.
- Nada de dados da empresa do autor.

## 9. Qualidade

- **Vitest** para o motor (regras, determinismo, migração de save).
- **Bot de ritmo**: script que joga como uma pessoa razoável e mede tempo para subir de nível, ganho de gold por hora, chance de morte; todo número novo é conferido por ele e registrado no GDD ([Calibrar]).
- **CI** (GitHub Actions): audit → test → lint → typecheck → build, em job próprio como os outros projetos do repositório.
- Testes obrigatórios por fatia: um teste novo para cada garantia (conforme as skills do repositório).

## 10. Port mobile (depois)

- **Expo (React Native)** em `apps/mobile`, usando `packages/motor` **sem mudanças**.
- Por isso o motor não pode usar APIs exclusivas do navegador ou do Node. Armazenamento entra por uma **interface** (`Armazenamento`), implementada por `localStorage`/IndexedDB na web e por `AsyncStorage`/SQLite no mobile.
- A API `/api/v1` é a mesma. Notificações push (fim de atividade, Limiar terminado) entram como extra.
- Só começa quando a web estiver 100% (decisão do autor).

## 11. Consolidação pós-auditoria (24/11/2026)

### Implementação F13.4 (26/11/2026)

`CabecalhoJornada` associa personagem, atividade e conexão, com altura observada para a navegação fixa não cobrir o conteúdo. `NavegacaoJogo` preserva os seis destinos e as 30 sub-abas, com navegação por teclado e relações ARIA tab/painel. O CSS adapta barra inferior mobile para lateral desktop a partir de 960 px. `destinoDaAtividade` é uma consulta pura que encaminha viagem/Limiar/atividade para a tela adequada; nenhum atalho executa ações do motor. Conta sem confirmação bloqueia ações na interface e no ponto de envio, mantendo reconexão e pedidos pendentes no cliente existente. A barra de ciclo deixa de ser uma região live a cada tick; erros e confirmações continuam anunciáveis. [Verificações](INTERFACE-F13-4.md).

### Implementação F13.3 (26/11/2026)

`PortalEntrada` apresenta o jogo, a identidade atual e a seleção de personagens. `Shell` controla apresentação/acesso/seleção/jogo sem mudar as ações do motor. `lerJornadaLocal` consulta o save sem inicializar estado, consumir RNG ou sobrescrever dados inválidos; somente a escolha explícita de jogar local cria/carrega a jornada. O componente de conta aceita ausência de save. Criações pendentes são retomadas do estado persistido; trocar de tela não rerrola. [Contrato e verificações](ENTRADA-F13-3.md).

### Implementação F13.2 (26/11/2026)

A autenticação foi extraída para `servidor/autenticacao.ts`. Na web, cookie HttpOnly/Secure/SameSite=Strict e proteção de origem substituem bearer em localStorage; bearer continua disponível para clientes nativos. A sessão referencia a credencial atual, e recuperar senha revoga sessões anteriores. Recuperação sem e-mail usa código aleatório de uso único armazenado como hash. O cache usa ID imutável, com migração do cache por nome. `GET /prontidao` testa PING; `/saude` continua liveness. A integração Redis existente na Vercel foi identificada e o fluxo publicado de consulta ao banco respondeu à sonda esperada; não foi contratado outro recurso. [Migração, testes reais e estado de publicação](CONTAS-F13-2.md).

### Implementação F13.1 (26/11/2026)

As regras desta seção atualizam a implementação histórica da F9: a importação é única e casual, e não substitui estado existente. O envelope de armazenamento (separado do save v13) registra procedência e revisão. Jogos competitivamente confiáveis começam em `POST /jogo/iniciar` com semente do servidor. `POST /jogo/acao` exige `idAcao` e `revisao`; save e recibo são gravados juntos por comparação atômica, verificando sessão e proprietário da trava. A web separa convidado/contas, persiste pedidos sem confirmação e não avança o cache online com relógio local. [Detalhes e migração](ESTABILIZACAO-F13-1.md).

[Autor] Identidade persistente por conta e sincronização entre dispositivos são requisitos, não apenas sessão local. Tela de apresentação, autenticação e seleção de personagem antecedem a jornada online. Isolar cache por conta e impedir vazamento entre sessões. [Proposta] Avaliar PostgreSQL para persistência principal, sem descartar Redis antes da análise de custo e requisitos; manter motor e API. Revisar autoridade de saves importados, concorrência, idempotência, reconciliação e recuperação de acesso. F14 depende de aceite da consolidação web. Ver [auditoria](AUDITORIA-CONSOLIDACAO.md).
