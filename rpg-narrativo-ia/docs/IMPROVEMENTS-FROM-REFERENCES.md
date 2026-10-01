# Melhorias inspiradas em jogos de referência

## Estado da decisão

Este documento junta o que a comparação com jogos parecidos (A Dark Room, Roadwarden, Citizen Sleeper, Fallen London, Disco Elysium, Wildermyth, RimWorld) sugeriu para o projeto e separa o que **já foi implementado** do que **precisa de spec aprovada** antes do código, conforme `AGENTS.md`.

| # | Melhoria | Inspiração | Estado |
| --- | --- | --- | --- |
| 1 | Revelação progressiva da Central do Sistema | A Dark Room | **Implementada** |
| 2 | Janela do Sistema para conquistas, com vibração | Status windows de LitRPG | **Implementada** |
| 3 | Incerteza declarada com semente persistida | Citizen Sleeper | Proposta — exige schema 27 |
| 4 | Oportunidades com prazo | Roadwarden | Proposta — conteúdo + leitura de prazo |
| 5 | Vozes da aptidão nas cenas | Disco Elysium | Proposta — só conteúdo, motor já suporta |
| 6 | Crônica de fim de arco | Wildermyth | Proposta — só apresentação |

---

## 1. Revelação progressiva — implementada

`src/ui/system-window/reveal.ts` decide quais entradas da Central do Sistema aparecem. Progressão, Mapa e Ajuda sempre aparecem; as outras só quando existe **estado persistido** (vínculo, grupo, território, carteira, mandato, membro de família que não seja o jogador, acesso ao Registro) ou **uma ação disponível agora**. Ações listadas mas bloqueadas não abrem a interface sozinhas — era exatamente o que fazia o Domínio exibir sete ações bloqueadas no Dia 1.

O Menu diz quantas interfaces continuam seladas, para o jogador saber que há mais por vir. Agrupar continua não sendo esconder: o que existe aparece com contagem; o que não existe ainda não ocupa espaço.

## 2. Janela do Sistema — implementada

`src/ui/system-window/announcements.ts` tira um retrato do Sistema antes e depois de cada escolha narrativa, ação de sandbox ou combate e anuncia só o que mudou: nível, título (com a arte do pack), habilidade nova, proficiência, patente e interface nova. É uma derivação de apresentação: nenhuma regra nova e nada persistido — a fonte de verdade continua sendo o estado validado.

`SystemWindow` usa o motivo canto-trava, materializa com animação curta (desligada com `prefers-reduced-motion`) e vibra no celular (`src/ui/haptics.ts`) com intensidade proporcional ao anúncio. Onde a vibração não existe, a janela basta.

---

## 3. Incerteza declarada — proposta

**Problema.** O motor é totalmente determinístico: toda ação mostra o resultado antes de acontecer. Isso é ótimo para testes, mas tira tensão — não existe "arriscar".

**Proposta (no espírito de Citizen Sleeper):**

- O save ganha `rng: { seed: number; cursor: number }` (schema 27; saves 26 migram com uma semente fixa derivada de dados já persistidos e cursor 0 — a origem exata fica para a spec).
- O pack pode declarar, numa atividade contextual ou interação, um bloco opcional `risk` com 2 a 3 desfechos (`success`, `partial`, `setback`) e pesos inteiros. Sem `risk`, nada muda.
- O peso pode ser modificado **só** por condições já existentes (`progression.ability`, `attribute.min`, `bond.dimension.min`), nunca por fórmula nova.
- A UI mostra a faixa antes da escolha ("chance alta / incerta / arriscada"), nunca esconde o risco.
- A rolagem acontece no motor, consome uma posição do cursor e o desfecho entra na mesma transação de mundo que custa o tempo. React não rola nada.
- Testes: mesma semente + mesmo cursor ⇒ mesmo desfecho; save/reload não permite "rolar de novo".

**Fora do recorte:** dados visíveis por período, stress, combate probabilístico.

## 4. Oportunidades com prazo — proposta

**Problema.** O relógio existe, mas quase nada expira; gastar um período raramente custa uma oportunidade.

**Proposta (no espírito de Roadwarden):**

- Atividades contextuais ganham `availableUntil: { day: number; period?: WorldPeriod }` opcional, lido pelo mesmo filtro que já trata `world.day.min`.
- A UI mostra "expira em N dias" nas atividades com prazo e o Diário registra a oportunidade perdida como fato (não como falha).
- Primeiro uso sugerido: no arco "Os Primeiros Senhores", uma ajuda a Davi ou Caio que só existe até um dia declarado.
- Sem schema novo: o prazo é catálogo; o estado já guarda dia e período.

## 5. Vozes da aptidão — proposta (só conteúdo)

O motor já tem a condição `progression.ability`. Escolhas de evento podem ser exclusivas de quem tem Olhar Atento, Voz Calma ou Resiliência, com um `hint` em voz do Sistema ("[Olhar Atento] A trilha à esquerda foi pisada há pouco."). Isso dá personalidade à aptidão inicial sem regra nova. Sugestão: uma escolha condicionada por aptidão em cada cena-chave dos próximos dias.

## 6. Crônica de fim de arco — proposta (só apresentação)

Ao fim de cada arco, uma tela "Crônica" reúne título obtido, rota tomada nos dias, vínculos formados e decisões marcantes — tudo derivado de `history`, `progression.titleIds` e `bonds`. Um legado entre partidas (heróis que reaparecem, como em Wildermyth) exigiria armazenamento fora do save e fica para depois.

---

## Fontes consultadas

- A Dark Room — <https://mechanicsofmagic.com/2026/05/14/critical-play-a-dark-room-2/>
- Roadwarden — <https://www.rpgfan.com/review/roadwarden/>
- Citizen Sleeper — <https://www.rascal.news/tracing-citizen-sleepers-circuitous-vector-from-tabletop-to-hit-video-game/>
- Narrativa baseada em qualidades — <https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/>
- Disco Elysium — <https://www.thefandomentals.com/disco-elysium-redefines-stories-rpgs/>
- Wildermyth — <https://en.wikipedia.org/wiki/Wildermyth>
