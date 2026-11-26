# F13.2 — Contas e persistência

Implementação em 26/11/2026, diretamente na `main`, após a F13.1 (`dac7f70`). Contrato: `prompts/idle-personagem-unico/13-2-contas-persistencia.md`. Não altera o motor nem as fórmulas de progressão.

## Identidade e sessão

O navegador usa cookie HttpOnly, SameSite=Strict, sem Domain e com Path=/. Em HTTPS, o nome é `__Host-idle-pu` e o atributo Secure é obrigatório. Somente HTTP em loopback usa `idle-pu-local`, sem Secure, para desenvolvimento/teste. O JSON da web não contém bearer. Clientes nativos continuam recebendo bearer no JSON e enviando Authorization.

POSTs web exigem `x-idle-web: 1` e Origin correspondente à autoridade HTTP do destino. A comparação usa Host, sem confiar em `x-forwarded-host`, e considera `x-forwarded-proto` para a terminação TLS. Isso evita comparar a origem pública ao hostname interno que o Next pode colocar em `req.url`. Corpos existentes devem ser application/json. Mutações do jogo com cookie exigem ainda `x-idle-conta`, conferido contra a identidade autenticada; uma requisição antiga de A não pode agir na conta B quando o cookie mudar em outra aba.

As operações de autenticação são serializadas por Web Locks quando disponível, inclusive entre abas, para evitar Set-Cookie de login/logout fora de ordem. O cliente persiste apenas ID, nome e marcador de migração. A confirmação do cookie é feita por `GET /auth/sessao`; o cache nunca autentica o usuário sozinho.

## Recuperação sem e-mail

Cadastro gera código aleatório de 160 bits, exibido uma vez. No Redis fica apenas SHA-256 do código; senhas continuam com scrypt e sal aleatório. O código não é gravado em localStorage nem no save. O jogador precisa guardá-lo fora do jogo.

- `POST /auth/recuperacao`: gera/rotaciona código com sessão válida **e senha atual**. Invalida o código anterior.
- `POST /auth/recuperar`: nome, código e nova senha. O código é de uso único; o novo código substitui o anterior atomicamente. Não cria outra conta nem altera o save.
- A sessão nova é vinculada à credencial vigente. Trocar a senha revoga todas as sessões anteriores; um marcador por ID também invalida tokens legados. Ações em andamento verificam a credencial no commit, além da trava e do save.
- Quem perde senha **e** código não tem recuperação automática por e-mail ou atendimento nesta implementação. Quem ainda sabe a senha pode gerar outro código na conta.

## Migração e logout

`POST /auth/migrar` troca um bearer antigo por sessão com cookie, conferindo a conta e revogando o token anterior. Registros F9 e saves v13 continuam aceitos. O cache passa de nome para ID imutável da conta; o pedido pendente é transferido uma única vez. A cópia antiga do cache é preservada, mas pedidos já transferidos não são reintroduzidos.

Logout invalida a identidade na interface imediatamente e volta ao convidado. Se não há rede, um marcador sem segredo (`idle-pu:saida-pendente`) impede o cookie remanescente de reconectar automaticamente no próximo carregamento. O encerramento é confirmado antes de restaurar sessão ou permitir outro login. Sair em um aparelho não encerra outro aparelho; recuperar senha encerra todos os anteriores.

Uma sessão expirada continua exibindo o cache da própria conta sem permitir ações locais. Uma conta nova sem save pode iniciar o jogo online mesmo após recarregar antes de criar o personagem. A importação local continua explícita, única e casual, conforme F13.1.

## Banco existente e readiness

A inspeção da Vercel em 26/11 encontrou variáveis de integração Redis REST em preview/produção. Credenciais sensíveis não foram retornadas pelas APIs de metadados e não foram copiadas para arquivos. Não foi criado, contratado nem migrado outro banco.

O health publicado respondeu `banco: true`. Uma sonda com nome aleatório inexistente e senha fictícia passou pelo fluxo antigo de consulta ao banco e recebeu o 401 `credenciais_invalidas` esperado. Não criou conta nem save; o rate limit usa contador temporário. Isso confirma conectividade do fluxo publicado existente, **não a implantação da F13.2**.

Novo `GET /api/v1/prontidao` faz PING de fato e responde 200 conectado ou 503 indisponível/não configurado, sem expor erro do provedor. `/saude` permanece liveness compatível. A interface consulta readiness antes de oferecer autenticação.

## Verificações

Resultados em 26/11/2026:

- Motor: **355 testes aprovados** com um worker, sem alteração do motor, asserts ou limites de tempo.
- Web: **54 testes aprovados**, incluindo autenticação, código de uso único, recuperação concorrente, revogação durante commit, cookie/CSRF, proxy público com porta interna, migração e logout offline.
- Redis real: **2 testes de integração aprovados**, com AOF, reinício e execução dos scripts Lua.
- `npm run lint`, `npm run typecheck`, `npm run build` e `git diff --check`: aprovados.
- Playwright headless sobre build de produção e **API real sem interceptação**, usando a ponte REST e Redis local: três contextos isolados. Cadastro e código exibido uma vez; cookie HttpOnly e token ausente de localStorage; mesma conta com atualização e reload em dois navegadores; outra conta isolada; ID incorreto recusado; logout sem rede seguido de reload sem reconexão; outra sessão preservada no logout; recuperação preservando o personagem e expirando sessões antigas. Sem erros de JavaScript ou overflow horizontal em 390×844 e 1440×900; captura mobile inspecionada.

O comando de regressão usa `--maxWorkers=1` devido aos timeouts/performance documentados na F13.1 nesta máquina. Nenhum teste foi excluído nem teve assert/timeout relaxado. Um teste novo de proxy revelou que alterar `URL.host` sem limpar a porta interna conservava a porta antiga; a implementação foi corrigida e a regressão passou.

Esta entrega é local, na main. A conectividade do fluxo publicado anterior foi conferida, mas **a F13.2 não foi publicada nem declarada validada em produção**. A prova de persistência e os navegadores desta entrega usam o Redis real isolado local.

Os testes de integração usam Redis real isolado com AOF e ponte REST no formato da Upstash: as operações e os scripts Lua são executados pelo Redis, não simulados. O teste reinicia o processo e confere conta, save, recibo, duas sessões, isolamento de outra conta e revogação após recuperação.

```powershell
npm run test --workspaces --if-present -- --maxWorkers=1
npm run test:integracao -w @idle-pu/web
npm run lint
npm run typecheck
npm run build
```

O teste de integração requer `redis-server` no PATH ou `REDIS_SERVER_BIN`. No Windows, detecta a instalação padrão em `C:/Program Files/Redis`. Cria portas e diretório temporários próprios, vincula somente loopback e encerra/remove os recursos ao terminar. Não aponta aos bancos do desenvolvedor nem da Vercel.

Apresentação antes do personagem, novo desenho de navegação e tutorial continuam nas próximas fatias. O CSP com scripts inline permanece uma limitação já registrada na auditoria.

Referências: [cookies HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie), [proteção CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
