# UI/UX 2.0 — Navegação por focos

## Estado da decisão

Esta arquitetura está **implementada como protótipo**. Ela reorganiza a apresentação dos Sistemas 1 a 29 sem alterar regras, custos, conteúdo, persistência ou balanceamento.

## Problema resolvido

A interface anterior concentrava progressão, relações, grupos, família, economia, território e política em uma única página do Sistema. O mundo também apresentava local, presenças e mapa completo no mesmo fluxo. O resultado era correto, porém longo e difícil de percorrer em celular.

A UI/UX 2.0 separa consulta de ação e distribui cada fantasia do jogador em uma tela com responsabilidade clara.

## Navegação principal

```text
┌──────────────────────────────────────┐
│ HUD: personagem · tempo · condição  │
├──────────────────────────────────────┤
│                                      │
│          CONTEÚDO DO FOCO            │
│                                      │
├──────────────────────────────────────┤
│ Mundo Jornadas Personagem Mochila ☰ │
└──────────────────────────────────────┘
```

| Destino | Pergunta respondida |
| --- | --- |
| **Mundo** | Onde estou e o que posso fazer agora? |
| **Jornadas** | O que estou tentando alcançar e o que já descobri? |
| **Personagem** | Quem sou, qual é minha condição e qual é meu próximo marco? |
| **Mochila** | O que carrego, equipei e preparei? |
| **Menu** | Qual domínio mais profundo quero consultar? |

O rodapé possui somente destinos frequentes. Telas especializadas usam um cabeçalho de retorno e mantêm o rodapé como âncora.

## Telas contextuais do mundo

`Mundo` mantém o local atual, a principal ação de exploração, as ações locais, a jornada acompanhada, pontos de interesse e ameaças. Dois atalhos abrem superfícies próprias:

- **Mapa:** posição atual, hierarquia de rotas, bloqueios e custo de deslocamento;
- **Pessoas e criaturas:** presenças do local, disponibilidade, agenda percebida, vínculos e ações sociais.

O mapa permanece vertical e não depende de gesto horizontal. Relacionamentos não aparecem misturados aos atributos do personagem.

## Central do Sistema

O destino `Menu` distribui os domínios complexos:

```text
Menu
├── Progressão
│   ├── Eteris e Númen
│   ├── Habilidades e caminhos
│   ├── Treinamento
│   └── Jardim
├── Registro
│   └── patentes, rankings e reconhecimento
├── Sociedade
│   ├── grupos e party
│   ├── família e lar
│   └── ocupação e cidadania
├── Domínio
│   ├── comércio e propriedade
│   ├── base e território
│   └── facções e diplomacia
├── Relacionamentos
└── Mapa completo
```

Cada tela profunda reutiliza os mesmos contratos do motor. O React somente apresenta os dados e solicita ações existentes.

## Regras de experiência

- uma tela deve possuir um foco principal reconhecível pelo título;
- ações de mundo permanecem próximas do local em que acontecem;
- dados pessoais ficam em `Personagem`; vínculos ficam em `Pessoas e criaturas`;
- domínios complexos entram por cartões-resumo, não por uma parede única de sanfonas;
- cartões de entrada exibem contagens úteis sem antecipar informações secretas;
- nenhuma troca de tela consome tempo;
- voltar de uma tela especializada preserva a partida e não produz ação de motor;
- todos os destinos devem funcionar a partir de 320 px sem rolagem horizontal obrigatória;
- botões mantêm rótulo textual, foco visível e alvo confortável para toque.

## Limites

- a reorganização não cria novas mecânicas;
- ícones continuam tipográficos e a arte continua provisória;
- não existe roteamento por URL nesta etapa;
- a tela aberta não é persistida no save;
- animações, temas visuais, busca, filtros e personalização do menu continuam fora do recorte.

## Critérios de aceite

- cinco destinos principais visíveis no rodapé;
- mapa e pessoas deixam de alongar a tela inicial do mundo;
- identidade e condição possuem tela própria;
- Progressão, Registro, Sociedade e Domínio deixam de disputar uma única página;
- todas as ações já implementadas continuam disponíveis em sua nova superfície;
- lint, tipos, testes e build aprovados;
- verificação visual em celular e desktop sem overflow horizontal.
