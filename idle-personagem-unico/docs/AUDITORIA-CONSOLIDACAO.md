# Auditoria técnica e funcional e plano de consolidação — 24/11/2026

## Atualização do plano — 27/11/2026

O diagnóstico abaixo registra a inspeção de 24/11; seus achados não representam automaticamente pendências atuais. F13.1–F13.6 já foram publicadas: contas/persistência, apresentação, navegação, tutorial e arte foram consolidados em suas entregas. O banco existente foi confirmado conectado; o save atual é v14. Ver [roadmap atualizado](ROADMAP.md) e [relatório de execução](../RELATORIO-idle-personagem-unico.md).

A F13.6 atual usa personagens raster V2 e quatro animações por quadros para as oito raças, publicadas em `b271466`. [Validações e limites](ANIMACOES-V1.md) incluem 445 testes e revisão no navegador; elas cobrem a entrega artística, sem encerrar a F13.7. Próxima fatia planejada: auditoria global em execução, depois consolidação/aceite web na F13.8, antes da F14. Ferramentas por profissão, armas visíveis, monstros e pets continuam como pacotes artísticos futuros.

## Escopo e evidências

Baseline: [`7b59626`](https://github.com/FelpHendeson/FelpZone/commit/7b596262f6807cfb8c2a8e2c7c4fd47c6659e0e7), branch main. Inspeção estática da árvore, documentação, componentes centrais, motor, API, persistência, competição e PWA. Não foram executados testes, build, simulações, inspeção visual renderizada nem verificação de infraestrutura de produção nesta auditoria. Resultados de testes e calibração citados são os registrados pelo projeto, não validação independente. F0–F13 permanecem como entregas históricas; F13 não é aceite final do produto. Maturidade estimada: alpha avançada; avaliação qualitativa preliminar 7,8/10, não métrica objetiva.

## Diretrizes do autor (24/11/2026)

1. **Apresentação e conta real.** Tela de entrada, login/cadastro e progresso associado à identidade do jogador, não à sessão do navegador. A mesma conta deve continuar a jornada no celular e no computador. Next.js e banco tornam autenticação completa viável; reutilizar o que existe quando adequado. Separar contas inclusive no mesmo navegador; não criar personagens automaticamente em nome de outra conta. Recuperação de acesso, logout e migração controlada de saves locais são recomendações de implementação.
2. **Liberdade de UX.** O agente pode melhorar lógica de navegação, agrupamento, hierarquia visual, feedback e organização da interface sem seguir descrições anteriores literalmente. Preservar a identidade e as regras centrais; justificar e documentar alterações relevantes de game design.
3. **Tutorial.** Criar onboarding integrado às ações reais do jogo. Apresentar sistemas progressivamente; evitar mural de textos. Recomenda-se permitir pular, retomar e revisar; persistir progresso corretamente.
4. **Spritesheets.** Quando precisar de recursos gráficos, o agente envia prompts completos ao autor, que pode gerar com Gemini ou ChatGPT. Não presumir que arte definitiva já existe; usar placeholders quando necessário.

## Diagnóstico técnico

- Manter monorepo npm, Next/React e motor TypeScript puro compartilhável com servidor e futuro Expo. RNG semeado, ações serializáveis, relógio injetável, save v13 com migrações e testes de domínio são forças.
- Shell.tsx concentra sessão, simulação, persistência, ações e navegação. Extrair responsabilidades gradualmente, sem reescrita geral.
- A F9 implementou conta opcional e API com Redis previsto, mas a documentação registra banco não ativado. Validar produção antes de afirmar sincronização operacional.
- O save local usa chave única `idle-pu:save`. Sessão online e cache local devem ser isolados por identidade e descartados/trocados com segurança no logout. Evitar exposição do estado anterior durante carregamento de outra conta.
- Simulação de 500 ms, UI a cada 1 s, gravação a cada 15 s, limite offline de 12 h (86.400 passos). Medir desempenho em dispositivos modestos; evitar travamentos e divergências entre relógio local e servidor.
- 19 arquivos de teste de motor e 4 de web identificados; não há suíte E2E dedicada identificada. Adicionar testes de jornada, integração e regressão.

## Riscos técnicos e ações

| Prioridade | Evidência | Ação |
| --- | --- | --- |
| Crítica | `apps/web/src/servidor/api.ts`: importar aceita save local validado estruturalmente e substituição explícita; builds saem desse estado | Separar procedência casual/importada da competitiva; progresso competitivo nasce e é validado no servidor; não permitir overwrite arbitrário de estado autoritativo |
| Crítica | Banco não ativado conforme ROADMAP/ARQUITETURA | Ativar ambiente de homologação e validar conta real em dois dispositivos; custo e provedor dependem de autorização |
| Alta | `api.ts` e `armazem.ts`: trava de 10 s com valor fixo e remoção incondicional | Token exclusivo, liberação atômica condicionada e controle de versão/CAS; testar expiração e corrida |
| Alta | `Shell.tsx`, `lib/sync.ts`: tick local em sessão online e fallback inconsistente | Estados explícitos online/desconectado/sincronizando/expirado; reconciliação autoritativa; impedir perda/duplicação de progresso e operações cruzadas |
| Alta | Sem idempotência explícita em ações | Identificador de ação, deduplicação e resultado consistente sob retry |
| Alta | Sem recuperação de senha | Definir mecanismo seguro de recuperação, sem expor contas |
| Média | Token em localStorage, CSP inline | Cookie HttpOnly/Secure/SameSite na web (com proteção CSRF adequada), estratégia de token mobile e revisão CSP |
| Média | `servidor/rota.ts`: limite aplicado depois de req.text(), mede caracteres | Limitar bytes reais e leitura; erros consistentes e logs estruturados sem segredos |
| Média | Health check indica configuração, não conectividade | Readiness do banco separada de liveness |
| Média | `public/sw.js`: cache fixo e navegação sem verificar response.ok | Versionar cache por release, preservar caches alheios, não guardar erros ou dados privados |
| Alta | Ausência de E2E identificado | Playwright: criação, loop básico, offline, migração, conta, duas sessões, concorrência, PWA, mobile |

**Banco [Proposta]:** avaliar PostgreSQL (por exemplo Neon) para identidade, persistência versionada e futuro ranking; Redis pode permanecer como cache/rate limit/locks ou armazenamento inicial se atender requisitos. Não é decisão de migração nem autorização de custo. Avaliar reutilização do backend existente, transações, backups, migração e recuperação. Conta autenticada é requisito independentemente do provedor.

## Diagnóstico funcional

Loop: treinar → coletar → produzir/vender → equipar → combater → evoluir; uma atividade por vez mantém tempo como recurso estratégico. Raças, cores, dons e origens dão individualidade. O Limiar transforma morte em conteúdo e é diferencial; verificar se jogadores descobrem a mecânica sem incentivar mortes artificiais. A arena é contra bots; builds de terceiros servem ao Campo de Provas. Não confundir rating/torneios locais com PvP ou ranking global autoritativo. Aprofundar origens, especializações e narrativa em futuras expansões.

Calibração F13 documentada: nível 10 em 1,3 dia; 20 em 4,8; 30 em 12,5; 50 em 33,5; rank S em 44,5 dias. Bot chega ao dia 60 sem mortes. Gold do dia 60 caiu de 4,6 milhões para 0,5 milhão devido à mudança da estratégia do bot (fusão e mochila), não alteração das regras. Insígnia em cerca de 5 semanas. Medir também diversão, frequência de recompensa, cliques, desbloqueios e retenção em playtests; resultados do bot não substituem jogadores reais.

## Experiência e fluxo

Apresentação → login/cadastro → conta → seleção de personagem (respeitar slots e desbloqueios existentes) → criação ou continuação → tutorial/jogo. Modo local legado, se mantido, deve ser explicitamente separado e nunca se confundir com conta online. Revisar seis áreas e 30 subabas atuais; evitar excesso de navegação e aparência de painel administrativo. Dar protagonismo visual ao personagem, equipamento, atividade atual, regiões, monstros, recursos e conquistas. Mobile-first e desktop; não presumir avaliação visual concluída.

### Tutorial [Proposta de implementação]

- Nascimento: sorteio, raça, core, dons e origem, sem forçar reroll.
- Primeiros passos: ficha, atributos e treino.
- Sobrevivência: coleta, mochila, venda e gold.
- Preparação: compra/produção e equipamento.
- Primeiro combate: risco, vida, habilidades e recuo.
- Guilda: missão inicial, objetivo e recompensa.
- Jornada livre: encerrar tutorial principal; contextualizar pets, Limiar, fusão, produção avançada e competição no primeiro acesso. Não alterar regras do jogo para forçar tutorial; garantir pular, retomar, consultar e salvar.

### Protocolo de assets

Solicitação ao autor deve incluir identificador, descrição e estilo visual, dimensões totais e por frame, grade, ordem e número de frames, perspectiva, escala, âncora/pivô, transparência RGBA real (sem quadriculado embutido), formato PNG e destino sugerido. Para camadas, mesmas proporções/âncoras e alinhamento; preservar identidade e evitar deformações. Validar arquivo recebido, transparência, recorte, bordas e integração antes de substituir placeholder. Autor gera recursos quando solicitado; agente especifica e integra.

## Roadmap de consolidação [Proposta de ordem]

| Fatia | Nome | Entrega | Critério de aceite |
| --- | --- | --- | --- |
| F13.1 | Estabilização técnica e segurança | Corrigir autoridade do save, concorrência, idempotência, sincronização e cache; testes de regressão. | Importação não permite adulterar progresso competitivo; concorrência e falhas de rede testadas. |
| F13.2 | Contas e persistência | Autenticação real, banco ativo, isolamento por conta, recuperação e migração de save local. | Mesma conta em dois dispositivos; contas distintas isoladas; logout seguro; persistência comprovada. |
| F13.3 | Apresentação e entrada | Tela inicial, login/cadastro, seleção/criação de personagem. | Fluxo completo de usuário novo e recorrente, sem personagem obrigatório antes do login. |
| F13.4 | Interface e navegação | Revisar arquitetura de informação, responsividade, feedback e protagonismo do personagem. | Jornadas principais claras em mobile e desktop; funcionalidades existentes preservadas. |
| F13.5 | Tutorial | Onboarding interativo e contextual, pulável e revisável, com progresso salvo por conta/personagem conforme escopo. | Jogador aprende sorteio, treino, coleta, venda, equipamento, combate e guilda por ações reais. |
| F13.6 | Direção artística | Identidade visual, sprites modulares, ícones e animações; prompts para o autor quando necessários. | Assets validados e integrados; placeholders não bloqueiam desenvolvimento. |
| F13.7 | Auditoria em execução | Playwright/E2E, playtest, desempenho mobile, acessibilidade e calibração. | Jornadas críticas verificadas; testes, lint, typecheck e build verdes; resultados documentados. |
| F13.8 | Consolidação web/PWA | Revisão de release, regressões, deploy e validação offline/online. | Web aprovada pelo autor, sem bloqueios críticos, antes de F14. |

F14 (Expo/mobile) somente após aceite da web; F15 expansão e competição global são propostas posteriores, não autorização de execução. Preservar histórico das fatias. Autor/diretor criativo decide conceitos e dá feedback/gera arte solicitada; agente implementa, testa, documenta, propõe UX e solicita assets. Cada fatia segue implementar → testar → revisar → corrigir → consolidar → autorizar a próxima. Atualização documental não autoriza automaticamente execução de código nem custo de infraestrutura.

## Referências internas

[Roadmap](ROADMAP.md) · [Arquitetura](ARQUITETURA.md) · [Decisões](DECISOES.md) · [Segurança](SEGURANCA.md) · [Calibração](CALIBRACAO.md) · [GDD](GDD.md) · [Relatório histórico](../RELATORIO-idle-personagem-unico.md).
