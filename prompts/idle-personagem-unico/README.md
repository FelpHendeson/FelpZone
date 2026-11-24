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
| 6 | `06-fatia-F6-limiar.md` | **Concluída** em 24/11/2026. Decisões para o autor conferir em `docs/DECISOES.md` (38 a 44). |
| 7 | `07-fatia-F7-missoes-guilda.md` | **Concluída** em 24/11/2026 (F7 a F13 autorizadas juntas). Decisões em `docs/DECISOES.md` (45 a 51). |
| 8 | `08-fatia-F8-forja-producao.md` | **Concluída** em 24/11/2026. Decisões em `docs/DECISOES.md` (52 a 59). |
| 9 | `09-fatia-F9-conta-sincronizacao.md` | **Concluída** em 24/11/2026 (banco a ativar pelo autor). Decisões em `docs/DECISOES.md` (60 a 67). |
| 8 a 14 | F8 a F14 de `docs/ROADMAP.md` | F8 a F13 autorizadas; prompts escritos uma a uma. A F14 (mobile) ainda não. |

O relatório de todas as fatias executadas fica em `idle-personagem-unico/RELATORIO-idle-personagem-unico.md`.

Não dispare duas fatias em paralelo. O ciclo é:

```text
implementar → testar → revisar → corrigir → consolidar → autorizar próxima fatia
```

## Como usar

1. Confirme que a fatia anterior está commitada, revisada e sem pendências críticas.
2. Copie integralmente o conteúdo do arquivo da próxima fatia para o agente codificador.
3. Peça revisão e quality gates antes de autorizar a seguinte.
