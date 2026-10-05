# Motor e pack de mundo

O código do motor (Aincrad) conhece **leis e vocabulário**. O primeiro dia — mapa, habilidades, Jardim, desbloqueios, Mira, combate, jornadas e eventos — entra como **pack de conteúdo**. O save continua só com IDs e progresso (schema 23). Catálogo não é persistido.

Esta fatia não numerada como sistema: é o contrato de conteúdo sobre o motor já consolidado.

## Motor versus pack

Permanece no código:

- relógio, custo único, transação atômica, persistência e schema do save;
- uniões fechadas de critério, efeito, visibilidade e interação (`skill.known`, `level.minimum`, `combat.victory`, `npc.rememberFact`, etc.);
- funções `inspectXCatalog(unknown)` / `indexXCatalog` — o catálogo é entrada hostil;
- UI estrutural (Mundo, Jornadas, Mochila, Sistema). Textos de item, descoberta e fato vêm do pack.

Vira pack `first-day` em `content/first-day/`:

- mundo: mapa, exploração, recursos, crafting, presenças, interações, pontos de interesse, relacionamentos, organizações, party, calendário, família, cidadania, economia, assentamentos, política, NPCs/agenda;
- sistema: energéticos, habilidades, treino, maestria, Jardim, itens, condições, combate, execução, Registro;
- campanha: eventos, capacidades iniciais, NPCs narrativos, gatilhos de mundo, jornadas;
- rótulos de estação usados só na apresentação.

Pack inválido falha na borda, como save corrupto. JSON nunca executa código.

Arte estática é opcional nos catálogos e eventos. Quando declarada, aponta para arquivos locais validados em `public/images/`; sem arquivo a interface preserva o placeholder. Veja [Imagens opcionais dos packs](VISUAL-ASSETS.md).

## ContentSource e compose

```ts
interface ContentSource {
  readonly id: string;
  loadRaw(): unknown | Promise<unknown>;
}
```

- `MemorySource` — testes e fixtures.
- `JsonPackSource` — pack empacotado no bundle (Vite) a partir de `content/first-day/`.
- `RemoteSource` — `fetch` do mesmo JSON. Um banco ou CMS futuro só precisa devolver este formato.

`composeWorld(raw)` chama os `inspect*` existentes, resolve referências cruzadas (skill ↔ treino ↔ jardim ↔ combate ↔ mapa) e devolve `IndexedWorld`. `createSandboxContext` / `startGame` / a UI consomem esse mundo já validado.

## Roteiros de cena

Eventos de campanha podem declarar `script` (narração, Sistema, pensamento e fala de NPC, com `conditions` opcionais por linha) no lugar do `body` corrido. Contrato e exemplos em [Melhorias inspiradas em jogos de referência](IMPROVEMENTS-FROM-REFERENCES.md#7-cenas-em-modo-visual-novel--implementada). A condição `ability.has` permite linhas e escolhas exclusivas de cada aptidão.

## Fora de escopo

- CMS, autenticação, backend de produção;
- banco de dados real (só a interface de fonte);
- geração procedural;
- mudar regras de combate ou tempo;
- elevar o schema do save;
- editor visual no jogo.

## Verificação

- o mesmo primeiro dia jogável (Clareira, Mira, predador, Mochila, Jardim);
- JSON adulterado não sobe o mundo;
- save antigo permanece schema 11;
- trocar um nome ou descrição no JSON muda a UI sem alterar o motor.

## Eventos destravados por eventos (gatilhos de capítulo)

**Decisão do autor:** os eventos não são definidos por dia. Um evento destrava outro; o dia do mundo só entra como trava opcional, no formato "isto só acontece depois do dia tal".

O gatilho de capítulo fica em `campaign/world-triggers.json`, com `source.type: "story.chapter"`.

**Campos do gatilho:**

| Campo | Obrigatório | O que faz |
| --- | --- | --- |
| `anyOf` | sim | Grupos de condições. Basta **um** grupo ficar todo satisfeito. |
| `after` | não | Capítulo anterior. O novo capítulo abre no amanhecer seguinte ao anterior: `minDaysAfter` dias depois, padrão 1. |
| `notBeforeDay` | não | Trava opcional: o capítulo nunca abre antes deste dia do mundo. |
| `fallbackDaysAfter` | não | Saída de segurança para rotas que nunca passam pela cena-chave. |

**Condições aceitas**, em `anyOf` e em `conditions`:

| Condição | Formato | Quando vale |
| --- | --- | --- |
| Evento vivido | `{ "type": "event.seen", "eventId": "..." }` | O evento da campanha já está no histórico de escolhas. O pack é recusado se o evento não existir. |
| Flag | `{ "type": "flag.is", "flag": "...", "value": true }` | Uma escolha deixou essa marca. |

**Como a primeira campanha usa isso:**

- Do capítulo 3 em diante, cada capítulo é destravado pelo **amanhecer anterior já vivido**. Exemplo: `day-five-start` exige `event.seen: day-four-awakening`.
- Restam só duas travas de dia, ambas narrativas:
  - o capítulo 2 é a manhã depois da primeira noite (`notBeforeDay: 2`);
  - o Registro fecha o primeiro ciclo de avaliação do Sistema (`notBeforeDay: 7`).
- A primeira noite continua presa ao relógio (`world.time.reached`), porque é literalmente a noite do primeiro dia.

**Textos com o dia real:**

- `{{dia}}` vira o número do dia em que a cena acontece; `{{diaOrdinal}}` vira o ordinal por extenso (por exemplo, "O {{diaOrdinal}} amanhecer" vira "O nono amanhecer").
- Assim, um capítulo atrasado não diz "quinto dia" no nono dia.
- O histórico guarda o título e a escolha já com o dia do momento.
