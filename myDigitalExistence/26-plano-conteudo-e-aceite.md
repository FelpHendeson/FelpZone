# Plano de implantação do conteúdo inicial e aceites — versão jogável V1

**11/11/2026 · Revisão 1.0 · Documento operacional.** Integra os conteúdos candidatos 22–25 ao roadmap original. O agente deve implementar sem exigir aprovação para decisões técnicas rotineiras, mas preservar a revisão conjunta de conteúdo final.

## 1. Estado e significado de V1

O termo **V1** aqui indica uma primeira edição com base de conteúdo coerente, **não** que a primeira versão instalável já contenha tudo. Preservamos marcos já planejados:
- G0: Unity e APK mínimo.
- G1: sistema modular real funcionando em Android.
- G2: cuidados, treinamento de mana, inventário e save de teste local.
- G3/G4 = v0.1 de MVP online: conta, três slots, runas, persistência, economia e uma experiência de cuidado/treino fechada.
- v0.2: classes e primeiro treino de combate.
- v0.3: pets básicos conforme planejamento.
- v1.0: catálogo inicial suficientemente revisado, estável e bonito para ser base da expansão.

É aceitável lançar uma v0.1 com menos conteúdo do que o alvo V1, mas **não** com um recurso anunciado que não funcione. Habilidades sem efeito implementado ficam desabilitadas/não sorteáveis.

## 2. Backlog de conteúdo executável

| ID | Gate | Trabalho e aceite |
| --- | --- | --- |
| CONTENT-01 | G1 | Criar schema/versionamento para catálogo de raças, runas, cores, classes, itens e cosméticos; testes de ID e referência |
| VIS-01 | G1 | Body_balanced e animação idle em 96×128 *hipótese*, com 1 cabelo, túnica e item na mão |
| VIS-02 | G1 | Troca de cabelo/torso/arma em runtime e sorting correto; screenshot Android |
| VIS-03 | G2 | Compleições slender/sturdy e 4 cabelos, olhos, paletas, headwear, preview de compatibilidade |
| RACE-01 | G2 | Overlays das 4 raças sem rigs separados; 1 visual por raça em cena de teste |
| RUNE-01 | G2/G3 | Catálogo de 3 runas, UI de pedra/brilho azul e semente versionada; resultado definitivo só servidor |
| CORE-01 | G2 | Engine de efeitos/custos, com 2 núcleos implementados no treino/lar com prova visível |
| CORE-02 | V1 | Demais 4 núcleos, cada um com interação real compatível e limitador |
| EQUIP-01 | G2 | 6 slots RPG propostos, kit inicial, equip/unequip e efeitos tipados sem acumulação |
| EQUIP-02 | G4 | Subconjunto da loja com visual real e itens persistidos |
| EQUIP-03 | V1 | Os 18 itens catalogados com art, compatibilidade, testes de inventário/loja |
| CLASS-01 | v0.2 | Três classes e duas capacidades de cada; teste que classe não depende da raça |
| SKILL-01 | G2/G4 | Quatro habilidades genéricas como dados; disponibilizar só as jogáveis no fluxo |
| SKILL-02 | v0.2/V1 | Quatro passivos raciais e habilidades de classe efetivos, explicados em ficha |
| MANA-03 | G2/G4 | Circuito de Mana, feedback e recompensa única; afinidades representadas |
| PHYS-01 | v0.2 | Treino físico simples para habilidades marciais, se aprovado o conceito final |
| BAL-02 | G4/V1 | Perfis de balanceamento e testes de repetição; taxas e custos revisados pelo criador |
| QA-CAT | todos | Ferramenta de preview e validação automática de referências, sprites e versões |
| ART-LEGAL | todos | Origem e direitos de cada sprite, som, ícone e fonte verificados |

Nomes e IDs não mudam sem migração ou aliases de catálogo. **Toda entrada nova deve ser registrável por dados**, não exigir alteração em HomeController.

## 3. Tarefa imediata para o agente após ler a documentação

Começar por **ENV-01..05 e ART-01**, mesmo com estas novas especificações disponíveis. O primeiro conteúdo a aparecer na Unity deve ser:
1. Um humanoide body_balanced com torso_base simples, cabelo curto e sprite de arma original provisório.
2. Uma cena Home de teste com personagem em pé, idle e botão para trocar cabelos.
3. Botão para alternar túnica/peitoral e arma; impedir transição inválida.
4. Teste de animação sincronizada e preview no Android, com Console sem Missing Script.
5. Depois produzir as outras compleições, runas e efeitos.

**Não começar desenhando todas as 18 peças ou codificando seis poderes antes de provar que a pipeline visual funciona.** Esta ordem protege o tempo do criador e evita refazer arte.

## 4. Conteúdo de demonstração sem bloquear criatividade

Se ainda não existem sprites originais, agente cria formas/pixel art provisórias que representam especificamente **os candidatos listados** (não clones de anime). Catálogo deve registrar CANDIDATO_JOGAVEL. Não chamar a arte de final. Os valores de necessidade, moedas, XP e pesos de runas usam configuração DEV_BALANCE até a revisão do equilíbrio.

**Conceitos suficientemente detalhados neste pacote podem entrar no protótipo sem consulta adicional:** 3 corpos, paletas, cortes, 4 raças, 3 runas, 6 núcleos, 3 classes e 18 itens, respeitando a ordem de implantação. Se algum conceito exigir nova regra fundamental (morte permanente, sistema de essência espiritual, restrição de raça/classe, monetização real, transformação ou punição diária), deve voltar à discussão criativa.

## 5. Critérios de aceite por conteúdo

### Aparência
- Body_balanced/Slender/Sturdy usam pivôs compatíveis, sem stretching deformante.
- 4 cabelos, 3 olhos, 6 paletas de pele e overlays de raça salvam por IDs.
- Troca de headwear oculta partes compatíveis, sem sumir com o cabelo inteiro por erro.
- Equipamento não abre buracos ou desloca pixels no idle.
- Interação de cuidado tem ao menos uma resposta animada.

### Origem/RPG
- Runa escolhe raça + elemento + core com semente versionada; todos independentes da classe.
- Os três slots persistem por conta; operação idempotente no G3.
- Cada core sorteável possui comportamento próprio e limitação real, não só texto.
- Talentos raciais aparecem na ficha, e, quando habilitados, produzem modificação rastreável.
- Escolha de classe ocorre por ação do jogador e permite crescimento posterior conforme regras.
- Não existe comparação hardcoded de nomes de raça/habilidade na UI.

### Equipamentos/loja
- 18 IDs únicos com visual de inventário e descrição. Para conteúdo V1, visual de corpo/arma reconhecível no sprite, onde aplicável.
- Equipar altera visual e modificadores declarados. Desequipar reverte exatamente.
- Oferta de loja não aceita preço enviado pelo cliente. Retry de compra não duplica item nem saldo.
- Kit inicial só é concedido uma vez e seleção de ferramenta não fixa classe.

### Desempenho e manutenção
- Projeto abre com versão de Unity registrada, sem assets perdidos.
- EditMode tests cobrem cálculos e validação de catálogo, PlayMode cobre trocas visuais e tela.
- APK de teste inicia no Android referência; registrar performance real, não inventar FPS.
- Adicionar nova cor de cabelo, peça e habilidade de efeito existente é operação de catálogo, sem refatoração do motor.

## 6. Fichas faltantes para futuras oficinas de design

Depois que o protótipo estiver jogável, criar sessões específicas com o criador:
- CR-01: proporções finais e direção de pixel art;
- CR-02: quais customizações ficam disponíveis na invocação e quais são desbloqueáveis;
- CR-03: nomes/lore das raças e outros arquétipos anatômicos;
- CR-04: runas e raridade/afinidades;
- CR-05: refino dos seis núcleos e caminhos de evolução;
- CR-06: classes, restrições, multiclasses, árvores;
- CR-07: preço, raridade, sets e visual final de itens;
- CR-08: ritmo de mana, cuidados, minigames;
- CR-10: pets antes da introdução pública.

O agente pode construir todo o sistema e exemplos enquanto isso, mas não pode fingir aprovação do criador de decisões ainda abertas.

## 7. Template de registro de conteúdo

Em ficha por ID:
- contentId, status, version, relatedDecisionId;
- descrição de fantasia e função;
- visual/assetId e direitos;
- pré-requisitos/custos/efeitos;
- efeitos colaterais, restrições, acessibilidade;
- dependências de engine e sistema;
- testes e screenshots;
- data de revisão e autoria.

**Regra de processo:** antes de marcar V1 final, todos os registros lançados devem estar REVISADOS/APROVADOS; placeholders devem ser removidos ou explicitamente identificados como recursos não lançados.

## 8. Estado real

A publicação desta documentação NÃO produziu sprites, ScriptableObjects, cenas ou APK. Os entregáveis só serão concluídos por agente com acesso ao código/Unity e teste real. Ver 21-roteiro-agentes.md para sequência técnica.
