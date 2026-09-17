# Sistema 24 — Calendário de longo prazo e ciclo de vida

> **Estado:** definido e especificado pelo autor em 17 de setembro de 2026. Ainda não implementado.

## Objetivo

Permitir que dias formem meses, estações e anos, dando base para aniversários, idade, crescimento, família, profissões, mandatos e projetos duradouros.

## Decisões confirmadas

- O relógio atual de períodos continua sendo a unidade das ações comuns.
- O pack define calendário, nomes, duração de ciclos e estágios de vida.
- Idade é derivada de uma origem temporal válida; não é um contador independente alterado pela UI.
- Tempo só avança por ações autorizadas, nunca enquanto o aplicativo está fechado.
- A passagem longa não simula individualmente todo NPC a cada período.
- Processos duradouros usam marcos e regras agregadas disparadas pelo avanço do relógio.

## Contrato conceitual

O pack declara calendário, unidades, estações opcionais, datas notáveis e definições de estágio de vida. Atores podem possuir data de origem, estágio derivado e exceções justificadas pelo conteúdo.

O avanço temporal produz fronteiras cruzadas — novo dia, ciclo, estação ou ano — que outros sistemas consomem por contratos públicos. Essas notificações são consequência do relógio, não comandos diretos da UI.

## Integrações

- **Tempo e ciclo diário:** fonte única da passagem temporal.
- **Recursos e necessidades:** renovação e degradação por tempo.
- **NPCs e agenda:** compromissos e marcos futuros.
- **Família:** idade, crescimento e gerações.
- **Economia, profissão e território:** prazos, projetos e mandatos.
- **Narrativa:** aniversários e eventos de calendário declarativos.

## Primeiro ciclo jogável

Uma partida atravessa dias suficientes para mudar um ciclo do calendário. Um compromisso agendado e uma renovação ocorrem na fronteira correta, a idade derivada permanece coerente e recarregar não duplica eventos.

## Fatias propostas

1. Calendário declarativo e validação.
2. Conversão determinística entre instante e data.
3. Datas de origem, idade e estágios de vida.
4. Eventos de fronteira idempotentes.
5. Processos agregados de longa duração.
6. Calendário mobile e próximos compromissos.
7. Jornada de múltiplos ciclos e testes de migração.

## Critérios de aceite

- Calendários diferentes funcionam sem editar o motor.
- Não há avanço offline nem dependência do relógio do aparelho.
- Saltos longos geram cada fronteira necessária uma única vez.
- Idade e estágio não divergem da data canônica.
- Recarregar não repete aniversário, renovação ou compromisso consumido.
- Sistemas consumidores não alteram diretamente o relógio.

## Fora do escopo inicial

- clima;
- astronomia simulada;
- calendário em tempo real;
- simular cada ação de cada NPC ausente;
- envelhecimento visual automático;
- morte por velhice sem autorização futura.
