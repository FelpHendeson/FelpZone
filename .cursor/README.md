# Configuração de IA

Esta pasta mantém mecanismos compartilhados para trabalhar com assistentes de IA no FelpZone. Ela é versionada para que o mesmo comportamento esteja disponível no trabalho e em casa.

## `rules/`

Contém regras persistentes no formato `.mdc`. O Cursor carrega essas instruções como contexto do projeto.

- `felpzone.mdc` se aplica sempre e orienta organização, segurança, documentação e qualidade.

Edite a regra quando um princípio passar a valer para todo o repositório. Para convenções específicas de uma tecnologia, crie outra regra com `alwaysApply: false` e um `globs` adequado, por exemplo `**/*.tsx`.

## `commands/`

Contém prompts reutilizáveis para tarefas frequentes.

- `nova-ideia.md` ajuda a transformar uma hipótese em um experimento pequeno e documentado.
- `revisar-ideia.md` avalia um projeto existente e sugere o próximo passo mais valioso.

No Cursor, esses arquivos podem aparecer como comandos personalizados. Também podem ser abertos e usados como roteiro em qualquer assistente.

## `skills/`

Contém fluxos operacionais que o Codex pode descobrir automaticamente ou executar quando você cita o nome da skill.

- `felpzone-implementar-fatia`: implementa somente uma fatia autorizada e preserva os limites documentados.
- `felpzone-revisar-entrega`: revisa uma implementação contra o prompt, a documentação e a arquitetura, sem corrigir durante a revisão.
- `felpzone-quality-gates`: executa testes, lint, verificação de tipos e build por meio de uma bateria única e reproduzível.
- `felpzone-release-gate`: reúne escopo, revisão, validações e, quando necessário, inspeção visual para decidir se a próxima fatia pode começar.

Exemplos de uso:

```text
$felpzone-implementar-fatia execute prompts/rpg-narrativo-ia/02-fatia-8.2-sincronizacao.md
$felpzone-revisar-entrega revise a implementação que acabou de subir
$felpzone-quality-gates rode a bateria completa
$felpzone-release-gate diga se podemos avançar para a próxima fatia
```

As skills não fazem `commit` ou `push` sem um pedido explícito. Assim, implementação, aprovação técnica e publicação continuam sendo decisões separadas.

## Quando criar novos mecanismos

- Crie uma **regra** quando a orientação precisar valer automaticamente e de forma recorrente.
- Crie um **comando** quando quiser iniciar manualmente um fluxo de trabalho repetível.
- Crie uma **skill** quando o fluxo precisar investigar o repositório, executar ferramentas, aplicar decisões e produzir uma saída padronizada.
- Mantenha cada arquivo focado em uma única finalidade e revise instruções que deixarem de refletir a maneira atual de trabalhar.
