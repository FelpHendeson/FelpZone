# Visão do produto

## Proposta

Criar um RPG narrativo sandbox no qual o jogador administra seu tempo, percorre locais, interage com o cenário e desencadeia histórias por suas ações. A apresentação usa texto, ícones, mapas funcionais e imagens estáticas; não há necessidade de motor gráfico.

O projeto deve poder receber novas campanhas, módulos e sistemas sem reescrever o núcleo.

## Estrutura da experiência

O início é dirigido: criação do personagem, despertar, apresentação do Reset, introdução ao Sistema e escolha da capacidade inicial. Depois disso, o jogador recebe liberdade para explorar.

O fluxo principal deixa de ser uma sequência contínua de eventos. O jogador escolhe ações e destinos; o mundo avança; encontros acionam temporariamente narrativa e diálogos; ao final, o controle retorna à exploração.

O jogador poderá avançar a trama principal, desenvolver NPCs, descobrir locais, encontrar conteúdo opcional ou buscar a conclusão de uma região.

## Universo

O evento conhecido provisoriamente como **Reset** alterou a existência:

- planetas cresceram e receberam novas regiões;
- a geografia anterior deixou de existir;
- construções e objetos da civilização desapareceram;
- humanos foram reposicionados e separados;
- pessoas receberam poderes e acesso ao Sistema;
- magia, criaturas e recursos desconhecidos passaram a existir.

Os humanos preservam memória e conhecimento, mas não possuem infraestrutura. Por isso, não se trata de explorar ruínas pós-apocalípticas, e sim de fundar uma civilização do zero.

## Personagem do jogador

O jogador define nome e sobrenome. O protagonista tinha acabado de atingir a maioridade e desperta sozinho, sem familiares, aliados ou equipamentos.

Não existe alinhamento ou profissão predeterminada. A identidade emerge das decisões: sobrevivente, explorador, líder, artesão, diplomata, conquistador ou qualquer combinação permitida pelo conteúdo futuro.

A premissa e o protótipo atuais tratam o protagonista como humano. Permitir que ele pertença a outra raça é uma possibilidade **em discussão**, dependente da definição de povos não humanos e de quem recebe acesso ao Sistema; não é cânone nem requisito de implementação neste momento.

## O Sistema

Todos os humanos possuem o Sistema; o protagonista não é escolhido por exclusividade.

O Sistema é uma interface existente dentro do mundo. Menus, mensagens e ações apresentadas pela aplicação podem representar o próprio personagem consultando ou operando essa ferramenta. Status, habilidades, jornadas, mapa conhecido, receitas, registros e títulos ganham assim função mecânica e narrativa ao mesmo tempo.

O Sistema reage às ações, registra conhecimentos e pode oferecer orientação ou métodos de desenvolvimento, mas não deve remover a autonomia do jogador. A origem e as intenções do Sistema permanecem um mistério narrativo. Estender o Sistema a todas as raças ou seres continua **em discussão**; o cânone confirmado abrange toda a humanidade.

## Eteris, Númen e progressão

Eteris é a energia presente no mundo e no ambiente, equivalente funcional à mana ambiental. Ao ser absorvido e interiorizado por um ser vivo, ele se individualiza como Númen.

Númen pode alimentar aplicações ligadas ao Corpo — reforço, movimento, resistência e sentidos — e ao Poder, incluindo técnicas, manifestações e magia. Essas duas categorias não definem classes fechadas nem fórmulas prontas.

O jogador poderá investir tempo em métodos de treinamento apresentados pelo Sistema, desenvolver nível, proficiências, habilidades e caminhos, e consultar esse crescimento pelo Status. A velocidade de conjuração ou execução deverá ganhar efeito compreensível sobre o tempo necessário para usar uma capacidade, mas sua fórmula ainda não foi decidida.

A Árvore de habilidades apresenta desenvolvimento e caminhos conhecidos. O Jardim de habilidades integra caminhos por receitas curadas, não destrutivas e determinísticas, conforme o Sistema 16; combinações arbitrárias e geração procedural continuam proibidas.

O núcleo está implementado no Sistema 11, a progressão por prática no Sistema 13 e o primeiro contrato do Jardim está implementado no [Sistema 16](SYSTEM-SKILL-GARDEN.md).

## Combate futuro

O combate deverá reutilizar habilidades físicas e mágicas por um banco de ações declarativo: condições de ativação, custos, tempo de execução, efeitos e encadeamentos são preparados antes de cada turno e resolvidos pelo motor. O contrato não pode presumir que todo oponente seja um monstro; pessoas e criaturas também podem participar.

Combate ainda não está implementado. Atributos, fórmulas, comportamento de oponentes e consequências de vitória, fuga ou derrota permanecem em discussão e receberão especificação própria depois da fundação do Sistema 11.

## Tom

A ambientação mistura aventura, drama, fantasia e ficção especulativa. O tom da trajetória surge das escolhas:

- cooperação favorece reconstrução e esperança;
- busca por pessoas cria drama;
- exploração enfatiza aventura;
- poder e domínio conduzem a caminhos sombrios;
- investigação do Reset aproxima a história do mistério cósmico.

## Papel da IA

A IA é uma ferramenta externa de desenvolvimento. Ela pode ajudar autores e programadores a criar conteúdo, revisar coerência e implementar o projeto. Todo resultado aprovado vira código ou conteúdo versionado.

A aplicação final não gera narrativa por IA, não chama modelos e não solicita chaves do usuário.

## Princípios de experiência

- Escolhas devem produzir consequências compreensíveis.
- Consequências anteriores devem reaparecer em eventos posteriores.
- Textos devem ser confortáveis para sessões curtas no celular.
- O jogador deve sentir que constrói uma trajetória, não que adivinha uma resposta correta.
- Conteúdo e motor devem permanecer separados.
- Exploração deve existir entre cenas narrativas.
- Horário e localização precisam afetar o que pode ser encontrado.
- O mundo deve reagir às ações sem obrigar o jogador a seguir imediatamente a rota principal.
