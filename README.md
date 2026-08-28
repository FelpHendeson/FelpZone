# FelpZone

O **FelpZone** é um laboratório pessoal para explorar ideias, aprender tecnologias e construir pequenos projetos com apoio de IA.

O repositório foi pensado para ser usado tanto no computador do trabalho quanto em casa. O GitHub é a fonte central de sincronização, permitindo continuar um experimento em qualquer uma das máquinas sem misturar os projetos entre si.

## Princípios

- Cada ideia deve viver em uma pasta própria.
- Experimentos devem ser pequenos, independentes e fáceis de entender.
- Cada projeto deve explicar seu objetivo, como executá-lo e seu estado atual.
- Commits devem registrar etapas úteis e compreensíveis.
- Dependências, configurações e decisões devem ser documentadas.
- Segredos, credenciais e informações corporativas nunca devem ser versionados.
- A IA deve ajudar a pensar, implementar e verificar, mas sem esconder decisões importantes.

## Organização sugerida

```text
FelpZone/
├── .cursor/                 # Regras e comandos para trabalhar com IA
│   ├── commands/            # Prompts reutilizáveis
│   └── rules/               # Instruções persistentes do repositório
├── nome-da-ideia/           # Um experimento independente
│   ├── README.md
│   └── ...
├── .gitignore
└── README.md
```

Uma ideia pode começar pequena e ganhar sua própria estrutura conforme crescer. Evite criar uma arquitetura complexa antes de ela ser necessária.

## Fluxo entre trabalho e casa

Antes de começar a trabalhar:

```bash
git pull
```

Depois de concluir uma etapa útil:

```bash
git add .
git commit -m "Descrição objetiva da mudança"
git push
```

Antes de adicionar arquivos, confira `git status` e verifique se nada sensível ou corporativo entrou por engano.

## Criando uma nova ideia

1. Crie uma pasta com um nome curto em `kebab-case`, por exemplo `organizador-de-links`.
2. Adicione um `README.md` explicando problema, proposta, tecnologia, execução e próximos passos.
3. Mantenha dependências e arquivos de configuração dentro da pasta da ideia sempre que possível.
4. Implemente primeiro a menor versão capaz de validar a hipótese.
5. Registre decisões relevantes e faça um commit ao alcançar um ponto estável.

Se estiver usando Cursor ou Codex, o comando em [`.cursor/commands/nova-ideia.md`](.cursor/commands/nova-ideia.md) fornece um roteiro reutilizável para esse processo.

## Trabalho com IA

A pasta [`.cursor`](.cursor/README.md) contém o contexto compartilhado com assistentes de IA:

- `rules/felpzone.mdc`: princípios que devem ser considerados em toda tarefa neste repositório.
- `commands/nova-ideia.md`: roteiro para planejar e iniciar um experimento.
- `commands/revisar-ideia.md`: roteiro para avaliar um experimento existente.

As regras dão contexto persistente. Os comandos são prompts reutilizáveis: abra o arquivo correspondente ou invoque-o pelo nome quando o editor oferecer suporte a comandos personalizados.

## Segurança e privacidade

Este repositório é público. Nunca adicione:

- senhas, tokens, chaves de API ou arquivos `.env`;
- código, documentos, nomes internos ou dados pertencentes à empresa;
- dados pessoais ou de clientes;
- arquivos gerados, caches e dependências que possam ser recriados.

Use valores de exemplo em `.env.example`, como `API_KEY=adicione_sua_chave_aqui`, sem inserir credenciais reais.

## Estado atual

Estrutura inicial do laboratório. Novas ideias serão adicionadas como projetos independentes.
