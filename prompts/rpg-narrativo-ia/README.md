# Prompts do Sistema 8 — Presenças e interações

Esta pasta guarda os prompts de implementação do Sistema 8 do projeto **Reset — RPG Narrativo Modular**. Ela fica fora de `rpg-narrativo-ia` para separar instruções de execução do código e da documentação normativa.

## Fonte de verdade

Antes de usar qualquer prompt, o agente precisa ler:

- `rpg-narrativo-ia/AGENTS.md`;
- `rpg-narrativo-ia/README.md`;
- `rpg-narrativo-ia/docs/PROJECT-STATUS.md`;
- `rpg-narrativo-ia/docs/SYSTEM-PRESENCES.md`;
- documentos dos sistemas citados pelo prompt;
- implementação e testes da fatia anterior.

Em caso de divergência, a documentação do projeto e a solicitação mais recente do autor prevalecem sobre estes arquivos.

## Ordem obrigatória

| Ordem | Arquivo | Situação em 2 de setembro de 2026 |
| --- | --- | --- |
| 1 | `01-fatia-8.1-catalogo-e-estado.md` | Implementada no commit `7b36993`; mantida como histórico. |
| 2 | `02-fatia-8.2-sincronizacao.md` | Próxima candidata, somente após revisão da 8.1. |
| 3 | `03-fatia-8.3-interacoes.md` | Preparada; não executar antes da consolidação da 8.2. |
| 4 | `04-fatia-8.4-integracao-e-save.md` | Preparada; não executar antes da consolidação da 8.3. |
| 5 | `05-fatia-8.5-interface-mobile.md` | Preparada; não executar antes da consolidação da 8.4. |
| 6 | `06-fatia-8.6-conteudo-jogavel.md` | Preparada; não executar antes da consolidação da 8.5. |

Não dispare duas fatias em paralelo. O ciclo continua sendo:

```text
implementar → testar → revisar → corrigir → consolidar → autorizar próxima fatia
```

## Como usar

1. Confirme que a fatia anterior está commitada, revisada e sem pendências críticas.
2. Copie integralmente o conteúdo do arquivo da próxima fatia para o agente codificador.
3. Entregue ao agente o repositório atualizado na branch correta.
4. Revise o resultado antes de usar o prompt seguinte.
5. Não trate a existência de um prompt como autorização automática de execução.

## Limites permanentes do Sistema 8

Estes prompts não autorizam:

- combate ou estatísticas de batalha;
- IA ou comportamento autônomo;
- agenda e deslocamento automático de NPCs;
- grupo, domesticação ou captura;
- respawn procedural;
- sobrevivência automática;
- clima, economia ou facções jogáveis;
- backend, serviço pago ou IA em runtime;
- arte final.

Por padrão, os prompts também não autorizam push. Commit e push seguem a orientação explícita do autor em cada execução.
