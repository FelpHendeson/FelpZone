# Dia 7 — Especificação narrativa e jogável

## Estado

**Especificação narrativa concluída; Fatias A, B e C da implementação estão feitas — Dia 7 fechado neste recorte, fechando o primeiro arco (Os Sete Dias).** Este documento converte a [Fundação Narrativa](NARRATIVE-FOUNDATION.md) (seção "Dia 7 — O Registro regional") em uma direção jogável para o sétimo dia, a partir do estado real ao fim do [Dia 6](DAY-6-NARRATIVE-SPEC.md). A especificação técnica que implementa esta direção está em [Dia 7 — implementação](DAY-7-IMPLEMENTATION-SPEC.md).

Referências:

- [Fundação narrativa — Reset](NARRATIVE-FOUNDATION.md);
- [Dia 6 — especificação narrativa e jogável](DAY-6-NARRATIVE-SPEC.md);
- [Dia 6 — implementação](DAY-6-IMPLEMENTATION-SPEC.md);
- [Dia 7 — implementação](DAY-7-IMPLEMENTATION-SPEC.md);
- [Sistema 20 — Registro, patentes e rankings](SYSTEM-20-SYSTEM-REGISTRY-RANKINGS.md).

---

# 1. Tese do Dia 7 — o fim do prólogo

Os Dias 1 a 6 responderam perguntas sobre convivência imediata: como começar, quem encontrar, o que a convivência repetida constrói, e o que a diferença de capacidade custa quando tem um nome. Todas essas perguntas trataram o mundo como se ele fosse do tamanho do que o jogador já viu.

O Dia 7 muda a escala:

> **E se a diferença de poder que você já percebeu no seu pequeno grupo for só a ponta de algo muito maior?**

A Fundação Narrativa é explícita: no sétimo dia, o Sistema conclui um primeiro ciclo de avaliação e habilita o Registro regional. Pela primeira vez, fica claro que a região contém uma população humana muito maior do que qualquer coisa que o jogador tenha visto pessoalmente — e que ao menos uma pessoa nessa região cresceu em poder de um jeito que não deveria ser possível em apenas sete dias.

Isso fecha o prólogo dos Sete Dias. Não é o início da escala política do jogo (isso é o arco "Os Primeiros Senhores", ainda provisório) — é o momento que planta a pergunta que o arco seguinte deveria responder.

---

# 2. O Dia 7 herda o estado, não reinicia o grupo

## 2.1 O que o Dia 7 pode assumir do Dia 6

- `day6.started` é sempre verdadeiro ao entrar no Dia 7.
- Nenhuma decisão anterior (postura do Dia 5, saída do caso concreto de Davi no Dia 6, rota de convivência dos Dias 2–4) é apagada ou reescrita por este dia.

## 2.2 O Registro regional é do Sistema, não do grupo

Diferente das cenas dos Dias 5 e 6 (que só existiam para quem tinha convivência real estabelecida), a revelação do Registro regional não depende de o jogador ter encontrado ninguém. O Sistema é uma instituição que acompanha todo humano com acesso a ele (Sistema 20), então a revelação do sétimo dia chega **para todo mundo**, inclusive para quem seguiu as rotas de afastamento ou nunca encontrou ninguém. O conteúdo social das rotas continua distinto (quem tem grupo pode comentar a revelação com alguém; quem está sozinho processa a notícia sozinho), mas a revelação em si não é opcional nem condicionada a contato humano.

## 2.3 Estado pessoal e recursos

Como nos dias anteriores, nenhuma cena presume água, comida, abrigo, fogueira, energia cheia ou presença de Mira. Localização, hora, necessidades, ferimentos, recursos, descobertas e relações persistidos continuam sendo a fonte canônica.

---

# 3. A revelação

A cena central é a mensagem conceitual que a Fundação já registra:

> **Primeiro ciclo de avaliação concluído.**

Seguida da revelação de que a região contém uma população muito maior do que a visível ao redor do jogador, e de que ao menos um indivíduo está muito acima da curva esperada de crescimento em sete dias — identidade reservada, propositalmente. Isso não é uma ameaça imediata; é uma mudança de percepção de risco.

A revelação não precisa (e não deve) expor números exatos, fórmulas de poder ou identidade de quem está no topo — a Fundação já trata esses detalhes como provisórios para playtest, e a força da cena está em levantar a pergunta, não em respondê-la.

Nenhuma consequência mecânica imediata é obrigatória: o Dia 7 planta a pergunta, não resolve nada sobre facção, território ou aliança.

---

# 4. Continuidade e variação

Como no Dia 1 (Sistema, Etéris, Númen), o Registro é apresentado através de uma interface diegética já existente — o Sistema 20 já está implementado e consolidado, com política de acesso universal, rankings e patentes locais funcionando desde o Dia 1 (`local-exploration`, `local-combat`, patente `clearing-scout`). O Dia 7 não precisa inventar um mecanismo de ranking novo: a novidade é a **escala** revelada (regional, não só a Clareira) e o **peso narrativo** da revelação, não uma mecânica nova de Registro.

A especificação técnica deve decidir se essa mudança de escala é só narrativa (um evento de campanha que descreve a revelação, sem novo conteúdo de catálogo) ou se justifica também uma entrada nova no catálogo de Registro do pack — mas qualquer extensão de catálogo deve respeitar exatamente os tipos já validados pelo motor (categorias `exploration`/`combat`, métricas `exploration.progress`/`combat.victory`/`system.level`), sem propor um tipo novo de métrica, categoria ou visibilidade que exija mudança de engine.

---

# 5. Pessoas continuam com objetivos próprios

Caio, Davi e Mira mantêm as mesmas diretrizes das especificações anteriores. Nenhum deles precisa reagir de um jeito específico à revelação — isso é conteúdo futuro, não uma obrigação deste recorte.

---

# 6. Escolhas e consequências

A revelação em si não é uma escolha — é uma informação que o Sistema entrega. O que o jogador faz com ela (buscar mais informação, ignorar, comentar com quem estiver por perto) pode ser uma escolha leve dentro da própria cena, sem opção moralmente correta e sem consequência mecânica automática sobre facção, aliança ou combate.

---

# 7. Progressão de Númen

Sem novidade em relação aos dias anteriores.

---

# 8. Encerramento do Dia 7 e do primeiro arco

O encerramento decorre do relógio real e das ações do sandbox. Ao fim do dia, o jogador deve poder perceber que:

1. o Registro regional foi habilitado e a revelação aconteceu, independentemente de grupo ou rota;
2. a percepção de risco mudou — o mundo é maior e mais desigual em poder do que o que o jogador viu pessoalmente;
3. nenhuma instituição, facção, aliança ou conflito nasceu automaticamente desta revelação;
4. o prólogo dos Sete Dias está fechado; o que vem a seguir é decisão de conteúdo futuro, não deste documento.

---

# 9. Limites deste recorte narrativo

O Dia 7 não estabelece automaticamente:

- party, assentamento, cargo, liderança reconhecida ou facção;
- território, milícia, guilda ou aliança entre assentamentos;
- identidade revelada de quem está no topo do Registro regional;
- números definitivos de população, ranking ou poder;
- combate ou ataque como evento inevitável;
- romance ou vínculo familiar;
- elenco novo obrigatório;
- Sistema 30 ou outro sistema numerado;
- o início mecânico do arco "Os Primeiros Senhores".

O Sistema 20 já está implementado; usá-lo para uma revelação regional é extensão de conteúdo de pack sobre um contrato existente, não um sistema novo.

---

# 10. Critérios narrativos para especificar a implementação

Uma futura especificação técnica do Dia 7 deve demonstrar que:

- a revelação chega a todas as rotas herdadas, sem depender de convivência humana estabelecida;
- nenhum número definitivo, identidade ou fórmula de poder é exposto como se fosse final;
- o Sistema 20 (rankings/patentes) não precisa de nenhum tipo novo de métrica, categoria ou visibilidade;
- nenhuma instituição (party, assentamento, facção, aliança) nasce automaticamente desta cena;
- o encerramento depende do relógio real e retorna ao sandbox;
- a continuidade pode ser salva, recarregada e retomada sem duplicar consequências.

---

# 11. Próximo passo

Este documento é a especificação narrativa; sua implementação está em [Dia 7 — implementação](DAY-7-IMPLEMENTATION-SPEC.md), que optou por uma revelação puramente narrativa (sem entrada nova no catálogo de Registro) e fechou as Fatias A a C no mesmo molde usado nos Dias 3 a 6. Com o Dia 7 fechado, o primeiro arco — Os Sete Dias — está fechado. O próximo passo deixa de ser um dia numerado e passa a ser uma decisão de conteúdo sobre o início do arco "Os Primeiros Senhores" (Fundação Narrativa, seção 14).
