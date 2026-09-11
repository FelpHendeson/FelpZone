# Prompt — Fatia 10.5: primeira jornada ponta a ponta

Implemente somente a Fatia 10.5 do Sistema 10 — Objetivos, jornadas e registro de descobertas.

## Base consolidada

As Fatias 10.1 a 10.4 consolidaram domínio, schema 6, sincronização após ações do sandbox, diário derivado e interface mobile. Preserve esses contratos e use somente fatos, locais, recursos, receitas e presenças que já existem.

## Objetivo

Adicionar a jornada principal protótipo `Primeiros passos` e provar que ela acompanha o jogador desde a capacidade inicial até conhecer Mira, sem exigir combate nem alterar o balanceamento.

## Escopo obrigatório

1. Ativar a jornada quando qualquer capacidade inicial tiver sido escolhida, sem criar três cópias da mesma jornada.
2. Se necessário, adicionar um critério genérico e profundamente validado para reconhecer a existência de uma capacidade escolhida; não use ID-curinga nem flags duplicadas.
3. Sincronizar objetivos também após escolhas narrativas, sobre o estado final da escolha e sem custo ou efeito extra.
4. Reconciliar saves schema 6 válidos quando o catálogo ganhar conteúdo, sem mudar a versão do schema e sem rejeitar saves criados enquanto o catálogo inicial estava vazio.
5. Declarar uma jornada principal sequencial com estas etapas:
   - escolher uma capacidade inicial;
   - explorar a Clareira do Despertar;
   - encontrar a nascente;
   - construir uma fogueira;
   - preparar uma refeição;
   - investigar os sinais de outra pessoa;
   - conhecer Mira.
6. Mapear cada etapa apenas para fatos canônicos existentes. A jornada deve aceitar qualquer capacidade e uma fogueira ativa em qualquer local.
7. Manter etapas futuras ocultas pelo diário sequencial e preservar o acompanhamento efêmero da Fatia 10.4.
8. Provar ativação, progressão retroativa de fatos já alcançados, persistência, recarga, conclusão idempotente e continuidade do sandbox.
9. Provar o fluxo com cada uma das três capacidades iniciais, ao menos no marco de ativação.
10. Atualizar a documentação com o contrato realmente entregue e consolidar o Sistema 10 somente depois de todos os gates.

## Fora da fatia

- novos locais, itens, recursos, receitas, NPCs ou eventos;
- recompensas automáticas;
- persistência da jornada acompanhada;
- combate, agenda, comportamento autônomo ou equipamentos;
- mudança de custos, rendimentos, desgaste ou balanceamento;
- arte final ou modal obrigatório.

## Gates

Adicione testes unitários, integrados, de persistência e de interface. Execute suíte completa, lint, tipos, build/PWA, revisão React, validação visual mobile/desktop e gate de avanço. Não faça push.
