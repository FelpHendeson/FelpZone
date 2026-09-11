# Sistema 9 — Necessidades e sobrevivência leve

## Estado da decisão

**Implementado e consolidado.** As Fatias 9.1 a 9.5 estão implementadas, revisadas e consolidadas. O autor aprovou o Sistema 9 desde que o conteúdo atual permita ao jogador sobreviver e que combate não seja necessário; a prova ponta a ponta confirmou esse contrato.

Esta etapa cria pressão e propósito para horário, exploração, recursos, crafting e cozinha. Não transforma o jogo em um simulador punitivo nem autoriza combate.

## Objetivo de experiência

O jogador deve perceber que suas ações consomem parte do dia e que o corpo precisa de água, alimento e descanso. A resposta deve vir dos sistemas já existentes:

```text
agir e explorar
      ↓
tempo passa e necessidades mudam
      ↓
buscar água, alimento e um lugar para descansar
      ↓
consumir, cozinhar ou repousar
      ↓
recuperar condição e continuar explorando
```

O ciclo precisa incentivar planejamento sem criar um beco sem saída. Estados críticos comunicam risco, mas as ações essenciais de recuperação continuam disponíveis.

## Regra central de suficiência

O Sistema 9 não pode exigir combate, uma nova área ou um novo ponto de recurso para manter o personagem vivo. O conteúdo já implementado precisa bastar:

| Necessidade | Resposta existente | Regra de suficiência |
| --- | --- | --- |
| Sede | `spring` produz `raw-water` e renova em 1 período. A água narrativa `agua-limpa` também pode ser consumível. | A rota sustentável não depende de purificação, recipiente ou nova receita nesta etapa. |
| Fome | `horned-rabbit-warren` produz carne; `cook-horned-rabbit-meat` usa a fogueira. | O consumo médio necessário deve ficar abaixo da recuperação de 2 unidades da população por dia. |
| Energia | A ação de repousar será adicionada e poderá ocorrer em qualquer local conhecido. | A fogueira melhora o repouso, mas não é requisito para evitar um bloqueio permanente. |
| Saúde | Repouso junto à fogueira recupera pouco; necessidades críticas causam desgaste gradual. | Necessidades não reduzem a saúde abaixo de 1 no primeiro protótipo. |
| Fogo | `fallen-sticks` é renovável e `build-campfire` já existe. | Não haverá combustível, extinção ou manutenção de fogueira nesta etapa. |

A coleta da toca continua sendo a abstração aprovada do Sistema 5. Ela não abre batalha, não cria vida de criatura e não depende do encontro visual com o coelho.

## Necessidades

O primeiro recorte usa quatro valores de `0` a `100`:

| ID | Interpretação | Polaridade |
| --- | --- | --- |
| `saude` | condição física geral | maior é melhor |
| `energia` | capacidade de continuar agindo | maior é melhor |
| `fome` | necessidade de alimento | menor é melhor |
| `sede` | necessidade de água | menor é melhor |

`saude`, `energia` e `fome` já existem em `Attributes`. A integração acrescentará `sede` ao mesmo contrato e migrará saves anteriores. `humanidade` e `cautela` continuam atributos narrativos, fora do desgaste automático.

Valores iniciais propostos para o protótipo:

```ts
{
  saude: 80,
  energia: 70,
  fome: 30,
  sede: 25
}
```

Os números são balanceamento de protótipo, não decisão definitiva.

## Desgaste por período

Cada período efetivamente cobrado por um `TimeCost` aplica, uma única vez:

```text
fome    +3
sede    +5
energia -2
```

Depois do desgaste base de cada período:

- `fome === 100` causa `saude -2`;
- `sede === 100` causa `saude -3`;
- `energia === 0` causa `saude -1`;
- as penalidades podem se acumular;
- o desgaste de necessidades nunca reduz `saude` abaixo de `1` neste sistema.

Não há aleatoriedade. Custo zero não desgasta necessidades. Ler, abrir menus e permanecer parado sem escolher uma ação não consome tempo.

O efeito narrativo `world.period` apenas alinha a cena e não representa sozinho um custo. Ele não aplica desgaste automático. Eventos narrativos continuam podendo alterar atributos por efeitos declarados no próprio conteúdo.

## Faixas de apresentação

As faixas são derivadas e não entram no save:

| Situação | Saúde/energia | Fome/sede |
| --- | --- | --- |
| estável | `>= 50` | `<= 49` |
| atenção | `25..49` | `50..74` |
| urgente | `1..24` | `75..99` |
| crítico | `0` | `100` |

As cores ajudam, mas texto, ícone e rótulo precisam transmitir o estado sem depender somente de cor.

## Consumíveis aprovados

O catálogo de necessidades referencia IDs já existentes:

| Item | Resultado inicial | Observação |
| --- | --- | --- |
| `raw-water` | `sede -45` | Água clara da nascente; contaminação não existe no protótipo. |
| `agua-limpa` | `sede -45` | Item obtido pela narrativa. |
| `cooked-horned-rabbit-meat` | `fome -36`, `energia +6` | Principal alimento renovável. |
| `fruto-desconhecido` | `fome -12` | Recurso auxiliar da narrativa; não participa da prova obrigatória de sobrevivência. |

`raw-horned-rabbit-meat` não pode ser consumida. Não criar intoxicação, validade, qualidade, peso, recipiente ou preparo de água nesta etapa.

Consumir:

- remove exatamente uma unidade do inventário;
- custa `0` períodos;
- aplica os efeitos uma única vez;
- falha atomicamente se o item não existir ou não for consumível;
- informa quando parte da recuperação foi limitada em `0` ou `100`;
- não permite consumo repetido por duplo clique enquanto a ação anterior está em andamento.

## Repouso

Duas modalidades iniciais usam somente o mundo atual:

| Modalidade | Condição | Custo | Resultado antes do desgaste do custo |
| --- | --- | --- | --- |
| repouso simples | qualquer localização conhecida | 2 períodos | `energia +24` |
| repouso junto à fogueira | `campfire` ativa no local atual | 2 períodos | `energia +40`, `saude +6` |

O orquestrador mantém a ordem consolidada: efeito da ação → `TimeCost` → desgaste por cada período → demais sincronizações. Portanto, o ganho líquido de energia já considera os dois períodos consumidos.

Repouso não exige noite, abrigo, cama, combustível ou NPC. Agenda de sono e qualidade de abrigo podem ser discutidas depois.

## Estados críticos e prevenção de softlock

No Sistema 9 inicial:

- fome, sede ou energia críticas não bloqueiam movimento, coleta, consumo nem repouso;
- não existe morte permanente, tela de game over ou perda de save por necessidades;
- saúde permanece em pelo menos 1 quando o dano vem de necessidades;
- a UI deve destacar a ação que pode aliviar o estado atual;
- o jogador pode se recuperar mesmo depois de administrar mal os recursos;
- ações inválidas continuam falhando sem aplicar tempo ou desgaste.

Essas proteções permitem validar o ciclo antes de discutir derrota, incapacidade ou consequências narrativas mais duras.

## Integração e ordem transacional

Quando integrada ao orquestrador, uma ação com custo segue:

1. validar e executar a ação primária;
2. aplicar os efeitos declarativos da ação;
3. avançar o relógio uma vez pelo `TimeCost`;
4. aplicar desgaste de necessidades para cada período cruzado;
5. processar recuperação populacional e renovação de recursos;
6. reavaliar descobertas, receitas e presenças;
7. validar e devolver um único `GameState` final.

Falha em qualquer etapa não devolve nem persiste estado parcial. Renovação ecológica e desgaste corporal observam o mesmo avanço temporal, mas permanecem módulos independentes.

## Persistência

A integração de `sede` exigirá `schemaVersion: 5`.

- saves v4 válidos recebem `sede: 25` durante a migração;
- v1, v2, v3 e v4 atravessam a cadeia de migração até v5;
- os demais atributos e todo o sandbox são preservados;
- faixas derivadas, catálogos de consumíveis e regras de desgaste não entram no JSON;
- ler um save não consome tempo, não altera necessidades e não regrava o armazenamento.

## Interface mobile

- o HUD passa a mostrar sede ao lado de saúde, energia e fome sem estourar 320 px;
- a mochila mostra `Consumir` apenas para itens aprovados;
- o painel Ações oferece `Repousar` e informa a melhoria da fogueira quando aplicável;
- feedback indica alterações com polaridade compreensível, por exemplo `Fome −36` e `Sede +5`;
- avisos críticos não usam modal a cada período;
- todos os alvos de toque mantêm pelo menos 48 px;
- nenhuma informação de combate aparece.

## Prova obrigatória de sobrevivência

Antes da consolidação, um teste determinístico ponta a ponta deve demonstrar pelo menos sete dias de jogo usando somente:

- exploração e navegação atuais;
- água da nascente;
- gravetos e fogueira atuais;
- carne da toca e receita de cozinha atuais;
- consumo e repouso do Sistema 9.

O cenário não pode depender de `fruto-desconhecido`, `agua-limpa`, ajuda de Mira, combate, novo recurso ou manipulação direta do estado. A coleta média de coelhos deve ficar abaixo ou igual à recuperação de 2 unidades por dia, sem extinção local. Ao final, saúde deve estar acima de 1 e o jogador ainda deve conseguir executar ações.

## Fatias aprovadas

### Fatia 9.1 — Modelo puro e prova matemática

**Implementada, revisada e consolidada.** `modules/needs` contém estado isolado, configuração validada, desgaste de 0 a 10.000 períodos, penalidades críticas com piso de saúde, efeitos de consumo e repouso, faixas derivadas, catálogos profundamente imutáveis e uma simulação determinística de sete dias. Não altera `GameState`, schema, persistência, UI ou orquestrador.

A revisão rejeita catálogos indexados quando a lista e o índice redundante divergem por entrada ausente, extra, fora de ordem ou com valor diferente. A entrega passou por 16 testes próprios e pela suíte completa de 466 testes, além de lint, tipos e build/PWA.

### Fatia 9.2 — Estado principal e migração

**Implementada, revisada e consolidada.** `Attributes` e `ATTRIBUTE_IDS` incluem `sede`; novas partidas começam com `sede: 25`; esta fatia introduziu o schema 5, depois sucedido pelo schema 6 do Sistema 10. Os contratos legados de atributos permanecem separados para validar e migrar saves v1, v2, v3 e v4 sem mutar a entrada, avançar tempo ou regravar o armazenamento. A validação rejeita sede ausente, fracionária ou fora de `0..100`. A entrega acrescentou 13 testes próprios e passou pela suíte completa de 479 testes. Desgaste automático, consumo, repouso e controles visuais foram adicionados nas fatias seguintes do Sistema 9.

### Fatia 9.3 — Ações e passagem do tempo

**Implementada, revisada e consolidada.** `needs.consume` remove uma unidade e custa zero; `needs.rest` oferece repouso simples e repouso aprimorado condicionado a fogueira ativa no local. O orquestrador aplica efeito da ação → avanço único do relógio → desgaste por período → ecologia e reavaliações. O resultado expõe o resumo do desgaste. Falhas permanecem atômicas e não existe bloqueio crítico, morte ou UI nesta fatia. A entrega acrescenta 8 testes próprios e passou pela suíte completa de 487 testes, além de lint, tipos, build/PWA e revisão sem achados acionáveis.

### Fatia 9.4 — Interface mobile

**Implementada, revisada e consolidada.** O HUD mostra as quatro necessidades e suas faixas, a mochila oferece consumo apenas aos itens aprovados, o painel Ações oferece o melhor repouso válido no local e o feedback diferencia recuperação, desgaste e condição crítica. A superfície bloqueia repetição enquanto uma ação está pendente e mantém recuperação disponível sem modal ou combate.

A revisão corrigiu o desbloqueio depois de falha na persistência, tornou a faixa textual sempre visível no HUD e removeu um corte de vitais em larguras intermediárias. A entrega acrescenta 5 testes próprios e passou pela suíte completa de 492 testes, além de lint, tipos, build/PWA e revisão visual sem overflow em 320, 360, 390, 480 e 500 px, com alvos visíveis de pelo menos 48 px.

### Fatia 9.5 — Conteúdo e sobrevivência ponta a ponta

**Implementada, revisada e consolidada.** A prova parte do fluxo narrativo público, prepara clareira, nascente, mata e fogueira apenas por ações públicas e persiste/recarrega depois de cada passo. Sete ciclos de água, uma unidade de coelho, cozinha, consumo e repouso atravessam oito dias após a preparação. O resultado é Saúde 100, Energia 96, Fome 6 e Sede 25; foram coletadas 7 unidades de coelho, média de 0,875 por dia, sem extinção local. Nenhum valor de protótipo precisou ser alterado. A entrega passou pela suíte completa de 493 testes, lint, tipos, build/PWA e revisão sem achados de código acionáveis.

## Fora do Sistema 9

- combate, armas, dano de criaturas ou estatísticas de inimigos;
- morte permanente, perda de save ou tela de derrota;
- sono obrigatório por horário e agenda;
- doença, intoxicação, temperatura, clima ou ferimentos detalhados;
- abrigo construível além da fogueira existente;
- combustível, durabilidade, ferramentas ou peso;
- buffs, debuffs, qualidade de alimento ou validade;
- novo mapa, ponto de recurso, animal, NPC ou receita;
- automação de NPCs ou criaturas;
- balanceamento definitivo.

## Critérios de conclusão

- o tempo altera necessidades uma única vez por período cobrado;
- água, comida e repouso existentes recuperam o jogador;
- consumo e repouso são atômicos e persistidos;
- uma rota de sete dias prova que o conteúdo atual é suficiente;
- não existe combate nem dependência de combate;
- estados críticos não causam softlock ou perda irreversível;
- save v1 a v4 migra corretamente para v5;
- UI mobile mostra condição e ações sem overflow;
- testes, lint, tipos, build, revisão de código e revisão visual passam.
