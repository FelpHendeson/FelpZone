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
