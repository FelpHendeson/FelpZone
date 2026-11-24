# Prompts do Idle de Personagem Único

Esta pasta guarda os prompts de implementação do projeto **`idle-personagem-unico`**. Ela fica fora do projeto para separar instruções de execução do código e da documentação normativa.

## Fonte de verdade

Antes de usar qualquer prompt, o agente precisa ler:

- `idle-personagem-unico/README.md`;
- `idle-personagem-unico/docs/GDD.md`;
- `idle-personagem-unico/docs/ARQUITETURA.md`;
- `idle-personagem-unico/docs/DECISOES.md`;
- `idle-personagem-unico/docs/ROADMAP.md`;
- implementação e testes da fatia anterior, quando houver.

Em caso de divergência, a documentação do projeto e a solicitação mais recente do autor prevalecem sobre estes arquivos.

## Ordem obrigatória

| Ordem | Arquivo | Situação |
| --- | --- | --- |
| 0 | `00-fatia-F0-fundacao.md` | **Concluída** (commit `293c932`); mantida como histórico. |
| 1 | `01-fatia-F1-sorteio.md` | **Concluída** em 23/11/2026; mantida como histórico. Decisões para o autor conferir em `docs/DECISOES.md` (7 a 12). |
| 2 | `02-fatia-F2-atividade-treino.md` | **Concluída** em 24/11/2026; mantida como histórico. Decisões para o autor conferir em `docs/DECISOES.md` (13 a 18). |
| 3 | `03-fatia-F3-mapa-coleta.md` | **Concluída** em 24/11/2026. Decisões para o autor conferir em `docs/DECISOES.md` (19 a 24). |
| 4 | `04-fatia-F4-combate.md` | **Concluída** em 24/11/2026. Decisões para o autor conferir em `docs/DECISOES.md` (25 a 31). |
| 5 | `05-fatia-F5-habilidades.md` | **Concluída** em 24/11/2026. Decisões para o autor conferir em `docs/DECISOES.md` (32 a 37). |
| 6 a 14 | F6 a F14 de `docs/ROADMAP.md` | Ainda não escritos. Cada prompt é escrito quando a fatia anterior estiver consolidada. |

O relatório de todas as fatias executadas fica em `idle-personagem-unico/RELATORIO-idle-personagem-unico.md`.

Não dispare duas fatias em paralelo. O ciclo é:

```text
implementar → testar → revisar → corrigir → consolidar → autorizar próxima fatia
```

## Como usar

1. Confirme que a fatia anterior está commitada, revisada e sem pendências críticas.
2. Copie integralmente o conteúdo do arquivo da próxima fatia para o agente codificador.
3. Peça revisão e quality gates antes de autorizar a seguinte.
