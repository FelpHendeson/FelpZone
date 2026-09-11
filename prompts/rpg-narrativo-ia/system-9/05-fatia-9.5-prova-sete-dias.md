# Prompt — Fatia 9.5: prova de sobrevivência por sete dias

Implemente somente a Fatia 9.5 do Sistema 9 — Necessidades e sobrevivência leve.

## Leitura obrigatória

Antes de alterar código, leia integralmente:

- `rpg-narrativo-ia/AGENTS.md`;
- `rpg-narrativo-ia/README.md`;
- todos os arquivos de `rpg-narrativo-ia/docs/`;
- as skills locais indicadas pelo `AGENTS.md`.

## Base consolidada

As Fatias 9.1 a 9.4 estão consolidadas. Necessidades, schema 5, desgaste, consumo, repouso, interface e feedback já existem. Esta fatia deve provar que o ciclo completo funciona com o conteúdo atual, não criar outro sistema.

## Objetivo

Criar uma prova determinística ponta a ponta de pelo menos sete dias em que o jogador continua vivo e capaz de agir usando somente os sistemas aprovados.

## Escopo obrigatório

1. Começar por uma partida obtida pelo fluxo narrativo público existente.
2. Preparar o mundo apenas por ações públicas de exploração, navegação, coleta e crafting.
3. Construir a fogueira com os gravetos atuais.
4. Revelar e usar a nascente atual para água.
5. Revelar e usar a toca atual para uma unidade de carne por ciclo.
6. Cozinhar a carne na fogueira, consumir água e alimento e repousar.
7. Persistir e recarregar o estado depois de cada ação da rota.
8. Demonstrar pelo menos sete dias após a preparação.
9. Confirmar ao final:
   - saúde acima de 1;
   - fome e sede abaixo do crítico;
   - jogador ainda capaz de executar ações;
   - população de coelhos não extinta;
   - média coletada menor ou igual à recuperação de 2 unidades por dia.
10. Ajustar valores de protótipo somente se a rota aprovada for matematicamente inviável, documentando qualquer ajuste.

## Proibições

- não alterar diretamente `GameState` para facilitar o cenário;
- não usar `fruto-desconhecido`, `agua-limpa`, ajuda de Mira ou interação com presenças;
- não criar itens, recursos, receitas, áreas ou ações;
- não acrescentar combate, morte, derrota ou punições;
- não relaxar validações para fazer o teste passar.

## Gates

- teste ponta a ponta determinístico passa;
- suíte completa, lint, tipos e build passam;
- revisão confirma que a prova usa apenas APIs públicas e conteúdo existente;
- documentação consolida o Sistema 9 e separa claramente o próximo sistema ainda não discutido.

Faça uma revisão final de escopo e relate a rota, dias sobrevividos, consumo médio, condição final, testes e pendências reais. Não faça push sem autorização explícita do autor.
