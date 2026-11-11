# Plano mestre de desenvolvimento — myDigitalExistence

> Documento vivo | revisão 1.0 | 11/11/2026 | Estado: planejamento estruturado, NÃO implementação

## 0. Leitura obrigatória e autoridade

Este plano é a camada EXECUTIVA da documentação, não substitui o GDD nem reescreve regras ainda não aprovadas. Leia junto de [GDD v0.1](02-gdd-mvp.md), [arquitetura](08-arquitetura.md), [roadmap](10-roadmap.md) e [decisões](11-decisoes-pendencias.md).

Legendas:
- **D — decisão confirmada:** escolha expressa pelo criador.
- **R — requisito de produto:** intenção expressa, ainda dependente de regras e balanceamento.
- **P — proposta:** solução a validar com protótipo ou aprovação.
- **ABERTO:** não escolher por inferência.
- **GATE:** evidência obrigatória para avançar.
- **FEITO:** somente após evidência de execução/teste, nunca por documentação pronta.

**D:** Unity 2D + C#; Android como plataforma inicial; documentação em Markdown em myDigitalExistence no repositório FelpZone.
**R:** pixel art, humanoide modular, até 3 personagens por conta, runas com brilho azul, origem/raça e elemento, habilidades centrais, RPG, cuidados, mana, minigames, loja e pets futuramente.
**Situação conhecida em 11/11/2026:** o Unity foi instalado e a opção Android aparece nas configurações de build do usuário. Ainda NÃO há evidência de um projeto criado, cena, APK ou SDK/NDK/JDK validados. A existência de documentação não prova código criado.
**ABERTO:** versão exata do Editor, escopo de publicação, Android de referência, orientação, nome comercial, tipo de autenticação, hospedagem e regras finas.

## 1. Visão e critérios de sucesso

**Premissa:** fazer o jogador sentir que invocou e acompanha uma existência individual, não apenas uma ficha de atributos. O personagem deve ser visualmente reconhecível, responder a cuidados e crescer conforme escolhas.

**Pilares de produto:**
1. Presença/expressividade: um personagem vivo, compreensível e bonito em tela pequena.
2. Individualidade: origem gerada por runa + decisões de evolução.
3. Cuidado significativo: necessidades afetam atividades sem rotina abusiva.
4. Progressão compreensível: recompensas e mudanças de habilidade/atributo sempre explicadas.
5. Produção modular: conteúdo novo entra por catálogo e contrato gráfico sem refazer o núcleo.
6. Confiança do jogador: progresso salvo, economia consistente, erros recuperáveis.

**Pergunta de validação da primeira fatia:** após invocar ou selecionar um personagem, a pessoa entende o que fazer, gosta de vê-lo e deseja realizar mais uma interação?

**Métricas a coletar em testes internos, sem metas artificiais:** tempo até primeira interação, sucesso na primeira tarefa, falhas de UI, tempo da sessão, quantas vezes testadores repetem o minigame voluntariamente, satisfação com animação, percepção de justiça/rotina e performance em Android real. Definir valores-alvo após medir um protótipo.

## 2. Fronteira do produto

### 2.1 Primeira versão jogável (vertical slice local)

**P:** uma tela de lar com personagem humanoide modular, animação idle e cuidado; troca de pelo menos uma peça visual; um treino de mana curto; necessidades e recompensas fictícias em dados locais de desenvolvimento. Nenhum login nem economia online nesta prova. Objetivo é descobrir viabilidade e diversão rapidamente.

### 2.2 MVP online v0.1 — O Despertar

**P:** fluxo de conta → slots → invocação → lar → cuidado → treino → recompensa → loja → equipar → salvar e recuperar. Requisitos de identidade e três slots aplicados no servidor. Os documentos 02 e 04–09 detalham sistemas.

### 2.3 Evolução posterior

v0.2: primeiras classes e minigame de combate. v0.3: pets. v0.4: atividades e expressividade ampliadas. v0.5+: híbridos, novas ambientações, elementos de ficção científica e especializações. São objetivos candidatos, não compromissos ou datas.

### 2.4 Exclusões explícitas até nova decisão

Sem mundo aberto, multiplayer, PvP, marketplace entre jogadores, IA generativa obrigatória, 3D, dezenas de raças de início, catálogo massivo de equipamentos, monetização real ou sistema de transformação racial no primeiro MVP.

## 3. Fluxo principal de usuário

1. Inicializa aplicativo e recupera sessão (ou entra/cria conta na fase online).
2. Vê até três slots; pode selecionar ocupado ou iniciar invocação quando houver vaga.
3. Escolhe uma runa física de pedra com iluminação mágica azul. Um resultado único é validado e salvo.
4. Nomeia/identifica seu ser conforme regra ainda a definir; visualiza origem, elemento e habilidade core.
5. Entra no lar, observa reações e necessidades; escolhe cuidado.
6. Pratica um minigame; recebe feedback transparente, XP, moedas e/ou progresso específico.
7. Visita ficha e inventário, compra/equipa algo permitido; vê diferença visual.
8. Sai ou suspende o aplicativo; retorno restaura estado e aplica passagem de tempo sem duplicações.

**P:** um personagem ativo de cada vez. Outros slots persistem, mas não são atualizados continuamente no dispositivo. O comportamento no tempo para personagens inativos precisa ser definido.

## 4. Contratos de sistemas

| Sistema | Entrada | Saída observável | Fonte de verdade | Risco |
| --- | --- | --- | --- | --- |
| Personagem modular | arquétipo + aparência + equipamento | sprite composto e animações sincronizadas | catálogo/estado | desalinhamento |
| Invocação | conta, slot, runa, idempotência | nascimento persistido | servidor no MVP | duplicação |
| Necessidades | tempo + ações + estado anterior | fome/sono/higiene/saúde coerentes | domínio; servidor ao online | punição excessiva |
| Mana | reserva/qualidade + treino | efeitos e avanço mensuráveis | domínio + validação online | grind |
| Progressão | atividade válida + regras versionadas | XP, nível, proficiência e habilidades | servidor no MVP | power creep |
| Economia | compra/venda/recompensa | carteira e inventário atualizados | servidor | exploits |
| Pets (futuro) | obtenção e cuidado | companheiro persistido | servidor | carga de rotina |

A descrição completa de cada sistema permanece nos documentos 03–09. Os detalhes abaixo são critérios de implementação, não balanceamento aprovado.

### 4.1 Composição de personagens

**P:** começar com um arquétipo de corpo, sistema de camadas, slot de acessório/equipamento e poucos frames de animação. Fixar um contrato de arte antes de produzir conteúdo: resolução de frame, PPU, pivôs, nomenclatura de poses, âncoras, ordem de camadas e compatibilidade. Testar troca visual enquanto a animação está em execução. Se peças exigirem animações próprias, ambas devem seguir o mesmo relógio/índice de quadro.

O contrato gráfico deverá prever direção, frente/verso, capacetes ocultando cabelo e itens incompatíveis. Não supor que raças de anatomia diferente compartilham a mesma base.

### 4.2 Origem e geração procedural

**P:** separar definição de runa, seed, versão do gerador, tabela de probabilidades, snapshot do nascimento e evolução corrente. O cliente apresenta animação; servidor decide resultado e limita slots. Nunca reexecutar uma invocação ao restaurar a cena. Não determinar taxas de raridade sem aprovação.

### 4.3 Tempo e cuidados

**P:** uma função pura de evolução temporal recebe estado, instante anterior e instante atual autenticado. Calcula necessidades com limites para evitar degradação infinita. Não executar uma thread por personagem. No protótipo, usar relógio simulado injetável. No MVP, horário do cliente não confere moedas ou acelera progresso. Definir explicitamente saúde mínima, incapacidade temporária, ausência prolongada, descanso e acesso a cuidados básicos antes de balancear.

### 4.4 Treino de mana

**P:** primeiro minigame Circuito de Mana, com pulsos, zona de precisão, resultado repetível, feedback e treino de prática. Distinguir reserva instantânea, controle, qualidade e recuperação como hipótese; o nível de mana precisa ser mapeado para esses atributos ou definido separadamente. Conceder uma recompensa por sessão aprovada, mesmo que o cliente solicite duas vezes.

### 4.5 Economia, progressão e habilidades

Cada item/habilidade/classe possui ID persistente, versão, nome, descrição e regras/custos explícitos. Instância possuída é diferente da definição de catálogo. A interface mostra ganhos antes/depois. Cálculos de status devem ser determinísticos: base + equipamentos + efeitos, sem duplicar modificadores ao carregar. Fonte de moedas, preços, revenda, treinamento de habilidades e custos não estão aprovados; registrar testes de economia antes de publicar.

## 5. Arquitetura Unity proposta

**P — arquitetura em quatro camadas:**
- **Domain:** modelos e regras puras C# (necessidades, atributos, modificadores, limitações).
- **Application:** casos de uso (alimentar, equipar, invocar, treinar, comprar).
- **Infrastructure:** armazenamento local de teste, rede, sessão, serialização, catálogo, relógio e logs.
- **Presentation:** MonoBehaviours, cenas, Canvas/UI, sprites, Animator, input e áudio.

O domínio não conhece MonoBehaviour nem depende do estado de uma cena. Use interfaces para relógio, armazenamento e APIs; mocks permitem testes no PC sem backend. Não introduzir contêiner de DI complexo ou framework ECS sem necessidade comprovada.

**P — cenas:** Bootstrap; Seleção/Altar; Lar; Treino de Mana (ou subcena). Ficha, inventário e loja podem ser painéis. Evitar uma cena separada para cada botão. Salvar ao suspender e restaurar idempotentemente.

**P — dados:** ScriptableObjects para catálogos de conteúdo **não** para salvar progresso. Estado mutável serializado em DTOs versionados; dados online são autoritativos pelo backend. Não armazenar segredos ou tokens permanentemente em texto simples. O servidor não confia em preços, XP ou saldo enviados pelo cliente.

**P — diretórios futuros, a refinar ao criar projeto:**

~~~text
myDigitalExistence/
  README.md e documentação/
  client/
    Assets/_Game/
      Art/{Characters,Environment,UI,Items}
      Audio/
      Animations/
      Prefabs/
      Scenes/
      Scripts/{Domain,Application,Infrastructure,Presentation}
      Content/
      Tests/{EditMode,PlayMode}
    Packages/
    ProjectSettings/
  server/        (apenas após ADR)
~~~

**Unity no Git:** versionar Assets, Packages e ProjectSettings, incluindo arquivos .meta; excluir Library, Temp, Logs, Obj e Builds com gitignore adequado. Fixar Editor e pacotes em documentação quando criados. Não versionar chaves, keystore ou credenciais.

## 6. Estratégia mobile e PC modesto

**D:** Android é plataforma inicial; Unity é ferramenta escolhida.
**P:** projeto 2D enxuto, sem 3D, HDRP, pós-processamento e física de alto custo. Não instalar complementos sem caso de uso. Atlas de sprites, texturas de dimensões adequadas, filtro Point para pixel art, evitar desfoque e observar overscan/proporção em telas diferentes. Pixel Perfect Camera é candidata, não obrigação se conflitar com layout.

**GATE essencial antes de conteúdo:** confirmar módulo Android Build Support e dependências, executar cena vazia no editor e produzir um build instalável de teste no telefone real. A simples presença de Android no menu não prova build funcional.

**P — performance:** instrumentar FPS, uso de memória, GC alloc, tempo de entrada e tamanho do APK. Metas numéricas serão definidas por dispositivo alvo e testes; perseguir 60 FPS se sustentável, considerar fallback 30 FPS apenas por decisão de experiência. Testar suspensão/reabertura e alternância entre aplicativos.

**P — acessibilidade:** área de toque confortável, contraste, não depender de cor para status, legendas/labels para necessidades, opção de áudio, tutorial repetível e janela de precisão ajustável no treino.

## 7. Infraestrutura online — decisão pendente

O protótipo local não depende de API. Antes do MVP, conduzir um ADR comparando:
- TypeScript/Hono + Workers/D1;
- API TypeScript e banco persistente em outro provedor;
- Supabase Auth/DB e endpoints de domínio;
- API C# se houver argumento forte.

Verificar preços e limites ATUAIS antes de decisão (não assumir cota histórica). Exigir autenticação segura, autorização por conta/personagem, transações, idempotência, backup/restauração testados, exportabilidade, migração, logs sem dados sensíveis, retenção/exclusão de conta e orçamento de uso. Opção gratuita não significa alta disponibilidade.

**P:** HTTP/JSON versionado; códigos de erro consistentes; operação com request-id e chave de idempotência; reconsulta após timeout. Não aceitar estado financeiro produzido localmente sem validação. Registrar reconciliação explícita para rede fraca, sem perda silenciosa.

## 8. Processo de desenvolvimento e governança

- Trabalhar por fatias verticais pequenas: protótipo visível, teste, correção, registro e integração.
- Cada item tem ID, prioridade, dependências, entrega demonstrável e teste de aceite; ver [backlog](13-backlog-execucao.md).
- Evitar construir infra, combate, loja e catálogo antes de validar modularidade visual.
- Revisar desempenho no celular alvo a cada marco.
- Registrar decisões novas em [decisões](11-decisoes-pendencias.md) com data e justificativa; gerar ADR quando afetar arquitetura.
- Manter histórico de versões; uma correção pode usar 0.1.1, uma funcionalidade pequena 0.2.0 etc. O rótulo de versão não é porcentagem de conclusão.
- Nenhum requisito é marcado FEITO por ter sido discutido; exige commit/artefato/teste evidenciado.
- Adição de escopo exige identificar troca: qual item sai, qual marco muda ou qual custo é aceito.
- Dependências externas e assets: registrar origem/licença. Não usar imagens de referência de busca como assets do produto.

## 9. Gates de passagem

| Gate | Conteúdo requerido | Evidência objetiva |
| --- | --- | --- |
| G0 Ambiente | Unity, Android, projeto versionado | Editor e APK de cena mínima no telefone |
| G1 Visual | base modular + animação + peça dinâmica | vídeo/print do dispositivo e teste de sincronismo |
| G2 Ciclo local | cuidado, mana, recompensa de teste, inventário | sessão completa reproduzível e save local de desenvolvimento |
| G3 Online | conta, 3 slots, invocação, economia segura | testes de reconexão, concorrência e idempotência |
| G4 v0.1 | UX do GDD, estabilidade e dados recuperáveis | checklist integral e regressão no Android |
| G5 Evolução | classes/pets e novos sistemas | critérios específicos, sem quebrar G4 |

Não declarar gate concluído sem passar no dispositivo e manter evidências. Falhas bloqueadoras criam marcos de correção intermediários.

## 10. Riscos, sinais e resposta

| Risco | Sinal | Mitigação |
| --- | --- | --- |
| Estouro de escopo | funcionalidades novas antes de G1 | congelar mínimo da fatia |
| Produção de arte inviável | cada item requer redesenho total | contrato de sprite e matriz de compatibilidade |
| PC fraco / build Android | editor ou importação lentos | template leve, testes pequenos e APK mínimo cedo |
| Cuidado punitivo | jogador evita retornar após ausências | teto de perda, cuidados básicos e testes de sessão |
| Exploração econômica | ações duplicam saldo ou itens | autorização, ledger, idempotência e concorrência |
| Provedor gratuito instável | suspensão/limites/migração difícil | prova de conceito, exportação e plano alternativo |
| Perda de progresso | save inconsistente e sem backup | versões, restauração testada e transações |
| Conteúdo desbalanceado | um minigame domina economia | simulação de ganhos e métricas internas |
| Direitos autorais | sprites/sons sem origem | registro de licenças e substituição preventiva |

## 11. Critérios de encerramento e próximo passo real

Este documento é concluído quando revisado e publicado; **o jogo continua em planejamento**. O primeiro próximo passo de implementação é G0: fixar versão Unity, criar projeto 2D leve, preparar Git e compilar uma cena mínima para Android. Em seguida G1: provar humanoide modular animado e uma troca de peça antes de produzir muitas raças ou itens.

Acompanhar execução no [backlog](13-backlog-execucao.md), testar segundo [matriz de QA](14-qualidade-validacao.md) e preservar as regras de origem no GDD. A qualquer momento, atualizar o plano se novos fatos do projeto mudarem prioridades.
