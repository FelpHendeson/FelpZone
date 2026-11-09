# Cuidados, mana e minigames

## Necessidades confirmadas como requisitos

Sono, fome, saúde, sujeira, nível e qualidade de mana. O treino diário de mana deve usar um minigame específico. O autor também deseja minigames variados de temática RPG que deem moedas, atributos, habilidades e experiência.

| Indicador | Ação proposta | Consequência proposta |
| --- | --- | --- |
| Fome/saciedade | Alimentar | Melhora disposição para atividades |
| Sono/descanso | Dormir | Recupera energia ao longo do tempo |
| Sujeira/higiene | Limpar | Melhora bem-estar |
| Saúde | Descanso e cuidado específico | Limita esforço quando muito baixa |
| Reserva de mana | Repouso ou ação apropriada | Recurso consumível |
| Qualidade de mana | Treino | Eficiência e estabilidade duradouras |

Convenção de barras precisa ser uniforme: é possível representar saciedade em vez de fome e higiene em vez de sujeira, explicando a conversão. Percentuais, velocidades e relações entre necessidades são pendentes.

## Tempo e ausência — proposta

Persistir valores e instante da última avaliação. Ao entrar ou executar ação, calcular o tempo transcorrido no servidor, aplicar taxas e limites. Não depender de um processo rodando continuamente no celular.

**Proposta do histórico:** atenção diária concede bônus; ausência não destrói progresso nem faz qualidade de mana despencar. Morte, abandono permanente, doenças, limite de degradação e regras de vários personagens inativos ainda não foram decididos.

No protótipo local, usar um relógio substituível para testar passagem do tempo. Na versão online, horário do dispositivo não concede recursos. Aplicativo suspenso ou encerrado deve produzir o mesmo resultado previsto pela regra de tempo escolhida.

## Propriedades da mana

**Requisitos:** nível e qualidade. **Proposta do histórico:** separar reserva disponível, controle, qualidade e recuperação. Como o “nível de mana” se relaciona a essas propriedades é pendente.

Não confundir gastar reserva com perder qualidade permanente. A UI precisa explicar treino de longo prazo e recurso de uso imediato.

## Primeiro minigame — Circuito de Mana

**Proposta:** um pulso percorre um circuito; o jogador toca quando ele cruza uma zona de equilíbrio. A precisão mantém o fluxo estável e contribui para o resultado.

1. Tutorial sem recompensa econômica apresenta alvo, pulso e toque.
2. Rodada com quantidade fixa de pulsos.
3. Cada toque tem precisão normalizada conforme distância temporal ao centro.
4. Resultado usa média das tentativas previstas; não tocar conta como erro.
5. Feedback mostra precisão, estabilidade e recompensa validada.

**Fórmula ilustrativa:** precisão = max(0, 1 − |erro de tempo| / janela). Janela, velocidade, número de tentativas e pesos não estão aprovados. Pontuação alta pode melhorar qualidade ou controle, além de conceder moedas/XP dentro dos limites.

Começar com ritmo estável; ramificações e instabilidades ficam para expansão. Oferecer prática, pausa ou alternativa acessível conforme a validação do gesto. Não exigir uma sequência diária sem falhas para manter progresso já conquistado — proposta a confirmar.

## Contrato comum de atividades — proposta

Cada minigame declara ID, versão, duração esperada, entrada/saída, resultados possíveis, recompensas máximas e condições de interrupção. O servidor emite sessão com expiração e confirma conclusão uma vez. Duração e pontuação plausíveis são verificações mínimas, não prova completa contra fraude.

Desconexão não deve inventar recompensa nem repetir concessão; consultar sessão pendente após reconectar. Definir política offline antes de aceitar resultados produzidos fora do servidor.

## Expansões propostas

Treino de espada para coordenação/força; meditação para controle; coleta ou alquimia para recursos. Não existem regras aprovadas para esses jogos. Priorizar um treino divertido e repetível antes de criar muitos.

## Validação

Testar erro, acerto, rodada incompleta, toque repetido, interrupção, retorno após dias e relógio local alterado. Observar se o jogador entende o ganho e se cuidado ajuda a experiência sem bloquear toda atividade por falta de moeda.
