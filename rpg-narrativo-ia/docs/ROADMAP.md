# Roadmap de evolução sandbox

## Princípio

O motor narrativo consolidado será mantido como camada de eventos e diálogos. A exploração será construída por sistemas independentes, um de cada vez, sempre seguindo o ciclo:

```text
especificar → implementar → testar → revisar → corrigir → consolidar → próxima etapa
```

Não iniciar duas etapas simultaneamente. Cada sistema deve estar estável antes de servir de dependência para o seguinte.

## Sequência aprovada

### Etapa 1 — Horário e data

**Implementada e integrada.** O módulo `modules/time` fornece um relógio determinístico por períodos e avanço de dias. O Sistema 7 passou a aplicar os custos das ações sandbox.

Fonte: `SYSTEM-TIME-AND-DATE.md`.

### Etapa 2 — Ciclo diário

**Implementada e integrada.** O módulo `modules/day-cycle` interpreta o avanço do relógio e produz eventos de início e encerramento de períodos e dias, além da fase visual derivada. O Sistema 7 usa esses eventos para recuperação populacional; tema por fase, sobrevivência, agenda e clima não possuem implementação aprovada.

Fonte: `SYSTEM-DAY-CYCLE.md`.

### Etapa 3 — Navegação hierárquica

**Implementada e integrada.** O módulo `modules/navigation` carrega o mapa JSON aninhado e controla localização, descoberta, bloqueios e movimento entre pai, filhos diretos e irmãos. O Sistema 7 persiste o estado, aplica custo e expõe destinos na superfície mobile. A UI possui uma primeira representação visual dos arredores adjacentes, sem mapa global.

Fonte: `SYSTEM-NAVIGATION.md`.

### Etapa 4 — Exploração e descobertas

**Implementada e integrada.** O módulo `modules/exploration` aumenta o percentual de conhecimento de cada local, revela conteúdo dirigido por dados e deriva a conclusão da zona. O Sistema 7 persiste o estado, aplica custo, oferece a ação na interface e conecta uma descoberta ao primeiro encontro.

Fonte: `SYSTEM-EXPLORATION.md`.

### Etapa 5 — Recursos e ecologia

**Implementada e integrada.** O módulo `modules/resources` modela pontos de coleta com capacidade limitada, coleta atômica, renovação curta ou longa e populações que podem ser pressionadas ou extintas localmente. O Sistema 7 persiste, aplica custo e expõe coleta na interface.

Fonte: `SYSTEM-RESOURCES.md`.

### Etapa 6 — Crafting e cozinha

**Implementada e integrada.** O módulo `modules/crafting` declara receitas, consome materiais atomicamente, constrói estruturas no local atual e cozinha quando há estação ativa. O Sistema 7 persiste, aplica custo e expõe receitas na interface.

Fonte: `SYSTEM-CRAFTING.md`.

### Etapa 7 — Integração explorável

Fonte: `SYSTEM-INTEGRATION.md`.

#### Fatia 7.1 — Estado integrado e persistência principal

**Implementada.** `GameState` passou a incluir `sandbox`; esta fatia introduziu `schemaVersion: 2` e migração de partidas v1. A Fatia 7.3 evoluiu depois o formato atual para schema 3.

#### Fatia 7.2 — Orquestrador de ações e tempo

**Implementada.** `executeSandboxAction` aplica o custo uma vez, recupera populações, sincroniza renovação e reavalia descobertas e receitas sem alterar a interface.

#### Fatia 7.3 — Da introdução à exploração livre

**Implementada.** Depois da capacidade inicial o jogador permanece `playing` sem sessão narrativa, na Clareira do Despertar.

#### Fatia 7.4 — Superfície mobile

**Implementada.** Destinos, explorar, coletar e fabricar estão na interface mobile.

#### Fatia 7.5 — Gatilho de mundo e primeiro encontro

**Implementada.** O jogador desperta, escolhe uma capacidade, explora a Clareira e encontra a criatura e Mira por consequência da descoberta `first-priority-event`. Depois da noite, retorna ao sandbox. O marco mínimo do Sistema 7 foi atingido.

### Etapa 8 — Presenças e interações no mundo

**Aprovada e especificada.** A Fatia 8.1 está implementada isoladamente. Fonte: [Sistema 8 — Presenças e interações](SYSTEM-PRESENCES.md).

#### Fatia 8.1 — Catálogo e estado isolado

**Implementada.** `modules/presences` valida entidades e presenças, mantém estado mínimo serializável e deriva status. Não altera `GameState`, schema, persistência, UI, tempo ou narrativa.

#### Fatia 8.2 — Sincronização com descobertas

**Aprovada, aguardando revisão e autorização após a Fatia 8.1.** Sincronizar descobertas reveladas com presenças e derivar disponibilidade por localização e condições.

#### Fatia 8.3 — Interações

**Aprovada, aguardando a Fatia 8.2.** Modelar observar, investigar, aproximar, conversar e evitar como ações dirigidas por dados, ainda sem aplicar o custo no relógio.

#### Fatia 8.4 — Estado integrado e orquestração

**Aprovada, aguardando a Fatia 8.3.** Integrar o estado mínimo ao save, criar migração e executar interações atomicamente com custo temporal único.

#### Fatia 8.5 — Interface mobile

**Aprovada, aguardando a Fatia 8.4.** Mostrar presenças conhecidas no local e permitir ações contextuais na UI existente.

#### Fatia 8.6 — Conteúdo protótipo

**Aprovada, aguardando a Fatia 8.5.** Validar uma presença social e uma de criatura usando Mira e coelhos chifrudos.

## Depois do Sistema 8

Não existe Sistema 9 aprovado nem uma ordem fechada posterior. A classificação completa está em [Estado, metas e horizonte](PROJECT-STATUS.md).

### Direções definidas pelo autor, ainda sem próxima especificação

- interagir com elementos do cenário além de coleta, crafting e presenças;
- ampliar exploração, passagens, áreas bônus, recursos, crafting e cozinha;
- permitir trama principal, conteúdo opcional e alguma forma futura de conclusão de áreas ou rotas;
- desenvolver assentamentos, facções e modelos de sociedade como partes do universo narrativo.

### Em discussão

- minijogos;
- expansão do mapa visual para visão regional ou global;
- objetivos e notificações mais amplos do Sistema;
- progressão extensa de NPCs;
- formato de rotas e de conclusão global.

### Ainda não discutido / sem certeza de implementação

- estado persistente próprio, agenda e deslocamento autônomo de NPCs;
- comportamento ou IA de criaturas;
- sobrevivência automática;
- ferramentas, equipamentos, durabilidade e combustível;
- grupo ou companheiros;
- combate;
- clima, economia, comércio ou viagem rápida;
- administração jogável de assentamentos ou facções;
- geração procedural, backend, sincronização, monetização e editor.

Nenhum item desta seção autoriza implementação. Depois da Fatia 8.1, cada fatia do Sistema 8 precisa ser validada antes da seguinte. Uma etapa posterior só recebe número depois de ser discutida, especificada e aprovada pelo autor.

## Regra de entrada de um sistema

Antes de implementar, definir:

1. problema de diversão ou imersão resolvido;
2. estado lido e alterado;
3. contratos públicos;
4. apresentação mobile;
5. relação com tempo, navegação e narrativa;
6. menor sequência jogável;
7. testes e critérios de aceite;
8. itens explicitamente fora da etapa.
