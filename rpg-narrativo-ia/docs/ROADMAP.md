# Roadmap de mecânicas

## Direção

Escolhas narrativas continuam sendo o eixo do jogo, mas não serão sua única interação. Mecânicas devem criar tensão, planejamento e expressão do personagem; depois, a narrativa interpreta suas consequências.

Cada sistema novo entra como um módulo pequeno, reutiliza contratos do motor e precisa participar de uma sequência jogável. Não construir vários sistemas completos em paralelo sem uma integração vertical.

```text
Situação narrativa
       ↓
Mecânica ou decisão sistêmica
       ↓
Alteração do estado
       ↓
Consequência narrativa
       ↓
Nova oportunidade mecânica
```

## Ordem proposta

### 1. Sobrevivência e tempo

Primeira expansão recomendada por aproveitar atributos já existentes.

- ações consomem períodos do dia;
- fome e energia criam prioridades;
- descanso e alimento possuem efeitos concretos;
- chegar à noite despreparado altera eventos.

Objetivo: fazer a escolha de água, abrigo ou localização ser também planejamento, não apenas diálogo.

### 2. Exploração por regiões

- poucos locais conectados;
- ações de observar, vasculhar, avançar e retornar;
- riscos e recursos conhecidos parcialmente;
- capacidade inicial modifica informações e opções.

Objetivo: permitir descoberta ativa sem criar mapa aberto.

### 3. Testes de capacidade e risco

- resultado baseado em atributos, habilidade, preparação e contexto;
- chances sempre explicáveis ao jogador;
- falha gera consequência interessante, não apenas bloqueio;
- aleatoriedade reproduzível por semente caso seja adotada.

Objetivo: acrescentar incerteza sem transformar o jogo em tentativa cega.

### 4. Inventário e criação simples

- limite ou custo de transporte;
- itens com usos narrativos e sistêmicos;
- poucas receitas descobertas organicamente;
- nenhuma grade extensa de crafting no início.

Objetivo: recursos adquirirem valor entre eventos.

### 5. Relações e grupo

- confiança, medo, respeito e necessidades;
- companheiros opinam sobre decisões;
- vínculos desbloqueiam ajuda, conflito ou abandono;
- efeitos persistem entre capítulos.

Objetivo: pessoas funcionarem como agentes do mundo, não barras decorativas.

### 6. Conflitos e combate

- primeiro resolver conflitos como encontros com postura, recursos e risco;
- introduzir combate apenas quando houver decisões relevantes além de atacar;
- ferimentos e fuga devem continuar importantes depois da cena.

Objetivo: combate servir à narrativa e à sobrevivência, sem virar um minijogo desconectado.

### 7. Assentamentos e facções

- recursos coletivos, segurança, população e regras;
- modelos de liderança e sociedade;
- reputação e conflitos entre grupos;
- possibilidade futura de fundar ou governar um assentamento.

Objetivo: levar decisões pessoais à reconstrução da humanidade.

## Regra de entrada de uma mecânica

Antes de iniciar qualquer item do roadmap, definir:

1. qual problema de diversão ou imersão ele resolve;
2. qual estado lê e altera;
3. como aparece na interface mobile;
4. como afeta eventos posteriores;
5. qual é sua menor sequência jogável;
6. quais testes garantem suas regras;
7. o que ficará explicitamente para depois.

## Próximo marco após a consolidação

Implementar uma fatia vertical de **sobrevivência e passagem do tempo** dentro do primeiro dia existente. A campanha deve permanecer curta, mas água, alimento, energia, abrigo e horário precisarão interagir de maneira perceptível.
