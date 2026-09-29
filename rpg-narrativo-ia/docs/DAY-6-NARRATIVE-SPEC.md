# Dia 6 — Especificação narrativa e jogável

## Estado

**Especificação narrativa concluída; Fatias A, B, C e D da implementação estão feitas — Dia 6 fechado neste recorte.** Este documento converte a [Fundação Narrativa](NARRATIVE-FOUNDATION.md) (seção "Dias 5 e 6 — Poder altera relações") em uma direção jogável para o sexto dia, a partir do estado real ao fim do [Dia 5](DAY-5-NARRATIVE-SPEC.md). A especificação técnica que implementa esta direção está em [Dia 6 — implementação](DAY-6-IMPLEMENTATION-SPEC.md).

Referências:

- [Fundação narrativa — Reset](NARRATIVE-FOUNDATION.md);
- [Dia 4 — especificação narrativa e jogável](DAY-4-NARRATIVE-SPEC.md);
- [Dia 5 — especificação narrativa e jogável](DAY-5-NARRATIVE-SPEC.md);
- [Dia 5 — implementação](DAY-5-IMPLEMENTATION-SPEC.md);
- [Dia 6 — implementação](DAY-6-IMPLEMENTATION-SPEC.md).

---

# 1. Tese do Dia 6 — a postura declarada encontra um caso concreto

O Dia 5 fez o grupo (quando havia grupo) declarar em voz alta uma postura sobre como decidir as coisas, diante da diferença de capacidade que começa a ficar visível. Essa postura ainda não foi testada por nada — foi só uma resposta a uma pergunta hipotética.

O Dia 6 pergunta:

> **Quando a diferença de capacidade tem um preço concreto para uma pessoa específica, a postura declarada ontem se sustenta?**

A Fundação Narrativa já lista a pergunta exata que este dia deveria tornar jogável: **"crianças, feridos ou incapazes têm direito aos mesmos recursos?"** — e o grupo já tem, desde o Dia 2, uma pessoa concreta para quem essa pergunta deixa de ser abstrata: Davi, cujo ferimento (Dia 2) e cujo cuidado (Dia 4, quando disponível) já são estado real, não invenção deste dia.

O Dia 6 não introduz um sistema de distribuição de recursos, nem obriga o jogador a manter a postura que declarou no Dia 5 — a Fundação já registra que reações dependem do motivo e da conduta observada, nunca de um valor fixo. O objetivo é só tornar a pergunta concreta pela primeira vez, sem fingir que ela já foi resolvida no Dia 5.

---

# 2. O Dia 6 herda o estado, não reinicia o grupo

## 2.1 O que o Dia 6 pode assumir do Dia 5

- `day5.started` é sempre verdadeiro ao entrar no Dia 6.
- A postura declarada no Dia 5 (`day5.organization.stance.collective`, `.capable` ou `.undecided`) é lida como contexto, nunca reescrita — o Dia 6 não deve fingir que ela nunca existiu, mas também não deve travar as escolhas do jogador para "obedecer" à postura anterior. Alguém pode ter dito que decisões deveriam ser coletivas no Dia 5 e, mesmo assim, priorizar sua própria visão sobre o caso concreto de Davi no Dia 6 — isso é consistência de personagem, não bug.
- Quando o Dia 5 não teve conversa (rotas de afastamento e ausência de encontro), nenhuma postura foi declarada; o Dia 6 não deve punir essa ausência nem inventar uma postura que não existe.

## 2.2 O que o Dia 6 pode assumir de Davi

- O estado de Davi (ferimento visto/conhecido no Dia 2; cuidado atencioso, rápido, adiado, ou nunca oferecido no Dia 4) é lido do estado real, nunca presumido.
- Quando Davi nunca foi conhecido (rotas de afastamento e ausência de encontro), a cena deste dia não deve ocorrer — não há caso concreto sem a pessoa concreta.

## 2.3 Estado pessoal e recursos

Como nos dias anteriores, nenhuma cena presume água, comida, abrigo, fogueira, energia cheia ou presença de Mira. Localização, hora, necessidades, ferimentos, recursos, descobertas e relações persistidos continuam sendo a fonte canônica.

---

# 3. Pressão dramática — um caso concreto, não uma política

A situação proposta: alguém do grupo (a Fundação já estabelece que Caio tende a ser o mais prático e o mais preocupado com sobrevivência coletiva) levanta que o grupo tem mais para fazer do que consegue cobrir, e pergunta diretamente ao jogador se Davi deveria ser poupado de contribuir enquanto ainda se recupera, ou se deveria participar do jeito que conseguir, como qualquer outra pessoa.

Isso é uma variação deliberada da pergunta do Dia 5 (que era abstrata e sobre o grupo em geral) para um caso nomeado e concreto — sem inventar um sistema de tarefas obrigatórias ou de recursos escassos que o motor ainda não possui.

Saídas propostas, sem opção moralmente correta:

- defender que Davi seja poupado até se recuperar de verdade;
- dizer que Davi deveria contribuir do jeito que conseguir, sem tratamento especial;
- recusar decidir por Davi e devolver a pergunta a ele.

Uma solução parcial continua válida: a terceira opção (devolver a decisão a Davi) é tão legítima quanto qualquer posição direta, e não deve ser lida como indecisão covarde nem como resposta superior.

---

# 4. Continuidade e variação

Diferente do Dia 5 (uma cena única, sempre igual independentemente da postura anterior), o Dia 6 pode variar o tom da cena conforme a postura declarada no Dia 5 — não para forçar consistência mecânica, mas para que o grupo pareça se lembrar do que foi dito. Isso é uma variação de apresentação (texto), não uma trava de escolha: as três saídas da seção 3 continuam disponíveis independentemente da postura anterior.

Como no Dia 5, esta cena é modelada como evento de campanha, não como atividade contextual: não há local fixo, participante obrigatório/opcional nem custo de tempo próprio no molde de uma `ContextualActivityDefinition`. O resultado é registrado só por `flag.set`, sem exigir `npc.rememberFact` nem `relationship.change` amarrado a um NPC específico.

---

# 5. Pessoas continuam com objetivos próprios

Caio, Davi e Mira mantêm as mesmas diretrizes das especificações anteriores. Davi, especificamente, não deve ser tratado como objeto passivo da decisão só porque o ferimento é dele — a terceira saída da seção 3 existe exatamente para reconhecer isso.

---

# 6. Escolhas e consequências

As mesmas regras dos dias anteriores continuam valendo. Nenhuma das três saídas é moralmente superior; reações futuras (quando existirem) devem depender do que foi dito e feito, nunca de um valor fixo.

---

# 7. Progressão de Númen

Sem novidade em relação aos dias anteriores: Númen pode aparecer como parte da cena, sem abrir nova árvore de progressão.

---

# 8. Encerramento do Dia 6

O encerramento decorre do relógio real e das ações do sandbox. Ao fim do dia, o jogador deve poder perceber que:

1. a pergunta abstrata do Dia 5 encontrou um caso concreto e nomeado;
2. sua resposta ficou registrada, sem que isso tenha criado uma política, um sistema de recursos ou uma obrigação mecânica sobre Davi;
3. a postura do Dia 5, quando existiu, pode ter sido mantida ou contradita pela resposta ao caso concreto — ambas são leituras válidas de personagem.

O Dia 6 não precisa declarar assentamento fundado, cargo, liderança reconhecida ou facção.

---

# 9. Limites deste recorte narrativo

O Dia 6 não estabelece automaticamente:

- party ou grupo formal;
- assentamento, território reivindicado ou propriedade coletiva;
- leis, eleições, liderança reconhecida ou governo;
- um sistema de distribuição de recursos ou de tarefas obrigatórias;
- emprego, profissão, cidadania, salário ou moeda comunitária;
- ranking, Registro regional ou qualquer número de poder exposto ao jogador (reservado ao Dia 7);
- combate ou ataque como evento inevitável;
- romance ou vínculo familiar;
- elenco novo obrigatório;
- Sistema 30 ou outro sistema numerado;
- consequência mecânica automática sobre a saúde ou capacidade de Davi.

Os Sistemas 20, 21, 26, 27, 28 e 29 continuam disponíveis quando a narrativa e uma especificação futura justificarem seus contratos.

---

# 10. Critérios narrativos para especificar a implementação

Uma futura especificação técnica do Dia 6 deve demonstrar que:

- a cena só aparece quando Davi já é conhecido (herdado das rotas com contato real do Dia 2);
- a postura declarada no Dia 5 é lida como contexto, sem travar nenhuma das três saídas do Dia 6;
- as três saídas (poupar, tratamento igual, devolver a decisão a Davi) são igualmente válidas, sem punição mecânica automática;
- nenhuma política, sistema de recursos ou obrigação nasce automaticamente desta cena;
- o encerramento depende do relógio real e retorna ao sandbox;
- a continuidade pode ser salva, recarregada e retomada sem duplicar consequências.

---

# 11. Próximo passo

Este documento é a especificação narrativa; sua implementação está em [Dia 6 — implementação](DAY-6-IMPLEMENTATION-SPEC.md), que optou por um único evento genérico (sem variação de tom por postura do Dia 5, registrada como conteúdo futuro) e fechou as Fatias A a D no mesmo molde usado nos Dias 3 a 5. O próximo passo é uma decisão de conteúdo sobre o Dia 7 — o Registro regional, já antecipado pela Fundação Narrativa.
