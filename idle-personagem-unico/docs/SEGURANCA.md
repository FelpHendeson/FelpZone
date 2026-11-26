# Auditoria de segurança (F13, 24/11/2026)

Escopo: `apps/web` (páginas e API `/api/v1`) e `packages/motor` (regras e validação de save). Feita pelo agente, sem ferramenta paga; vale revisar de novo quando o banco for ativado.

## Resumo

| Área | Situação | Onde |
| --- | --- | --- |
| Dependências | `npm audit --audit-level=high`: 0 vulnerabilidades | CI (job do projeto) |
| Segredos no repositório | Nenhum. Só `apps/web/.env.example` com valores fictícios; `.env*` no `.gitignore` | raiz |
| Save não confiável | Validação profunda de todo campo (tipos, faixas, ids do catálogo, coerência), tamanho máximo de 512 KiB, migrações versionadas | `packages/motor/src/personagem/conta.ts`, `save.ts` |
| Ações não confiáveis | `validarAcao` confere a forma de cada ação antes do motor; textos limitados | `packages/motor/src/acoes.ts` |
| Autoridade | Com conta, o servidor aplica as ações com o relógio dele; o save enviado não pode adiantar o tempo | `apps/web/src/servidor/api.ts` |
| Senhas | `scrypt` com sal aleatório de 16 bytes; comparação em tempo constante; mensagem única para usuário ou senha errados | `api.ts` |
| Sessões | Token aleatório de 32 bytes; no banco só o hash SHA-256; validade de 30 dias; sair apaga a sessão | `api.ts` |
| Abuso | 120 pedidos/min por IP; 10 tentativas de entrada/min por IP; uma ação por vez por conta (trava de 10 s); corpo até 600 KiB | `api.ts`, `rota.ts` |
| Banco | Sem as variáveis, a API responde 503; `http://` só aceito em localhost (teste) | `armazem.ts` |
| Cabeçalhos | CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`), `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` | `apps/web/next.config.ts` |
| HTML injetado | Nenhum `dangerouslySetInnerHTML`, `eval` ou `new Function` no código do jogo; a miniatura SVG é gerada só com ids do catálogo | busca no código |
| Service worker | Não guarda nada da API; só a interface e os arquivos estáticos | `apps/web/public/sw.js` |
| Dados pessoais | A conta não pede e-mail; nenhum dado pessoal guardado | — |

## Riscos conhecidos e recomendações

1. **CSP com `'unsafe-inline'` em scripts**: o Next injeta scripts inline de hidratação. Trocar por *nonce* exige renderização dinâmica de todas as páginas; recomendo fazer quando houver banco e tráfego real.
2. **Token no `localStorage`**: um XSS leria o token. A CSP e a ausência de HTML injetado reduzem o risco; a alternativa é cookie `httpOnly` (o ARQUITETURA prevê os dois).
3. **Sem recuperação de senha** (sem e-mail): perder a senha é perder o acesso à conta online (o save do aparelho continua).
4. **Modo local é confiável só para o próprio jogador**: quem edita o `localStorage` muda o próprio jogo. A competição global (quando houver banco) deve usar só estados do servidor.
5. **Limite por IP** atrás de proxy: usa o primeiro `x-forwarded-for`, que a Vercel define. Em outro provedor, revisar.
6. **Arena e builds de outros jogadores**: o build registrado é gerado pelo servidor a partir do save dele (o que o aparelho manda é ignorado). A Arena local continua sendo do aparelho; um ranking global deve usar só lutas resolvidas no servidor.

## Complemento pós-auditoria (24/11/2026)

A validação estrutural e o relógio do servidor não provam a procedência de um save importado. A rota de importação admite substituição explícita; builds derivadas desse estado não devem ser consideradas competitivamente confiáveis. Separar progresso importado/casual e autoritativo. Corrigir locks com TTL e remoção incondicional (token + liberação atômica + versão), idempotência, isolamento de cache por conta, reconciliação online/offline, recuperação de acesso, limite real de bytes, readiness e cache PWA. São achados estáticos, não exploração prática. Detalhes e critérios em [AUDITORIA-CONSOLIDACAO.md](AUDITORIA-CONSOLIDACAO.md).

## Correções F13.1 (26/11/2026)

O complemento acima é histórico. A implementação agora recusa sobrescrita na importação, registra a procedência fora do save enviado e impede builds públicas de jogos importados/legados. Travas usam proprietário e liberação condicional; commits comparam sessão, trava e valor anterior. Ações exigem revisão e identificação, com recibo atômico de 24 h. Caches de conta e convidado ficam separados, com invalidação de respostas tardias e sem fallback local automático. Corpos HTTP são limitados em bytes durante leitura; o PWA preserva caches alheios e não guarda respostas de erro. Timeouts de rede: 15 s no cliente e 8 s por comando ao banco. [Migração, testes e limitações](ESTABILIZACAO-F13-1.md).

Cookie HttpOnly/CSP, recuperação de acesso, readiness e validação do banco real permanecem pendentes. A F13.1 não declara a implantação de produção validada.

## Correções F13.2 (26/11/2026)

O parágrafo anterior registra o fim da F13.1. A F13.2 implementa cookie HttpOnly/Secure/SameSite=Strict na web, proteção CSRF por origem e cabeçalho, confirmação do ID em requisições de conta, recuperação por código aleatório de uso único e revogação de sessões ao trocar senha. A origem considera Host/protocolo público, não a porta interna do Next. Tokens novos e códigos não são persistidos no armazenamento do navegador. Logout offline usa marcador pendente para não reconectar silenciosamente.

Redis real isolado validou os scripts Lua, persistência após reinício e revogação. O banco configurado na Vercel respondeu à sonda do fluxo publicado existente, sem criação de contas/saves; a F13.2 ainda não foi implantada lá. Readiness por PING foi adicionada. O CSP com scripts inline e a auditoria completa da F13.7 continuam pendentes. [Protocolo, evidências e escopo](CONTAS-F13-2.md).
