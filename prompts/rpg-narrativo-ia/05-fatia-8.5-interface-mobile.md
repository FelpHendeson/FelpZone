# Prompt — Sistema 8, Fatia 8.5: interface mobile de presenças

> Executar somente após revisão e consolidação da Fatia 8.4.

```text
Implemente somente a Fatia 8.5 do Sistema 8 — Interface mobile de presenças e ações contextuais.

Trabalhe dentro de `rpg-narrativo-ia`. Leia integralmente:

- `AGENTS.md` e `README.md`;
- `docs/PROJECT-STATUS.md`;
- `docs/SYSTEM-PRESENCES.md`;
- `docs/CONTENT-AND-UI.md`;
- `docs/SYSTEM-INTEGRATION.md`;
- implementação atual de `ExplorationScreen`, `GameScreen`, `GameHud`, `BottomNavigation`, `ui/sandbox` e estilos;
- testes das Fatias 8.1 a 8.4.

Pré-condição: o save v4, `SandboxState.presences`, contexto de presenças, interações e `presence.interact` precisam estar implementados e consolidados. A UI não deve compensar contrato ausente com lógica própria.

Objetivo:

Mostrar presenças descobertas no local atual e permitir que o jogador escolha interações conhecidas usando a linguagem visual mobile-first já estabelecida. Conteúdo oculto permanece completamente invisível.

Experiência esperada:

┌──────────────────────────────────┐
│ PRESENÇAS NESTE LOCAL          2 │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ [retrato] MIRA VALE          │ │
│ │ NPC · Disponível             │ │
│ │ Confiança: 2                 │ │
│ │                              │ │
│ │ [Conversar]     [Observar]   │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ [ícone] COELHO CHIFRUDO      │ │
│ │ Animal · Disponível          │ │
│ │                              │ │
│ │ [Investigar]       [Evitar]  │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘

Entregas:

1. View-model

- ampliar `buildExplorationView` ou criar composição equivalente fora dos componentes;
- fornecer somente presenças descobertas do local atual;
- incluir entidade, tipo, nome, descrição, placeholder, status, confiança quando já existir em `relationships` e interações;
- incluir rótulo, dica, custo, disponibilidade e motivo seguro de bloqueio das interações;
- manter regras e condições fora do React;
- criar testes do view-model para conteúdo oculto, disponível, bloqueado e resolvido.

2. Interface

- adicionar “Presenças neste local” ao painel Mundo, próxima ao mapa e à ação principal;
- esconder totalmente a seção quando não houver presença descoberta relevante;
- diferenciar `npc`, `animal` e `creature` com texto e símbolo, nunca apenas cor;
- usar `ImagePlaceholder` local para retratos/ícones;
- apresentar ações dentro do cartão ou em painel contextual compacto;
- mostrar custo temporal antes do clique;
- mostrar motivo para ação conhecida bloqueada;
- tratar presença resolvida de forma discreta e sem ações inválidas;
- disparar somente `onAction({ type: 'presence.interact', ... })`;
- deixar o roteamento existente abrir `GameScreen` quando a ação iniciar narrativa;
- apresentar o feedback não narrativo no componente de atualização do mundo;
- preservar retorno à mesma aba/local quando a narrativa terminar conforme o contrato existente.

3. Responsividade e acessibilidade

- validar larguras de 320, 360, 390 e desktop;
- nenhum elemento pode aumentar `document.scrollWidth` além da viewport;
- cartões e ações devem quebrar linha ou empilhar, sem exigir arrasto horizontal;
- preservar a correção responsiva do mapa;
- alvos de toque com pelo menos 48 px;
- foco visível e ordem de teclado coerente;
- nomes acessíveis em ícones e placeholders;
- não depender de hover;
- a barra inferior não pode ocultar a última ação sem espaço de rolagem suficiente;
- respeitar safe areas.

Estados que precisam ser representados:

- nenhuma presença descoberta: seção ausente;
- presença disponível: ações habilitadas;
- presença conhecida indisponível: estado e motivo compreensíveis;
- interação bloqueada: botão visível, desabilitado e explicado;
- presença resolvida: conclusão visível sem permitir repetição indevida;
- ação concluída sem narrativa: feedback no sandbox;
- ação com narrativa: transição para `GameScreen`;
- erro controlado: banner existente, sem perda de estado.

Não mostre dados inexistentes:

- nível ou experiência;
- vida de NPC/criatura;
- chance de sucesso;
- hostilidade calculada;
- clima;
- peso da mochila;
- dano ou combate;
- agenda ou destino futuro.

Não implemente:

- regra de presença nos componentes;
- conteúdo narrativo completo da Fatia 8.6;
- arte final ou dependência externa de ícones;
- animações complexas;
- mudanças de schema;
- agenda, IA, combate ou sobrevivência.

Validação obrigatória:

- testes do view-model e regressão completa;
- lint e tipos;
- build PWA;
- teste manual ou automatizado do fluxo no navegador;
- conferir console sem erros;
- conferir ausência de overflow horizontal nas larguras definidas;
- conferir Mundo, Ações, Mochila, Eu, interação e retorno da narrativa.

Atualize documentação somente com o que foi implementado e marque apenas a Fatia 8.5 como concluída.

Execute:

npm test
npm run lint
npm run typecheck
npm run build

Relate arquivos, estados visuais verificados, dimensões testadas e pendências. Não antecipe a Fatia 8.6.
```
