# Pack first-day

O primeiro dia vive neste pack JSON. O motor (Aincrad) só conhece leis e vocabulário; nomes, mapa, receitas, Mira e eventos entram aqui.

O save continua schema 11: IDs e progresso, nunca o catálogo.

## Como autorar

1. Edite o JSON correspondente em `world/`, `system/`, `campaign/` ou `ui/`.
2. Mantenha identificadores estáveis. Trocar um `id` quebra saves e referências cruzadas.
3. Não coloque funções nem código. Condições, custos e efeitos usam as uniões fechadas do motor (`skill.known`, `npc.rememberFact`, `combat.victory`, etc.).
4. Rode `npm test` em `rpg-narrativo-ia`. Pack inválido falha na borda com `ContentError`.

## Onde mudar o quê

| Quero... | Arquivo |
| --- | --- |
| Adicionar ou renomear uma habilidade | `system/skills.json` |
| Ligar treino ou Jardim a essa habilidade | `system/training.json`, `system/garden.json`, `system/mastery.json` |
| Mudar um local ou passagem | `world/map.json`, `world/exploration.json` |
| Mudar coleta ou receita | `world/resource-nodes.json`, `system/recipes.json`, `system/items.json` |
| Mudar Mira, agenda ou fatos | `world/npcs.json`, `world/presences.json`, `world/presence-interactions.json` |
| Fazer uma conversa gravar um fato | efeito `npc.rememberFact` na interação; o fato precisa existir em `npcs.json` (`locationHint: true` se o resumo for dica de paradeiro) |
| Mudar textos da abertura | `campaign/events.json` e `campaign/campaign.json` |
| Mudar o nome visível de uma descoberta | campo `name` em `world/exploration.json` |
| Mudar rótulo de estação na Mochila | `ui/labels.json` |

`pack.json` lista os arquivos. Uma fonte HTTP futura busca esse manifesto e os mesmos JSON; o motor chama o mesmo `composeWorld`.

O schema opcional está em `schema/content-pack.schema.json`.
