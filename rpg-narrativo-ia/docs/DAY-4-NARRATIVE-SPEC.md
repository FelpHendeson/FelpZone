# Dia 4 — Especificação narrativa e jogável

## Estado

**Especificação narrativa em rascunho; nenhuma fatia de implementação autorizada.** Este documento converte a [Fundação Narrativa](NARRATIVE-FOUNDATION.md) (seção "Dias 4 e 5 — Trabalho e convivência") em uma direção jogável para o quarto dia, a partir do estado real ao fim do [Dia 3](DAY-3-NARRATIVE-SPEC.md). Nenhum código deve ser escrito a partir deste documento até que exista uma especificação técnica equivalente à de [Dia 3 — implementação](DAY-3-IMPLEMENTATION-SPEC.md), dividida em fatias.

Referências:

- [Fundação narrativa — Reset](NARRATIVE-FOUNDATION.md);
- [Dia 2 — especificação narrativa e jogável](DAY-2-NARRATIVE-SPEC.md);
- [Dia 3 — especificação narrativa e jogável](DAY-3-NARRATIVE-SPEC.md);
- [Dia 3 — implementação](DAY-3-IMPLEMENTATION-SPEC.md);
- [Atividades Contextuais](MECHANIC-CONTEXTUAL-ACTIVITIES.md).

---

# 1. Tese do Dia 4 — a rotina também é história

O Dia 1 respondeu **como começo a viver neste mundo?**. O Dia 2, **o que muda quando encontro outras pessoas?**. O Dia 3 começou a responder **que problemas só conseguimos resolver se levarmos os outros em conta?**, com a primeira atividade compartilhada de fato jogável.

O Dia 4 aprofunda a mesma pergunta em vez de abrir uma nova:

> **O que a convivência repetida constrói, que um único gesto de cooperação não constrói sozinho?**

A Fundação Narrativa chama isso de "trabalho e convivência": expedições, vigias, construção, preparo de comida, cuidado de feridos, treino conjunto e exploração de áreas novas funcionam como **geradores de narrativa**, não como uma lista de tarefas a cumprir. Um turno de vigia pode não gerar nada, gerar conversa, gerar descoberta ou gerar mudança de relação — o resultado não deve ser garantido pela ação em si.

O Dia 4 não introduz uma nova pressão dramática autônoma. Ele repete e varia a pressão já estabelecida no Dia 3 (tempo e esforço são finitos, cooperação é voluntária) em uma segunda situação prática, e observa o que muda quando o jogador já tem uma decisão anterior registrada com Caio (assumiu a vigília sozinho, revezou ou recusou).

---

# 2. O Dia 4 herda o estado, não reinicia o grupo

Como no Dia 3, o conteúdo deve começar sem apagar ou reescrever resultados anteriores.

## 2.1 O que o Dia 4 pode assumir do Dia 3

- `day3.started` é sempre verdadeiro ao entrar no Dia 4; as quatro rotas de amanhecer do Dia 3 (`day-three-cooperation`, `day-three-independent`, `day-three-distance`, `day-three-solo`) já resolveram a postura do jogador em relação a Caio e Davi.
- Quando o jogador participou da vigília (`day3.watch.covered`), o resultado específico (`day3.watch.taken-by-player` ou `day3.watch.shared`) descreve **como** ele contribuiu, não uma reputação permanente — Caio e Davi continuam avaliando novas situações pelo que acontece nelas.
- Quando o jogador recusou a vigília (`day3.watch.declined`) ou nunca chegou a propô-la (rotas de afastamento e ausência de encontro), o Dia 4 não deve punir mecanicamente essa ausência; o mundo apenas continua sem esse episódio específico.
- Nenhuma rota do Dia 3 cria party, assentamento, profissão ou obrigação — o Dia 4 herda exatamente essa ausência.

## 2.2 Jogador próximo do grupo

Se Caio e Davi estiverem conhecidos e presentes, o Dia 4 pode oferecer uma segunda situação prática de convivência — não uma repetição do mesmo tema da vigília. Mira participa apenas se sua presença e relação já estabelecidas permitirem; não é requisito.

## 2.3 Jogador que manteve distância ou ainda não encontrou ninguém

As rotas de afastamento e ausência de encontro do Dia 3 continuam válidas no Dia 4: sinais de atividade humana podem se tornar mais concretos (uma segunda trilha, um cheiro de fumaça mais definido, um objeto deixado para trás), mas a aproximação continua sendo opcional e não deve ser narrada como cooperação que não ocorreu.

## 2.4 Estado pessoal e recursos

Como no Dia 3, nenhuma cena presume água, comida, abrigo construído, fogueira ativa, energia cheia ou presença de Mira. Localização, hora, necessidades, ferimentos, recursos, descobertas e relações persistidos continuam sendo a fonte canônica.

---

# 3. Pressão dramática — repetição com variação, não escalada forçada

O Dia 4 não precisa (e não deve) introduzir uma ameaça nova para justificar conteúdo. A Fundação Narrativa já lista exemplos válidos de trabalho cotidiano:

- uma expedição de coleta a uma área ainda não explorada;
- uma vigia em dupla, generalizando o padrão já estabelecido pela vigília do Dia 3;
- cuidar do ferimento de Davi de forma mais ativa do que a simples verificação do Dia 2;
- um treino conjunto de percepção ou Númen;
- reunir material para algo simples e concreto (não uma estrutura de assentamento formal).

Escolher **uma** dessas situações para a primeira fatia jogável do Dia 4, do mesmo modo que o Dia 3 escolheu a vigília em vez de tentar cobrir várias pressões ao mesmo tempo. As demais permanecem como conteúdo futuro, não como lacuna deste recorte.

Uma solução parcial continua válida: participar parcialmente, negociar as condições ou decidir não participar já é resultado suficiente, sem exigir que a necessidade seja "resolvida" por completo.

---

# 4. Continuidade e variação da atividade compartilhada

O Dia 4 deve demonstrar algo que o Dia 3 não teve chance de provar sozinho: que **atividades contextuais diferentes, com NPCs e locais diferentes, seguem o mesmo contrato de motor** sem exigir nenhuma mudança de engine. A segunda atividade jogável deve:

- usar um local, participante obrigatório e (quando fizer sentido) participante opcional diferentes da vigília, para não duplicar `share-night-watch-with-caio`;
- consentir e resolver presença/disponibilidade dos participantes pelas mesmas regras já implementadas (`npc.known`, `npc.present`, `npc.available`);
- consumir tempo real e não conceder resultado que o estado não confirme;
- permitir aceitar, recusar ou propor outra coisa como saídas igualmente válidas, sem opção moralmente correta;
- registrar o resultado através dos efeitos já suportados (flags, relação, fato de memória em efeito de atividade/interação — nunca em efeito de escolha de evento comum, pela mesma restrição de contrato documentada na Fatia B do Dia 3).

Não é necessário inventar um novo tipo de efeito, uma nova mecânica de agenda coletiva ou um sistema de trabalho formal para esta primeira fatia jogável do Dia 4.

---

# 5. Pessoas continuam com objetivos próprios

Caio, Davi e Mira mantêm as mesmas diretrizes estabelecidas na especificação do Dia 3 (seção 5): eles não são uma equipe pronta, podem discordar, e podem agir sem o jogador quando o conteúdo e o estado permitirem. O Dia 4 não deve introduzir elenco novo obrigatório; a Fundação Narrativa reserva personagens adicionais (Helena, Lívia, Samuel, Nádia, Ícaro, Yasmin, Rafael, Rowan) para quando a continuidade e o conteúdo já disponíveis sustentarem a entrada de cada um — nenhuma decisão sobre isso é tomada por este documento.

---

# 6. Escolhas e consequências

As mesmas regras do Dia 3 (seção 6) continuam valendo: escolhas expressam prioridades sem opção moralmente correta, consequências usam sistemas existentes, e reações dependem do motivo e da conduta observada, nunca de um valor fixo por concordar ou recusar.

---

# 7. Progressão de Númen

Como no Dia 3, Númen pode aparecer como parte da vida prática (treino, observação, troca de percepções), sem abrir uma nova árvore de progressão e sem conceder proficiência ou vantagem sem uma ação que já use os contratos existentes.

---

# 8. Encerramento do Dia 4

O encerramento decorre do relógio real e das ações do sandbox, do mesmo modo que o Dia 3. Ao fim do dia, o jogador deve poder perceber que:

1. a segunda atividade compartilhada teve um resultado concreto e observável, ou que ele optou por não participar;
2. outras pessoas continuam com prioridades próprias, inclusive quando o jogador está ausente;
3. cooperar repetidamente pode consolidar confiança, mas continua sendo negociado a cada situação, não automático;
4. afastar-se continua sendo possível e continua tendo efeitos que o mundo registra.

O Dia 4 não precisa declarar assentamento fundado, nem introduzir uma cutscene obrigatória de fechamento.

---

# 9. Limites deste recorte narrativo

O Dia 4 não estabelece automaticamente, pelos mesmos motivos já registrados na especificação do Dia 3 (seção 9):

- party ou grupo formal;
- assentamento, território reivindicado ou propriedade coletiva;
- leis, eleições, liderança reconhecida ou governo;
- emprego, profissão, cidadania, salário ou moeda comunitária;
- contribuição compulsória ou partilha obrigatória de recursos;
- combate ou ataque como evento inevitável;
- romance ou vínculo familiar;
- elenco novo obrigatório;
- simulação completa de necessidades de NPCs;
- Sistema 30 ou outro sistema numerado;
- uma segunda cópia da vigília noturna do Dia 3 ou de qualquer outra atividade já implementada.

Os Sistemas 21 a 29 continuam disponíveis quando a narrativa e uma especificação futura justificarem seus contratos. A capacidade técnica preexistente não torna uma instituição canônica neste dia.

---

# 10. Critérios narrativos para especificar a implementação

Uma futura especificação técnica do Dia 4 deve demonstrar que:

- as quatro rotas herdadas do Dia 3 (cooperação, contato conhecido sem compromisso, afastamento, ausência de encontro) chegam ao conteúdo apropriado do Dia 4;
- o resultado da vigília do Dia 3 (assumida, revezada, recusada ou nunca oferecida) é lido do estado real, nunca presumido;
- a nova atividade compartilhada usa local e participantes distintos da vigília, sem duplicar seu tema;
- aceitar, recusar ou propor outra coisa são saídas válidas, sem punição mecânica automática pela recusa;
- NPCs podem agir sem o jogador quando o conteúdo e o estado permitem;
- o encerramento depende do relógio real e retorna ao sandbox;
- não há criação automática de party, assentamento, profissão ou obrigação;
- nenhum resultado é concedido sem a ação correspondente;
- a continuidade pode ser salva, recarregada e retomada sem duplicar consequências.

---

# 11. Próximo passo

Este documento é a especificação narrativa; nenhuma fatia de implementação está autorizada a partir dele. O próximo passo é escrever [Dia 4 — implementação](DAY-4-IMPLEMENTATION-SPEC.md) (ainda não existe), escolhendo **uma** situação prática da seção 3 para a primeira atividade jogável do Dia 4, com o mesmo recorte em fatias pequenas usado no Dia 3.
