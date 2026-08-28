# RPG Narrativo com IA

Um RPG de texto mobile-first no qual campanhas estruturadas ganham narrativa, diálogos e variações com apoio de IA.

O projeto combina a leitura rápida e a linha do tempo de simuladores de vida com atributos, inventário, relações, escolhas e consequências de um RPG. A interface será própria e usará imagens estáticas, sem depender de um motor gráfico.

## Hipótese

É possível criar uma experiência de RPG envolvente para celular usando uma aplicação web leve, desde que:

- as escolhas tenham consequências perceptíveis;
- o estado da história permaneça coerente;
- a interface torne leitura e decisão rápidas;
- a IA expanda a narrativa sem controlar sozinha as regras do jogo.

## Experiência desejada

O jogador acompanha uma linha do tempo de acontecimentos, observa o estado do personagem e toma decisões por botões grandes. Cada escolha pode alterar atributos, relações, inventário, eventos futuros e finais disponíveis.

```text
Campanha estruturada
        ↓
Estado atual do jogador
        ↓
Evento e escolhas permitidas
        ↓
Narração da cena
        ↓
Escolha do jogador
        ↓
Consequências aplicadas pelo jogo
        ↓
Novo estado
```

## Princípio central

A IA não deve ser a única fonte de verdade.

O código mantém o estado, valida regras e aplica consequências. A IA pode ajudar a criar campanhas e, futuramente, variar descrições, diálogos e reações dentro do contexto permitido.

Essa separação evita que personagens, itens e decisões importantes sejam esquecidos durante a partida.

## Primeira campanha

Título provisório: **A Noite Esquecida**.

Uma pessoa chega a uma vila de fantasia sombria cujos habitantes perderam as memórias da mesma noite. Ao investigar o ocorrido, o jogador forma alianças, encontra versões contraditórias e decide se certas lembranças deveriam realmente voltar.

A campanha inicial deve durar entre 10 e 15 minutos e conter:

- um personagem jogável;
- uma vila e poucos locais importantes;
- três personagens relevantes;
- entre cinco e dez eventos;
- duas ou três escolhas por evento;
- atributos afetados pelas decisões;
- pelo menos dois finais.

## MVP

A menor versão jogável não utilizará uma API de IA durante a partida. A campanha será escrita com ajuda de IA, revisada e armazenada localmente como dados estruturados.

O MVP deve ter:

- interface vertical responsiva;
- linha do tempo de acontecimentos;
- retrato e resumo do personagem;
- atributos como vida, reputação e sanidade;
- eventos com texto, imagem e escolhas;
- consequências determinísticas;
- inventário e relações simples;
- salvamento local;
- funcionamento como PWA instalável;
- uma campanha curta completa.

## Interface inicial

```text
┌─────────────────────────────┐
│ Retrato   Nome — Capítulo 2 │
│ Vida  ♥♥♥  Reputação  ●●○   │
├─────────────────────────────┤
│                             │
│      Imagem da cena         │
│                             │
├─────────────────────────────┤
│ A chuva apaga as pegadas... │
│                             │
│ [Seguir até a floresta]     │
│ [Questionar a curandeira]   │
│ [Voltar para a hospedaria]  │
├─────────────────────────────┤
│ História  Pessoa  Itens     │
└─────────────────────────────┘
```

O desenho é apenas uma referência funcional. A identidade visual será definida durante o protótipo e não copiará elementos protegidos de outros jogos.

## Tecnologia proposta

- TypeScript;
- React com Vite;
- CSS responsivo, priorizando telas de celular;
- estado local simples, adicionando uma biblioteca apenas se necessário;
- `localStorage` ou IndexedDB para partidas;
- manifesto e service worker para PWA;
- campanhas armazenadas inicialmente em JSON.

PHP e SQL ficam reservados para uma etapa futura com contas, sincronização, campanhas compartilhadas ou editor online.

## Evolução da IA

1. A IA ajuda o autor a estruturar uma campanha durante o desenvolvimento.
2. A IA varia descrições e diálogos sem alterar o estado por conta própria.
3. A IA interpreta respostas abertas do jogador dentro de escolhas válidas.
4. A IA gera campanhas seguindo um esquema verificável.
5. Autores criam, testam e compartilham campanhas pelo próprio aplicativo.

## Uso no celular

A aplicação será publicada como site responsivo. No início, qualquer celular poderá acessá-la pelo navegador. Como PWA, poderá ser adicionada à tela inicial e funcionar em tela cheia; suporte offline será incluído no desenvolvimento.

O desenvolvimento principal será mais confortável no computador. Pelo celular será possível testar, revisar conteúdo e, dependendo das ferramentas disponíveis, fazer pequenas alterações pelo GitHub. Editar toda a aplicação pelo telefone é possível, mas não será o fluxo principal.

## Critérios de sucesso do protótipo

- a campanha pode ser concluída no celular sem problemas de interface;
- uma escolha anterior altera pelo menos um evento posterior;
- fechar e reabrir o jogo preserva a partida;
- o jogador entende atributos e consequências sem tutorial longo;
- a experiência gera vontade de iniciar outra campanha.

## Próximos passos

- [ ] Definir o tom e o personagem inicial de **A Noite Esquecida**.
- [ ] Modelar campanha, eventos, escolhas e consequências em TypeScript/JSON.
- [ ] Criar o wireframe navegável para celular.
- [ ] Implementar o motor narrativo determinístico.
- [ ] Escrever a campanha curta.
- [ ] Adicionar salvamento local e instalação como PWA.
- [ ] Testar a experiência em um celular real.
- [ ] Avaliar onde a IA melhora o jogo sem prejudicar a coerência.

## Estado atual

**Conceito registrado.** Ainda não há aplicação ou dependências instaladas.
