# Imagens opcionais dos packs

O motor aceita arte estática, mas **nenhuma imagem é obrigatória**. Sem `src`, a interface mantém o placeholder identificado; se um arquivo declarado falhar ao carregar, o mesmo fallback aparece. Esta fatia não inclui arte final nem muda o save.

## Como adicionar

1. Coloque o arquivo em `public/images/<nome-do-pack>/`, por exemplo `public/images/first-day/clearing.webp`.
2. No JSON do pack, use uma referência como:

```json
"image": {
  "kind": "scene",
  "label": "Clareira do Despertar",
  "src": "/images/first-day/clearing.webp"
}
```

Remover `src` mantém o placeholder. Remover o objeto inteiro também é permitido onde a referência é opcional, inclusive em eventos narrativos. Não existe necessidade de preencher todos os locais, personagens ou itens de uma vez.

`src` aceita somente caminho local começando por `/images/` e terminando em `.png`, `.jpg`, `.jpeg`, `.webp` ou `.avif`. URL externa, `data:`, SVG, `..` e parâmetros de URL são rejeitados na validação do pack. Isso preserva a experiência offline e evita que conteúdo carregue recursos de terceiros. O arquivo precisa existir no diretório `public` da aplicação; a validação do JSON verifica o caminho, não a existência do arquivo. Falhas de carregamento são tratadas pela interface.

| Local do conteúdo | Campo | Tipo | Uso |
| --- | --- | --- | --- |
| `campaign/campaign.json` | `coverImage`, `endingImage` | `scene` | Capa inicial e resumo final. |
| `campaign/events.json` | `image`, `portrait` | `scene`, `portrait` | Cena e personagem do encontro. |
| `campaign/campaign.json` | `items[].image`, `abilities[].image`, `npcs[].image`, `titles[].image` | `icon`, `icon`, `portrait`, `icon` | Inventário e painéis narrativos. |
| `world/map.json` | `image` de cada local | `scene` | Cena do local e miniatura de destino conhecido. |
| `world/presences.json` | `entities[].image` | `portrait` ou `icon` | Pessoas e criaturas visíveis. |
| `world/interactables.json` | `interactables[].image` | `scene` | Pontos de interesse. |
| `system/items.json` | `items[].image` | `icon` | Mochila principal. |

As imagens dos catálogos ficam nos dados do pack, não no `GameState`; trocar uma arte não exige migração de save. Descoberta, sigilo, horário e disponibilidade continuam controlando se o conteúdo pode aparecer. A interface nunca usa uma imagem para revelar um local ou presença oculta.

## Recomendações de arquivo

- `scene`: proporção 16:9, preferencialmente WebP/AVIF e peso reduzido para celular.
- `portrait`: proporção 1:1, sujeito centralizado.
- `icon`: proporção 1:1, leitura nítida em aproximadamente 48 px.
- Não incluir texto importante dentro da imagem. `label` é a descrição acessível e deve continuar compreensível sem arte.
- Mantenha nomes de arquivo estáveis; ao trocar conteúdo no mesmo caminho, a PWA poderá exigir atualização para baixar a nova versão.
- Mantenha cada arquivo abaixo de 2 MB para entrar no precache offline padrão da PWA.

Os ícones puramente funcionais da interface ainda são código/CSS. Este contrato serve à arte do mundo e do conteúdo, não substitui rótulos de botões nem regras do jogo.
