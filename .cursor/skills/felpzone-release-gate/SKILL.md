---
name: felpzone-release-gate
description: Decide se uma entrega do RPG narrativo pode avançar para a próxima fatia combinando escopo, revisão, testes, build, documentação e validação visual condicional. Use antes de aprovar, encerrar ou iniciar a próxima etapa de um sistema.
---

# Gate de avanço do FelpZone

## Reunir evidências

1. Identifique a fatia, seu prompt em `prompts/rpg-narrativo-ia`, a documentação do sistema e o commit de implementação.
2. Leia `rpg-narrativo-ia/AGENTS.md` e `docs/PROJECT-STATUS.md`.
3. Inspecione histórico, status, diff e `git diff --check` sem alterar o repositório.
4. Aplique o fluxo de `felpzone-revisar-entrega`.
5. Execute `felpzone-quality-gates` e registre os resultados reais.

Se a entrega modificar UI ou CSS, também valide a experiência completa no navegador:

- larguras de 360 px e 390 px;
- tablet e desktop;
- ausência de corte ou overflow horizontal involuntário;
- rolagem e gestos esperados;
- foco, teclado e alvos de toque;
- fluxo afetado do início ao fim.

Use automação de navegador quando disponível. Se não for possível validar visualmente, declare o gate visual como pendente; não presuma aprovação.

## Critérios de bloqueio

Bloqueie o avanço quando existir qualquer um destes itens:

- achado P0, P1 ou P2 confirmado;
- teste, lint, typecheck ou build reprovado;
- requisito autorizado ausente;
- comportamento fora do escopo introduzido;
- documentação incompatível com o código;
- alteração visual sem validação nas larguras exigidas;
- alteração do usuário sobrescrita ou segredo incluído.

Achados P3 podem ser aceitos somente quando estiverem documentados como não bloqueantes.

## Veredito

Use exatamente um dos resultados:

```text
APROVADO PARA A PRÓXIMA FATIA
```

ou

```text
BLOQUEADO — CORREÇÃO NECESSÁRIA
```

Fundamente o veredito com escopo, revisão, gates, validação visual e pendências. O gate aprova tecnicamente a entrega, mas não autoriza sozinho implementar a próxima fatia.

Não faça correções, `commit` ou `push` durante o gate sem solicitação explícita.
