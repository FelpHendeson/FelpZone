# Consolidação de UI/UX

## Estado da decisão

Esta apresentação está **implementada como protótipo**. Ela consolida os Sistemas 1 a 11 sem criar novas regras de jogo. Arte, ícones, tipografia, balanceamento e identidade visual definitiva ainda podem mudar.

## Problema observado

Cada sistema acrescentou uma superfície própria. O conteúdo continuava correto, mas a soma de abas, cartões, indicadores e listas fazia a interface competir com a aventura, sobretudo em telas estreitas. O jogador precisava interpretar a organização do software antes de decidir o que fazer no mundo.

## Princípio de experiência

**Aventura primeiro, dados sob demanda.**

A ordem visual deve acompanhar o raciocínio do jogador:

1. **Contexto:** onde estou e qual é minha condição?
2. **Decisão:** o que posso fazer agora e quanto isso custa?
3. **Consequência:** o que mudou depois da ação?
4. **Detalhes:** quais registros, itens e possibilidades de progressão quero consultar?

## Estrutura da partida

```text
┌──────────────────────────────────┐
│ personagem · período · condição │  HUD persistente
├──────────────────────────────────┤
│                                  │
│           LOCAL ATUAL            │  cena, descrição e exploração
│                                  │
│  [ Explorar ]  [ Ações locais ]  │  decisões contextuais
├──────────────────────────────────┤
│ orientação / jornada acompanhada │  contexto recolhível ou compacto
├──────────────────────────────────┤
│ mapa de rotas / presenças        │  consequência e mundo conhecido
├──────────────────────────────────┤
│ Mundo  Jornadas  Mochila Sistema │  quatro destinos persistentes
└──────────────────────────────────┘
```

## Navegação consolidada

| Destino | Responsabilidade |
| --- | --- |
| **Mundo** | Local atual, exploração, orientação, jornada acompanhada, rotas e presenças. |
| **Jornadas** | Objetivos, locais registrados, presenças conhecidas e histórico narrativo. |
| **Mochila** | Itens carregados e consumo de itens já permitido pelo domínio. |
| **Sistema** | Identidade, condição, relações, Eteris, Númen, habilidades, caminhos e treino. |

`Ações` deixa de ser um destino permanente: descanso, coleta e fabricação pertencem ao local e abrem por **Ações locais**. A antiga aba `Eu` deixa de competir com a fantasia do jogo; seus dados passam a compor a interface diegética do `Sistema`.

## Regras de densidade

- O HUD mantém visíveis personagem, período e faixas textuais de condição, mas evita painéis altos.
- A cena atual concentra nome, descrição, progresso e as duas decisões mais importantes.
- O mapa usa uma lista vertical de rotas; não depende de arrastar horizontalmente.
- Presenças mostram identidade e disponibilidade primeiro; descrição e ações aparecem ao expandir.
- Jornadas mantém a rota principal aberta e recolhe registros secundários.
- Sistema mostra identidade e nível no cabeçalho e organiza cada domínio em seções expansíveis.
- Custos e razões de bloqueio permanecem visíveis antes de ações.
- Feedback de descoberta, condição e jornada continua destacado próximo ao contexto do mundo.

## Responsividade e acessibilidade

- A largura mínima de referência é 320 px, sem rolagem horizontal obrigatória.
- Alvos interativos preservam pelo menos 48 px de altura sempre que possível.
- A navegação não depende de hover.
- Painéis contextuais viram folhas inferiores em celular e diálogos centralizados em telas maiores.
- Elementos nativos `details` e `summary` preservam divulgação progressiva com teclado.
- Foco visível, rótulos acessíveis, contraste e áreas seguras da PWA continuam obrigatórios.

## Limites preservados

Esta consolidação não implementa combate, clima, peso, equipamento, novas fórmulas, novos atributos nem qualquer outra mecânica. O próximo sistema deve ganhar especificação própria e reutilizar a hierarquia existente, acrescentando somente o contexto necessário no momento em que o jogador entra naquela atividade.
