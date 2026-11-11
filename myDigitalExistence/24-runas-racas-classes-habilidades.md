# Runas, raças, classes e habilidades — catálogo inicial V1

**11/11/2026 · Revisão 1.0 · Status CANDIDATO_JOGAVEL, conteúdo original revisável.** O criador autorizou exemplos concretos para construir bases e depois expandir. Estes poderes não reproduzem habilidades específicas de obras existentes. O agente pode implementá-los de modo parametrizado, mas qualquer mudança identitária ou adição canônica fora deste pacote precisa ser discutida com o criador.

## 1. Estrutura do nascimento e da evolução

**Nascimento:** conta → runa escolhida → resultado único com raça, afinidade e habilidade central; visual inicial gerado/selecionado dentro das regras de aparência. O jogador não escolhe a classe na invocação. Classe é decisão posterior de crescimento. O mesmo tipo de runa pode originar indivíduos distintos.

**Três dimensões separadas:**
1. **Raça:** fisiologia, detalhe visual e característica racial.
2. **Afinidade:** tendência de interação com uma das seis manifestações de mana.
3. **Núcleo:** princípio extraordinário individual, com aplicações, limitações e evolução própria.

Nunca colapsar raça, elemento, core e classe em um enum de “personagem”. Gerador tem catalogVersion/generatorVersion/seed e persiste BirthSnapshot; progresso de classe e habilidades aprendido é mutável e separado.

## 2. Catálogo de raças (4)

| ID | Nome | Visual inicial | Traço racial jogável | Restrição |
| --- | --- | --- | --- | --- |
| race_human | Humano | qualquer corpo/cor/cabelo humanoide; sem marca obrigatória | **Aprendizado Adaptável:** pequena melhora de treino em proficiência menos desenvolvida | não é bônus direto de dano |
| race_elf | Elfo | orelhas alongadas e olhos expressivos, aparência variada | **Leitura do Fluxo:** pista adicional de estabilidade no treino de mana | não oferece mana infinita |
| race_draconic | Dracônico | chifres curtos, escamas discretas, cauda opcional | **Pele Resiliente:** menor desgaste em uma atividade física validada | não elimina necessidade de descanso |
| race_vesperine | Vesperino | olhos refletivos, marcas crepusculares geométricas | **Sentido da Penumbra:** identifica mais facilmente pistas em treino de observação | não concede invisibilidade permanente |

Cada passivo deve ter interface descritiva e efeito específico somente onde a atividade oferece a dimensão correspondente. Em G2 pode ser demonstrado com escala DEV_CANDIDATE; antes do online calibrar percentuais conjuntamente. Não ligar raça a tom de pele ou gênero.

**Crescimento racial posterior:** variações de marcas, escamas e reflexos sem reconstruir todos os corpos; hibridização e outras raças são expansão, não compromisso V1.

## 3. Afinidades elementares (6)

| ID | Nome de trabalho | Expressão visual e tipo de prática | Proibição técnica |
| --- | --- | --- | --- |
| element_ember | Brasa | calor, persistência, pequenas faíscas cobre | sem dano automático ao nascer |
| element_tide | Maré | fluxo, adaptação, pequenas gotas/ondas | não equivale a controlar o oceano |
| element_breeze | Brisa | deslocamento, leveza, partículas de ar | sem voo no nível inicial |
| element_stone | Rocha | firmeza, estrutura, textura mineral | não torna corpo invulnerável |
| element_dawn | Alvor | claridade, foco, brilho cálido | não cria magia curativa universal |
| element_dusk | Penumbra | ocultação, contraste, perda de ruído | não garante teleporte ou sombras vivas |

Elementos podem gerar VFX, proficiências e pequenas sinergias quando as regras forem criadas. **Núcleo não é determinado automaticamente pelo elemento**. A combinação precisa permanecer possível e compreensível, mesmo que menos frequente em certas runas.

## 4. Três runas de invocação

Todas devem parecer **pedras físicas com inscrições e brilho azul**, conforme requisito do criador. É permitido variar o desenho interno sem usar símbolos de mídias conhecidas.

**rune_pulse — Runa do Pulso**
- Gravação: três arcos interrompidos conectados ao centro; iluminação parece pulsar, nunca girar freneticamente.
- Fantasia de nascimento: mudança, ritmo, intenção, movimento e ressonância.
- Tendências candidatas: habilidades Contrapeso / Âncora Breve; afinidades Brisa, Rocha e Maré podem ser mais expressivas.
- Não garante raça, classe ou capacidade de combate; pode originar qualquer raça da lista inicial.

**rune_veil — Runa do Véu**
- Gravação: duas linhas curvas envolvendo uma lacuna central; luz azul mais difusa na fenda.
- Fantasia: percepção, silêncio, lembrança de ações e limites do visível.
- Tendências candidatas: Véu de Ruído / Leitura de Vestígios; Penumbra e Alvor são afinidades temáticas.
- Não equivale a magia “maligna” ou raça sombria.

**rune_forge — Runa da Forja**
- Gravação: losango irregular cercado por pequenas ranhuras; brilho azul concentra-se nos vértices.
- Fantasia: transformação da energia, matéria, proteção, construção e esforço.
- Tendências candidatas: Cinza Fria / Sopro Vítreo; Brasa e Rocha são tematicamente coerentes.
- Não determina classe Bárbaro ou arma específica.

**Probabilidades:** o agente pode implementar seleção determinística por seed com pesos **de teste** documentados, mas não rotular chances como balanceamento final. Antes da primeira liberação pública, registrar pesos reais versionados e comunicá-los de modo compreensível. Evitar invocações client-side que permitam manipular o resultado.

## 5. Seis habilidades CORE (indivíduo/alma)

Cada core tem ID, princípio, aplicação cotidiana, aplicação de jogo, contrapartida e 3 patamares descritivos. **Patamares não são níveis numéricos definitivos**: as regras de desbloqueio virão após testes de progressão.

### core_counterweight — Contrapeso
- **Essência:** deslocar uma pequena parcela do impulso de seu próprio movimento para o instante seguinte. Não cria energia do nada.
- **Cotidiano:** equilibrar objetos, amortecer salto, reagir ao tropeço do personagem.
- **Minigame/combate:** janela curta de compensação que facilita corrigir um toque fora de ritmo ou um desvio.
- **Limite:** acumular correções gera instabilidade; durante a recuperação a precisão diminui por um intervalo.
- **Evolução:** iniciante percebe desvio → intermediário guarda um impulso → avançado redistribui dois movimentos próximos sem aumentar o impulso total.
- **Visual:** duplo contorno discreto dos pés/mãos, sem teleporte.

### core_noise_veil — Véu de Ruído
- **Essência:** reduzir ecos de sons próximos ao corpo por um intervalo breve, sem apagar absolutamente o som do mundo.
- **Cotidiano:** auxiliar descanso num ambiente barulhento, caminhar silenciosamente.
- **Minigame/combate:** diminuir pistas auditivas hostis ou estabilizar uma fase de concentração.
- **Limite:** o próprio usuário percebe menos sinais sonoros enquanto usa o efeito, tornando atividades auditivas mais difíceis.
- **Evolução:** abafa passos → envolve objeto pequeno → molda uma zona reduzida de amortecimento.
- **Visual:** linhas de vibração diminuindo ao redor do corpo; não desenhar uma “expansão de domínio”.

### core_cold_ash — Cinza Fria
- **Essência:** armazenar temporariamente calor dissipado pelo próprio esforço, convertendo-o em um breve brilho de partículas opacas.
- **Cotidiano:** aquecer uma bebida/objeto pequeno ou acender uma luz fraca em local escuro.
- **Minigame/combate:** liberar uma faísca controlada que interage com alvo de treino, sem explosão gigante.
- **Limite:** requer movimento/esforço anterior; uso repetido consome disposição e reduz conforto térmico até repousar.
- **Evolução:** calor pontual → cinza aderente em superfície → múltiplas pequenas liberações distribuídas.
- **Visual:** pontos cor âmbar com núcleo cinza; independente da cor azul das runas.

### core_glass_breath — Sopro Vítreo
- **Essência:** condensa mana exalada em películas translúcidas temporárias, frágeis sob impacto forte.
- **Cotidiano:** sustentar por segundos uma folha, criar apoio para item leve, separar gotas/sujeira.
- **Minigame/combate:** produzir barreira curta para bloquear uma única ameaça leve ou delimitar alvo.
- **Limite:** depende de reserva e controle de mana; películas racham quando tensão excede limite.
- **Evolução:** placa única → curvatura simples → composição de pequenas lâminas defensivas.
- **Visual:** fragmentos transparentes com borda difusa; não imitar armas icônicas.

### core_trace_reading — Leitura de Vestígios
- **Essência:** perceber marcas residuais recentes deixadas por interação física em objetos; não vê memórias pessoais completas.
- **Cotidiano:** localizar objeto manuseado recentemente ou identificar pista de uma tarefa.
- **Minigame/combate:** revela uma pista adicional por rodada de exploração/observação.
- **Limite:** excesso de estímulos cria ruído/confusão, e rastros antigos desaparecem.
- **Evolução:** objeto tocado → comparar dois rastros → inferir ordem de algumas ações recentes.
- **Visual:** fios finos e efêmeros próximos a objetos, sem copiar sistema de “Ecos” de Shadow Slave.

### core_brief_anchor — Âncora Breve
- **Essência:** fixar a posição de um objeto pequeno ou do próprio corpo em relação a uma superfície por poucos instantes; não congela o tempo.
- **Cotidiano:** segurar uma porta/caixa instável, manter postura em tarefa manual.
- **Minigame/combate:** evitar um recuo ou dar estabilidade a uma janela de treinamento.
- **Limite:** enquanto ancorado, reduz a própria mobilidade; força excessiva quebra o vínculo.
- **Evolução:** ancoragem do corpo → pequeno objeto próximo → alternância rápida de pontos de fixação.
- **Visual:** um selo geométrico original baixo nos pés/contato, não ritual de franquia.

**Aceite funcional mínimo:** para a V1, cada core implementado precisa ter uma manifestação visível e pelo menos uma consequência jogável/medível no lar ou minigame. Se não houver atividade compatível, mantê-lo como definição não sorteável até existir suporte; NÃO oferecer habilidade “funcional” apenas no texto.

## 6. Três classes escolhidas ao crescer

A classe não é sorteada na runa; desbloqueio e nível mínimo são assuntos de balanceamento. Implementar seleção com confirmação e registro de classId. Não amarrar classes a uma raça.

**class_swordsman — Espadachim**
- Fantasia: eficiência, postura, precisão com lâminas e leitura de tempo.
- Técnica ativa: **Corte Medido** — golpe de treino que recompensa precisão no timing, não apenas rapidez.
- Passiva: **Guarda Fluida** — pequena tolerância a erro de postura quando um treino marcial está ativo.
- Contra: não ganha bônus de reserva de mana por causa da classe.
- Futuro: especializações de duelos, arma única ou dupla, sem compromisso agora.

**class_arcanist — Arcanista**
- Fantasia: converter reserva e controle de mana em efeitos conscientes.
- Técnica ativa: **Canalização Guiada** — uma janela focada que estabiliza o pulso do minigame de mana sob custo.
- Passiva: **Reservatório Estável** — pequena melhora da recuperação/eficiência após repouso qualificado.
- Contra: esforço arcano excessivo exige pausa; não é classe de “magia infinita”.
- Futuro: escolas, catalisadores e rituais próprios do nosso jogo.

**class_barbarian — Bárbaro**
- Fantasia: força, perseverança, vigor e intensidade progressiva.
- Técnica ativa: **Ímpeto Crescente** — impulso físico cresce em uma sequência curta de desafios, até uma janela máxima.
- Passiva: **Fôlego de Aço** — penalidade um pouco menor por cansaço em uma atividade física válida.
- Contra: ritmo prolongado exige recuperação e controle.
- Futuro: estilos defensivos/ofensivos, sem obrigar a classe a ser irracional ou brutal.

**Dependência de minigames:** técnicas de Espadachim e Bárbaro só serão consideradas concluídas quando existir treino físico/combate apropriado (v0.2), e Arcanista quando o Circuito de Mana estiver validado.

## 7. Quatro habilidades genéricas de partida

| ID | Nome | Aplicação inicial | Limite |
| --- | --- | --- | --- |
| generic_breathe | Respirar Fundo | pequena recuperação de foco em pausa/descanso | não repõe reserva indefinidamente |
| generic_stance | Postura Firme | melhora estabilidade durante treino físico curto | reduz mobilidade enquanto ativo |
| generic_observe | Observação Atenta | exibe pista adicional em atividade de atenção | cooldown/limite por sessão |
| generic_short_step | Passo Curto | corrige pequeno erro de posicionamento | janela estreita, não teleporta |

**Aquisição:** habilidades genéricas podem ser candidatas à compra por moeda interna; custo e pré-requisitos são dados versionados a discutir. Core, racial e classe NÃO são automaticamente vendidas na loja. Todas devem ter efeitos em handlers tipados (PrecisionWindowModifier, RestEfficiencyModifier, StabilityModifier, HintReveal etc.) e não código espalhado por nomes.

## 8. Dados e regras de compatibilidade

Modelo de definição:
- id, version, status, category, originTags[], displayName, description;
- unlockRequirements[], activationConditions[], costs[], effects[];
- progressionStages[], allowedActivityTypes[], presentationAssetId;
- engineCapabilitiesRequired[] e contentStatus (sorteável/desabilitado).

**Regras do agente:**
1. Nunca programar caso especial com comparação de nome de raça/habilidade na UI.
2. Usar efeitos tipados e registrador extensível. Efeito indisponível = habilidade marcada não jogável, e não conceder benefício fictício.
3. Validar combinações de raça/afinidade/core/classe com testes de catálogo e seed reproduzível.
4. Evitar vantagens de combate incomparáveis em um jogo cuja V1 ainda é centrada em cuidados.
5. Se algum poder conflitar com decisões futuras, preferir migração explícita e preservar snapshot de origem.

## 9. Pendências criativas para refinamento conjunto

Lore, etnias/civilizações fantásticas, taxonomias de mana, tiers, progressão de estágio, efeito exato de classe/raça, pesos de runa, habilidade core adicional, custos, restrições, combate e equilíbrio. A lista acima fornece **material jogável de partida**, e não encerra essas discussões.

**Testes necessários antes de tratar conteúdo como V1 aprovado:** invocar dez personagens com seeds DEV variados; salvar e restaurar snapshots; confirmar que raça e classe são independentes; alternar habilidades e medir efeito real no minigame; verificar que nenhum poder opera sem custo/limitação; comparar builds sem vantagens dominantes evidentes.
