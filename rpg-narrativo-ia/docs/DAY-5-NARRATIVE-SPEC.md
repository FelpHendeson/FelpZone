# Dia 5 — Especificação narrativa e jogável

## Estado

**Especificação narrativa concluída; Fatias A, B, C e D da implementação estão feitas — Dia 5 fechado neste recorte.** Este documento converte a [Fundação Narrativa](NARRATIVE-FOUNDATION.md) (seção "Dias 5 e 6 — Poder altera relações", com a adição de "o momento de discussão de governo" registrada na seção "Dias 3 e 4 — Comunidade por necessidade") em uma direção jogável para o quinto dia, a partir do estado real ao fim do [Dia 4](DAY-4-NARRATIVE-SPEC.md). A especificação técnica que implementa esta direção está em [Dia 5 — implementação](DAY-5-IMPLEMENTATION-SPEC.md).

Referências:

- [Fundação narrativa — Reset](NARRATIVE-FOUNDATION.md);
- [Dia 3 — especificação narrativa e jogável](DAY-3-NARRATIVE-SPEC.md);
- [Dia 4 — especificação narrativa e jogável](DAY-4-NARRATIVE-SPEC.md);
- [Dia 4 — implementação](DAY-4-IMPLEMENTATION-SPEC.md);
- [Dia 5 — implementação](DAY-5-IMPLEMENTATION-SPEC.md);
- [Atividades Contextuais](MECHANIC-CONTEXTUAL-ACTIVITIES.md).

---

# 1. Tese do Dia 5 — diferença de poder deixa de ser invisível

Os Dias 3 e 4 responderam **que problemas só resolvemos levando os outros em conta?**, através de duas atividades compartilhadas (a vigília e o cuidado com Davi). Nenhuma delas exigiu que o grupo se organizasse formalmente; cooperar bastou.

O Dia 5 muda a pergunta:

> **O que muda quando fica claro que nem todo mundo está crescendo no mesmo ritmo?**

A Fundação Narrativa chama isso de "poder altera relações": diferenças de treino, aplicação de Númen e capacidade de reação começam a ficar observáveis, e isso tem peso social antes mesmo de qualquer disputa por liderança formal existir. A mesma seção da Fundação já lista as perguntas que essa diferença deveria provocar (pessoas fortes devem receber mais recursos? proteger o grupo gera privilégio? trabalho doméstico conta como contribuição?) — este dia não precisa responder todas, só tornar uma delas concreta e jogável.

O Dia 5 não introduz combate contra ameaça externa nem facção formal. Ele introduz a **primeira vez em que o grupo fala em voz alta sobre a diferença de poder que já existe entre seus membros**, e o que fazer a respeito — inclusive a pergunta, ainda informal, de como esse pequeno grupo deveria se organizar daqui para frente.

---

# 2. O Dia 5 herda o estado, não reinicia o grupo

## 2.1 O que o Dia 5 pode assumir do Dia 4

- `day4.started` é sempre verdadeiro ao entrar no Dia 5; as quatro rotas herdadas do Dia 3 continuam válidas (cooperação, contato conhecido sem compromisso, afastamento, ausência de encontro).
- Quando o jogador cuidou do ferimento de Davi (`day4.davi.care.covered`), o **modo** de cuidado (`day4.davi.care.attentive` ou `day4.davi.care.quick`) descreve como ele agiu, não uma reputação permanente.
- Quando o jogador nunca teve acesso à atividade do Dia 4 (rotas sem escolta) ou a adiou (`day4.davi.care.declined`), o Dia 5 não deve punir mecanicamente essa ausência.
- Nenhuma rota anterior cria party, assentamento, profissão, cargo ou obrigação — o Dia 5 herda exatamente essa ausência, e é o primeiro dia em que essa ausência vira assunto explícito de conversa, não em que ela é resolvida por um sistema novo.

## 2.2 Diferença de poder como estado real, não narrado à força

O jogo já possui progressão real de Númen/proficiência (Sistemas 11, 13, 16) e um contrato de combatente (Sistema 12). O Dia 5 não deve inventar uma métrica de "poder" só para a cena: a diferença observável deve vir do estado real de progressão do jogador e dos NPCs (quem treinou mais, quem já aplicou Númen em algo concreto), não de um número decorativo criado apenas para esta narrativa.

Se o estado real ainda não mostra diferença nenhuma (jogador e NPCs pouco desenvolvidos), a cena deve funcionar mesmo assim — a preocupação pode nascer da possibilidade ("e se um de nós ficar muito mais forte que os outros?"), sem exigir que a diferença já exista mecanicamente.

## 2.3 Jogador que manteve distância ou ainda não encontrou ninguém

As rotas de afastamento e ausência de encontro continuam válidas: sem grupo, não há conversa sobre organização de grupo. O sinal de atividade humana pode continuar se tornando mais concreto (Fundação, seção "Dias 2 e 3"), mas a pressão deste dia é sobre convivência já estabelecida — não deve ser forçada sobre quem optou por não se aproximar.

## 2.4 Estado pessoal e recursos

Como nos dias anteriores, nenhuma cena presume água, comida, abrigo, fogueira, energia cheia ou presença de Mira. Localização, hora, necessidades, ferimentos, recursos, descobertas e relações persistidos continuam sendo a fonte canônica.

---

# 3. Pressão dramática — uma conversa, não uma instituição

Escolher **uma** situação concreta para o Dia 5, do mesmo modo que os Dias 3 e 4 escolheram uma atividade cada. A direção proposta:

Uma cena de conversa (não uma atividade contextual de trabalho, mas um evento narrativo disparado por convivência já estabelecida) em que alguém do grupo levanta a pergunta que a Fundação já antecipa: já que ficou claro que as pessoas não estão crescendo do mesmo jeito, como esse pequeno grupo deveria decidir as coisas daqui para frente — junto, por quem mais treinou, por quem chegou primeiro, ou cada um por si?

Essa cena:

- não cria cargo, líder reconhecido, lei ou organização (Sistemas 21/26/29 continuam fora deste recorte);
- registra apenas a **postura declarada** do jogador diante da pergunta (quer decisão coletiva, prefere que quem for mais capaz decida, ou não quer se comprometer com nenhum modelo ainda) como flag/fato de memória, para consumo narrativo futuro;
- deixa claro, através das falas dos NPCs, que eles têm posições próprias e podem discordar entre si — sem que o jogo precise simular uma votação ou sistema de consenso;
- pode ser recusada ou adiada pelo jogador sem penalidade mecânica: dizer "ainda não sei" é uma resposta tão válida quanto qualquer outra.

Uma solução parcial continua válida: a conversa pode terminar sem consenso, e isso é um resultado tão legítimo quanto qualquer acordo.

---

# 4. Continuidade e variação

O Dia 5 não precisa (e não deve) reaproveitar `share-night-watch-with-caio` ou `tend-davi-wound-with-caio`, nem inventar uma terceira atividade contextual de trabalho — o gerador de conteúdo deste dia é uma cena de conversa, não uma atividade com custo de tempo e participantes obrigatórios/opcionais no mesmo molde dos Dias 3 e 4. Isso é uma variação deliberada de formato, para provar que o motor narrativo (eventos + escolhas + efeitos) sustenta um tipo de cena diferente de uma atividade contextual, sem exigir nenhuma mudança de engine.

Requisitos:

- a cena só deve estar disponível quando o jogador já tem convivência estabelecida com pelo menos uma pessoa (herdada das rotas anteriores) — sem contato humano, não há conversa;
- a cena não deve exigir um NPC específico como obrigatório do mesmo jeito que uma atividade contextual exige — qualquer combinação de Caio/Davi/Mira já conhecidos e presentes pode sustentar a cena, com o texto se ajustando a quem está lá;
- o resultado é registrado por um efeito de escolha de evento comum (flag/fato), não por um efeito reservado a atividades — esta cena não é uma atividade contextual, então a restrição de `npc.rememberFact` documentada na Fatia B do Dia 3 (só válido em efeitos de atividade/interação) não impede seu uso aqui desde que a implementação confirme se a cena é modelada como evento de campanha ou como atividade; a especificação técnica deve decidir isso e justificar a escolha antes de qualquer código.

---

# 5. Pessoas continuam com objetivos próprios

Caio, Davi e Mira mantêm as mesmas diretrizes das especificações anteriores: não são uma equipe pronta, podem discordar entre si e podem ter posições próprias sobre a pergunta de organização do grupo, inclusive posições que o jogador não esperava. O Dia 5 não introduz elenco novo obrigatório.

---

# 6. Escolhas e consequências

As mesmas regras dos dias anteriores continuam valendo: escolhas expressam prioridades sem opção moralmente correta, consequências usam sistemas existentes, e reações dependem do que foi dito e feito, nunca de um valor fixo por concordar ou discordar. Especificamente:

- não existe resposta "certa" entre decisão coletiva, deixar quem for mais capaz decidir, ou não se comprometer;
- a postura declarada aqui é semente para conteúdo futuro (Dia 6, Registro do Dia 7, ou o arco "Os Primeiros Senhores"), não uma trava imediata sobre o que o jogador pode fazer depois.

---

# 7. Progressão de Númen

Como nos dias anteriores, Númen pode aparecer como parte da cena (por exemplo, alguém citando o próprio treino ou uma aplicação recente como argumento na conversa), sem abrir uma nova árvore de progressão e sem conceder proficiência ou vantagem sem uma ação que já use os contratos existentes.

---

# 8. Encerramento do Dia 5

O encerramento decorre do relógio real e das ações do sandbox, do mesmo modo que os dias anteriores. Ao fim do dia, o jogador deve poder perceber que:

1. a diferença de capacidade entre as pessoas do grupo (real ou ainda só temida) virou assunto declarado, não apenas um fato de fundo;
2. sua própria postura sobre como o grupo deveria se organizar ficou registrada, sem que isso tenha criado uma instituição;
3. outras pessoas têm posições próprias sobre a mesma pergunta, e podem não concordar com o jogador nem entre si;
4. nada foi decidido de forma definitiva — a pergunta pode voltar em dias futuros com mais peso.

O Dia 5 não precisa declarar assentamento fundado, cargo, liderança reconhecida ou facção.

---

# 9. Limites deste recorte narrativo

O Dia 5 não estabelece automaticamente:

- party ou grupo formal;
- assentamento, território reivindicado ou propriedade coletiva;
- leis, eleições, liderança reconhecida ou governo;
- emprego, profissão, cidadania, salário ou moeda comunitária;
- contribuição compulsória ou partilha obrigatória de recursos;
- ranking, Registro regional ou qualquer número de poder exposto ao jogador (isso é reservado ao Dia 7, por decisão já registrada na Fundação);
- combate ou ataque como evento inevitável;
- romance ou vínculo familiar;
- elenco novo obrigatório;
- Sistema 30 ou outro sistema numerado;
- uma nova atividade contextual de trabalho no molde dos Dias 3/4.

Os Sistemas 20, 21, 26, 27, 28 e 29 continuam disponíveis quando a narrativa e uma especificação futura justificarem seus contratos. A capacidade técnica preexistente não torna uma instituição canônica neste dia.

---

# 10. Critérios narrativos para especificar a implementação

Uma futura especificação técnica do Dia 5 deve demonstrar que:

- as quatro rotas herdadas continuam válidas e a cena só aparece com convivência humana já estabelecida;
- a cena se ajusta a qual combinação de NPCs conhecidos/presentes o jogador tem, sem exigir um elenco fixo;
- aceitar um modelo, preferir que outro decida, ou não se comprometer são saídas igualmente válidas, sem punição mecânica automática;
- a modelagem técnica (evento de campanha vs. atividade contextual) é decidida e justificada antes do código, respeitando a restrição de `npc.rememberFact` já documentada;
- nenhuma instituição (party, assentamento, cargo, lei) nasce automaticamente desta cena;
- o encerramento depende do relógio real e retorna ao sandbox;
- a continuidade pode ser salva, recarregada e retomada sem duplicar consequências.

---

# 11. Próximo passo

Este documento é a especificação narrativa; sua implementação está em [Dia 5 — implementação](DAY-5-IMPLEMENTATION-SPEC.md), que modelou a cena como evento de campanha puro (sem atividade contextual) e fechou as Fatias A a D no mesmo molde usado nos Dias 3 e 4. O próximo passo é uma decisão de conteúdo sobre o Dia 6.
