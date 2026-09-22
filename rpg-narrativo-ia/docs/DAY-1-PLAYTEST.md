# Dia 1 — Playtest da Fatia G

## Estado

**Executado em 22 de setembro de 2026. Fatia G concluída.**

Este playtest valida o Dia 1 como fluxo integrado de jogo, usando os mesmos caminhos públicos do aplicativo para escolhas, ações de sandbox, gatilhos narrativos, persistência e transição de tela.

Ele complementa os testes unitários das Fatias A–F.

---

# 1. Rotas obrigatórias validadas

## 1.1 Rota com contato

```text
nova partida
→ despertar / Sistema / aptidão
→ Etéris
→ Númen
→ treino real
→ primeira leitura da clareira
→ sinais humanos
→ nascente
→ retorno à clareira
→ Mira
→ conversa
→ primeira noite compartilhada
→ descanso real
→ Dia 2
```

O teste integrado prova que:

- a primeira prática usa `focused-perception-drill` e proficiência real;
- sinais humanos surgem antes de Mira;
- a Nascente pode ser alcançada sem gastar um período inteiro de viagem;
- encontrar a fonte conclui a etapa de água;
- Mira só é revelada na segunda exploração da clareira;
- falar com Mira no entardecer leva o relógio naturalmente à noite;
- a conversa ativa não é interrompida pelo gatilho noturno;
- ao retornar ao sandbox, `first-night` é resolvido;
- a rota compartilhada não encerra a partida;
- `needs.rest` continua sendo o mecanismo real de descanso e passagem de tempo;
- `day-two-start` abre o amanhecer somente depois que o relógio cruza para o Dia 2;
- save/serialize/reload preserva o estado final.

## 1.2 Rota sem contato

```text
nova partida
→ treino
→ exploração
→ sinais humanos
→ Mira é percebida
→ evitar contato
→ noite sozinho
→ descanso real
→ Dia 2
```

O teste integrado prova que:

- evitar Mira não abre narrativa;
- a presença é resolvida pela decisão de afastamento;
- a jornada principal pode permanecer incompleta por falta de água sem bloquear o mundo;
- a noite ainda acontece;
- a rota solo permanece `status: playing`;
- o Dia 2 começa normalmente;
- nenhuma relação, party, família ou romance é criado automaticamente.

---

# 2. Problema encontrado pelo playtest

A primeira versão das Fatias E/F era correta isoladamente, mas o fluxo completo tinha um problema de ritmo.

O despertar já avançava o mundo para a manhã. Depois da primeira prática real de Númen, o relógio chegava ao meio-dia.

Com os custos anteriores:

```text
treino
+ várias explorações da clareira
+ viagem à nascente
+ exploração da nascente
+ retorno
```

a noite chegava antes de o jogador conseguir cumprir a rota:

```text
água → sinais → Mira → noite
```

Os testes por fatia não revelavam isso porque isolavam os gatilhos posteriores.

---

# 3. Correção aplicada

A correção não altera a duração global dos períodos nem acelera todas as explorações.

## Clareira do Despertar

O progresso continua em **10% por exploração**.

Somente o conteúdo de onboarding foi antecipado:

- `human-footprints` → 10%;
- `human-cut-branch` → 10%;
- `path-spring-lake` → 10%;
- `mira-nearby` → 20%.

Assim:

```text
1ª exploração
→ leitura inicial
→ pegadas
→ ramo cortado
→ caminho da nascente

2ª exploração
→ Mira pode ser percebida
```

O restante da clareira mantém progressão própria.

## Nascente

A Nascente é tratada como ponto próximo à Clareira:

- viagem até ela: 0 períodos;
- retorno à Clareira: 0 períodos pelo contrato já existente do destino;
- primeira leitura da área: 0 períodos;
- progresso por leitura: 30%.

Isso representa localizar e reconhecer uma fonte próxima, não uma expedição.

Coletar, consumir, fabricar ou executar outras ações continua sujeito aos custos normais de seus sistemas.

---

# 4. Linha temporal da rota principal após o ajuste

```text
Manhã
→ introdução inicial

Meio-dia
→ primeira prática de Númen concluída

Tarde
→ primeira exploração da clareira
→ sinais humanos + caminho da nascente

Tarde
→ deslocamento local à nascente
→ fonte identificada
→ retorno local

Entardecer
→ segunda exploração da clareira
→ Mira percebida

Noite
→ contato com Mira
→ primeira noite adaptativa

Dia 2
→ após descanso real pelo sandbox
```

A noite continua sendo consequência do relógio, não uma cutscene arbitrária.

---

# 5. Cobertura automatizada adicionada

Arquivo:

`src/tests/first-day-playtest.test.ts`

Os testes usam:

- `startGame`;
- `applyChoice`;
- `attemptSandboxAction`;
- `resolveWorldNarrativeState`;
- catálogo real do pack;
- objetivos reais;
- world triggers reais;
- serialize/reload real.

Não usam fixtures para revelar Mira nem alteram diretamente o relógio para construir as duas rotas principais.

---

# 6. Resultado

No fechamento da Fatia G:

- **92 arquivos de teste**;
- **928 testes passando**;
- lint passando;
- typecheck passando;
- build PWA passando;
- deployment Vercel do commit final de código respondendo HTTP 200;
- schema permanece **25**.

A revisão do Dia 1 está concluída dentro do recorte aprovado.

---

# 7. Próximo trabalho narrativo

O próximo passo deixa de ser correção do prólogo.

A próxima especificação deve começar pelo **Dia 2**, usando o estado herdado da primeira noite como entrada real:

- companhia ou solidão;
- Mira conhecida, evitada ou ainda não encontrada;
- água e recursos;
- necessidades;
- exploração já feita;
- decisões sociais do Dia 1.

Ranking do Dia 7, assentamento formal, empregos, política e romance continuam fora do recorte imediato.
