# Backlog de execução, dependências e critérios de aceite

> Revisão 1.0 — 11/11/2026 | **Todos os itens: NÃO INICIADOS, salvo evidência posterior.**
>
> Este backlog é uma PROPOSTA operacional. Prioridade P0 = bloqueia fatia; P1 = necessário MVP; P2 = expansão. O backlog usa IDs estáveis e não substitui as regras dos capítulos temáticos.

## Legenda e como usar

Cada cartão possui: ID, dependência, entrega e critério de aceite. Só marcar como concluído se o arquivo/commit, execução e teste forem verificáveis. Não inventar estimativa sem medir velocidade. Marcar bloqueios em vez de declarar sucesso parcial.

### Marco G0 — Ambiente e primeira instalação Android

| ID | Prioridade | Depende | Entrega e aceite |
| --- | --- | --- | --- |
| ENV-01 | P0 | — | Registrar versão Unity, template, sistema e aparelho; projeto abre sem erro |
| ENV-02 | P0 | ENV-01 | Confirmar Android SDK/NDK/OpenJDK via Unity Hub e verificar saída do build |
| ENV-03 | P0 | ENV-01 | Criar projeto Unity 2D e fixar packages, settings e gitignore correto |
| ENV-04 | P0 | ENV-03 | Cena Bootstrap/Homologação com interface mínima; Play funciona no Editor |
| ENV-05 | P0 | ENV-02/04 | APK instalável e aberto em celular real; registrar comportamento e falhas |
| ENV-06 | P1 | ENV-03 | Pipeline de commits e convenção de branches/versões documentados |

**Saída G0:** projeto reproduzível + APK mínimo funcional. Não considerar “Android aparece em Build Profiles” como aceite.

### Marco G1 — Vertical slice visual

| ID | Prioridade | Depende | Entrega e aceite |
| --- | --- | --- | --- |
| ART-01 | P0 | ENV-03 | Contrato de arte de um arquétipo: dimensão, PPU, pivô, nomes e slots |
| ART-02 | P0 | ART-01 | Sprite base humanoide legível no tamanho real do aparelho |
| ART-03 | P0 | ART-02 | Camadas independentes corpo/cabelo/roupa/equipamento |
| ART-04 | P0 | ART-03 | Animação idle única sincronizando camadas sem jitter |
| ART-05 | P0 | ART-04 | Troca de cabelo, roupa e arma em execução, sem desalinhamento |
| ART-06 | P0 | ART-05 | Cena de quarto com personagem em destaque e toque reconhecido |
| ART-07 | P1 | ART-06 | Animação curta de cuidado + resposta visual/sonora |
| ART-08 | P1 | ART-05 | Catálogo visual com IDs/slots/compatibilidade/fallback |
| ART-09 | P0 | ART-06 | Build Android com teste de escala, legibilidade, memória e FPS anotados |

**Saída G1:** o usuário consegue observar personagem e ver uma troca real de aparência no celular. Congelar contrato de sprites somente após essa validação.

### Marco G2 — Loop jogável local

| ID | Prioridade | Depende | Entrega e aceite |
| --- | --- | --- | --- |
| SIM-01 | P0 | ENV-03 | Domain C# isolado e teste de uma regra pura |
| SIM-02 | P0 | SIM-01 | Estado de necessidades + relógio injetável, com limites temporais |
| SIM-03 | P0 | SIM-02/ART-07 | Alimentar, limpar, repousar e recuperar saúde em modelo local |
| SIM-04 | P0 | SIM-03 | UI mostra valores, consequências e recuperação de erro |
| MANA-01 | P0 | SIM-01/ART-06 | Circuito de Mana com tutorial, pulsos e feedback |
| MANA-02 | P0 | MANA-01 | Pontuação determinística, sessões e anti-duplo-reward local |
| RPG-01 | P0 | MANA-02 | XP, nível e pelo menos uma mudança de atributo explicada |
| INV-01 | P1 | ART-08 | Inventário local de teste + equipar/desequipar com compatibilidade |
| ECO-01 | P1 | RPG-01/INV-01 | Loja local de teste para uma compra e uma venda sem saldo negativo |
| SAVE-01 | P0 | SIM-04/RPG-01 | Save local de desenvolvimento versionado, restaura sem empilhar efeitos |
| UX-01 | P0 | MANA-01/ECO-01 | Fluxo cuidado → treino → moeda/XP → item; nenhum beco sem saída |
| QA-01 | P0 | SAVE-01 | Interrupção/reabertura, avanço simulado de horas/dias e dados consistentes |

**Saída G2:** uma sessão de ponta a ponta offline apenas de teste, sem converter saldo local em economia do serviço futuro.

### Marco G3 — Decisão e implementação online

| ID | Prioridade | Depende | Entrega e aceite |
| --- | --- | --- | --- |
| ADR-01 | P0 | G2 | Comparar provedores com limites/preços oficiais atuais e teste de banco |
| API-01 | P0 | ADR-01 | Contrato HTTP, autenticação e códigos de erro versionados |
| AUTH-01 | P0 | API-01 | Login, sessão, renovação, logout e recuperação conforme provedor |
| DB-01 | P0 | ADR-01 | Schema com donos, slots, catálogos, carteiras e migrações |
| SUM-01 | P0 | AUTH-01/DB-01 | Três slots, runa e invocação atômica gerada no servidor |
| SUM-02 | P0 | SUM-01 | Retry e concorrência com mesma/novas idempotency keys sem quarto slot |
| API-02 | P0 | DB-01 | Estado/sincronização por versão; rollback e erros claros |
| CARE-01 | P0 | API-02/SIM-02 | Cuidado e passagem de tempo autorizados, com servidor definindo tempo |
| ECO-02 | P0 | DB-01/INV-01 | Carteira e ledger transacional para compra/venda/equipar |
| REW-01 | P0 | API-02/MANA-02 | Sessão de atividade, conclusão única e limites de recompensa |
| SAVE-02 | P0 | API-02 | Recuperação em outro aparelho e após app encerrado |
| SEC-01 | P0 | SUM-02/ECO-02 | Teste cross-account, duplicação, replay, tampering e corrida |
| OPS-01 | P1 | DB-01 | Backup/exportação e restauração comprovada em ambiente de teste |

**Saída G3:** invocação, progresso e economia persistentes de forma segura; custos operacionais conhecidos. Backend gratuito é meta, não garantia.

### Marco G4 — MVP v0.1 O Despertar

| ID | Prioridade | Depende | Entrega e aceite |
| --- | --- | --- | --- |
| UI-01 | P0 | G3 | Entrada e recuperação de conta amigáveis |
| UI-02 | P0 | SUM-02 | Seleção de 3 slots, runa de pedra azul, reveal de nascimento persistido |
| UI-03 | P0 | G2/G3 | Lar com cuidados, barra de mana, ficha, inventário, loja e retorno |
| UI-04 | P0 | REW-01 | Tela de resultado mostra ganhos detalhados e confirma uma vez |
| TUTOR-01 | P1 | UI-03 | Primeira sessão ensina invocação, cuidado, treino e equipar |
| BAL-01 | P0 | UI-04 | Tabela inicial auditada: custo de cuidados, economia e progressão |
| ACC-01 | P1 | UI-03 | Touch targets, contraste, informações não só por cor e ajustes de som |
| QA-02 | P0 | UI-01/UI-04 | Regressão funcional e testes de segurança completos |
| REL-01 | P0 | QA-02 | APK de teste interno identificado, changelog e rollback possível |

**Saída G4:** checklist do GDD integralmente atendido em Android definido; problemas críticos resolvidos.

### Evoluções após MVP (não inclusas na data/escopo de G4)

| Marco | IDs propostos | Entrega condicionada à validação |
| --- | --- | --- |
| v0.2 | CLASS-01/02, COMBAT-01, RPG-02 | caminhos de classe e treino de combate com diferenciação real |
| v0.3 | PET-01/02/03, UX-02 | obtenção, vínculo, cuidados e progresso de pets |
| v0.4 | IDLE-01, MANA-03, GAME-02 | autonomia leve, variações de treino e novos ambientes |
| v0.5+ | RACE-02, TECH-01, SOCIAL-01 | híbridos, ficção científica e sistemas sociais após design específico |

## Pacote criativo inicial e novas tarefas de conteúdo (autorização 11/11/2026)

O criador autorizou produzir **modelos, customizações, raças, runas, habilidades e equipamentos candidatos** para uma versão jogável. Ver [22-pacote-conteudo-v1.md](22-pacote-conteudo-v1.md) e [26-plano-conteudo-e-aceite.md](26-plano-conteudo-e-aceite.md) para ids e critérios; as tarefas CONTENT-01, VIS-01..03, RACE-01, RUNE-01, CORE-01..02, EQUIP-01..03, CLASS-01, SKILL-01..02, MANA-03, PHYS-01, BAL-02, QA-CAT e ART-LEGAL são dependências adicionais, **não tarefas concluídas**.

Para não alterar a promessa de v0.1, a inclusão do pacote é **incremental**: G1 valida uma única base com peças; G2 integra dados básicos; G3/G4 usa pequeno subconjunto seguro; v0.2 classes e habilidades; v0.3 pets; V1 revisa o catálogo mais amplo. A aprovação autoral final dos candidatos depende de demonstração/feedback, enquanto a arquitetura e os testes são responsabilidade autônoma do agente.

## Dependências críticas

1. ENV antes de arte integrada e build.
2. ART-01–05 antes de catálogo de dezenas de skins e raças.
3. SIM-01/02 antes de necessidades, mana e progressão.
4. G2 antes de escolher contratos definitivos de economia online.
5. DB-01, SUM-02 e ECO-02 antes de abrir testes com contas reais.
6. QA-02 antes de distribuir um APK de teste mais amplamente.

## Regra de priorização

Se um bloqueio inviabilizar um marco, abrir uma correção com código e sufixo claro (ex.: ART-05-F1), registrar causa e teste de regressão; não avançar como se o gate tivesse passado. Se o jogo estiver bonito mas não divertido, não construir mais conteúdo: iterar no loop. Se a infraestrutura consumir muito tempo, preservar o protótipo local e reduzir escopo do online, nunca fingir que a economia local é segura.

## Registro de execução (modelo)

~~~text
Item: ART-05
Status: não iniciado | em andamento | bloqueado | em revisão | concluído
Responsável:
Branch/commit:
Evidência Android:
Resultado de testes:
Decisão ou impedimento:
Data de atualização:
~~~

O documento original [roadmap](10-roadmap.md) define marcos. Este backlog define COMO demonstrar que cada marco realmente avançou.
