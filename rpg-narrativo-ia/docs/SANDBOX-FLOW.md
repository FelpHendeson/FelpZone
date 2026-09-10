# Visão sandbox e fluxo de jogo

## Decisão de produto

O jogo não será uma sequência permanente de evento, escolha e próximo evento. Depois da introdução, o jogador fica livre em um mundo navegável. A narrativa é acionada quando suas ações encontram pessoas, criaturas, objetos, locais ou condições relevantes.

O resultado desejado é um jogador que desperta, explora, mapeia o mundo e encontra NPCs e criaturas. Diálogos e escolhas acontecem dentro desses encontros.

## Loop principal

```text
Exploração livre
      ↓
Escolher destino ou interação
      ↓
Validar ação
      ↓
Aplicar custo e avançar tempo
      ↓
Atualizar mundo e localização
      ↓
Resolver gatilhos
      ↓
Narrativa, diálogo ou interação, se houver
      ↓
Aplicar consequências
      ↓
Retornar à exploração
```

## Abertura dirigida

1. Criar nome e sobrenome.
2. Despertar depois do Reset.
3. Conhecer o Sistema.
4. Escolher uma capacidade inicial.
5. Receber uma introdução curta a horário e navegação.
6. Entrar no modo de exploração.

A introdução reutiliza o conteúdo atual até a capacidade inicial. Depois dela, o motor não seleciona automaticamente `first-priority`. Explorar a Clareira revela `first-priority-event` e a presença de Mira; a narrativa só começa se o jogador escolher conversar. Ao terminar a noite, a sessão devolve o jogador à exploração.

## Modos

- `introduction`: sequência inicial dirigida.
- `exploration`: modo padrão para navegar e agir.
- `narrative`: acontecimentos do mundo sem conversa direta.
- `dialogue`: encontros com personagens e escolhas sociais.
- `interaction`: objetos, coleta e investigação; minijogos foram citados como possibilidade, mas não estão decididos.
- `summary`: encerramentos e resumos de marcos.

Menus não constituem modo de mundo e não avançam tempo.

## Gatilhos

O resultado desejado admite gatilhos como os abaixo, mas somente `discovery.revealed` está implementado no mecanismo genérico. As Fatias 8.1 a 8.6 do Sistema 8 isolam o catálogo de presenças, sincronizam descobertas, planejam interações, persistem, apresentam e validam Mira e o coelho. O catálogo `FIRST_DAY_WORLD_TRIGGERS` está vazio: explorar a Clareira não abre mais `first-priority` automaticamente. Demais tipos de gatilho continuam para etapas posteriores:

- entrada em local;
- primeira visita;
- interação com elemento do cenário;
- presença de NPC ou criatura;
- mudança de período;
- começo ou fim de dia;
- atributo, item, relação ou flag;
- conclusão de evento anterior;
- combinação das condições anteriores.

Exemplo conceitual:

```json
{
  "id": "primeiro-encontro-mira",
  "trigger": {
    "type": "location.enter",
    "locationId": "riacho"
  },
  "conditions": [
    { "type": "time.period.in", "periodIds": ["manha", "meio-dia"] },
    { "type": "flag.is", "flag": "met.mira", "value": false }
  ],
  "repeat": { "type": "once" }
}
```

O primeiro gatilho implementado é declarativo: `source.type: 'discovery.revealed'` associa uma descoberta a `campaignId` / `eventId`. O mecanismo vive em `modules/world-events`. A campanha `first-day` não registra mais essa ligação automática. Consumo único, quando um gatilho ativo dispara, fica em `GameState.flags`. Outros tipos (entrada em local, presença de NPC, período) são possibilidades ainda sem etapa aprovada.

## Trama principal e conteúdo opcional

A campanha principal existe, mas pode ser temporariamente ignorada. O jogador poderá:

- avançar objetivos principais;
- conhecer e desenvolver NPCs;
- descobrir locais opcionais;
- investigar o Reset;
- encontrar habilidades e recursos;
- completar rotas ou uma região inteira.

Bloqueios precisam ser consequência clara de local, horário, condição, item, relação ou progresso. Nunca devem parecer botões quebrados.

## Interface de exploração

Em uma tela mobile, mostrar:

- cabeçalho com dia e período;
- nome e caminho da localização atual;
- placeholder visual da área;
- ações locais;
- destinos permitidos;
- avisos de custo de tempo;
- navegação inferior para mapa, personagem, inventário, histórico e objetivos.

O mapa inicial pode ser textual ou composto por cartões. Não exige ilustração final.

## Exploração, coleta e criação

Essas ações possuem responsabilidades diferentes:

- **explorar** aumenta o conhecimento do local e revela conteúdo;
- **coletar** utiliza um ponto de recurso já descoberto e altera sua disponibilidade;
- **criar** transforma materiais conhecidos por meio de uma receita e, quando necessário, uma estrutura.

Uma área pode estar 100% explorada e ainda possuir recursos em recuperação. Da mesma forma, descobrir um ponto de coleta não concede automaticamente seus materiais.

Exploração poderá revelar marcos, passagens, subáreas secretas, NPCs, habitats de criaturas, eventos e pontos de recurso. Cada descoberta entra no estado do mundo e pode desbloquear novas ações.

## Limites atuais

- a superfície mobile de exploração (Fatia 7.4) já expõe navegar, explorar, coletar e fabricar;
- o mecanismo de gatilho (Fatia 7.5) permanece disponível; a campanha `first-day` não usa mais a ligação automática da Clareira;
- a Fatia 8.6 mostra Mira após explorar a Clareira e abre `first-priority` só ao conversar; o coelho na Mata Densa permanece no sandbox;
- nenhum minijogo está definido ou aprovado;
- o Sistema 8 foi aprovado para entidades, presenças por local, descoberta, disponibilidade derivada, resolução e ações contextuais;
- a Fatia 8.1 já isolou o catálogo e o estado de presenças;
- a Fatia 8.2 sincroniza descobertas reveladas com presenças conhecidas;
- a Fatia 8.3 planeja interações dirigidas por dados;
- a Fatia 8.4 persiste o estado mínimo no sandbox e executa `presence.interact` no orquestrador;
- a Fatia 8.5 expõe essas presenças na interface mobile existente;
- saves com `world.trigger.first-priority.consumed` reconciliam Mira como resolvida;
- `NPCState` completo e agenda continuam fora do escopo;
- comportamento de criaturas e combate não foram discutidos nem aprovados;
- o Sistema 9 de necessidades e sobrevivência leve foi aprovado e especificado, mas ainda não está implementado; o conteúdo atual deverá sustentar o jogador sem combate;
- outros tipos de gatilho (entrada em local, presença, período) ainda não existem nem possuem etapa aprovada;
- não há viagem rápida nem conexões especiais no primeiro mapa.
