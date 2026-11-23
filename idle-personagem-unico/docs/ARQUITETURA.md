# Arquitetura (proposta)

Rótulos como no GDD: **[Autor]**, **[Proposta]**, **[Em discussão]**, **[Calibrar]**. Nenhum código existe ainda; este documento guia as fatias de `ROADMAP.md`.

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
├── dados/                conteúdo (raças, cores, dons, monstros, itens, mapa, missões)
└── index.ts              API pública do motor
```

### 3.1 Simulação

- **Combate:** passos de 0,5 s. 12 h = 86.400 passos; o objetivo é simular em **< 1 s** (o LionHearth faz 8 h em < 1 s). [Calibrar]
- **Treino/coleta/produção:** **por ciclos** (matemática fechada: ciclos completos × rendimento esperado, com RNG semeado para o que for sorteio). Evita 86.400 passos para tarefas que são só um relógio.
- **Mistura:** a atividade atual define o integrador. Troca de atividade ou de local é um **evento** na linha do tempo.
- **Offline:** `avancar(estado, agora)` limita a 12 h e devolve o novo estado + um **resumo** (o que foi ganho, se houve Limiar) para a tela "enquanto você estava fora".

### 3.2 Estado (campos principais)

`versao`, `semente`, `ultimoTick`, `conta` (id, personagens[≤3], `personagemAtivoId`; **cada personagem tem estado totalmente independente**), por personagem: `origem{tipo,id,loreGerada}`, `bestaVinculadaId?`, `nome`, `nivel`, `xp`, `racaId`, `coreId`, `dons[]`, `status{valor,piso,teto}`, `habilidades[]` (maestria), `slots`, `equipamento`, `ferramentas`, `mochila`, `ouro`, `moedas`, `localAtual`, `atividadeAtual`, `viagem`, `missoes`, `guilda{rank,merito}`, `pets[]` (com `fome`, `energia`, atribuição por atividade), `limiar{ativo,fimEm,cargasEco}`, `cronica[]`, `titulos[]`, `bestiario`.

## 4. Web (`apps/web`)

- Next, App Router, **mobile-first**; validar também em tablet/desktop.
- A interface é só exibição: lê o estado do motor e dispara ações. Navegação por **abas inferiores** e **sub-abas no topo** (GDD §16).
- **PWA** instalável; o service worker guarda o save e a UI para abrir offline.
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

## 6. Banco de dados [Em discussão]

**Proposta:** **Postgres (Neon, pela Vercel Marketplace)** para contas, personagens (estado em **JSONB versionado**), builds de arena, temporadas e rankings; **Redis (Upstash)** só para rate limit e caches.

Por que Postgres e não só Redis: temporadas, torneios e rankings pedem consultas e histórico que ficam simples em SQL. Para o MVP local-first dá para **adiar o banco** até a fatia de conta (`ROADMAP.md`, F9).

Alternativa mais barata e conhecida: **reusar o Upstash** que o LionHearth já usa (com prefixo de chaves próprio, por exemplo `idle-pu:`). Serve para conta+save, mas é ruim para ranking histórico e arena. Decidir na F9.

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
