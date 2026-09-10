# Prompt — Fatia 9.2: estado principal e migração

Implemente somente a Fatia 9.2 do Sistema 9 — Necessidades e sobrevivência leve.

Antes de alterar código, leia integralmente:

- `rpg-narrativo-ia/AGENTS.md`;
- `rpg-narrativo-ia/README.md`;
- `rpg-narrativo-ia/docs/PROJECT-STATUS.md`;
- `rpg-narrativo-ia/docs/SYSTEM-NEEDS.md`;
- `rpg-narrativo-ia/docs/ARCHITECTURE.md`;
- `rpg-narrativo-ia/docs/SYSTEM-INTEGRATION.md`;
- os módulos e testes atuais de estado, persistência, sandbox e necessidades.

## Objetivo

Integrar `sede` ao estado principal e evoluir a persistência para schema 5, preservando saves válidos anteriores sem ainda aplicar necessidades ao loop jogável.

## Escopo obrigatório

1. Adicione `sede` a `Attributes`, `AttributeId`, `ATTRIBUTE_IDS`, rótulos e estado inicial, com valor inicial `25`.
2. Incremente `SCHEMA_VERSION` para `5`.
3. Preserve contratos legados explícitos para os atributos dos schemas 1 a 4, que não possuíam `sede`.
4. Adicione inspeção e migração do schema 4.
5. Faça saves v1, v2, v3 e v4 válidos chegarem ao schema 5 com `sede: 25`.
6. Preserve personagem, status, sessão narrativa, demais atributos, inventário, relações, flags, histórico, mundo, progressão, sandbox e `updatedAt`.
7. Mantenha a leitura sem regravar o armazenamento e sem executar qualquer ação do jogo.
8. Exija `sede` válida no schema atual e rejeite ausência, valor fracionário, não numérico ou fora de `0..100`.
9. Preserve cópias defensivas e validação do sandbox contra o contexto recebido.
10. Atualize a documentação para refletir somente a integração implementada.

## Testes obrigatórios

- nova partida nasce no schema 5 com `sede: 25`;
- roundtrip preserva um valor de sede diferente do inicial;
- schema 5 rejeita sede ausente, fracionária, não numérica e fora do intervalo;
- schemas 1, 2, 3 e 4 migram para 5 com sede 25;
- todos os demais campos são preservados;
- migração não muta a entrada;
- schema 4 continua validado pelo contrato antigo e rejeita estrutura adulterada;
- carregar um save antigo não avança tempo, não altera inventário ou sandbox e não regrava o armazenamento;
- regressões de persistência, narrativa, sandbox e presenças continuam passando.

## Proibições desta fatia

- não aplicar desgaste automático;
- não criar `needs.consume` nem `needs.rest`;
- não alterar `executeSandboxAction`;
- não alterar React, CSS, HUD, mochila ou painéis;
- não mudar mapas, recursos, receitas ou conteúdo;
- não implementar combate, morte ou novos recursos;
- não antecipar as Fatias 9.3 a 9.5.

## Gates

Execute ao final:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Revise migrações e validações adversariais antes de aprovar. Não faça push sem autorização explícita do autor.
