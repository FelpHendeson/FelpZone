# Catálogo de equipamentos iniciais, roupas e loja — V1

**11/11/2026 · Revisão 1.0 · Status CANDIDATO_JOGAVEL.** Os 18 itens abaixo são **básicos no estágio de progressão**, não visualmente genéricos. O agente está autorizado a criar descrições, ícones e sprites originais provisórios para implementá-los. Valores exatos, raridades finais e lore continuam revisáveis junto ao criador.

## 1. Princípios de equipamento

1. Equipamento deve ser legível em sprite pixel art e combinar com mais de uma raça, corpo e corte de cabelo.
2. Armas e roupas possuem visual e função. Vestimenta casual pode ter atributo; aparência não deve determinar poder diretamente.
3. Não importar armamento ou uniforme icônico de Naruto, Bleach, Black Clover, Jujutsu, Lord of Mysteries ou Shadow Slave. Referência = variedade de formas e funções, não réplica.
4. Atributos do item são efeitos versionados em definição, recalculados quando equipa; nunca permanentes no save de stats.
5. Custo, revenda, bônus numérico, raridade e escalonamento são **parâmetros de balanceamento**. Para G2 utilizar valores DEV; para liberação revisar simulação de economia.
6. Os itens não são exclusivos de classe por padrão. Restrições futuras deverão ter motivo de design e registro.
7. Um catálogo pode representar visual de acessório pequeno por destaque em ficha, sem forçar detalhe impossível de ler no sprite; o usuário deve perceber a mudança no equipamento onde aplicável.

## 2. Slots RPG propostos

- weapon_main — arma/catalisador principal; o modelo visual pode ser espada, cajado ou machado.
- head — faixa, capuz ou circlet; interage com cabelo/chifres.
- torso — túnica, colete, robe ou casaco; parte interna/externa pode ocupar layers visuais diferentes.
- legs — calças/perneiras, com variante para body type.
- feet — sapatos/botas.
- accessory — anel/pulseira/talismã.

Um item ocupa no máximo um slot RPG nesta versão, mas pode ter múltiplos sprites visuais. Não oferecer segunda arma, ombreiras e armadura completa multipartes como regras do inventário até sistema de compatibilidade estar testado.

## 3. Lista de 18 peças com identidade visual

### Armas e catalisadores (5)

| ID | Nome | Descrição visual pixel art | Afinidade funcional inicial |
| --- | --- | --- | --- |
| wpn_ashwood_practice_blade | Lâmina de Freixo | espada de treino curta em madeira escurecida, guarda simples em tecido azul; ponta arredondada | precisão/treino de postura |
| wpn_narrow_iron_sword | Espada de Ferro Delgado | lâmina estreita cinza-prata, proteção trapezoidal cobre, empunhadura escura | coordenação e ataque técnico em treino |
| wpn_woven_staff | Cajado de Fibra Trançada | madeira alta com fibras entrelaçadas e pequeno anel oco no topo, sem cristal icônico | foco e estabilidade de mana |
| wpn_copper_resonator | Bastão Ressonante | bastão curto de cobre e couro com três entalhes geométricos originais | percepção de tempo/pulso mágico |
| wpn_slag_hand_axe | Machado de Escória | machado leve de um gume, metal escuro com borda polida e cabo de madeira robusto | esforço e treino físico |

### Cabeça (3)

| ID | Nome | Descrição visual | Afinidade funcional |
| --- | --- | --- | --- |
| head_wayfarer_band | Faixa do Andarilho | tira de tecido cruzando a testa, preserva a franja | conforto/coordenação em treino simples |
| head_fog_hood | Capuz da Neblina | capuz de pano azul-cinza com costura clara; variação compatível com chifres | concentração/descanso; sem invisibilidade |
| head_copper_circlet | Aro de Cobre Polido | arco metálico fino com pequena fenda frontal; sobre o cabelo | controle de mana, bônus leve |

### Torso (4)

| ID | Nome | Descrição visual | Afinidade funcional |
| --- | --- | --- | --- |
| torso_linen_tunic | Túnica do Primeiro Dia | linho creme, gola contrastante, costuras simples e faixa colorida | traje inicial neutro/conforto |
| torso_quilted_vest | Colete Acolchoado de Vigia | colete marrom sobre camisa, painéis costurados em losangos | proteção leve em atividade física |
| torso_novice_robe | Veste de Aprendiz | robe curto com camadas azul-petróleo e gola desdobrada; não cobre mãos | foco/estabilidade no treino de mana |
| torso_travel_leather_coat | Casaco do Peregrino | couro envelhecido, gola alta e lapelas, bainha até quadril | resistência a desgaste leve |

### Pernas (2)

| ID | Nome | Descrição visual | Afinidade funcional |
| --- | --- | --- | --- |
| legs_canvas_trousers | Calças de Lona | tecido cinza-oliva, costura vertical forte e barra ajustada | equipamento inicial sem bônus ofensivo |
| legs_reinforced_trousers | Calças Reforçadas | tecido escuro e joelheiras de couro visíveis | firmeza/recuperação pós-esforço |

### Calçados (2)

| ID | Nome | Descrição visual | Afinidade funcional |
| --- | --- | --- | --- |
| feet_cloth_shoes | Sapatos de Tecido | solado simples e faixa no tornozelo | equipamento inicial neutro |
| feet_ranger_boots | Botas de Percurso | cano curto, travas laterais e bico reforçado | estabilidade/deslocamento de treino |

### Acessórios (2)

| ID | Nome | Descrição visual | Afinidade funcional |
| --- | --- | --- | --- |
| acc_focus_ring | Anel de Foco Opaco | aro de ferro com pedra fosca, efeito pontual azul em inspeção | pequena melhora de foco/estabilidade |
| acc_ward_bracelet | Pulseira de Amarração | corda escura com elos de cobre e uma plaqueta sem símbolos conhecidos | amortecimento/recuperação curta |

**Observação:** efeitos são dimensões e hipóteses. Implementar via AttributeModifier/ActivityModifier tipado, com dados de teste. Os itens não garantem bônus definitivos até aprovação de balanceamento.

## 4. Carga inicial sugerida

**Pacote de começo candidato:**
- sempre: Túnica do Primeiro Dia + Calças de Lona + Sapatos de Tecido;
- uma ferramenta **de escolha** do jogador no tutorial: Lâmina de Freixo, Cajado de Fibra Trançada ou Machado de Escória. A opção não determina classe futura nem atributo de nascimento.
- acessórios e peças restantes são adquiridos por atividades/loja, com preço em moeda do jogo a definir.

**Importante:** a entrega do kit inicial deve ser transação do servidor com idempotência e trigger de primeira sessão; criar/instalar novamente o aplicativo não duplica itens. No G2, simular a entrega apenas com dados locais DEV. Se o diretor preferir começar totalmente sem arma, essa parte pode ser trocada sem alterar modelo de inventário.

## 5. Três conjuntos visuais para loja e preview

- **Peregrino:** Casaco do Peregrino + Calças de Lona + Botas de Percurso; silhueta de explorador, marrom/azul.
- **Vigia:** Colete Acolchoado + Calças Reforçadas + Faixa do Andarilho + Espada de Ferro Delgado; leitura de proteção leve.
- **Estudioso do Fluxo:** Veste de Aprendiz + Aro de Cobre Polido + Cajado de Fibra Trançada; azul-petróleo/cobre.

São combinações temáticas de itens avulsos, **não classes nem sets com bônus obrigatórios**. Set bonus só depois de decisão criativa. Uma roupa de classe não pode apagar automaticamente escolha de cabelo.

## 6. Especificação para art/equipment pipeline

Cada ItemDefinition:
- id, version, status (CANDIDATO_JOGAVEL etc), displayName, description;
- equipSlot, requiredTags[], archetypeCompatibility[], buy/sell policy IDs;
- effectDefinitions[] tipados, balanceProfileId, itemSpriteId, equipmentVisualId;
- customization/palette variants quando aplicáveis;
- ownership/binding rules, transfer/sale eligibility e origem/licença do asset.

**No Unity:** ScriptableObject para definição e visual; ItemInstance e EquippedItemRef para posse. O render da personagem busca EquipmentVisual por itemInstanceId/definitionId. Item sem arte não provoca crash; mostrar thumbnail de fallback com indicação de item incompleto em build de desenvolvimento.

**Regra de ocultação:** capuz pode cobrir franja e chifres pequenos exigem recorte alternativo; casaco pode compor camada externa sem apagar torso_base; arma troca frame em mão sem animar por conta própria.

## 7. Loja e economia inicial

A loja usa uma moeda principal fictícia. Minigames concedem recompensas com limites. Venda de equipamento exige política de propriedade e não pode gerar lucro comprando/vendendo o mesmo item indefinidamente.

**Definição a fazer antes do MVP online:** valores absolutos e proporção preço/recompensa, taxa de revenda, preço de habilidades genéricas, itens iniciais gratuitos, eventual limite de estoque e condições de uso. O agente pode criar BalanceProfile DEV específico para testes, sem transformar seus números em cânone.

**Critérios:** botão Buy não aceita preço fornecido pelo cliente; em operação única servidor debita+entrega; repetir a mesma chave não duplica. Recarregar save não acumula stats. Item equipado é tratado na venda conforme política aprovada. Não vender habilidades core/raciais/class sem regra de acesso específica.

## 8. Testes de catálogo e apresentação

1. Todos os 18 IDs únicos e resolvíveis.
2. O kit inicial equipa sem conflito e mostra as peças certas.
3. Cada arma aparece alinhada na mão no frame Idle e no preview.
4. Cada headwear tem comportamento definido com ao menos dois cortes de cabelo e com chifres.
5. Os três tipos de corpo renderizam peça de torso e pernas sem vazamento de pixels.
6. Equip/unequip troca modificadores sem alterar baseAttributes.
7. Comprar, vender e voltar ao inventário produz estado consistente em teste local; em online, também passar nos testes de transação.
8. Nenhum item usa iconografia, logotipo ou design específico reconhecível de franquia.

**Futuro:** armaduras pesadas, armas exóticas, variações elementais, cosméticos temáticos, itens tecnológicos e habilidades implantadas em equipamentos devem entrar como novos catálogos, não como hardcodes no renderizador.
