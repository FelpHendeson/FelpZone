# F13.1 — Estabilização técnica e segurança

Implementação de 26/11/2026, branch `codex/idle-f13-1`, sobre `1714e6d`. Contrato em `prompts/idle-personagem-unico/13-1-estabilizacao.md`.

## Procedência e migração

`POST /api/v1/jogo/iniciar` cria semente e sorteio no servidor. É seguro repetir: se já existe jogo, devolve o existente. O save do motor continua v13. O armazenamento do servidor passa a usar um envelope separado (`formato: 1`, `save`, `revisao`, `procedencia`). O envelope não é aceito do cliente.

`POST /jogo/importar` só aceita contas sem jogo. `substituir: true` não permite sobrescrita. Importações recebem procedência `importado`; saves F9 antigos também são tratados como importados, pois não há evidência de origem confiável. O progresso é preservado. Eles continuam jogando contra bots, mas `POST /arena/builds` recusa publicação (403). A listagem ignora builds antigas sem procedência. Não há ranking global implementado nesta fatia.

## Concorrência e repetição

`POST /jogo/acao` exige `{ idAcao, revisao, acao }`. O identificador deve ter 16–80 caracteres ASCII alfanuméricos, `_` ou `-`. O cliente usa UUID. A mesma identificação com outro conteúdo é recusada. A revisão otimista impede que uma sessão substitua o progresso de outra.

Cada ação processada grava o save e um recibo na mesma operação. O recibo dura 24 horas e guarda a resposta original; após expirar, a revisão antiga continua impedindo reexecução. Erros de domínio (422) também recebem recibo e consomem uma revisão, impedindo que um retry se torne uma nova ação depois. O cliente ressincroniza após conflitos e erros de domínio.

As travas têm UUID de proprietário e expiram em 10 segundos. O commit compara atomicamente a trava, a sessão ainda ativa e o registro lido antes de escrever. Uma execução lenta perde o direito de gravar e deve ser repetida após sincronização. A liberação só remove a trava do próprio dono. A publicação de builds verifica também a trava global da Arena e sua lista anterior. O Redis usa scripts Lua com `EVAL`; o contador de rate limit também tem incremento e TTL atômicos.

## Cliente e armazenamento

- Convidado: chave histórica `idle-pu:save`.
- Conta: `idle-pu:conta:<nome normalizado>`, com envelope de resposta e revisão.
- Pedido sem confirmação: `idle-pu:conta:<nome>:pendente`, gravado **antes** do envio. Recarregar repete o mesmo identificador e revisão; nenhuma outra ação passa à frente.
- Sessões antigas sem `cacheSeparado` isolam a chave compartilhada em `idle-pu:save-legado` antes de iniciar o convidado. Essa cópia fica preservada para recuperação manual; a fatia não cria uma interface de recuperação de backup.
- Online usa somente o relógio e o resultado do servidor, com sincronização a cada 15 segundos, ao voltar à aba ou manualmente. Sem rede, o cache é apenas leitura; a próxima reconexão calcula o tempo ausente no servidor.
- Sessão expirada continua identificada como expirada, sem fallback local. Logout volta ao save do convidado e não copia progresso da conta.
- Mudanças de sessão em outra aba invalidam a identidade corrente. Respostas tardias não podem reativá-la. Duas contas distintas têm caches distintos; não há garantia de edição simultânea do mesmo convidado em várias abas.

## HTTP e PWA

O corpo HTTP é limitado em bytes durante a leitura, incluindo pedidos sem `Content-Length`. Todos os retornos da rota têm `Cache-Control: no-store`. O service worker usa cache `idle-pu-f13-1-v2`, remove somente caches com seu prefixo e só guarda navegação HTML com resposta bem-sucedida. API continua fora do cache. Atualizar o identificador do cache a cada alteração de release do service worker.

## Validação

Resultados em 26/11/2026:

- `npm run test -w @idle-pu/motor -- --maxWorkers=1`: 19 arquivos, **355 testes passando**, com limites originais. Motor sem alterações nesta fatia.
- `npm run test -w @idle-pu/web`: 8 arquivos, **38 testes passando**. Também passou nas duas execuções de `npm test`.
- `npm run lint`: aprovado; após retirar um aviso na limpeza de sessão, `npm run lint -w @idle-pu/web` terminou sem erros nem avisos.
- `npm run typecheck`: aprovado em ambos os workspaces.
- `npm run build`: aprovado; inclui `/api/v1/jogo/iniciar`.
- `git diff --check`: aprovado.

O comando padrão `npm test` **não ficou verde nesta máquina**: na primeira execução houve 4 timeouts de sorteio e uma falha de orçamento de 50 ms do teste de desempenho; na segunda, restaram 3 timeouts de sorteio. Com um único worker, todos os 355 testes do motor passaram, sem alterar asserts, timeout, configuração ou código do motor. A limitação de paralelismo foi somente argumento do comando; não foi aplicada ao CI nem versionada como exclusão de testes.

Smoke test Playwright headless sobre o build de produção em `127.0.0.1:3100`: criação local, cadastro, escolha de novo jogo online, criação online, reload mantendo conta e logout restaurando o personagem local correto. Zero erros de JavaScript e zero overflow horizontal em 390×844 e 1440×900. Para esse smoke, as requisições de API foram encaminhadas às regras reais em TypeScript com `ArmazemMemoria`; **não ao Upstash**. Captura mobile inspecionada. Não equivale a validação de produção nem à auditoria E2E completa da F13.7.

As regressões incluem importação/procedência, revisão antiga, replay após expiração de recibo, resposta perdida com reload, troca de identidade com requisição pendente, 401, commit atrasado, logout, bytes UTF-8/streaming e cache PWA.

Banco Upstash de produção, recuperação de senha, cookie HttpOnly, readiness, fluxo de apresentação e tutorial permanecem nas fatias seguintes. Não foram criados recursos de infraestrutura nem alteradas fórmulas ou dados de balanceamento.

Referências da implementação: [Lua no Redis](https://redis.io/docs/latest/develop/programmability/eval-intro/) (execução atômica e chaves explícitas em `KEYS`).
