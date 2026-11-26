# F13.1 — Estabilização técnica e segurança

Autorizada pelo autor em 26/11/2026 após a análise do projeto: “pode trabalhar nisso ai”. Primeira fatia de consolidação, conforme a ordem recomendada na análise.

## Contrato

- Preservar o motor, as regras e os saves existentes.
- Impedir que importação local sobrescreva a conta ou ganhe procedência competitiva.
- Criar jogos online com semente do servidor. Importações e saves anteriores sem procedência continuam casuais; não apagar progresso.
- Usar identificação da ação, revisão do jogo, recibos e commit atômico para concorrência e retries.
- Identificar o dono da trava e impedir gravação após expiração ou logout.
- Separar cache de conta do convidado; impedir adoção de respostas de uma identidade anterior. Conta sem rede/expirada não se torna jogo local.
- Corrigir limite de bytes HTTP e cache PWA.
- Adicionar regressões para rede, duas sessões, expiração de trava, logout, importação e PWA. Executar testes, lint, tipos e build.

F13.2–F13.8, infraestrutura paga, recuperação de senha, redesenho da entrada/tutorial, arte e port mobile ficam nas respectivas fatias. Não fazer push/deploy nesta entrega.
