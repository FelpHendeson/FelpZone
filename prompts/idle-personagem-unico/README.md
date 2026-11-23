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
| 0 | `00-fatia-F0-fundacao.md` | Escrito e **autorizado em 23/11/2026**. |
| 1 a 14 | F1 a F14 de `docs/ROADMAP.md` | Ainda não escritos. Cada prompt é escrito quando a fatia anterior estiver consolidada. |

Não dispare duas fatias em paralelo. O ciclo é:

```text
implementar → testar → revisar → corrigir → consolidar → autorizar próxima fatia
```

## Como usar

1. Confirme que a fatia anterior está commitada, revisada e sem pendências críticas.
2. Copie integralmente o conteúdo do arquivo da próxima fatia para o agente codificador.
3. Peça revisão e quality gates antes de autorizar a seguinte.
