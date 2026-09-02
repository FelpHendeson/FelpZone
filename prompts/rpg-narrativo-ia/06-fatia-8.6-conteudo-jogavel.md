# Prompt — Sistema 8, Fatia 8.6: conteúdo jogável e consolidação

> Executar somente após revisão e consolidação da Fatia 8.5.

```text
Implemente somente a Fatia 8.6 do Sistema 8 — Conteúdo jogável de Mira e coelhos chifrudos, integração do fluxo final e consolidação.

Trabalhe dentro de `rpg-narrativo-ia`. Leia integralmente toda a documentação, com prioridade para:

- `AGENTS.md` e `README.md`;
- `docs/PROJECT-STATUS.md`;
- `docs/PRODUCT.md`;
- `docs/SYSTEM-PRESENCES.md`;
- `docs/SANDBOX-FLOW.md`;
- `docs/CONTENT-AND-UI.md`;
- `docs/SYSTEM-INTEGRATION.md`;
- campanhas, catálogos, gatilhos de mundo, eventos narrativos e testes atuais.

Pré-condição: Fatias 8.1 a 8.5 implementadas, revisadas e sem pendências críticas. Não implemente contratos estruturais que deveriam ter sido resolvidos nas fatias anteriores sem antes relatar o conflito.

Objetivo:

Validar o Sistema 8 de ponta a ponta com duas experiências diferentes:

1. uma presença social de Mira que oferece interação e narrativa;
2. uma presença animal de coelho chifrudo que oferece interação não narrativa, sem combate.

Fluxo social mínimo:

explorar Clareira
→ revelar a descoberta vinculada a Mira
→ presença de Mira aparecer sem conversa automática
→ jogador escolher uma interação social
→ custo e efeitos aplicados uma vez
→ narrativa existente ou conteúdo mínimo compatível abrir
→ escolhas alterarem relação/flags conforme o motor atual
→ narrativa terminar
→ jogador retornar à mesma localização
→ ocorrência resolvida não iniciar novamente quando não deve

Fluxo animal mínimo:

explorar Mata Densa
→ revelar `horned-rabbit-tracks`
→ presença do coelho chifrudo aparecer
→ jogador observar ou investigar
→ receber feedback e consequência declarada
→ tempo avançar uma vez quando houver custo
→ continuar no sandbox
→ nenhuma tela ou estatística de combate surgir

Regras de conteúdo:

- reutilizar `mira-vale`, `mira-awakening-clearing`, `horned-rabbit` e `horned-rabbit-dense-woods` quando continuarem adequados;
- manter nomes e textos como conteúdo protótipo;
- declarar interações em dados, não em JSX;
- usar eventos, condições, efeitos, flags, relações e inventário existentes;
- qualquer texto novo deve respeitar a premissa do Reset;
- não transformar o protagonista em escolhido único;
- não adicionar ruínas ou objetos preservados da civilização antiga;
- não criar caça detalhada, combate, dano, captura ou domesticação;
- não atribuir comportamento autônomo ou agenda às presenças.

Revisão do primeiro gatilho:

O fluxo antigo abre `first-priority` automaticamente por `FIRST_DAY_WORLD_TRIGGERS` ao revelar `first-priority-event`. O objetivo final do Sistema 8 exige que a descoberta revele uma presença e que a narrativa comece por uma decisão explícita do jogador.

- remova, substitua ou desative somente a ligação automática específica quando o novo fluxo estiver completo;
- preserve o mecanismo genérico de gatilhos de mundo para usos futuros;
- não deixe a descoberta abrir narrativa e presença simultaneamente de forma duplicada;
- trate saves que já consumiram `world.trigger.first-priority.consumed`;
- não faça uma partida antiga repetir narrativa resolvida;
- cubra a transição com testes de regressão.

Interações mínimas sugeridas:

- Mira: `approach` ou `talk`, abrindo narrativa; `observe` pode ser não narrativa se o contrato suportar;
- coelho: `observe` ou `investigate`, com feedback e efeito leve já suportado pelo motor; `avoid` pode ser sem custo se fizer sentido;
- escolha o menor conjunto que prove os dois caminhos sem inventar novo sistema.

Testes end-to-end obrigatórios no nível do motor/UI-model:

- Mira não aparece antes da descoberta;
- revelar a descoberta mostra Mira, mas não abre narrativa automaticamente;
- interação social válida abre exatamente uma sessão;
- custo da interação é aplicado exatamente uma vez;
- terminar narrativa retorna à localização anterior;
- relação, flags, inventário e histórico continuam coerentes;
- presença resolvida não repete encontro indevido;
- coelho não aparece antes de `horned-rabbit-tracks`;
- interação com coelho permanece no sandbox e fornece feedback;
- interação animal não cria combate ou atributos inexistentes;
- save/reload preserva descobertas e resoluções;
- saves migrados não duplicam o primeiro encontro;
- navegação, exploração, coleta, crafting e narrativa anterior continuam funcionando;
- interface não apresenta overflow horizontal em 320, 360 e 390 px;
- console do navegador não apresenta erros.

Consolidação documental:

- marcar o Sistema 8 e a Fatia 8.6 como implementados somente se todos os critérios passarem;
- atualizar `SYSTEM-PRESENCES.md`, `PROJECT-STATUS.md`, `ROADMAP.md`, `SANDBOX-FLOW.md`, `SYSTEM-INTEGRATION.md`, `CONTENT-AND-UI.md`, README, AGENTS e handoff;
- registrar limitações reais;
- não criar ou numerar Sistema 9;
- sobrevivência leve continua sendo possibilidade até discussão e aprovação do autor.

Não implemente:

- combate;
- vida ou atributos próprios de criaturas;
- agenda, movimentação autônoma ou IA;
- caça detalhada;
- captura, domesticação ou grupo;
- sobrevivência automática;
- clima, economia ou facções jogáveis;
- conteúdo amplo além do necessário para validar o Sistema 8;
- arte final.

Execute:

npm test
npm run lint
npm run typecheck
npm run build

Além dos comandos, valide o fluxo completo no navegador em tela estreita e desktop. Relate arquivos alterados, rotas testadas, compatibilidade de save, decisões de conteúdo e qualquer pendência real.
```
