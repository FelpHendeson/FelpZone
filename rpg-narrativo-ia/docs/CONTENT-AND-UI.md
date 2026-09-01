# Conteúdo e interface

## Campanhas como dados

Cada evento deve possuir identificador estável, texto, condições, escolhas e transição. O formato definitivo pode usar TypeScript ou JSON validado; priorize segurança de tipos e mensagens claras para conteúdo inválido.

Exemplo conceitual:

```ts
interface StoryEvent {
  id: string;
  title?: string;
  body: string;
  image?: ImageReference;
  conditions?: GameCondition[];
  choices: StoryChoice[];
}

interface StoryChoice {
  id: string;
  label: string;
  effects: GameEffect[];
  nextEventId: string;
}
```

Evite colocar funções, JSX ou lógica específica da interface nos arquivos de campanha.

## Telas do MVP

### Início

- título provisório;
- nova partida;
- continuar, somente quando existir salvamento;
- indicação de protótipo.

### Criação de personagem

- nome;
- sobrenome;
- validação simples;
- confirmação antes de começar.

### Jogo

- cabeçalho do personagem e período;
- resumo curto de atributos;
- imagem ou placeholder da cena;
- título e texto do evento;
- escolhas grandes e acessíveis ao toque;
- acesso a histórico, personagem e inventário.

### Resumo

- decisões marcantes;
- estado final;
- traço ou título resultante;
- reiniciar campanha.

## Diretrizes mobile-first

- Projetar primeiro para largura aproximada de 360 px.
- Não depender de hover.
- Manter alvos de toque confortáveis e separados.
- Evitar textos excessivamente largos em desktop.
- Garantir contraste, foco visível e navegação por teclado.
- Respeitar áreas seguras de aparelhos quando estiver em modo instalado.

## Placeholders de imagem

O MVP não deve buscar arte final nem usar imagens externas temporárias. Todo espaço visual recebe um componente local de placeholder.

O placeholder deve:

- preservar a proporção final esperada;
- mostrar um ícone ou forma neutra;
- exibir uma etiqueta como `Cena: despertar` ou `Retrato: sobrevivente`;
- usar cores coerentes com o tema provisório;
- possuir texto alternativo adequado;
- aceitar `kind`, `label` e proporção por propriedades;
- continuar apresentável se JavaScript ou o asset falhar.

Proporções iniciais:

- cenas: `16:9`;
- retratos: `1:1`;
- ícones de itens e habilidades: `1:1`.

Exemplo de uso esperado:

```tsx
<ImagePlaceholder kind="scene" label="Despertar após o Reset" />
<ImagePlaceholder kind="portrait" label="Sobrevivente desconhecido" />
```

Quando a arte final existir, o mesmo espaço deverá aceitar uma referência local sem exigir alterações no motor narrativo.

## Conteúdo inicial necessário

- três capacidades iniciais com vantagens compreensíveis;
- um perigo ou criatura;
- um sobrevivente com variável de confiança;
- um recurso compartilhável;
- uma decisão moral que reaparece mais tarde;
- pelo menos dois encerramentos do primeiro dia.

Os textos definitivos serão escritos depois que o motor aceitar uma campanha mínima de teste.

## Evolução sandbox

A Fatia 7.4 transforma a exploração em um loop jogável mobile: destinos visíveis, explorar o local, coletar pontos revelados e fabricar receitas conhecidas. Não há mapa gráfico complexo nem inventário novo; a tela lê o `GameState` e dispara `executeSandboxAction`. NPCs, criaturas e gatilhos narrativos pelo mundo continuam fora desta fatia.

Quando um gatilho iniciar uma narrativa ou diálogo, a interface reutiliza os componentes atuais. Ao terminar a sessão, retorna ao mesmo contexto de exploração, já com tempo, estado e mundo atualizados.

Consulte `SANDBOX-FLOW.md` e as especificações dos sistemas antes de alterar telas.
