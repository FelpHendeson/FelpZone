# F13.3 — Apresentação e entrada

Entrega de 26/11/2026. [Contrato](../../prompts/idle-personagem-unico/13-3-apresentacao-entrada.md).

## Comportamento

- Apresentação explica atividades, avanço offline de até 12 h e Limiar. Usa identidade escura/dourada, fontes locais e emblema existente; não adiciona recursos remotos.
- Login, cadastro e recuperação acessíveis antes de qualquer personagem/save local.
- Conta restaurada abre seleção de personagens. Jornada local só é carregada/criada quando o jogador escolhe jogar neste aparelho.
- Seleção exibe nomes, níveis, raça, core e miniaturas reais. Novo personagem continua limitado a três slots e Pergaminho do Novo Destino.
- Criação pendente pode ser retomada após navegar ou recarregar, sem devolver chances. Importação continua explícita, única e casual.
- Logout volta à apresentação, preservando o jogo local separado. Motor, fórmulas e versão de save não mudam.

## Verificação

355 testes do motor, 57 testes web e 2 de Redis real passaram (414 no total). Lint, tipos e build aprovados. Na primeira execução concorrente com o lint, o teste de 20 mil sementes excedeu 5 s; a repetição isolada do motor passou sem mudar testes, limites ou regras. O Redis nativo exigiu execução fora do sandbox; a repetição autorizada passou.

Playwright/Chromium com API real e Redis local isolado verificou:

- Apresentação e cadastro sem criar `idle-pu:save`.
- Cadastro, confirmação do código e início online sem personagem local.
- Segunda tentativa mantida ao voltar para seleção e após recarregar.
- Nome/aparência, seleção do personagem e novo slot bloqueado sem pergaminho.
- Logout retornando à apresentação, modo local e retomada local sem devolver tentativa.
- Formulário de recuperação acessível antes de criar save e login em outro navegador continuando o mesmo personagem.
- Ausência de erros JavaScript; revisão visual de apresentação/seleção e responsividade em 320, 390, 768 e 1440 px. A revisão corrigiu a altura excessiva dos botões no celular.

Os fluxos de escrita usam Redis temporário isolado, sem criar contas de teste em produção. O release segue por commit na main e push, com deployment automático na Vercel e conferência do SHA/status e da página pública.

## Limites

Esta etapa cobre a entrada. A revisão completa da navegação, tutorial e arte final seguem nas F13.4–F13.6. O roteiro de consolidação mantém o aceite web antes de F14.
