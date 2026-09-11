# Prompt — Fatia 9.4: interface mobile

Implemente somente a Fatia 9.4 do Sistema 9 — Necessidades e sobrevivência leve.

## Leitura obrigatória

Antes de alterar código, leia integralmente:

- `rpg-narrativo-ia/AGENTS.md`;
- `rpg-narrativo-ia/README.md`;
- todos os arquivos de `rpg-narrativo-ia/docs/`;
- as skills locais indicadas pelo `AGENTS.md`.

## Base consolidada

As Fatias 9.1 a 9.3 estão consolidadas. O modelo de necessidades, `sede`, schema 5, desgaste temporal e as ações atômicas `needs.consume` e `needs.rest` já existem. Não duplique essas regras na apresentação.

## Objetivo

Expor o ciclo de sobrevivência na superfície mobile existente, tornando condição, consumo, repouso e seus resultados compreensíveis sem acrescentar novas mecânicas.

## Escopo obrigatório

1. Mostrar saúde, energia, fome e sede no HUD sem overflow em 320 px.
2. Mostrar as faixas derivadas por texto e estilo, sem depender apenas de cor.
3. Exibir `Consumir` somente nos quatro itens aprovados pelo catálogo de necessidades.
4. Mostrar antecipadamente os efeitos efetivos do consumo, inclusive quando limitados pelos extremos `0..100`.
5. Acrescentar repouso ao painel Ações:
   - simples em qualquer local;
   - junto à fogueira quando existir `campfire` ativa no local atual;
   - informar custo e efeitos antes da confirmação.
6. Destacar o repouso quando energia estiver urgente ou crítica.
7. Descrever efeitos e desgaste com polaridade explícita, como `Fome −36` e `Sede +5`.
8. Comunicar condição crítica dentro da tela, sem modal recorrente e sem bloquear ações de recuperação.
9. Impedir despacho repetido enquanto uma ação anterior estiver pendente, inclusive duplo toque em consumo.
10. Manter alvos de toque de pelo menos 48 px e validar a superfície em 320, 360 e 390 px.

## Fora do escopo

- alterar desgaste, efeitos ou custos aprovados;
- criar novos itens, recursos, receitas, mapas, NPCs ou criaturas;
- combate, dano de criaturas, morte, derrota ou perda de save;
- agenda de sono, clima, temperatura, doença, peso ou durabilidade;
- Fatia 9.5.

## Testes mínimos

- quatro necessidades e limites das faixas aparecem no modelo de apresentação;
- somente consumíveis aprovados oferecem a ação;
- efeitos limitados são informados;
- repouso simples e melhoria por fogueira local são apresentados corretamente;
- feedback diferencia recuperação e desgaste por sinais;
- condição crítica permanece recuperável;
- testes, lint, tipos e build passam;
- revisão visual confirma ausência de overflow e alvos utilizáveis no mobile.

Faça uma revisão final de escopo e relate arquivos alterados, testes, revisão visual e pendências reais. Não faça push sem autorização explícita do autor.
