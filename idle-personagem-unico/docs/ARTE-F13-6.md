# F13.6 — Pixel art 2D

**Atualização:** o autor rejeitou o renderer geométrico dos personagens pessoais desta primeira entrega. Ele e os exports `sprites-v1` foram removidos e substituídos pela [arte pessoal raster V2](PERSONAGENS-V2.md). As seções abaixo registram a entrega original; cenários e ilustrações aprovados continuam em uso.

Direção autorizada pelo autor em 26/11/2026. [Contrato](../../prompts/idle-personagem-unico/13-6-pixel-art.md).

## Assets e intenção

Geração pelo imagegen embutido, sem chave de API do projeto. Originais preservados em `.codex/generated_images`; cópias finais em `apps/web/public/arte`.

- `racas-v1.png`: atlas transparente 4×2, leitura por linhas: humano, anão, elfo, orc, lobisomem, sangue-pálido, draconato, silfo. Ilustração representativa da raça; a aparência pessoal continua derivada do save.
- `locais-v1.png`: atlas 2×2 de Pedravau, Bosque Raso, Mina Velha, Lago Espelho.
- `limiar-v1.png`: cenário independente do reino da morte.
- Renderer SVG editável existente evoluído para retratos e sprites modulares em grade inteira, mantendo cores escolhidas e traços da raça; dois quadros de animação, sem dependências remotas ou estado novo no save.

Todos os PNGs gerados medem 1774×887; o atlas de raças tem alpha real (0–255). Versões `.webp` lossless reduzem o pacote servido de 5.724.399 para 4.489.474 bytes, com dimensões, alpha e pixels visíveis idênticos, conferidos pelo exportador. Originais PNG não foram alterados.

`apps/web/public/arte/sprites-v1/` contém, para cada uma das oito raças, `{raca}.svg`, `{raca}.png` (folha 96×64, dois quadros de 48×64) e `{raca}-retrato.png` (64×64). São exportações do renderer modular nativo com paleta de exemplo; o jogo renderiza a paleta pessoal do save em SVG, com escala nítida. As ilustrações de raça têm mais detalhe e não substituem a aparência escolhida.

Reproduzir com `node --experimental-transform-types --import ./packages/motor/scripts/resolver-ts.mjs ./scripts/exportar-sprites.mjs` na raiz do projeto (Node 22.12+; sharp já acompanha o Next instalado). O script rasteriza o SVG nativo e empacota PNG→WebP sem mudar pixels visíveis; não redesenha os assets gerados. Seis ícones editáveis de navegação em SVG de grade 16×16 completam o pacote.

As imagens geradas não foram recortadas/editadas: enquadramento dos atlases por CSS. O cenário é uma representação visual do local; a simulação continua no motor, sem controle de movimento manual ou combate em tempo real.

## Prompts exatos (imagegen embutido)

### Atlas de raças

Create a production game asset: ONE transparent pixel-art sprite atlas for an original medieval idle RPG, 8 full-body fantasy race representatives arranged in an EXACT 4-column by 2-row equal-cell grid. Landscape canvas 2:1 (prefer 1024 x 512). Each cell is exactly one quarter canvas width and one half canvas height. Every sprite centered in its own cell with generous transparent margins, feet aligned at the same baseline within each cell. No sprite crosses a cell edge. Entire background genuinely transparent, no floor, no labels, no text, no grid lines, no frames, no UI, no watermark. Pixel art drawn as a low-resolution 256x128 logical canvas scaled 4x with hard nearest-neighbor square pixels, 64x64 logical pixels per cell, character about 30x46 logical pixels. Crisp pixel clusters, dark aubergine outline, restrained 16-bit fantasy palette, readable charming serious adventurers, front-facing slight 3/4 stance, full body, boots and both hands visible, simple medieval tunics and belts, no weapons covering bodies. Consistent proportions and lighting, compact large heads and expressive faces, deliberate silhouettes. In exact reading order: top row cell1 HUMAN with warm tan skin, chestnut hair, linen tunic and brown boots; cell2 DWARF shorter broad stocky silhouette, thick copper beard, leather apron; cell3 ELF tall slender, pale peach skin, prominent long pointed ears, moss-green tunic; cell4 ORC strong broad figure with muted green skin, small white tusks, coarse brown tunic. Bottom row cell1 WEREWOLF anthropomorphic wolf person with taupe fur, wolf ears and short muzzle, simple traveler clothing; cell2 PALEBLOOD vampire-like traveler with pale lavender skin, dark hair, tiny fangs, wine cloak; cell3 DRAGONKIN with brick-red scales, two ivory horns, reptilian face and compact tail, charcoal tunic; cell4 SYLPH small slender pale icy-blue fairy-like traveler with two delicate antennae, teal tunic. No glowing blurry effects, no painterly texture, no gradients, no antialiasing, no photorealism. These are race illustrations for cards; maintain a coherent original art direction, not a reference to any existing franchise.

### Atlas de locais

Production pixel-art environment atlas for an original medieval idle RPG. ONE landscape PNG canvas with exact 2:1 aspect ratio, preferably 1792x896 or 1536x768. EXACT 2 columns x 2 rows, four equal rectangular cells; each cell itself a 2:1 landscape scene. Four independent seamless-edged background illustrations with NO characters, NO creatures, NO text, NO labels, NO borders, NO gutters, NO UI. Crisp 16-bit pixel-art world, coarse square pixel clusters, dark aubergine outlines, muted moss, warm stone, ochre light, clear readable shapes, no anti-aliasing blur, no photo textures. Every cell designed as a side-view game stage: flat walkable ground across bottom quarter, center foreground kept open for a character sprite, horizon and scenery above, atmospheric but no smooth gradient. Top LEFT cell: Pedravau, weathered medieval walled town plaza, warm stone houses, tiny amber lanterns, rustic guildhall and iron gate, peaceful twilight. Top RIGHT cell: Bosque Raso, old mossy pine and oak forest, open woodland path foreground, cool green blue canopy, shafts of golden pixel light, no town. Bottom LEFT cell: Mina Velha, abandoned mine mouth in slate crag, heavy timber supports, mineral crystals and rail cart at side, open rocky ground center, cool violet charcoal palette, safe no active fire. Bottom RIGHT cell: Lago Espelho, tranquil blue lake reflecting dark pines, reeds at edges and short wooden fishing dock to side, open earthen shore foreground center, silver blue twilight. Keep all four scenes equally polished, distinct, with same pixel size, perspective and lighting logic. Exact rigid atlas layout, everything belonging to one scene stays inside its quarter. This asset will be displayed by CSS background-position; no separation lines or labels can be present.

### O Limiar

One finished pixel-art game background, landscape 2:1 aspect ratio, matching a restrained 16-bit medieval fantasy RPG. The Limiar, a quiet realm of the dead: a spectral river and weathered stone ferry landing, a small empty wooden boat tied at the LEFT edge, ruined archways and distant obelisks, lavender mist rendered as discrete pixel bands, tiny teal ghost lights, deep aubergine and slate violet, silver moonlight, a narrow warm amber lantern as the only warm accent. Side-view game stage, not isometric. Bottom quarter is flat stone ground, center foreground open for a full-body player sprite. No characters, no monsters, no skull piles, no gore, no text, no labels, no UI or borders. Original world, melancholy and mysterious rather than horror. Hard square pixel clusters and crisp contours, no smooth gradients, no blur or painterly texture. Clear layered silhouettes. Canvas fully opaque. Intended as the background of an animated character scene; protect open center and readable foreground.

## Verificação

369 testes do motor, 66 web e 3 Redis real passaram (438). Lint, tipos e build aprovados. Testes de arte cobrem determinismo, oito silhuetas, todas as combinações de cabelo/roupa, cores, grade inteira sem curvas/scripts, IDs inválidos, mapeamento de cenários e cache PWA.

Chromium/Playwright com API real e Redis temporário isolado verificou oito raças criadas por sementes reais, cores do save, retratos/atlas, quatro locais e Limiar, repouso/atividade/viagem, chegada sem antecipação de cenário, movimento reduzido, arte visitada disponível após reload offline e conta em leitura sem animação. Navegação e enquadramento em 320/390/768/1440 px sem overflow horizontal. Seis ícones de navegação preservam rótulos e alvos de toque.

A revisão visual refinou roupa/contorno/encaixe da cabeça no sprite pessoal. Exportações PNG foram regeneradas pela mesma fonte modular. O empacotador confirmou dimensões/alpha e igualdade dos pixels visíveis de cada PNG gerado e seu WebP. Nenhuma conta/save de QA foi criado em produção.

Os três assets servidos totalizam cerca de 4,49 MB; atlas de raças usa carregamento lazy, cenários são solicitados ao abrir a cena e a instalação do PWA não baixa a galeria inteira. A F13.7 ainda avalia desempenho e playtest amplos; não é uma declaração de auditoria completa de acessibilidade nesta etapa.

## Continuidade

Este é o pacote inicial integrado. Monstros, pets, equipamentos visíveis e animações completas de combate precisam de pacotes próprios; os dados atuais não são representados por arte inventada.
