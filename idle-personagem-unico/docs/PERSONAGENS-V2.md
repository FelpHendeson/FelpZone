# Personagens pessoais V2 — correção artística

O autor rejeitou os bonecos geométricos e autorizou refazer com liberdade de ferramentas. Os cenários e as ilustrações de raça aprovados foram preservados.

## Fonte única de arte

Base editada com imagegen embutido a partir de `racas-v1.png`, preservando personagens, silhuetas, rostos e acabamento. Arquivos em `apps/web/public/arte/personagens-material-v2.png` e `.webp`; PNG original preservado, WebP lossless conferido pixel a pixel.

Magenta identifica cabelo/barba; ciano identifica tecido. A interface aplica as cores do save aos materiais, mantendo luz/sombra, alpha e detalhes. Pele, couro, metal, dentes/chifres e asas ficam fora da troca. Silfo usa também limites de região para proteger asas/rosto. Os corpos são renderizados em 256×256; retratos 128×128 são recortes da mesma imagem já personalizada, com fundo/indicador do core.

`personagens-v2/{raça}.png` e `{raça}-retrato.png` são exportações com cabelo preto e roupa linho. Reproduzir com `node --experimental-transform-types --import ./packages/motor/scripts/resolver-ts.mjs ./scripts/exportar-sprites.mjs` na raiz do projeto. A aplicação usa a paleta pessoal, não esses exemplos fixos.

O renderer geométrico, seus exports de API e os arquivos `sprites-v1` foram retirados. A renderização visual fica na web; o motor mantém apenas o contrato de aparência persistida. As verificações antigas de SVG foram substituídas por testes da nova paleta/transparência/arte, sem remover verificações de regras ou persistência.

## Carregamento e apresentação

Uma carga compartilhada da base, deduplicação de variantes em andamento e cache LRU de 16 aparências. Respostas tardias são ignoradas ao trocar personagem/paleta ou desmontar a tela. Falha do asset mantém o jogo acessível e tenta novamente ao reconectar, sem ressuscitar o desenho rejeitado.

Arte pública cacheada pelo PWA `idle-pu-personagens-v2`, mantendo API fora do cache. Atualizações futuras devem versionar o asset e o cache. Movimento é uma respiração discreta da imagem, desligada para movimento reduzido e conta em leitura; não é uma spritesheet de caminhada ou de ataques.

## Prompt exato — imagegen embutido

EDIT TARGET: the attached approved fantasy pixel-art race atlas. Preserve its high-quality character designs, faces, poses, outlines, anatomy, proportions, shading detail, boots, belts and the EXACT 4-column by 2-row arrangement, each character fully inside its own equal square cell on genuinely transparent background. Preserve full bodies and generous transparent margins, no labels or text. This is a GAME MATERIAL-COLOR BASE: change ONLY the hair and fabric colors so the engine can recolor them. ALL head hair, brows and dwarf beard should use a MAGENTA material ramp, hue strictly around 300 degrees: highlights pink-magenta, midtone #bf30bf, dark shades #501050. Keep dark aubergine outlines unchanged. Wolf head hair/ear tufts may use this hair ramp, but keep face/fur skin taupe. All principal garments (human tunic, dwarf apron, elf tunic, orc tunic, wolf traveler clothing, vampire cloak/main garment, dragonkin tunic, sylph tunic) should use a CYAN/TEAL fabric ramp with hue strictly 180-195 degrees: midtone #20b8c8, darker shades #084650, highlights light cyan. Preserve fabric folds, stitches, trim geometry and lighting. Keep leather belts and boots BROWN, buckles GOLD, teeth and horns IVORY, eyes natural amber/brown (not magenta or cyan). Keep each race's original skin tones: human tan, dwarf warm tan, elf peach, orc green, werewolf taupe, paleblood pale lavender, dragonkin brick red, sylph very pale low-saturation icy blue. Do NOT recolor skin, faces, eyes, teeth, horns, leather or metal into either material color. Transparent background must remain genuine alpha, no glow halos, shadows on ground, UI, grid lines or background. Maintain crisp detailed pixel-art clusters and the same premium game-ready aesthetic. The magenta/cyan colors are intentional temporary material identifiers, not final costume colors. Do not simplify these characters into blocky stick people. Match the reference's polished expressive faces and well-drawn silhouettes exactly.

## Verificação

361 testes do motor, 72 web e 3 Redis real passaram (436). Lint, tipos e build aprovados. As verificações da nova pipeline cobrem 144 combinações, sombras em paletas claras/escuras, alpha e buffer original intactos, proteção de rosto/asas, rejeição de entradas inválidas e detalhe/transparência dos 16 PNGs exportados. Regras e persistência continuam verificadas.

Chromium/Playwright percorreu as oito raças e conferiu corpos/retratos raster no jogo, quatro larguras (320/390/768/1440), troca rápida de paleta com carga atrasada, ausência de fallback geométrico, falha de asset sem interromper a navegação, recuperação ao reconectar e arte visitada após reload offline. Animação desliga com movimento reduzido. Revisão visual do cenário e cabeçalho e dos exports de cada raça; cenários aprovados não foram modificados.

O release segue por main, push/deploy e conferência pública com jornada local descartável, sem criar ou modificar conta/save no servidor de produção. Recarregar abas antigas após publicar para obter o novo renderer.
