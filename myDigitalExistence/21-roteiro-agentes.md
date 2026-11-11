# Ordem de execução para agentes — primeiros ciclos de trabalho

Versão 1.0 — 11/11/2026. Guia operacional **executável em sequência** pelo agente com acesso autorizado ao GitHub e/ou computador/Unity. Complementa [backlog](13-backlog-execucao.md); não declara tarefas concluídas.

## Regras antes do primeiro clique
- Ler AGENTS.md e 15-governanca-criativa.md.
- Confirmar branch e estado do Git, alterações não commitadas e existência de projeto Unity; preservar trabalho preexistente.
- Não mexer em outros jogos do repositório FelpZone.
- Se o computador/Unity não estiver acessível, não alegar que fez operações GUI, não inventar build ou screenshots; fazer apenas entregas de código/doc realmente possíveis.
- **Criatividade:** nomes de raças/classes/habilidades, aparência e equipamentos reais aguardam coaprovação. Para plumbing, usar DEV_ONLY e arte provisória original.
- Não solicitar autorização para decisões rotineiras de arquitetura nem devolver ao usuário tarefas de programação.

## Sprint técnico 0 — Ambiente Android (G0)
**Entradas:** Unity instalada segundo o usuário e Android disponível em Build Profiles; falta verificar versão/módulos.
**Ações:**
1. Abrir Unity Hub e editor (se acesso autorizado) e registrar versões, módulos SDK/NDK/JDK, status de licenças.
2. Verificar repositório, pasta myDigitalExistence/client e .gitignore. Não criar projeto duplicado se existir.
3. Criar projeto 2D leve na localização aprovada por convenção, sem HDRP/3D e pacotes irrelevantes.
4. Configurar serialização texto, Visible Meta Files, identificação técnica provisória do app, entrada de teste e cena Bootstrap.
5. Inspecionar erros Console e corrigir referências.
6. Criar Build Profile Android, incluir cena, produzir APK Development Build.
7. Instalar APK no Android real **somente se dispositivo/ADB/autorização disponíveis**; caso contrário registrar bloqueio de validação física, não marcar G0 completo.
8. Registrar commit e evidências de editor/build/dispositivo.

**Aceite:** editor Play funciona, APK produzido e aberto no Android com texto de homologação; sem erros relevantes de startup. **Relatório:** versão Unity, warnings, peso APK, commit, dispositivo, sucesso/falha.

## Sprint técnico 1 — Composição de personagem (G1 parcial)
**Entradas:** G0 e placeholders originais.
**Ações:**
1. Implementar modelos CharacterArchetype, AppearancePart, AppearanceSnapshot e catálogo DEV.
2. Criar CharacterVisualRoot com SpriteRenderers/layer order e um relógio de animação.
3. Montar humanoide dummy e peças por slot (corpo/cabelo/roupa/item neutros); testar sincronismo em idle.
4. Adicionar UI DEV para selecionar peça; mudar peça durante execução sem redefinir o relógio de todos os slots.
5. Implementar fallback de imagem/slot ausente com log amigável, sem crash.
6. Criar testes PlayMode de composição e troca.
7. Construir uma sala de teste neutra e testar no Android.
8. Capturar resultados, solicitar **feedback criativo** do diretor sobre direção estética apenas quando houver proposta de visual, sem usar visual dummy como decisão final.

**Aceite:** personagem desenhado e animação estável; troca visual funciona; screenshot/vídeo no Android quando disponível.

## Sprint técnico 2 — Núcleo de simulação (G2 parcial)
**Entradas:** sistema de render e contrato de domínio, sem lore.
**Ações:**
1. Criar Domain, Application, Infrastructure e Presentation conforme documento 16.
2. Implementar IClock fake e real, EvaluateNeeds puro com regras DEV injetadas.
3. Criar ação de cuidado, estado Ready/Pending/Error e atualização dos indicadores.
4. Criar RoundState/ScoreCalculator separados de animação de mana.
5. Implementar minigame Circuito de Mana apenas como hipótese/protótipo DEV, com input e resultado local; confirmar design antes de torná-lo oficial.
6. Implementar XP e inventário mock, sem itens ou habilidades canônicas.
7. Gravar GameSaveV1 DEV no persistentDataPath, restaurar e migrar quando necessário.
8. Testar fecha/reabre, avança relógio, prêmio duplo e cálculo de atributos.
9. Construir APK com loop demonstrável: cuidar → treinar → progredir → trocar aparência.

**Aceite:** loop local reproduzível, sem ganhos repetidos, sem save corrupto silencioso. **Não importar moeda local para futuro backend.**

## Sprint técnico 3 — Alinhamento de produto (pré-G3)
**Ações de engenharia independentes:** comparar provedores, elaborar ADR de auth/persistência/infra com cotas oficiais atuais, desenhar contratos HTTP e modelos. Não ativar gastos nem serviço pago por conta própria.
**Ações criativas conjuntas a priorizar:** CR-01 (visual), CR-02 (customização), CR-04 (runa/nascimento), CR-08 (mana/cuidado) e CR-09 (economia). Não fixar raças/classes/skills sem workshops CR-03/05/06.
**Aceite:** design técnico de backend validado e decisões criativas necessárias ao MVP aprovadas.

## Sprint técnico 4 — MVP online (G3→G4)
Sequência: autenticação → schema e controle de dono → slots 0–2 → invocação atômica → necessidades server-time → sessões de atividade → carteira/ledger → inventário e equipamento → sincronização/versionamento → UX completa → QA de concorrência e Android.

**Não antecipar:** pets, class trees finais, combate elaborado, mundo aberto, multiplayer.

## Entregáveis em cada passo (modelo de resposta do agente)

~~~md
## Entrega [ID]
**Objetivo:** ...
**Implementado:** ...
**Arquivos/cenas:** ...
**Testes executados:** EditMode / PlayMode / Android (somente reais)
**Falhas/limitações:** ...
**Dados DEV_ONLY:** ...
**Decisões criativas não tomadas:** ...
**Git:** commit/branch/PR ou alterações locais
**Próximo item:** [ID + gate]
~~~

O agente pode concluir várias pequenas tarefas técnicas de uma vez quando os testes e riscos forem proporcionais, sem pedir “posso seguir?” a cada arquivo. Deve parar para pedir input do criador apenas quando uma decisão conceitual ou direção artística bloqueia conteúdo canônico, ou quando ação externa/destrutiva exigir autorização.

## Critério de conclusão do plano
Documentação aprovada + backlog detalhado NÃO equivalem ao jogo pronto. Cada gate precisa da evidência exigida. Evitar números arbitrários de horas e datas. O histórico de versão deve incluir correções intermediárias e decisões substituídas.
