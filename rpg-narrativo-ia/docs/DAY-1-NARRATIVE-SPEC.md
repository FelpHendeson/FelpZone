# Dia 1 — Especificação narrativa e jogável

## Estado

**Especificado em 21 de setembro de 2026. Ainda não implementado nesta forma.**

Este documento transforma a [Fundação narrativa](NARRATIVE-FOUNDATION.md) em uma primeira fatia jogável concreta.

O objetivo não é reescrever o motor nem introduzir dezenas de mecânicas novas. O Dia 1 deve ensinar o jogo através da própria história, reutilizando os sistemas existentes e identificando somente as lacunas realmente necessárias.

---

# 1. Objetivo da experiência

Ao terminar o primeiro dia, um jogador novo deve compreender naturalmente:

- quem é seu personagem;
- que a antiga civilização material desapareceu;
- que o Sistema existe para todos os humanos;
- o que são Etéris e Númen em nível introdutório;
- como executar pelo menos um treino;
- como explorar e navegar;
- que tempo passa quando ele age;
- que recursos, necessidades e riscos importam;
- que existem outros humanos na mesma região;
- que suas escolhas sociais não são cosméticas;
- onde consultar ajuda caso esqueça uma mecânica.

O Dia 1 não precisa ensinar:

- economia avançada;
- assentamentos;
- política;
- família;
- organizações complexas;
- Jardim;
- diplomacia;
- administração territorial;
- todas as possibilidades de combate;
- todos os menus do Sistema.

Essas mecânicas devem aparecer somente quando o mundo criar uma razão para apresentá-las.

---

# 2. Princípio de onboarding

A regra do Dia 1 é:

> **a história apresenta a necessidade; o sistema oferece a agência.**

O jogador não recebe uma enciclopédia no início.

O fluxo deve alternar:

```text
acontecimento
↓
necessidade compreensível
↓
pequena explicação
↓
ação real do jogador
↓
consequência
↓
nova liberdade
```

Cada tutorial contextual deve possuir no máximo o necessário para executar a ação atual.

Uma Central de Ajuda mantém a explicação completa para consulta posterior.

---

# 3. Aptidão inicial não é habilidade de Númen

O conteúdo atual possui duas camadas diferentes e elas devem permanecer diferentes.

## 3.1 Aptidão inicial

As três capacidades atuais:

- Olhar Atento;
- Resiliência;
- Voz Calma;

representam uma **aptidão inicial** do personagem.

Elas ajudam a personalizar os primeiros acontecimentos e não devem ser apresentadas como a árvore completa de Númen.

A escolha continua exclusiva no começo.

Os nomes e efeitos continuam provisórios.

## 3.2 Habilidades do Sistema

O progresso de Númen usa o catálogo real de habilidades:

- Sentidos Aguçados;
- Corpo Firme;
- Fagulha Condutora;
- outras habilidades futuras.

No estado atual do motor, `Sentidos Aguçados` é a habilidade-raiz conhecida inicialmente.

Isso deve ser aproveitado narrativamente.

A primeira prática guiada de Númen do Dia 1 usa **Sentidos Aguçados**, em vez de criar uma habilidade artificial de tutorial.

---

# 4. Fluxo macro

```text
Criação do personagem
↓
Despertar
↓
Primeira leitura do ambiente
↓
Sistema inicializado
↓
Escolha da aptidão inicial
↓
Introdução: Etéris
↓
Introdução: Númen
↓
Primeira prática real
↓
Exploração livre orientada
↓
Água / recursos / abrigo / sinais humanos
↓
Primeiro encontro possível com Mira
↓
Decisão social
↓
Preparação para a noite
↓
Passar a noite junto ou separado
↓
Dia 2
```

O fluxo possui direção, mas não deve ser uma sequência de cutscenes sem liberdade.

Depois da primeira prática de Númen, o jogador entra no sandbox.

---

# 5. Etapa 0 — Criação do personagem

## Objetivo

Dar identidade mínima antes do Reset ser apresentado.

## Campos

Nesta fatia:

- nome;
- sobrenome;
- sexo.

Aparência detalhada pode entrar mais tarde.

## Sexo

O jogador escolhe o sexo do personagem.

Nesta etapa, sexo serve para:

- identidade;
- pronomes;
- apresentação textual;
- futuras condições sociais ou românticas quando realmente relevantes.

Não aplicar automaticamente:

- bônus de força;
- bônus de inteligência;
- penalidades;
- diferenças de potencial de Númen.

## Lacuna técnica

O estado atual não persiste sexo do personagem.

A implementação exigirá uma extensão mínima do estado e provavelmente evolução de schema, com migração segura de saves existentes.

A especificação técnica deve decidir o formato antes de alterar o código.

---

# 6. Etapa 1 — Despertar

## Cena

O evento atual `awakening` continua servindo como base.

A cena deve reforçar três coisas:

1. o personagem ainda possui memória da antiga vida;
2. nenhum objeto ou infraestrutura antiga está presente;
3. o ambiente não parece destruído — parece nunca ter sido urbanizado.

A ausência material precisa ser estranha.

Não existe:

- asfalto quebrado;
- poste tombado;
- carro;
- ruína;
- lixo;
- prédio abandonado.

Existe apenas o mundo novo.

## Escolha inicial

As escolhas atuais podem permanecer em essência:

- levantar com calma e observar;
- levantar rapidamente, preparado para perigo.

Elas modificam condição e personalidade momentânea, mas nenhuma deve ser uma escolha "errada".

## Tutorial desbloqueado

**Ajuda: Escolhas e consequências**

Resumo curto:

> Algumas decisões alteram atributos, relações, recursos ou acontecimentos futuros. Nem toda consequência aparece imediatamente.

O tutorial não precisa explicar todos os tipos de efeito.

---

# 7. Etapa 2 — O Sistema

O evento `system-awakens` continua como base.

## Mensagem principal

O Sistema reconhece o personagem.

Ele deixa claro que:

- não é um aparelho;
- não é exclusivo do protagonista;
- todo humano possui acesso;
- é uma nova regra da existência.

O Sistema não explica:

- quem o criou;
- por que existe;
- o motivo do Reset;
- o destino completo do jogador.

## Primeiro menu visível

No primeiro contato, evitar mostrar todas as áreas que o jogo possui.

O jogador precisa apenas de:

- identidade/status básico;
- aptidão disponível;
- orientação.

Os demais destinos podem existir tecnicamente, mas o onboarding deve evitar chamar atenção para mecânicas sem contexto.

## Tutorial desbloqueado

**Ajuda: O Sistema**

Explica:

- o Sistema é diegético;
- consultar menus não consome tempo;
- agir no mundo geralmente pode consumir tempo;
- novas áreas de conhecimento podem aparecer conforme o personagem descobre coisas.

---

# 8. Etapa 3 — Aptidão inicial

O evento atual `choose-ability` continua como base, mas o texto deve trocar a ideia de "caminhos completos" pela ideia de **aptidão inicial**.

As três opções continuam provisoriamente:

### Olhar Atento

Favorece percepção e cautela no primeiro dia.

### Resiliência

Favorece resistência física inicial.

### Voz Calma

Favorece interação social inicial.

A escolha:

- não define classe;
- não bloqueia campos inteiros de Númen;
- não determina a personalidade do personagem;
- pode alterar cenas, opções e facilidades futuras.

Depois da escolha, o jogador retorna à exploração.

---

# 9. Etapa 4 — Etéris

Pouco depois da escolha da aptidão, o Sistema oferece uma orientação energética.

Isso pode ser iniciado automaticamente na primeira exploração da Clareira ou como uma orientação destacada no Sistema.

## Texto conceitual

O Sistema apresenta Etéris como:

> energia presente no ambiente e no mundo.

Evitar um tratado metafísico.

O jogador recebe uma instrução prática:

> Pare por um momento. Não procure um objeto. Procure a diferença entre o que pertence ao seu corpo e o que existe ao redor dele.

A narrativa descreve sensação de forma aberta o suficiente para permitir interpretação:

- pressão;
- calor;
- vibração;
- presença;
- densidade;
- mudança nos sentidos.

Não definir que todo ser humano sente exatamente a mesma coisa.

## Ação do jogador

O jogador executa uma primeira observação/prática.

Essa ação deve consumir tempo de maneira coerente com o relógio.

---

# 10. Etapa 5 — Númen

Depois da primeira percepção, o Sistema explica somente o necessário:

> Etéris assimilada por um ser vivo é interiorizada e individualizada. Essa energia recebe a classificação de Númen.

Fluxo:

```text
Etéris ambiental
↓
absorção
↓
interiorização
↓
Númen individual
```

O jogador é orientado a perceber a energia já internalizada e fazê-la circular.

## Primeira habilidade

`Sentidos Aguçados` é utilizada como a primeira aplicação.

O jogador não recebe proficiência gratuitamente através de diálogo.

Ele realiza um **treino real** usando o método já existente:

`focused-perception-drill`

A execução deve passar pela ação real de treinamento do motor.

### Resultado esperado

Depois da prática:

- o relógio avançou pelo custo real do treino;
- necessidades sofreram o desgaste normal;
- a proficiência foi alterada pelo sistema existente;
- o jogador viu feedback estruturado;
- o Diário/Jornada pode reconhecer que a prática ocorreu.

## Lacuna técnica

O sistema de objetivos atual não possui critério para proficiência de habilidade.

Para registrar esse passo de forma canônica, preferir uma pequena extensão de critério, por exemplo conceitualmente:

```ts
{ type: 'system.skill.proficiency.min', skillId: string, amount: number }
```

Não criar uma flag duplicada somente para imitar um fato que já existe em `GameState.system`.

Essa extensão deve ser especificada e testada como ampliação do Sistema 10, não como um novo sistema numerado.

---

# 11. Tutorial de treinamento

Ao abrir treino pela primeira vez:

**Nova mecânica: Treinamento**

Resumo:

> Treinos consomem períodos do dia e desenvolvem habilidades ou caminhos conhecidos. O tempo gasto também afeta necessidades e o estado do mundo.

A tela deve deixar visível:

- nome do treino;
- alvo;
- custo em períodos;
- resultado compreensível;
- motivo de bloqueio quando houver.

Depois da primeira execução:

> Você pode repetir métodos conhecidos quando quiser, desde que cumpra seus requisitos. Outros métodos podem ser descobertos depois.

Não incentivar spam infinito como estratégia explicitamente ótima.

---

# 12. Etapa 6 — Sandbox orientado

Depois do primeiro treino, o jogo reduz a condução.

A jornada principal orienta sem bloquear liberdade.

O jogador pode:

- explorar a Clareira;
- encontrar a nascente;
- coletar;
- descobrir a Grande Árvore;
- fabricar;
- descansar;
- investigar sinais;
- encontrar criaturas;
- encontrar Mira.

## Primeiros objetivos

A jornada atual `Primeiros passos` deve ser revisada.

Hoje ela exige em sequência:

- aptidão;
- exploração;
- nascente;
- fogueira;
- refeição;
- sinais de Mira;
- Mira.

Isso é funcional para demonstrar sistemas, mas é rígido demais para a nova história.

### Nova direção

Dividir propósito narrativo de conteúdo opcional.

#### Jornada principal provisória: Primeiro dia

Etapas conceituais:

1. escolha sua aptidão;
2. compreenda Etéris;
3. realize a primeira prática de Númen;
4. reconheça o local do despertar;
5. garanta uma fonte de água ou outra condição mínima de sobrevivência;
6. encontre sinais de outra pessoa;
7. decida se aproxima ou evita o primeiro sobrevivente;
8. prepare-se para a noite.

#### Conteúdo opcional

Podem virar objetivos laterais ou oportunidades:

- construir fogueira;
- preparar refeição;
- investigar a Grande Árvore;
- explorar Mata Densa;
- enfrentar ameaça;
- descobrir Caverna Oculta.

A história principal não deve exigir que todo jogador cozinhe exatamente a mesma refeição antes de conhecer outra pessoa.

---

# 13. Sinais humanos antes de Mira

Mira não deve simplesmente aparecer como um cartão de NPC sem preparação.

Antes do encontro podem existir uma ou mais descobertas:

- pegadas;
- ramo cortado de maneira deliberada;
- marcas de mão;
- pedra deslocada;
- restos de uma fogueira muito recente;
- voz distante;
- recipiente improvisado;
- sinais perto da água.

O objetivo é fazer o jogador concluir:

> Eu não fui o único colocado aqui.

Essa descoberta também apresenta a regra narrativa de que outros humanos foram transpostos para a mesma região.

O jogador ainda não conhece o conceito formal de Zona de Transposição.

---

# 14. Etapa 7 — Mira

## Identidade nesta fatia

Para evitar churn técnico desnecessário, manter inicialmente:

- ID: `mira-vale`;
- nome de exibição atual: **Mira Vale**.

A Fundação Narrativa registrou outro sobrenome como proposta provisória. A escolha final do sobrenome pode ser feita quando a ficha completa do elenco for consolidada.

IDs persistentes não devem ser renomeados apenas por preferência estética.

## Papel no Dia 1

Mira é o primeiro contato humano importante possível.

Ela:

- também está desorientada;
- também possui um Sistema;
- já tentou compreender algumas coisas por conta própria;
- não sabe por que o Reset aconteceu;
- não sabe onde estão familiares e conhecidos;
- não depende do protagonista para funcionar.

## Conversa inicial

A conversa deve permitir descobrir:

- que o Sistema também apareceu para ela;
- que as experiências de Etéris/Númen não são necessariamente idênticas;
- que ela encontrou ou procurava água;
- que existem riscos no ambiente;
- que nenhum dos dois sabe onde está no antigo sentido geográfico.

Evitar uma conversa expositiva em que Mira explique o mundo inteiro.

Ela sabe apenas o que conseguiu descobrir.

## Agência do jogador

O jogador pode:

- aproximar-se abertamente;
- observar primeiro;
- manter distância;
- ajudar;
- compartilhar recurso;
- recusar;
- encerrar a conversa.

Evitar que encontrar Mira automaticamente transforme os dois em melhores amigos.

---

# 15. Decisão moral de recurso

A cena atual de compartilhar alimento pode ser mantida em espírito, mas precisa respeitar o estado real.

Não assumir que o jogador obrigatoriamente possui o mesmo fruto.

Se o jogador possui recurso compartilhável, pode existir uma decisão contextual.

Exemplos:

- dividir comida;
- dividir água;
- oferecer informação;
- recusar;
- negociar;
- guardar para si.

O Sistema **não diz qual escolha é moralmente correta**.

Consequências podem afetar:

- confiança;
- afinidade;
- memória de NPC;
- recursos;
- acontecimentos posteriores.

---

# 16. Etapa 8 — Preparar a noite

Ao se aproximar do entardecer, surge uma necessidade compreensível:

> Onde passar a noite?

O jogador pode ter:

- fogueira;
- abrigo;
- comida;
- água;
- Mira por perto;
- nenhum desses elementos.

O jogo deve adaptar o texto ao estado existente.

## Final A — Noite compartilhada

O jogador e Mira decidem permanecer próximos naquela noite.

Isso não significa romance.

Pode significar:

- segurança;
- cooperação;
- confiança inicial;
- necessidade.

O vínculo cresce de acordo com as escolhas anteriores.

## Final B — Noite separada

O jogador prefere permanecer sozinho ou Mira não aceita ficar próxima.

Isso também é uma conclusão válida.

Não punir o jogador com "final ruim".

Mira continua existindo no mundo e pode ser reencontrada.

## Variações

Podem existir diferenças menores:

- com ou sem fogo;
- com ou sem comida;
- ferido ou saudável;
- recurso compartilhado ou recusado;
- ameaça enfrentada ou evitada.

Essas variações alimentam histórico e relações, sem exigir dezenas de finais separados.

---

# 17. Encerramento do Dia 1

O Dia 1 não encerra a campanha.

Ele encerra somente o prólogo inicial.

A transição deve:

- avançar naturalmente para o Dia 2;
- manter o jogador no sandbox;
- registrar acontecimentos importantes;
- apresentar um pequeno resumo opcional;
- liberar novos tópicos de ajuda quando necessário.

O estado da comunidade ainda é embrionário.

Não existe assentamento formal ao fim do Dia 1.

O Dia 2 começa com a pergunta:

> Existem mais pessoas por perto?

---

# 18. Central de Ajuda — recorte do Dia 1

O primeiro recorte precisa somente dos tópicos:

- O Sistema;
- tempo e períodos;
- exploração;
- necessidades;
- inventário;
- Etéris;
- Númen;
- treinamento;
- jornadas;
- relações básicas.

Outros tópicos ficam ocultos.

## Estado necessário

Cada tópico precisa poder distinguir:

- bloqueado/desconhecido;
- desbloqueado;
- visto.

Esse estado deve persistir para evitar exibir o mesmo tutorial intrusivo a cada carregamento.

## Conteúdo no pack

Textos de ajuda devem ser dados do pack, não JSX nem strings espalhadas em componentes.

O motor/UI conhece o contrato de tutorial.

O pack define:

- título;
- resumo;
- conteúdo;
- gatilho conhecido;
- categoria/mecânica relacionada.

---

# 19. Lacunas técnicas identificadas

Esta especificação exige poucas extensões reais.

## 19.1 Sexo do personagem

Adicionar à criação e persistência.

Exige:

- contrato de estado;
- validação;
- migração;
- UI;
- substituição de texto/pronomes onde necessário;
- testes.

## 19.2 Tutorial contextual e ajuda

Ainda não existe como sistema próprio.

Antes de implementar, especificar um contrato mínimo.

Não criar um framework genérico de onboarding.

Primeiro recorte:

- catálogo de ajuda no pack;
- estado `unlocked/seen`;
- popup contextual;
- Central de Ajuda.

## 19.3 Critério de objetivo para progresso do Sistema

Adicionar um critério canônico que possa observar proficiência ou conhecimento de habilidade.

Evitar flags redundantes.

## 19.4 Divulgação progressiva da UI

O jogo possui muitos sistemas já disponíveis.

O Dia 1 precisa impedir que o onboarding apresente todas as superfícies como igualmente importantes desde o primeiro minuto.

Isso pode ser resolvido na camada de apresentação/ajuda, sem necessariamente bloquear regras do motor.

## 19.5 Revisão da jornada Primeiros passos

Separar:

- caminho narrativo principal;
- conteúdo opcional de exploração/crafting.

Não remover as mecânicas existentes.

Reorganizar como conteúdo.

---

# 20. Sistemas que NÃO precisam ser recriados

O Dia 1 deve reutilizar:

| Experiência | Sistema existente |
| --- | --- |
| relógio | Sistemas 1 e 2 |
| mapa | Sistema 3 |
| exploração | Sistema 4 |
| recursos | Sistema 5 |
| crafting/fogueira | Sistema 6 |
| sandbox | Sistema 7 |
| Mira e criaturas | Sistemas 8 e 17 |
| necessidades | Sistema 9 |
| jornada | Sistema 10 |
| Etéris/Númen/treino | Sistemas 11 e 13 |
| ameaça | Sistemas 12 e 15 |
| equipamento/preparação | Sistema 14 |
| cenário interativo | Sistema 18 |
| relação com Mira | Sistema 19 |
| Registro | Sistema 20, mas ranking regional amplo fica para o Dia 7 |

Não antecipar Sistemas 21–29 apenas porque já existem.

Eles entram quando a história criar a necessidade.

---

# 21. Conteúdo atual que pode ser reaproveitado

Reutilizar como ponto de partida:

- `awakening`;
- `system-awakens`;
- `choose-ability`;
- Clareira do Despertar;
- Nascente e Pequeno Lago;
- Grande Árvore;
- Mata Densa;
- fogueira;
- recursos iniciais;
- coelho chifrudo;
- Mira;
- ameaça da Clareira;
- `Sentidos Aguçados`;
- `Treino de Percepção Focada`;
- estrutura de `Primeiros passos`;
- finais de noite junto/separado.

Não preservar texto ou ordem apenas porque já existe.

O código atual é matéria-prima, não cânone superior à nova direção narrativa.

---

# 22. Conteúdo que deve mudar

### Campanha

Reescrever/ajustar eventos para:

- introduzir Etéris;
- introduzir Númen;
- executar prática real;
- transformar Mira em pessoa, não tutorial ambulante;
- tornar a sobrevivência menos linear;
- encerrar o Dia 1 sem concluir o jogo.

### Objetivos

Reorganizar `Primeiros passos`.

### UI

Adicionar onboarding progressivo.

### Criação

Adicionar sexo.

### Ajuda

Adicionar primeiro catálogo de tópicos.

---

# 23. Testes narrativo-mecânicos obrigatórios

A implementação futura deve provar pelo menos:

1. nova partida permite escolher nome, sobrenome e sexo;
2. save antigo continua carregando por migração válida;
3. aptidão inicial continua separada de habilidade de Númen;
4. primeira prática usa a ação real de treino;
5. prática consome tempo exatamente uma vez;
6. necessidades recebem desgaste normal;
7. a jornada reconhece a prática pelo estado canônico;
8. tutorial de treino aparece uma vez e continua consultável;
9. ajuda não revela mecânicas ainda bloqueadas;
10. jogador consegue explorar antes de encontrar Mira;
11. jogador pode conhecer Mira sem construir obrigatoriamente fogueira e refeição;
12. jogador pode passar a noite junto ou separado;
13. nenhuma das duas escolhas encerra permanentemente a campanha;
14. o Dia 2 começa com o estado completo preservado.

---

# 24. Critérios de aceitação de experiência

O Dia 1 está pronto para playtest quando um jogador que nunca viu a documentação consegue responder, depois de jogar:

- "O que é Etéris?"
- "O que é Númen?"
- "Como eu treino?"
- "O que faz o tempo passar?"
- "Como eu exploro?"
- "Onde vejo minha jornada?"
- "Onde procuro ajuda?"
- "Quem é Mira?"
- "Por que eu deveria me preocupar com outras pessoas?"

Sem precisar ler documentação externa.

Além disso:

- o jogador não deve sentir que já recebeu vinte sistemas de uma vez;
- deve haver pelo menos uma decisão social com consequência persistente;
- deve existir liberdade suficiente para fazer conteúdo opcional;
- a primeira noite deve refletir parcialmente como o jogador viveu o dia.

---

# 25. Próxima etapa depois desta especificação

A implementação deve ser feita em fatias pequenas.

Ordem recomendada:

1. especificar tecnicamente sexo do personagem;
2. especificar tutorial/ajuda mínimo;
3. ampliar critério de objetivo para progresso de habilidade;
4. reorganizar a jornada do Dia 1;
5. escrever os novos eventos de Etéris/Númen;
6. integrar primeira prática de treino;
7. revisar encontro de Mira;
8. revisar finais da noite;
9. testes;
10. playtest completo do Dia 1.

Somente depois do playtest do Dia 1 deve começar a especificação detalhada do Dia 2.

---

# 26. Regra de escopo

Esta especificação NÃO autoriza automaticamente:

- sistema completo de empregos;
- assentamento formal no Dia 1;
- romance imediato;
- ranking regional do Dia 7;
- novos personagens além dos necessários ao primeiro dia;
- política;
- economia complexa;
- sistemas 30+;
- reescrita geral do motor.

O objetivo é simples:

> **fazer o primeiro dia finalmente parecer o primeiro dia de uma vida no novo mundo, e não uma demonstração técnica dos sistemas existentes.**
