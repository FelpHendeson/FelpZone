# Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão

## Estado da decisão

**Aprovado pelo autor em 14 de setembro de 2026 e implementado nas Fatias 11.1 a 11.7 (autorização explícita do autor para desenvolvimento contínuo).**

Este documento amadureceu o próximo eixo do jogo e agora está implementado: os módulos `energetics`, `skills`, `training` e `system-interface` entregam vocabulário energético, catálogos validados, estado de progressão persistido no schema 7, treino que cobra o relógio uma vez, Árvore de habilidades derivada com sigilo de conteúdo oculto e uma interface diegética mobile. O Sistema 11 dá significado mecânico e narrativo ao Sistema canônico e prepara contratos públicos que um combate futuro poderá reutilizar.

Números, nomes, custos e conteúdo de habilidades permanecem protótipos e não são cânone. Balanceamento definitivo, regras do Jardim e o banco de ações de combate continuam fora do escopo e exigem especificação e autorização próprias.

## Problema de diversão e imersão

O protótipo já permite explorar, sobreviver, fabricar, encontrar presenças e seguir jornadas. A capacidade inicial, porém, ainda funciona principalmente como uma escolha narrativa registrada. Falta um ciclo no qual o personagem compreenda o próprio poder, invista tempo para desenvolvê-lo e perceba novas possibilidades de ação.

O Sistema 11 deve criar este ciclo:

```text
agir e descobrir o mundo
          ↓
o Sistema registra conhecimento e possibilidades
          ↓
consultar Status, caminhos e métodos conhecidos
          ↓
escolher um treino e investir tempo
          ↓
desenvolver proficiência, domínio ou capacidade
          ↓
liberar novas formas de explorar, criar e enfrentar obstáculos
```

O crescimento não deve existir apenas para elevar números. Ele deve mudar o que o jogador consegue perceber, tentar, combinar e executar.

## O Sistema é diegético

O Sistema existe dentro do universo. Quando a interface apresenta Status, jornadas, mapa conhecido, receitas, habilidades ou métodos de treino, o personagem também está vendo ou operando essas informações.

Portanto:

- abrir um menu do Sistema representa uma consulta do personagem, ainda que não consuma tempo por si só;
- escolher uma ação pela interface representa o personagem solicitando, preparando ou executando algo com auxílio do Sistema;
- mensagens, bloqueios, liberações e registros podem ser acontecimentos narrativos percebidos pelo personagem;
- o Sistema pode orientar e revelar métodos sem escolher a trajetória no lugar do jogador;
- a interface deve distinguir conhecimento registrado de conteúdo que o personagem ainda não descobriu;
- efeitos mecânicos continuam sendo resolvidos pelo motor local e determinístico, não por uma IA em runtime.

O cânone atual confirma que **todos os humanos possuem acesso a um Sistema** e que o protagonista não é exclusivo por possuí-lo. Estender esse acesso a todos os seres ou raças, permitir protagonista não humano e definir povos não humanos concretos permanecem **em discussão**.

## Fundamentos energéticos definidos

### Eteris

Eteris é a energia existente no mundo e no ambiente, equivalente funcional à ideia de mana ambiental. Seres vivos podem absorvê-lo ao viver e interagir com o mundo.

### Númen

Númen é Eteris interiorizado e individualizado por um ser vivo. A transformação não produz necessariamente uma energia idêntica em todos: corpo, experiência, caminhos e desenvolvimento podem influenciar como cada indivíduo manifesta seu Númen.

### Aplicações

O Númen alimenta dois grandes campos conceituais:

- **Corpo:** reforço, movimento, resistência, sentidos e outras aplicações interiorizadas;
- **Poder:** manifestação, técnica, magia e outros fenômenos exteriorizados ou especializados.

“Corpo” e “Poder” são categorias conceituais, não uma lista fechada de classes. Seus atributos internos, custos, subdivisões e fórmulas ainda precisam ser definidos.

```text
Eteris ambiental
       ↓ absorção e interiorização
Númen individual
       ├── aplicações no Corpo
       └── aplicações de Poder
                    ↓
          habilidades e caminhos
```

## Status e crescimento

O Status é a leitura organizada que o Sistema fornece sobre o estado e o desenvolvimento do personagem. Ele deve reunir fontes canônicas sem copiar dados de maneira divergente.

Conceitos aprovados para ganhar significado no novo eixo:

- nível como síntese ou marco de crescimento;
- habilidades conhecidas;
- caminhos de progressão;
- proficiência individual;
- estado relacionado a Eteris e Númen;
- velocidade de conjuração ou execução, capaz de influenciar o tempo necessário para uma ação;
- métodos de treinamento disponíveis e seu progresso.

Ainda não foram aprovados:

- nomes e quantidade de atributos novos;
- fórmula de nível ou experiência;
- curvas de evolução;
- limites, regeneração e conversão de Eteris/Númen;
- fórmula de velocidade de conjuração;
- forma de representar distância, iniciativa ou frações de turno;
- bônus raciais, classes, raridades ou notas de habilidade.

A implementação futura deve evitar um único número universal que decida toda ação. Nível pode resumir crescimento e controlar liberações, mas habilidades e proficiências precisam continuar tendo identidade própria.

## Treinamento

Treinar é uma ação voluntária que consome tempo do relógio do jogo. O Sistema apresenta métodos conhecidos, seus requisitos e seus efeitos compreensíveis; o jogador decide quando e como investir seus períodos.

Um método de treino poderá declarar, por dados:

- identidade e texto de apresentação;
- caminho ou habilidade relacionada;
- condições conhecidas de acesso;
- custo em períodos;
- local, recurso, conhecimento ou estado exigido, quando houver;
- consequências mecânicas declaradas;
- possibilidade de registro ou descoberta decorrente.

O contrato deve preservar a ordem consolidada do orquestrador: planejar e validar primeiro, executar de forma atômica, aplicar o custo temporal exatamente uma vez e somente então sincronizar os sistemas dependentes do relógio.

Treino não deve significar repetição infinita sem decisão. Retornos decrescentes, limites de recuperação, riscos, qualidade da execução e minijogos são possibilidades, mas suas regras permanecem em discussão.

## Árvore de habilidades

A Árvore apresenta habilidades, caminhos e relações de progressão. Ela serve simultaneamente como ferramenta de planejamento do jogador e visualização diegética do conhecimento registrado pelo Sistema.

Ela deve ser capaz de representar:

- habilidade conhecida;
- possibilidade conhecida ainda bloqueada;
- requisito que o personagem já pode compreender;
- conexão entre habilidades ou caminhos;
- proficiência ou desenvolvimento já alcançado;
- partes ainda desconhecidas sem vazar conteúdo oculto.

A Árvore não precisa revelar todo o universo de habilidades no início. Descobertas, treino, campanha e experimentação podem ampliar o que o Sistema consegue apresentar.

A topologia concreta, regras de desbloqueio e quantidade de caminhos ainda não estão definidas. O conteúdo deve ser dirigido por dados e validado antes de chegar à interface.

## Jardim de habilidades

O Jardim representa a integração entre caminhos. Seu propósito definido é combinar ou fundir habilidades para criar sinergias e aplicações que não pertencem isoladamente a um único ramo.

O Jardim precisa permanecer conceitualmente distinto da Árvore:

- a Árvore mostra desenvolvimento e caminhos;
- o Jardim trabalha combinações e integração entre caminhos.

As receitas de fusão, consumo ou preservação das habilidades de origem, reversibilidade, limites e resultados exatos continuam **em discussão**. O Sistema 11 deve reservar contratos e IDs estáveis para essa evolução, sem inventar uma regra de fusão durante a implementação das primeiras fatias.

## Relação com crafting, receitas e experimentação

O Sistema pode registrar conhecimentos de fabricação e apresentar receitas já compreendidas. Esse registro não significa que ele conhece automaticamente todas as combinações possíveis.

Uma receita poderá ser conhecida por caminhos diferentes:

- orientação direta do Sistema;
- acontecimento de campanha;
- ensinamento de personagem;
- observação do mundo;
- experimentação com materiais;
- resultado de um minijogo futuro.

O módulo de crafting continua sendo responsável por validar ingredientes, estações e produção. O núcleo do Sistema registra e apresenta conhecimento; ele não deve duplicar as regras de crafting.

Formatos exatos de experimentação, qualidade, desperdício e minijogos permanecem em discussão.

## Preparação para o combate futuro

Combate não faz parte da implementação do Sistema 11, mas este núcleo deve evitar decisões que o impeçam.

A direção definida para o combate é um **banco de ações declarativo**. Habilidades físicas, aplicações de Númen, itens e outras técnicas poderão virar ações com:

- condições de ativação;
- custos declarados;
- tempo ou velocidade de execução;
- efeitos;
- relações de encadeamento;
- informações que permitam ao motor ordenar e resolver um turno.

Jogador e oponente encadearão ações, e o motor resolverá as sequências conforme as condições vigentes. O futuro modelo de combatente não deve assumir que todo oponente é um monstro: pessoas e monstros ou outras criaturas podem ocupar esse papel. Todos precisam poder referenciar habilidades próprias no catálogo e compartilhar contratos fundamentais sem perder suas identidades de conteúdo. Quais personagens e criaturas possuirão quais habilidades ainda é decisão de conteúdo.

Ainda estão em discussão:

- atributos e fórmulas de combate;
- iniciativa, posicionamento e duração concreta das ações;
- dano, defesa e condições;
- comportamento dos oponentes;
- consequência de fuga, vitória ou derrota;
- controle de aliados;
- relação entre necessidades e desempenho;
- conteúdo de inimigos e habilidades específicas.

Nenhuma IA generativa é necessária para decidir ações. Se existir tomada de decisão de oponentes, ela deverá ser local, determinística ou baseada em regras validadas até que outra decisão seja aprovada.

## Conteúdo modular e substituível

História, personagens e conteúdo atual são protótipos. O núcleo precisa permitir que outro autor ou agente substitua a campanha sem reescrever o motor.

Direção de autoria:

```text
dados validados
├── habilidades e caminhos
├── métodos de treinamento
├── relações da Árvore
├── combinações futuras do Jardim
├── ações futuras de combate
├── entidades e personagens
├── receitas e conhecimentos
└── campanhas e eventos

motor TypeScript puro
├── valida catálogos e referências
├── planeja ações
├── aplica progressão
├── compõe custo temporal
└── produz novo estado imutável

interface React
├── representa o Sistema diegético
├── mostra apenas conhecimento permitido
└── envia intenções ao motor
```

JSON ou estruturas de dados equivalentes são preferíveis para autoria. Esses arquivos não podem conter código arbitrário, funções serializadas ou expressões executáveis. Condições e efeitos devem usar uma linguagem declarativa fechada, validada nas fronteiras.

## Fronteiras conceituais recomendadas

Os nomes finais dos módulos ainda podem mudar. As responsabilidades não devem se misturar:

- **interface do Sistema:** organiza o que o personagem pode consultar; não calcula progressão;
- **energia:** representa os conceitos persistidos ou derivados de Eteris/Númen; não executa treino nem combate;
- **habilidades:** valida definições, caminhos, conhecimento e proficiências;
- **treinamento:** planeja uma ação de treino e devolve custo e efeitos; não avança o relógio;
- **progressão:** aplica marcos e mantém estado mínimo; não conhece componentes React;
- **combate futuro:** consumirá ações e habilidades públicas, sem acessar arquivos internos desses módulos;
- **campanhas:** liberam conhecimento por efeitos declarativos, sem implementar regras do núcleo;
- **UI:** deriva uma visão segura, sem fórmulas próprias.

Catálogos e estado persistido devem permanecer separados. O save guarda apenas identidade, progresso e fatos necessários; nomes, descrições, topologia, fórmulas e definições completas permanecem nos catálogos versionados.

## Sequência proposta de fatias

As fatias estão aprovadas como roadmap de especificação. Cada uma ainda exige autorização antes de implementação.

### Fatia 11.1 — Vocabulário, catálogos e validação isolada

**Implementada.** Definir os contratos mínimos de energia, habilidade, caminho e método de treinamento, com catálogos pequenos e profundamente validados. Não alterar `GameState`, schema, relógio, UI ou campanha.

Antes de implementar, fechar apenas as decisões indispensáveis sobre IDs, referências e invariantes; não fechar balanceamento definitivo.

#### Decisões fechadas na Fatia 11.1

Foram fechadas apenas as decisões indispensáveis de IDs, referências e invariantes; balanceamento, fórmulas e topologia permanecem em aberto.

- **Energéticos (`modules/energetics`):** o vocabulário canônico é fixo — energias `eteris` e `numen`, campos de aplicação `corpo` e `poder`. O catálogo declara exatamente essas quatro entradas, cada uma com nome e descrição não vazios. Nenhum campo de reserva, controle, potência, absorção, regeneração ou conversão é definido.
- **Habilidades (`modules/skills`):** um caminho declara `id`, `name`, `description` e um `field` que precisa ser um campo de aplicação válido. Uma habilidade declara `id`, `name`, `description` e um `pathId` que precisa resolver para um caminho existente. IDs são únicos dentro de cada namespace (caminhos e habilidades). Requisitos de Árvore, proficiências e desbloqueios ficam para fatias futuras.
- **Treinamento (`modules/training`):** um método declara `id`, `name`, `description`, um `target` (`{ type: 'path' | 'skill', id }`) que precisa resolver contra o catálogo de habilidades, e um `cost.periods` inteiro positivo. Condições de acesso, efeitos mecânicos, requisitos de local/recurso/estado e execução do treino ficam para as Fatias 11.2 e 11.3.
- **Invariantes gerais:** cada catálogo é validado nas fronteiras públicas, congelado em profundidade, indexado por estruturas imutáveis e devolve cópias defensivas nas consultas; IDs inexistentes falham de forma controlada. Todo conteúdo é protótipo e substituível; seus nomes e números não são cânone.
- **Referências entre módulos:** `skills` importa apenas o tipo e o guarda público de campos de aplicação de `energetics`; `training` valida alvos recebendo o índice público de `skills` por parâmetro, sem acessar arquivos internos.

### Fatia 11.2 — Estado de progressão e migração

**Implementada.** O `GameState` passou a incluir `system: { level, entries: [{ skillId, proficiency }] }` sob `schemaVersion: 7`. Novas partidas e migrações v1–v6 começam com a aptidão inicial em proficiência 0 e nível 1; a migração não treina, não concede progresso por suposição, não avança tempo e não regrava durante a leitura. Os atributos de sobrevivência não foram reutilizados como fórmula de poder.

### Fatia 11.3 — Treinamento e tempo

**Implementada.** `planTraining` valida acesso, custo e efeitos e devolve um plano sem tocar no relógio; a ação `training.train` passa pelo orquestrador consolidado, aplica `TimeCost` uma única vez e deixa necessidades, ciclo diário, recursos e objetivos observarem o mesmo avanço. Os efeitos declarativos (`skill.proficiency.increase`, `skill.learn`) são protótipos; seus números não são cânone.

### Fatia 11.4 — Árvore de habilidades

**Implementada.** As habilidades declaram `requires` (validado, sem ciclos) e `deriveSkillTree` deriva caminhos, nós conhecidos, possibilidades disponíveis e uma contagem de nós ainda ocultos, sem vazar conteúdo bloqueado. Consultar a Árvore é uma derivação pura e não consome tempo.

### Fatia 11.5 — Status e interface diegética mobile

**Implementada.** O módulo `system-interface` deriva uma visão segura de Status (nível, Eteris/Númen, campos, habilidades, Árvore e treinos conhecidos) e a aba mobile `Sistema` a apresenta a partir de 320 px, explicando o custo em um diálogo de confirmação antes de treinar, sem duplicar regras no React.

### Fatia 11.6 — Primeiro ciclo de fortalecimento ponta a ponta

**Implementada.** O jogador consulta o Sistema, escolhe um treino, investe períodos, vê a proficiência crescer, revela uma habilidade e um caminho antes ocultos e mantém tudo após salvar e recarregar — provado por teste automatizado e por validação visual na interface.

### Fatia 11.7 — Consolidação e ponte para combate

**Implementada.** Uma bateria de consolidação cobre atomicidade do treino, imutabilidade dos catálogos, ausência de vazamento e a presença dos contratos públicos. Os contratos reutilizáveis por um futuro banco de ações — definições de habilidade, estado de progressão, requisitos e o molde declarativo de plano com custo e efeitos — estão expostos sem revelar internos.

O Jardim poderá receber uma fatia própria somente depois que as regras mínimas de fusão forem discutidas e aprovadas. Ele não foi simulado por uma combinação arbitrária.

## Critérios de aceite do Sistema 11

- o Sistema é apresentado como interface existente dentro do mundo;
- Eteris e Númen mantêm seus significados distintos;
- treino é voluntário e cobra o relógio exatamente uma vez;
- progressão é dirigida por dados, validada e independente da UI;
- Status e Árvore mostram apenas conhecimento autorizado;
- save guarda estado mínimo e migra sem efeitos de gameplay;
- conteúdo atual pode ser substituído sem alterar o motor;
- nenhum contrato pressupõe que todo combatente futuro seja monstro;
- a base prepara ações condicionais e velocidade de execução sem inventar fórmulas de combate;
- testes, lint, tipos, build/PWA, revisão de código e revisão visual passam em cada fatia implementada.

## Fora do Sistema 11

- combate jogável e comportamento de oponentes;
- dano, defesa, vitória, fuga e derrota;
- fórmulas e balanceamento definitivos;
- funcionamento completo do Jardim antes de suas regras serem aprovadas;
- minijogos específicos;
- equipamentos, armas, durabilidade, peso ou qualidade;
- classes e raças concretas;
- protagonista não humano;
- extensão canônica do Sistema a todos os seres ou raças;
- IA generativa em runtime;
- backend, conta ou sincronização em nuvem;
- reescrita definitiva da campanha e dos personagens protótipo.

## Decisões que precisam ser fechadas antes das fatias

1. quais informações mínimas o Status persiste e quais deriva;
2. o significado operacional de nível e proficiência no primeiro recorte;
3. como Númen é representado sem confundir reserva, controle e potência;
4. quais condições e efeitos um método de treino inicial pode declarar;
5. como velocidade de conjuração ou execução se relaciona com o relógio e, futuramente, com turnos;
6. qual habilidade e método de treino protótipo provarão o ciclo;
7. quais partes da Árvore são visíveis, conhecidas ou ocultas;
8. se e quando o Jardim entra em implementação;
9. quais contratos públicos o futuro banco de ações realmente precisa consumir.
