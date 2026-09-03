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

A introdução reutiliza o conteúdo atual até a capacidade inicial. Depois dela, o motor não seleciona automaticamente `first-priority`. A cadeia é aberta pelo gatilho de mundo associado à descoberta `first-priority-event`, revelada ao explorar a Clareira do Despertar. Ao terminar a noite, a sessão devolve o jogador à exploração.

## Modos

- `introduction`: sequência inicial dirigida.
- `exploration`: modo padrão para navegar e agir.
- `narrative`: acontecimentos do mundo sem conversa direta.
- `dialogue`: encontros com personagens e escolhas sociais.
- `interaction`: objetos, coleta e investigação; minijogos foram citados como possibilidade, mas não estão decididos.
- `summary`: encerramentos e resumos de marcos.

Menus não constituem modo de mundo e não avançam tempo.

## Gatilhos

O resultado desejado admite gatilhos como os abaixo, mas somente `discovery.revealed` está implementado. As Fatias 8.1 e 8.2 do Sistema 8 já isolam o catálogo de presenças e a sincronização com descobertas; interações e demais gatilhos continuam para etapas posteriores:

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

O primeiro gatilho implementado é declarativo: `source.type: 'discovery.revealed'` associa uma descoberta a `campaignId` / `eventId`. O catálogo vive em `modules/world-events` e na campanha `first-day`. Consumo único fica em `GameState.flags`. Outros tipos (entrada em local, presença de NPC, período) são possibilidades ainda sem etapa aprovada.

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
- o primeiro encontro (Fatia 7.5) abre `first-priority` a partir da descoberta `first-priority-event` e devolve o jogador ao sandbox;
- nenhum minijogo está definido ou aprovado;
- o Sistema 8 foi aprovado para entidades, presenças por local, descoberta, disponibilidade derivada, resolução e ações contextuais;
- a Fatia 8.1 já isolou o catálogo e o estado de presenças, sem ligá-los ao save, à UI, ao relógio ou à narrativa;
- estado persistente mínimo de ocorrências foi aprovado para uma fatia posterior, mas `NPCState` completo e agenda continuam fora do escopo;
- comportamento de criaturas e combate não foram discutidos nem aprovados;
- fome, alimento, descanso e abrigo aparecem na experiência, mas sobrevivência automática ainda não foi definida;
- outros tipos de gatilho (entrada em local, presença, período) ainda não existem nem possuem etapa aprovada;
- não há viagem rápida nem conexões especiais no primeiro mapa.
