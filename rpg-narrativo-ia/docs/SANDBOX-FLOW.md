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

A introdução pode reutilizar o conteúdo atual. Depois dela, o motor não deve selecionar automaticamente uma longa cadeia de eventos.

## Modos

- `introduction`: sequência inicial dirigida.
- `exploration`: modo padrão para navegar e agir.
- `narrative`: acontecimentos do mundo sem conversa direta.
- `dialogue`: encontros com personagens e escolhas sociais.
- `interaction`: objetos, coleta, investigação e futuros minijogos.
- `summary`: encerramentos e resumos de marcos.

Menus não constituem modo de mundo e não avançam tempo.

## Gatilhos

Eventos poderão ser iniciados por:

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
    { "type": "time.period.in", "periodIds": ["morning", "noon"] },
    { "type": "flag.is", "flag": "met.mira", "value": false }
  ],
  "repeat": { "type": "once" }
}
```

O formato definitivo de gatilhos será especificado somente na integração dos três sistemas.

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

## Limites atuais

- nenhum minijogo está definido;
- NPCs não possuem agenda ainda;
- criaturas não possuem comportamento ainda;
- sobrevivência não será acoplada antes dos três sistemas básicos;
- gatilhos completos pertencem à etapa de integração;
- não há viagem rápida nem conexões especiais no primeiro mapa.
