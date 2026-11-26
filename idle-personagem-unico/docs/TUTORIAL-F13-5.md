# F13.5 — Tutorial por ações reais

Continuação autorizada em 26/11/2026. [Contrato](../../prompts/idle-personagem-unico/13-5-tutorial.md).

## Comportamento

Tutorial individual no save do personagem, sincronizado na conta. Novos personagens começam ativos; sorteio é reconhecido ao nascer. Um bloco contextual orienta a próxima tarefa; o cabeçalho e Personagem → Guia permitem consultar todos os passos e retomá-lo. Os seis sistemas e todas as sub-abas anteriores continuam disponíveis; Guia acrescenta uma sub-aba.

| Passo | Reconhecido quando |
| --- | --- |
| Sorteio | Personagem criado com nome/aparência |
| Treino | Início de treino confirmado |
| Coleta | Início de coleta confirmado |
| Venda | Venda confirmada que aumenta gold |
| Equipamento | Equipar confirmado |
| Combate | Início de caça confirmado |
| Guilda | Aceitar missão do tipo Guilda confirmado |

Ações inválidas não contam. Abrir telas não conta. Não existe payload para concluir passos. É possível realizar tarefas fora de ordem, pular e retomar sem perder o registro; atividades continuam sendo reconhecidas enquanto pausado. Completar o tutorial não dá prêmio, desbloqueio ou tentativas extras. Os textos explicam aguardar ciclos, viajar, obter gold, equipar após comprar e avaliar risco/recuo.

## Persistência e migração

Save v14 adiciona `tutorial {modo: ativo|pulado, concluidos}` por personagem. Validação rejeita passos desconhecidos, duplicatas e modo inválido. Migração v13 preserva todo o jogo, inclusive RNG/sorteio pendente, acrescentando guia pausado com sorteio reconhecido. Não inventa histórico de vendas ou outras ações.

Pular/retomar alteram só o modo; não avançam tempo, consomem RNG ou modificam economia. Usam o fluxo existente de revisão/recibo e isolamento de identidade. Atualização do cache PWA mantém dados da API fora do cache. Abas antigas devem ser recarregadas para usar o cliente compatível com v14; não há downgrade automático de saves v14.

## Verificação

364 testes do motor, 61 web e 3 de integração com Redis real passaram (428 no total). Lint, tipos e build aprovados. Foram atualizadas as fábricas de personagens dos testes/simulador para o campo obrigatório de v14, mantendo as verificações das regras.

Os testes cobrem início, pausa/retomada idempotente, ausência de efeitos em RNG/tempo/economia, ações inválidas sem crédito, sete passos em qualquer ordem, reconhecimento durante pausa, isolamento entre personagens, migração preservando RNG/sorteio e rejeição de metadados inválidos. Redis real verifica reinício, outra sessão lendo o mesmo tutorial e outra conta isolada.

Playwright/Chromium com API real e Redis isolado verificou jogador novo, reload após pular, retomar, migração v13, conclusão dos sete passos por ações reais, guia após conclusão, sincronização de pausa/retomada em dois navegadores e controles bloqueados offline. O teste confirma o tratamento explícito de conflito de revisão: ação recusada atualiza o estado e o usuário pode tentar novamente; não se marca progresso sem confirmação.

Revisão em 320, 390, 768 e 1440 px sem overflow horizontal. A mudança de passo recebe foco/rolagem uma vez, sem anúncios ou movimento a cada tick. A medição de posição detectou sobreposição pelo cabeçalho fixo; a correção posiciona o bloco após o layout usando a altura real. O roteiro de foco verifica que o bloco inteiro fica abaixo do cabeçalho.

Não foram criadas contas de teste em produção. A publicação usa main e deploy automático autorizado; a verificação pública usa só uma jornada local descartável no navegador e readiness do banco.
