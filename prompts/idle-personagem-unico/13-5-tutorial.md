# F13.5 — Tutorial por ações reais

Continuação autorizada em 26/11/2026; commit/main, push e deploy já autorizados.

- Guia contextual, pulável e revisável, por personagem. Persistência no save e na conta, com autoridade do servidor.
- Ensinar sorteio, iniciar treino/coleta, vender materiais, equipar, iniciar caça e aceitar missão da Guilda por ações reais confirmadas. Aceitar apenas eventos bem-sucedidos; não oferecer botão que marque uma tarefa de jogo como feita.
- Registrar ações em qualquer ordem, inclusive com o guia pausado; nenhum bloqueio de outros sistemas, recompensa ou mudança de balanceamento.
- Save v14 com migração v13: progresso e RNG preservados; personagens antigos recebem guia pausado e podem retomá-lo. Personagens novos começam com o sorteio reconhecido e guia ativo.
- Pular/retomar afetam só o guia; ações comuns usam a API e regras existentes. Estado é individual por personagem e sincroniza entre aparelhos.
- Guia acessível no cabeçalho e Personagem; sem modal, foco forçado por tick ou dependências remotas.
- Direção visual: seis cores existentes (#14121a, #1f1c28, #34303f, #ece8f4, #a59fb3, #d9a441), Georgia nos títulos e corpo do sistema. Um bloco compacto com a próxima ação e acesso ao guia completo. Revisão: evitar sete cartões repetidos no jogo; apresentar um passo contextual e lista de consulta no guia.
- Testar migração/validação, erros sem crédito, persistência/isolamento, ausência de RNG/economia alterados por controles, tutorial local/online e mobile/desktop; build, revisão, push/deploy e produção.
