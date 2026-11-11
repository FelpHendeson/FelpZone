# Pipeline de arte modular, pixel art e animações

Versão 1.0 — 11/11/2026. **Contrato de PRODUÇÃO técnica proposto; aparência e conteúdo dependem de CR-01, CR-02, CR-03 e CR-07.** [Governança](15-governanca-criativa.md) prevalece sobre exemplos.

## 1. Problema que precisamos resolver

Um único humanoide deve permitir trocar corpo/variante, rosto, cabelo, roupa, armadura, arma e acessórios sem redesenhar o personagem inteiro. O render deve preservar silhueta coerente, sincronismo de quadros, proporções e legibilidade no celular. Raças com anatomias radicalmente diferentes podem exigir arquétipos separados.

O agente pode desenvolver **a engenharia modular** usando placeholders geométricos ou pixel art DEV_ONLY autorizada, mas não deve escolher o rosto, corpo, proporções, cabelos, raças ou design dos equipamentos finais.

## 2. Definições propostas de conteúdo

**CharacterArchetypeDefinition**
- id estável; versão; referência ao conjunto de animações suportadas;
- contrato de pivôs/âncoras; slots possíveis; compatibilidades anatômicas;
- orientação de sprites, frameSize, pixelsPerUnit e frameTiming (valores pendentes do protótipo);
- fallbacks para poses ou camadas não existentes.

**AppearancePartDefinition**
- id e versão; appearanceSlot; archetypeCompatibility[];
- atlas/sprites por animationId/direction/frame;
- variantIds, paletteOverrides permitidos se aprovados;
- hideTags/coverTags (ex.: ocultar cabelo sob headwear) e prioridade visual;
- anchorId e offset opcional; fallback quando não há sprite em pose;
- tipo visual (cosmético) separado de ID de ItemDefinition com atributos.

**CharacterAppearanceSnapshot**
- archetypeId; bodyVariantId;
- dicionário de appearanceSlot → appearancePartId;
- paleta selecionada e toggles aprovados;
- referências somente a IDs de catálogo, nunca paths temporários da máquina.

**EquipmentDefinition**
- id, slot de RPG, compatibilidade, atributos, displayName e visualPartId;
- um item pode não alterar aparência; duas definições podem referenciar o mesmo visual;
- aparência do personagem não determina diretamente seu dano/XP.

Esses nomes são exemplificativos de engenharia e não implicam que o jogador terá todos os slots no MVP.

## 3. Contrato gráfico a validar em G1

**Não fixar números sem CR-01**. Abrir uma amostra com duas escalas alternativas; validar no telefone e registrar escolha. Fixar depois:
- resolução de sprite (width/height em pixels) por arquétipo;
- pixels por Unity unit e câmeras;
- pivô central do corpo, origem do chão e baseline;
- normalização do frame canvas (evitar personagem pulando de posição entre poses);
- direções necessárias (front/side/back), conjunto inicial de estados e seus quadros;
- cadência de animação, looping e eventos de transição;
- paleta e filtro de textura (normalmente Point/no filter para pixel art);
- critérios de múltiplas peças, sombras e armas;
- regras de ordenação visual para cada frame/direção.

Um contrato de 4 direções ou 32x32/64x64 seria decisão estética; não assumir. Pode criar DEV_ONLY numa resolução conveniente para testar pipeline, mas ela não se transforma no padrão final.

## 4. Camadas e ordenação

Pilha conceitual: sombra de contato, detalhes traseiros, corpo base, traços raciais, rosto/olhos, cabelo traseiro, roupas, armadura, cabelo frontal, itens de mão, acessórios e efeitos. **Não usar um número fixo de sortingOrder para todas as poses**: uma arma deve poder ficar atrás do corpo em algumas direções e à frente em outras.

**P:** CharacterVisualRoot contém:
- BodyRoot e renderizadores por slot;
- CharacterAnimationClock (frame atual compartilhado entre peças);
- PartResolver (seleção/fallback/cobertura);
- LayerOrderResolver (ordem por pose/direção/quadro);
- AppearancePresenter (recebe snapshot, sem regra RPG).

Uma única fonte temporal de animação em vez de um Animator independente por acessório. PartResolver nunca deve alterar Progression/Inventory; somente renderiza um estado já válido.

## 5. Estados de animação propostos

**G1 obrigatório:** Idle; transição de troca de item visível em Idle; uma resposta de toque.
**G2 candidatos:** Eating, Sleeping, Cleaning, Training, Happy/Reaction.
**Após necessidades reais:** Walking, Combat, Hurt, Cast, Victory etc., conforme workshop de jogabilidade.

Contrato de animação inclui:
- animationId estável, isLoop, frames[], duration por frame (ou base FPS), events[] opcionais;
- opção de usar frames de fallback em partes sem sprite próprio;
- transição segura para Idle após one-shot;
- interrupção sem deixar peças deslocadas; ao suspender, não fazer avanço econômico.

**Desempenho:** não chamar AssetDatabase em runtime; cachear referências necessárias. Sprites/atlases sob gestão de memória coerente, sem Load/Instantiate por frame. Usar SpriteAtlas se fizer sentido após perfil de memória. Não incluir toda a arte futura no primeiro carregamento.

## 6. Slots e compatibilidade

Separar duas dimensões:
1. **Appearance slots** — como desenhar: body, hair, face, headwear, torso, legs, footwear, back, handMain, handOff, accessory, aura (nomes exemplificativos).
2. **Gameplay equipment slots** — regras do RPG: weapon, armor, accessory etc. (**quais existem é decisão CR-07**).

Uma peça pode ocupar múltiplas regiões visuais sem consumir múltiplos slots RPG; um item equipado pode fornecer vários sprites. Usar regras declarativas para incompatibilidades, não um if por raça/peça.

Exemplos exclusivamente técnicos:
- headwear com tag coverHair pode esconder variante de cabelo frontal.
- arma de duas mãos pode exigir pose diferente se essa regra for aprovada depois.
- raça com asas pode precisar de BackAnchor especializado.

Não declarar que o jogo terá capacetes, asas ou duas armas porque aparecem em exemplos técnicos.

## 7. Importação e nomenclatura de assets

**Padrão proposto** (após aprovar o contrato gráfico):
- IDs de conteúdo: lowercase_snake_case e únicos.
- Arquivos arte: partId__animationId__direction__frameIndex.png.
- Source files (Aseprite ou equivalente) separados de exports gerados; não obrigar software específico.
- Guardar arquivo de origem quando licenciado, hash/origem/licença e export settings reproduzíveis.
- Não rasterizar versões de cor para cada personagem se paleta dinâmica aprovada e viável; medir custo e artefatos antes de decidir.
- Sempre preservar transparência (alpha), frame alinhado e dimensões previstas.
- Unity import: tipo Sprite, filtro adequado para pixel art, compressão sem artefato, pivô definido e atlas quando indicado.
- NUNCA importar screenshots de buscadores como sprites finais sem direitos de uso.

## 8. Ferramenta de validação de peças — recomendada

Antes de multiplicar conteúdo, criar uma tela Editor/dev que:
1. escolha arquétipo + animação + direção + frame;
2. aplique uma variante por slot e mostre o resultado;
3. altere partes em runtime;
4. indique visualmente pivôs/âncoras;
5. valide IDs, frames ausentes, dimensões e compatibilidade;
6. faça captura comparativa ou registre divergências.

Essa ferramenta interna é responsabilidade técnica do agente. Não precisa de aprovação criativa para existir.

## 9. Matriz de testes visuais

Selecionar pelo menos as combinações:
- corpo sozinho / com cabelo / roupa / item;
- troca de partes durante Idle, primeiro/último frame e transição;
- direção frontal e qualquer outra direção suportada;
- item incompatível e imagem faltando;
- layering traseiro/frontal em poses críticas;
- save/load das mesmas peças;
- escala real no celular, notches/área segura e telas de tamanhos diferentes;
- uso de memória com diversos atlas pequenos vs um grande, quando houver conteúdo suficiente para comparar.

**G1 só passa** se o personagem parecer consistente e peças não pularem ou piscarem entre quadros no dispositivo Android. Exigir evidência do agente com build e cena; o diretor criativo decide se a estética é aprovada.

## 10. Critérios criativos ainda em aberto

CR-01: estilo e proporção do pixel art, resolução visual, expressões, cor, tema e direção UI.
CR-02: partes editáveis pelo jogador, paletas e limites de personalização.
CR-03: raças e diferenças anatômicas.
CR-07: equipamentos, slots de gameplay, acessórios e roupas com stats.

O agente deve registrar essas pendências sem retardar o motor de render. Nenhum placeholder deve ser apresentado como personagem oficial.
