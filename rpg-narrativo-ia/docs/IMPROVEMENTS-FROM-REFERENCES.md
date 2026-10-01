# Melhorias inspiradas em jogos de referência

## Estado da decisão

Este documento junta o que a comparação com jogos parecidos (A Dark Room, Roadwarden, Citizen Sleeper, Fallen London, Disco Elysium, Wildermyth, RimWorld) sugeriu para o projeto e separa o que **já foi implementado** do que **precisa de spec aprovada** antes do código, conforme `AGENTS.md`.

| # | Melhoria | Inspiração | Estado |
| --- | --- | --- | --- |
| 1 | Revelação progressiva da Central do Sistema | A Dark Room | **Implementada** |
| 2 | Janela do Sistema para conquistas, com vibração | Status windows de LitRPG | **Implementada** |
| 3 | Incerteza declarada com semente persistida | Citizen Sleeper | **Implementada** (schema 27; conteúdo no próximo arco) |
| 4 | Oportunidades com prazo | Roadwarden | **Implementada** (motor e interface; conteúdo no próximo arco) |
| 5 | Vozes da aptidão nas cenas | Disco Elysium | **Implementada** (condição `ability.has`) |
| 6 | Crônica | Wildermyth | **Implementada** (legado entre partidas fica para depois) |
| 7 | Cenas em modo visual novel | Visual novels / LitRPG | **Implementada** |

---

## 1. Revelação progressiva — implementada

`src/ui/system-window/reveal.ts` decide quais entradas da Central do Sistema aparecem. Progressão, Mapa e Ajuda sempre aparecem; as outras só quando existe **estado persistido** (vínculo, grupo, território, carteira, mandato, membro de família que não seja o jogador, acesso ao Registro) ou **uma ação disponível agora**. Ações listadas mas bloqueadas não abrem a interface sozinhas — era exatamente o que fazia o Domínio exibir sete ações bloqueadas no Dia 1.

O Menu diz quantas interfaces continuam seladas, para o jogador saber que há mais por vir. Agrupar continua não sendo esconder: o que existe aparece com contagem; o que não existe ainda não ocupa espaço.

## 2. Janela do Sistema — implementada

`src/ui/system-window/announcements.ts` tira um retrato do Sistema antes e depois de cada escolha narrativa, ação de sandbox ou combate e anuncia só o que mudou: nível, título (com a arte do pack), habilidade nova, proficiência, patente e interface nova. É uma derivação de apresentação: nenhuma regra nova e nada persistido — a fonte de verdade continua sendo o estado validado.

`SystemWindow` usa o motivo canto-trava, materializa com animação curta (desligada com `prefers-reduced-motion`) e vibra no celular (`src/ui/haptics.ts`) com intensidade proporcional ao anúncio. Onde a vibração não existe, a janela basta.

---

## 3. Incerteza declarada — implementada (schema 27)

**Save.** `GameState.rng = { seed, cursor }`. Partidas novas derivam a semente de `createdAt` + nome; saves do schema 26 migram com semente derivada de `updatedAt` + nome e cursor 0. A semente é inteiro de 32 bits e o cursor só cresce; valores adulterados tornam o save corrompido. Módulo puro: `src/modules/chance` (FNV-1a para a semente, mulberry32 sobre semente + cursor, sorteio por pesos inteiros).

**Pack.** Uma atividade contextual pode declarar `risk` com 2 ou 3 desfechos, ao menos um favorável:

```json
"risk": {
  "outcomes": [
    {
      "id": "clean", "label": "Sucesso", "favorable": true, "weight": 3,
      "modifiers": [{ "requirements": [{ "type": "ability.has", "abilityId": "olhar-atento" }], "delta": 3 }],
      "effects": [{ "type": "flag.set", "flag": "x.clean", "value": true }],
      "feedback": "Nada passa despercebido."
    },
    {
      "id": "setback", "label": "Revés", "favorable": false, "weight": 2,
      "effects": [{ "type": "flag.set", "flag": "x.setback", "value": true }],
      "feedback": "Um galho estala e o momento se perde."
    }
  ]
}
```

- Pesos só mudam por `modifiers` com requisitos já existentes de atividade (agora incluindo `ability.has`) — nenhuma fórmula nova.
- O cartão mostra a faixa antes da escolha: "Chance alta · 75%" (≥ 70%), "incerta" (≥ 40%) ou "arriscada".
- O sorteio acontece em `applyContextualActivityPlan`, uma vez, na mesma transação que cobra o tempo; os efeitos do desfecho somam-se aos efeitos fixos e o feedback sai rotulado ("Revés: ...").
- Mesma semente + mesmo cursor ⇒ mesmo desfecho; recarregar o save não permite sortear de novo.

**Fora do recorte:** dados por período, stress, combate probabilístico. Nenhuma atividade dos Dias 1–7 ganhou `risk`, para não mudar rotas fechadas por playtest; o primeiro uso previsto é o arco "Os Primeiros Senhores".

## 4. Oportunidades com prazo — implementada

Atividades contextuais aceitam `availableUntil` opcional:

```json
"availableUntil": { "day": 9 }
"availableUntil": { "day": 9, "period": "tarde" }
```

- Sem `period`, vale até o fim do dia indicado; com `period`, até o fim daquele período. Validado na borda (dia inteiro positivo, período conhecido).
- O cartão da atividade mostra "Expira em N dias", "Expira amanhã", "Expira hoje" ou "Último período" (os dois últimos com destaque).
- Depois do prazo, a atividade sai da lista e `planContextualActivity` recusa a execução ("O prazo desta oportunidade terminou."). Sem schema novo: o prazo é catálogo; dia e período já estão no save.
- Nenhuma atividade dos Dias 1–7 ganhou prazo, para não alterar rotas já fechadas por playtest. Primeiro uso previsto: o arco "Os Primeiros Senhores".

## 5. Vozes da aptidão — implementada

Havia só o *efeito* `progression.ability` (conceder a aptidão); faltava uma *condição* para lê-la. O motor ganhou `{ "type": "ability.has", "abilityId": "..." }`, validada contra o catálogo de aptidões da campanha e avaliada em `core/events/conditions.ts`. Ela vale em escolhas, eventos, títulos e linhas de roteiro.

No Dia 1, `eteris-introduction` traz uma linha do Sistema exclusiva de cada aptidão (`[Olhar Atento]`, `[Resiliência]`, `[Voz Calma]`) e `first-numen-practice` traz um pensamento exclusivo de cada uma. Próximo passo de conteúdo: ao menos uma linha ou escolha condicionada por aptidão em cada cena-chave dos próximos dias.

## 6. Crônica — implementada

`Menu → Mundo e referência → Crônica` abre quando surge a primeira decisão marcante e mostra dia atual, nível, habilidades, vínculos (com retrato), títulos (com arte) e a linha do tempo das decisões marcantes. Tudo é derivado de `history`, `progression.titleIds`, `bonds` e do status do Sistema — nada é salvo à parte, e a interface não depende de nenhuma flag de história. Ao fim de um arco, ela funciona como o resumo da jornada.

Legado entre partidas (heróis que reaparecem, como em Wildermyth) exigiria armazenamento fora do save e continua fora do recorte.

## 7. Cenas em modo visual novel — implementada

Eventos podem declarar `script`: uma lista de linhas apresentadas uma a uma antes das escolhas.

```json
"script": [
  { "kind": "narration", "text": "Você abre os olhos sobre um chão que nunca existiu." },
  { "kind": "system", "text": "Usuário reconhecido: **{{nomeCompleto}}**." },
  { "kind": "thought", "text": "Um painel flutuando no ar... falando comigo?" },
  { "kind": "speech", "speakerId": "mira-vale", "text": "Fique onde está." },
  { "kind": "system", "text": "[Olhar Atento] ...", "conditions": [{ "type": "ability.has", "abilityId": "olhar-atento" }] }
]
```

- `narration` usa a fonte da história; `thought` é a voz interna do personagem; `speech` mostra retrato e nome do NPC declarado na campanha.
- Linhas `system` consecutivas abrem uma **janela do Sistema** que cresce a cada toque — a interação com o Sistema durante a história acontece ali, não no texto corrido.
- Texto aparece com digitação progressiva (instantâneo com `prefers-reduced-motion`); um toque completa a linha, outro avança. "Pular cena" revela tudo. As escolhas só aparecem quando o roteiro termina.
- `body` pode ficar vazio quando há `script`. A validação exige roteiro não vazio, texto em toda linha, falante existente, variáveis conhecidas e ao menos uma linha sem condição.
- Nova variável `{{desperto}}`: Desperto, Desperta ou Desperto(a), conforme o sexo do personagem.
- O índice da linha atual não é salvo: recarregar reinicia o roteiro do evento atual, sem efeito no estado.

Convertidos no Dia 1: `awakening`, `system-awakens`, `choose-ability`, `eteris-introduction`, `numen-introduction` e `first-numen-practice`. Os demais eventos continuam com `body` e podem migrar aos poucos.

Cânone a confirmar: a abertura agora menciona coelhos com chifres e **ilhas flutuantes** no horizonte (sugestão do autor). O mundo continua sem nome; o Sistema chama o personagem de "Usuário" e de "{{desperto}}".

## Fontes consultadas

- A Dark Room — <https://mechanicsofmagic.com/2026/05/14/critical-play-a-dark-room-2/>
- Roadwarden — <https://www.rpgfan.com/review/roadwarden/>
- Citizen Sleeper — <https://www.rascal.news/tracing-citizen-sleepers-circuitous-vector-from-tabletop-to-hit-video-game/>
- Narrativa baseada em qualidades — <https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/>
- Disco Elysium — <https://www.thefandomentals.com/disco-elysium-redefines-stories-rpgs/>
- Wildermyth — <https://en.wikipedia.org/wiki/Wildermyth>
