# Fase 2 — Consolidação do motor narrativo

## Objetivo

Transformar o motor criado para o MVP em uma base confiável para receber novas campanhas e mecânicas. Esta fase deve fortalecer contratos, validações e testes sem ampliar o conteúdo ou redesenhar a interface.

Ao final, um sistema futuro de exploração, sobrevivência ou combate poderá usar o mesmo estado, condições e efeitos sem criar regras especiais dentro do React.

## Problema conhecido obrigatório

A função de leitura do salvamento valida apenas parte da estrutura. Um objeto com `schemaVersion` atual, mas campos internos incompletos, pode ser aceito e causar erro posteriormente na interface.

O parser deve validar profundamente:

- todos os atributos numéricos;
- identidade do personagem;
- evento e estado da partida;
- inventário e cada item;
- relações e cada vínculo;
- flags booleanas;
- entradas do histórico;
- dia e período válidos;
- capacidades e títulos;
- data de atualização.

Dados inválidos devem retornar `status: 'corrupt'`, nunca lançar erro ou chegar à UI como `GameState`.

## Garantias do motor

### Ciclo de vida

- Uma escolha só pode ser aplicada quando a partida estiver em `playing`.
- A escolha precisa existir no evento atual e cumprir suas condições.
- Uma partida concluída não aceita novas escolhas.
- Toda transição aponta para evento válido ou encerra a partida.
- Um evento apresentado deve cumprir suas próprias condições.

### Efeitos e recursos

- Efeitos produzem novo estado sem mutar o anterior.
- Atributos respeitam seus limites.
- Quantidades e variações devem ser números finitos e coerentes.
- Itens não podem ter quantidade zero, negativa ou fracionária no estado.
- Remover um recurso inexistente ou insuficiente deve falhar de maneira controlada, salvo quando o efeito declarar explicitamente outro comportamento no futuro.
- Relações não devem acumular entradas duplicadas para o mesmo personagem.
- Capacidades e títulos não devem ser concedidos em duplicidade.

### Campanhas

Ampliar `validateCampaign` para verificar, antes de jogar:

- IDs únicos de eventos, escolhas, itens, capacidades, NPCs e títulos;
- evento inicial existente e apresentável;
- destinos de todas as transições;
- candidatos `firstMatch` não vazios;
- referências de itens, capacidades, personagens e títulos existentes;
- valores finitos e quantidades positivas nos efeitos e condições;
- escolhas que removem itens protegidas por condição compatível;
- eventos sem escolhas ou sem rota válida;
- interpolação com variáveis conhecidas;
- alcançabilidade do evento inicial e existência de pelo menos um encerramento alcançável.

A validação pode retornar uma lista de diagnósticos legíveis. Não é necessário adicionar uma biblioteca de schema se tipos e validadores explícitos resolverem o problema com clareza.

## Resultado de uma escolha

Preservar `GameState` como fonte de verdade, mas considerar um retorno estruturado do motor:

```ts
interface ChoiceOutcome {
  previousState: GameState;
  state: GameState;
  appliedEffects: GameEffect[];
  eventId: string;
  choiceId: string;
}
```

Esse resultado permitirá futuramente mostrar feedback, animações e registros sem duplicar regras na interface. Implemente somente se a mudança simplificar o contrato atual e estiver coberta por testes; não force uma abstração desnecessária.

## Testes obrigatórios

- saves válidos continuam carregando;
- cada estrutura interna malformada retorna `corrupt`;
- versão diferente retorna `incompatible`;
- partida concluída rejeita escolhas;
- evento condicionado não pode ser acessado quando a condição falha;
- remoção insuficiente de item falha sem alterar o estado;
- campanha atual passa na validação ampliada;
- campanhas com referências quebradas produzem diagnósticos;
- todos os eventos da campanha atual são alcançáveis por alguma trajetória válida;
- todas as trajetórias válidas do MVP terminam sem evento morto;
- imutabilidade do estado permanece garantida.

Os testes de trajetórias podem percorrer a árvore de escolhas programaticamente, evitando depender de uma única sequência feliz.

## Compatibilidade

- Não reescrever a campanha apenas para facilitar os testes.
- Não alterar textos, identidade visual ou fluxo percebido sem necessidade.
- Manter saves válidos da versão atual sempre que o contrato permitir.
- Incrementar `schemaVersion` somente se o formato realmente mudar; nesse caso, documentar a decisão.

## Fora desta fase

- novos capítulos;
- combate, crafting ou exploração interativa;
- novos atributos, personagens ou facções;
- backend ou sincronização;
- arte final;
- grandes refatorações visuais.

## Critérios de aceite

- O problema conhecido de save corrompido está corrigido e testado.
- As garantias de ciclo de vida e recursos são aplicadas pelo motor.
- A campanha atual passa na validação ampliada.
- A árvore narrativa atual é verificada automaticamente.
- Testes, lint, tipos e build passam.
- O MVP continua jogável e visualmente equivalente.
- README e arquitetura refletem os contratos finais, não apenas a intenção.
