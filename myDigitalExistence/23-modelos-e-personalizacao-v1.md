# Modelos humanoides, personalização e sprites — catálogo inicial

**11/11/2026 · Revisão 1.0 · CANDIDATO_JOGAVEL.** Esta especificação dá ao agente autorização para produzir arte original **provisória** e testar o sistema modular. O diretor criativo pode ajustar depois proporções, estilo, peças e paleta; não declarar visual final sem revisão.

## 1. Direção de arte candidata
Pixel art 2D nítida, personagem de corpo inteiro, fantasia aventureira misturada com cotidiano. Silhuetas legíveis em tamanho de celular; rosto expressivo, mãos visíveis, roupas com contraste e equipamentos reconhecíveis. Evitar aparência de bebê/chibi extremo e detalhes que desaparecem a 100% de escala. Um quarto aconchegante deve contrastar com a atmosfera misteriosa do altar de invocação.

**Amostra técnica, não padrão estético congelado:** quadro transparente 96 × 128 px para cada camada e frame, referência lógica de chão compartilhada, personagens ocupando a área central e espaço para cabelo/armas; 32 Pixels Per Unit e Point filtering como ponto de teste. O agente deve experimentar o resultado no celular e ajustar antes de produzir muitas peças. Não ampliar sprites com interpolação borrada.

**Vista inicial:** frontal com respiração/gestos. Perfis lateral/traseiro são expansão conforme necessidade de navegação; não produzir quatro direções para cada peça antes de validar a vista frontal.

## 2. Bases de corpo (um arquétipo, três variantes)
| ID | Nome de trabalho | Descrição | Compatibilidade |
| --- | --- | --- | --- |
| body_slender | Esbelto | tronco estreito, braços finos, ombros suaves, postura ágil | mesmas âncoras, ajustes discretos de roupa |
| body_balanced | Equilibrado | torso e membros intermediários, fácil leitura das peças | corpo de referência para arte e pivôs |
| body_sturdy | Robusto | ombros e tronco um pouco mais largos, membros encorpados | mesmo rig lógico, máscaras/arte específica se necessário |

Nenhuma variante altera força, classe, raça ou gênero por padrão. **Não escalar o sprite inteiro horizontalmente** para simular corpos, pois o pixel art e os acessórios podem distorcer. Se variantes exigirem máscaras de roupa diferentes, resolver pelo catálogo sem multiplicar o motor.

## 3. Personalizações de nascimento
**Pele — 6 amostras de partida:** marfim, pêssego, bronze, castanho, ébano, cinza azulado fantástico. Paletas independentes de raça e gênero. Contraste dos olhos/expressões preservado.

**Cabelo — 4 cortes:**
- hair_short_neat: curto alinhado com franja discreta.
- hair_wild_layers: médio, mechas soltas e textura aventureira.
- hair_tied_long: comprido preso, mechas laterais.
- hair_curly_volume: encaracolado/afro com volume superior e laterais.

**Cabelo — 6 cores:** preto, castanho, dourado, cobre, prata, violeta profundo.

**Olhos — 3 formatos:** arredondados/expressivos; estreitos/concentrados; semicerrados/calmos. **5 cores:** castanho, verde, azul, âmbar, violeta.

**Marcas opcionais:** sardas, pequena cicatriz, marca geométrica original na face/ombro, sem copiar selos famosos. **Expressões funcionais:** neutra, alegre, faminta, cansada, irritada/desconfortável, concentrada, surpresa. Evitar prometer todas animadas na primeira build.

Atributos, raças e classe não devem ser inferidos pela cor de pele, cabelo, olhos ou corpo. Aparência gerada pode ser editada pelo jogador conforme regras de criação/loja ainda a refinar.

## 4. Overlays raciais sem novos rigs
- **Humano:** sem característica anatômica obrigatória; todas as variações básicas.
- **Elfo:** 1–2 formatos de orelhas alongadas, contorno bem legível; cabelo/capuz não as cortam indevidamente.
- **Dracônico:** chifres curtos (curvados ou retos), escamas nos ombros/maçãs do rosto, cauda opcional em camada traseira com origem anexada.
- **Vesperino:** reflexos sutis nos olhos, marcas geométricas no pescoço/antebraço e sombreamento controlado; sem depender de pós-processamento pesado.

As descrições são primeiros conceitos e podem mudar. Raças que exijam múltiplos braços, asas funcionais ou corpo animal são fora do arquétipo inicial.

## 5. Camadas visuais e compatibilidade
| Slot visual | Papel | Dependências de render |
| --- | --- | --- |
| body | pele/corpo | arquétipo, variante, paleta |
| face | olhos/boca/sobrancelha | expressão e cor |
| ears | orelhas | raça/ocultação de cabelo |
| horns | chifres | raça/headwear |
| hair_back | cabelo traseiro | corte e headwear |
| hair_front | franja | corte, headwear, expressão |
| racial_marks | escamas e marcas | raça/paleta |
| tail_back | cauda traseira | raça e pose |
| torso_base | camisa ou túnica | variante corporal |
| torso_outer | colete/armadura/robe | equipamento |
| legs | calça ou perneira | variante corporal |
| feet | calçado | variante corporal |
| headwear | faixa, capuz, adorno | cobre ou não cobre cabelo |
| cape_back | capa/mochila | âncora e camada traseira |
| held_main | arma/cajado | mão/pose e item |
| accessory | pulseira/anel/talismã | slot e local |
| effect | aura/partícula visual | estado temporário |

Separar slots de render dos slots de equipamento RPG. Uma peça no inventário pode usar múltiplos visuais e um item cosmético pode não conceder atributo. Não alterar stats em scripts de SpriteRenderer.

**Regras de oclusão exemplo:** capuz cobre hair_front total/parcial, chifres podem exigir variante de capuz, cauda precisa ficar atrás da capa em algumas poses, arma muda ordem de render ao ser erguida. Ordenação não deve ser uma única lista fixa para todas as poses.

## 6. Kit visual de início — além dos equipamentos do arquivo 25
- roupa interna: túnica de linho com costura colorida;
- roupa casual de viagem: camisa com mangas dobradas;
- calça leve de tecido em duas paletas;
- sapato de tecido simples;
- manto/capa curta;
- faixa de cabeça que não oculta cabelo;
- capuz liso com variação para chifres;
- espada, cajado e machado de treinamento como visuais de mão.

Esse kit é para permitir combinações reais de sprite; os itens com estatísticas estão em 25-equipamentos-iniciais.md.

## 7. Animações candidatas e prioridade
| Estado | Proposta de frames | Uso |
| --- | --- | --- |
| idle | 4 em loop | respiração discreta |
| blink | 2 | piscar sem trocar corpo inteiro |
| eat | 4 | cuidado com alimento |
| sleep | 2 em repouso | descanso |
| clean | 4 | higiene e reação |
| mana_train | 4 | energia simples azul nas mãos |
| react_happy | 3 | ganho de recurso/interação |
| react_tired | 2 | indisposição |
| equip_preview | 2 | mostrar item equipado |

Frames são **orçamento de animação**, não compromisso de estilo. AnimationClock único controla as camadas, frame e direção. Um acessório sem frame específico usa fallback definido por contrato, nunca “some aleatoriamente”. Não usar eventos de animação para conceder moedas ou XP.

## 8. Pipeline de produção de sprites
1. Criar sheet master com canvas, pivô e guias de âncora; confirmar no Android com body_balanced.
2. Criar hair_short_neat, starter_linen_tunic e held_main genérico, todos com o mesmo frame layout.
3. Construir prefab CharacterVisualRoot com PartResolver, LayerOrderResolver e relógio de animação.
4. Trocar peças durante idle, com feedback visual. Inspecionar todas as combinações de amostra.
5. Criar body_slender e body_sturdy, validar roupas nos contornos. Criar quatro cabelos e paletas.
6. Adicionar overlays raciais e ajustar headwear/cauda.
7. Só depois desenhar o restante dos 18 itens.
8. Criar visualizador de Editor: arquétipo, corpo, raça, peça, paleta, estado, direção e frame. Ele deve exibir pivôs e reportar sprites/IDs ausentes.

**Import settings sugeridos:** Sprite 2D/alpha transparente, filtro Point, compressão sem artefatos, pivô fixado, atlas sob medida e configurações de câmera coerentes com pixel art. Registrar o PPU escolhido após prova, e não assumir que 96×128 é definitivo.

## 9. Contrato de dados de uma parte
- partId estável, version, bodyVariants[], archetypeId, visualSlot;
- animationSetId e sprites por animationId, direction e frame;
- paletteOptions[] ou material/shader aprovado, hideTags, anchors e sortingRules;
- fallbackArtId, licenseSource, creator, status CANDIDATO_JOGAVEL/REVISADO/APROVADO.
Nomes de arquivos técnicos sugeridos: partId__animationId__direction__frameIndex.png. Snapshot de personagem grava IDs, não Sprite diretamente.

## 10. Testes e aceites
**G1:** um corpo, dois cabelos, camisa e dois itens em mão; idle sincronizado, nenhuma peça salta, troca funciona em runtime.  
**G2:** três corpos, quatro cabelos, paletas, pelo menos dois estados de cuidado; grava/recarrega a aparência.  
**G4:** aparência sorteada/editada na invocação/conta, equipamento sincronizado com inventário.  
**Conteúdo V1:** quatro raças distinguíveis, headwear compatível, 18 itens com visual verificável, testes em Android real.

Matriz de QA: corpo × cabelo × headwear × torso × item × animação; automatizar regras de compatibilidade e revisar visualmente conjuntos representativos. Limites de pixel art são julgados em dispositivo real. **O visual final será refinado com o criador, sem transformar esta descrição em arte aprovada.**
