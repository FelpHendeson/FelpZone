# F13.6 — Pixel art 2D integrada

O autor escolheu pixel art 2D e autorizou o agente a criar e integrar a arte em 26/11/2026. Commit na main, push e deploy já autorizados.

## Contrato

- Primeira leva utilizável: ilustrações das oito raças; cenários de Pedravau/Bosque/Mina/Lago e Limiar; sprites pessoais modulares e retratos em grade de pixels.
- Arte nova em PNG gerada com imagegen e copiada para o projeto; preservar originais e transparência. Atlases exibidos por recorte CSS, sem editar os pixels gerados.
- Evoluir o renderer SVG editável já existente para pixel art real em grade inteira, com módulos de raça/cabelo/roupa/core. Não substituir as escolhas do save pela aparência fixa das ilustrações de raça.
- Cena do personagem na ficha e no local atual, refletindo estado confirmado: repouso, atividade, viagem e Limiar. Animação de dois quadros discreta, desligada em prefers-reduced-motion. Não inventar equipamento ou resultados de combate.
- Manter miniatura/API existentes e acrescentar renderer de corpo inteiro; mesmas sementes e saves, sem mudanças de regras, versão, economia ou tutorial.
- Assets locais, cache PWA para uso offline após carregar. Placeholders restantes de monstros/pets ficam explícitos no relatório, sem sugerir que toda arte do universo está finalizada.
- Verificar oito raças, paletas, estados, atlas/alpha, mobile/desktop, movimento reduzido e offline; testes, lint, tipos, build, revisão visual e release autorizado.

## Direção visual

Fantasia medieval de pixels nítidos, contornos ameixa, pedra gasta, musgo e luz âmbar. Base da interface preservada: #14121a, #1f1c28, #34303f, #ece8f4, #a59fb3, #d9a441. Georgia para títulos e corpo do sistema.

Silhuetas distintas para humano/anão/elfo/orc/lobisomem/sangue-pálido/draconato/silfo. Ilustrações de raça mais detalhadas nas cartas; personagem pessoal de baixa resolução no cenário, com cabelo/roupa escolhidos pelo jogador. Revisão: evitar usar a ilustração canônica como aparência pessoal, e evitar ampliar retratos antigos com formas suaves. Grade de pixels, escala nítida e enquadramento aberto para o personagem.

Prompts exatos e mapa dos assets serão registrados em `idle-personagem-unico/docs/ARTE-F13-6.md`.
