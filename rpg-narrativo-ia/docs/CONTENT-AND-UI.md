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

## Telas e estrutura visual atual

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

- HUD persistente com personagem, período e condição resumida;
- cena dominante com imagem ou placeholder;
- apresentação própria de encontro narrativo, com retrato opcional;
- texto e escolhas em cartões de leitura;
- acesso a histórico, personagem e mochila pela barra inferior.

### Exploração

- o local atual é a tela principal do loop sandbox;
- imagem dominante, descrição e progresso aparecem no mesmo bloco;
- explorar é a ação contextual principal;
- mapa visual mostra somente o local atual e destinos adjacentes já descobertos;
- as relações `parent`, `sibling` e `child` continuam derivadas do mapa hierárquico;
- coleta e crafting ficam agrupados no painel de ações;
- mochila usa uma grade visual de itens;
- ficha mostra atributos, capacidade inicial e relações;
- a navegação inferior alterna entre Mundo, Ações, Mochila e Eu;
- descobertas e resultados ganham feedback destacado sem criar novas regras de domínio.

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
- Manter a cena e a ação principal visíveis cedo na rolagem.
- Organizar ações secundárias por intenção em vez de exibir todas numa lista contínua.
- Não apresentar valores fictícios: clima, nível, peso, combate e outros indicadores só entram na UI quando existirem no domínio.

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

A Fatia 7.4 transforma a exploração em um loop jogável mobile: destinos visíveis, explorar o local, coletar pontos revelados e fabricar receitas conhecidas. A revisão posterior de UI/UX preserva esse contrato e o apresenta por HUD, cena, mapa adjacente, painéis e navegação inferior. A tela continua lendo o `GameState` e disparando ações do sandbox; apresentação não decide regra de jogo.

A Fatia 7.5 abre a sessão narrativa pelo gatilho de descoberta. A interface reutiliza `GameScreen` e o motor existente; não há uma segunda tela de diálogo. O feedback da ação pode avisar que algo exige atenção. Ao terminar `night-together` ou `night-alone`, o jogador volta à mesma exploração. Saves `completed` antigos continuam abrindo o resumo.

Encontrar e interagir com NPCs e criaturas é uma direção definida. Persistência própria, agendas, comportamento autônomo e combate são possibilidades ainda não discutidas; não existe uma próxima etapa aprovada para elas. Consulte `PROJECT-STATUS.md`.

Consulte `SANDBOX-FLOW.md` e as especificações dos sistemas antes de alterar telas.
