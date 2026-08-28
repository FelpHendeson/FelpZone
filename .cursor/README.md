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

## Quando criar novos mecanismos

- Crie uma **regra** quando a orientação precisar valer automaticamente e de forma recorrente.
- Crie um **comando** quando quiser iniciar manualmente um fluxo de trabalho repetível.
- Mantenha cada arquivo focado em uma única finalidade e revise instruções que deixarem de refletir a maneira atual de trabalhar.
