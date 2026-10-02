# Proposta — Sistema-tutor, capítulos por ação e relógio em minutos

## Estado da decisão

**Proposta para decisão do autor. Nada aqui está implementado.** Nasce de um playtest real: um jogador morreu de fome preso numa área, sem perceber que havia pessoas ali para interagir, e é fácil atravessar os sete dias sem avançar a trama.

São três mudanças independentes. Cada uma pode ser aprovada, ajustada ou recusada sozinha. Cada seção termina com **as decisões que faltam** e uma recomendação.

| # | Mudança | Problema que resolve | Custo | Mexe no save? |
| --- | --- | --- | --- | --- |
| A | Sistema-tutor | jogador perdido, morrendo sem saber o que fazer | baixo | não |
| B | Capítulos por ação | dias passam sem a história andar | médio | não (versão recomendada) |
| C | Relógio em minutos (24h ou AM/PM) | período é uma unidade grossa e pouco intuitiva | alto | sim (schema 28) |

Ordem recomendada: **A → B → C**. A e B atacam o que o playtest mostrou; C é a mais cara e se beneficia de A e B já estarem no lugar.

---

## A. Sistema-tutor: o Sistema aponta o que importa agora

### Problema observado

- A fome subiu até o crítico e o jogador não sabia onde conseguir comida.
- Havia pessoas no local e ele não notou: elas ficam numa tela secundária (`Mundo → Pessoas e criaturas`).
- Ele ficou "preso": a área estava totalmente explorada e nada indicava para onde ir.

A Central de Ajuda existe, mas é passiva: explica conceitos quando desbloqueados, não diz **o que fazer agora**.

### Proposta

Uma camada de **sinais do Sistema**, derivada do estado a cada tela — sem estado novo no save, como a Janela do Sistema já faz.

```ts
interface SystemHint {
  id: string;                 // estável, para "não mostrar de novo hoje"
  priority: 'urgente' | 'importante' | 'sugestão';
  title: string;              // "Sua fome está alta"
  detail: string;             // "Você tem 1× Carne cozida na mochila."
  action?: SuggestedAction;   // botão que leva direto à ação ou tela
}

function deriveSystemHints(state: GameState, context: SandboxContext): SystemHint[];
```

A função é pura e mora num módulo (regra fora do React). Primeiros sinais, em ordem de prioridade:

| Sinal | Quando aparece | O que sugere |
| --- | --- | --- |
| Necessidade crítica | fome, sede ou energia na faixa alta/crítica | consumível que já está na mochila → "Comer agora"; senão, ponto de coleta conhecido ("Água na Nascente, 1 rota daqui"); senão, "explore para encontrar" |
| Pessoa por perto | NPC presente no local com interação disponível não usada | "Mira está aqui" → abre a interação |
| Área esgotada | local 100% explorado e nenhuma ação nova disponível | rota para um vizinho com exploração incompleta |
| Próximo passo da jornada | jornada acompanhada com passo atual | onde e o quê ("Fale com Caio na Margem Rochosa") |
| Noite chegando | entardecer sem fogueira/abrigo ativo | "Prepare a noite: fogueira na Clareira" |

**Onde aparece:**

1. O cartão **Orientação do Sistema**, que já existe na tela Mundo, passa a mostrar o sinal de maior prioridade com o botão de ação, em vez de só "Consultar".
2. Sinais **urgentes** abrem uma janela do Sistema curta (mesmo componente das conquistas), no máximo uma vez por período e por sinal.
3. Pessoas presentes ganham destaque direto no cartão-herói do local ("● 2 pessoas aqui"), sem precisar entrar em outra tela.

**Primeira vez no sandbox:** um tour curto de 4 passos (HUD de necessidades → Explorar → Ações locais → Pessoas/Mapa), escrito na voz do Sistema e reaproveitando a Central de Ajuda. Pode ser pulado e reaberto pela Ajuda.

**Preferência do jogador:** "Orientação: Guiada / Discreta / Desligada", salva no aparelho (`localStorage`), não no save — é conforto, não regra.

### Decisões que faltam

1. A janela automática para sinais urgentes é desejável, ou só o cartão no Mundo basta?
2. O tour de primeira vez entra agora ou depois?
3. **Recomendação:** implementar o cartão + destaque de pessoas + sinais urgentes primeiro (resolve o playtest); tour na sequência.

---

## B. Capítulos que avançam por ação, não por dia

### Problema

Hoje "Dia N" é o capítulo: `day-two-start` dispara com `world.day.min: 2`, e os Dias 3–7 encadeiam pelo relógio (`dayN.started` + dia mínimo). Se o jogador só sobrevive — coleta, dorme, repete — a semana passa e as cenas de cada dia abrem uma depois da outra sem que ele tenha feito nada do arco. O contrário também acontece: quem é rápido espera o relógio.

### Três modelos

| Modelo | Como funciona | Prós | Contras |
| --- | --- | --- | --- |
| 1. Só por ação | capítulo N+1 abre quando a cena-chave do capítulo N é resolvida; o dia é só ambiente | a história nunca passa sem o jogador | o mundo parece congelado; conflita com o cânone do Registro "no sétimo dia" |
| 2. Só por dia (atual) | capítulo = dia do calendário | simples, mundo com pressão | é o problema relatado |
| **3. Híbrido (recomendado)** | **cenas pessoais** avançam por ação; **eventos de mundo** mantêm data fixa | história acompanha o jogador e o mundo continua vivo | precisa separar o que é pessoal do que é mundo |

### Modelo híbrido em detalhe

- **Capítulo** passa a ser uma camada de conteúdo do pack: `chapters.json` com `id`, `title` e a **condição de entrada** (flags, objetivo concluído, descoberta — tudo o que `world-events` já entende).
- Cada capítulo pessoal abre quando **(a)** a cena-chave do anterior foi resolvida e **(b)** o personagem passou por um descanso noturno depois disso. A noite vira a "virada de página" natural, sem exigir um número de dia.
- **Eventos de mundo com data** continuam no relógio. O principal é o **Registro regional**: o cânone diz "no sétimo dia" e ele afeta toda a humanidade, então continua no Dia 7 haja o que houver. Quem estiver atrasado vive o Registro no capítulo em que estiver, e o conteúdo reage a isso.
- **Pressão sem punição:** se o jogador passa 2 dias no mesmo capítulo sem progresso, o Sistema-tutor (A) sugere o próximo passo e um NPC pode vir até ele. Nunca falha a história por demora.
- A interface troca "Dia N" por **"Capítulo N — título"** na Crônica e nas Jornadas; o dia continua no HUD como data.

### Como fica o primeiro arco

| Capítulo | Abre quando | Hoje |
| --- | --- | --- |
| 1 — O despertar | início | Dia 1 |
| 2 — Os outros | primeira noite superada | `world.day.min: 2` |
| 3 — Convivência | cena-chave do capítulo 2 resolvida (contato, afastamento ou ausência de encontro) + noite | Dia 3 |
| 4 — Trabalho | cena-chave do 3 + noite | Dia 4 |
| 5 — A conversa | cena-chave do 4 + noite | Dia 5 |
| 6 — Davi | postura do capítulo 5 registrada + noite | Dia 6 |
| Registro regional | **Dia 7, fixo** (evento de mundo) | Dia 7 |

As cenas atuais não precisam ser reescritas: só a **fonte do gatilho** muda (de `world.day.min` para "capítulo anterior concluído + noite"). As flags `dayN.started` continuam valendo, o que mantém os saves atuais compatíveis **sem mudar de schema**.

### Decisões que faltam

1. Modelo híbrido aprovado? Ou prefere capítulos 100% por ação (modelo 1), aceitando mover o Registro para "capítulo 7"?
2. A virada de capítulo exige a noite, ou abre imediatamente após a cena-chave?
3. Quantos dias sem progresso até o mundo "cutucar" o jogador (sugestão: 2)?
4. **Recomendação:** híbrido, com virada na noite e cutucada após 2 dias.

---

## C. Relógio em minutos, com 24h ou AM/PM

### Hoje

O tempo é contado em **6 períodos** (Alvorecer, Manhã, Meio-dia, Tarde, Entardecer, Noite). Toda ação custa períodos inteiros: o pack tem 61 custos de 1 período, 3 de 2 e 6 de 0. **26 módulos** leem "período": necessidades por período, recuperação de recursos, agenda de NPCs, prazos, projetos de assentamento, recarga de Númen, combate, treino, Jardim, entre outros.

### Duas formas de chegar lá

| | 1. Relógio só de exibição | **2. Minuto como unidade real (recomendado)** |
| --- | --- | --- |
| O que muda | cada período ganha uma faixa de horário e o HUD mostra um relógio | o estado guarda `{ day, minute }` e as ações custam minutos |
| Ação de 20 minutos | impossível (ainda custa 1 período) | possível |
| Esforço | baixo, só interface | alto, motor + pack + migração |
| Save | não muda | schema 28: `period` → minuto de início do período |
| Risco | quase nenhum | alto (26 módulos), mitigado por fases |

### Forma recomendada (2), em fases

**Faixas de horário canônicas** — o período continua existindo, derivado do minuto, para não quebrar agendas e condições:

| Período | Faixa |
| --- | --- |
| Alvorecer | 05:00–06:59 |
| Manhã | 07:00–10:59 |
| Meio-dia | 11:00–13:59 |
| Tarde | 14:00–16:59 |
| Entardecer | 17:00–18:59 |
| Noite | 19:00–04:59 |

- **Fase C1 — o motor entende minutos.** `TimeCost` aceita `{ minutes }` além de `{ periods }`; um custo em períodos é convertido para "avançar até o início do próximo período", o que preserva **exatamente** o comportamento atual. `world.period` e as agendas leem o período derivado do minuto. Schema 28 com migração. O HUD mostra o relógio.
- **Fase C2 — o pack ganha custos realistas.** Reescrever os custos em minutos com valores defendíveis (exemplos: beber água 5 min, coletar 30 min, explorar 90 min, cozinhar 45 min, treino 120 min, dormir até o amanhecer). Necessidades passam a variar por hora, não por período.
- **Fase C3 — sistemas de longo prazo** (projetos, recargas, prazos de atividade) passam a aceitar horas, mantendo períodos e dias como atalhos no pack.

**Formato 24h ou 12h AM/PM:** preferência de exibição salva no aparelho, em **Configurações**. Não entra no save nem nas regras. Padrão sugerido: 24h, mais comum no Brasil.

### Decisões que faltam

1. Forma 1 (só visual, barata) ou forma 2 (minutos reais, cara)?
2. Se a forma 2: as faixas de horário acima estão boas? A Noite deve ser tão longa?
3. Dormir avança até um horário fixo (06:00) ou por horas escolhidas pelo jogador?
4. **Recomendação:** forma 2 em fases. A Fase C1 sozinha já entrega o relógio sem mudar nenhum equilíbrio do jogo; a C2 é a que muda a sensação de tempo e pode ser ajustada por playtest.

---

## Resumo das perguntas para o autor

1. **A:** janela automática para sinais urgentes? Tour agora ou depois?
2. **B:** modelo híbrido? Virada de capítulo na noite? Cutucada após quantos dias?
3. **C:** relógio só visual ou minutos reais? Faixas de horário? Como funciona dormir?
