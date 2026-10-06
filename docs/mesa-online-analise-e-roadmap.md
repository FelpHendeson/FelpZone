# Mesa Online — análise, visão de produto e plano de evolução

**Projeto:** FelpZone / Mesa Online  
**Jogo atual:** Magnata  
**Site:** https://felp-zone.vercel.app/  
**Data:** 6 de outubro de 2026  
**Finalidade:** consolidar a avaliação da versão publicada, as ideias de Felipe e sugestões de evolução em um documento que possa orientar decisões, implementação e testes.

Este documento é uma proposta de direção. Ele não significa que todas as funcionalidades foram aprovadas para implementação imediata. As prioridades indicam a ordem recomendada para transformar o protótipo em uma experiência confiável, clara e divertida.

## 1. Avaliação geral

O Mesa Online já tem uma proposta compreensível: reunir família e amigos para jogar pelo navegador, especialmente no celular, sem exigir instalação ou cadastro. O Magnata é um bom primeiro jogo porque permite reconhecer rapidamente a experiência de comprar imóveis, receber aluguéis e disputar patrimônio.

A base técnica examinada tem decisões positivas: o servidor valida as ações, a identidade dos jogadores usa tokens secretos, as escritas usam controle de versão e o motor do jogo fica separado da interface. Essa organização facilita corrigir regras e evoluir a apresentação.

O próximo salto de qualidade deve acontecer em três frentes:

1. **Confiabilidade:** preservar a identidade, impedir exposição de informações secretas e permitir continuar partidas diante de ausências e falhas de conexão.
2. **Comunicação:** transformar as ações do jogo em acontecimentos visíveis e compreensíveis para toda a mesa.
3. **Identidade e apresentação:** dar personalidade aos jogadores, ao menu, ao tabuleiro e às diferentes temáticas.

A recomendação principal é tornar o Magnata uma experiência completa e agradável antes de multiplicar jogos e regras. Isso não impede experimentar temas ou avatares; apenas evita ampliar o catálogo sobre problemas ainda não resolvidos.

## 2. Escopo e limites da avaliação realizada

### 2.1 Fontes e versão

- A página publicada foi consultada e respondeu com HTTP 200.
- A Vercel informou que a publicação de produção estava pronta.
- O código analisado corresponde ao commit `af6933ffc7a8bf11a772e8a058d46f6c8f85af34`, associado à versão publicada naquele momento.
- A cópia local disponível durante a análise não continha a pasta `mesa-online`; o código atual foi consultado no GitHub, sem atualizar ou substituir o trabalho local.
- A consulta de erros agregados da Vercel não encontrou erros no período selecionado. A consulta de logs de aviso e erro em uma janela recente também não retornou registros com esses filtros.

**Ausência de registros não comprova ausência de falhas.** Esses resultados dependem do período, dos filtros e daquilo que o aplicativo registra.

### 2.2 O que foi testado na publicação

Foram criadas duas salas temporárias de teste, sem utilizar salas de outros jogadores. As verificações foram feitas pelas chamadas HTTP utilizadas pelo aplicativo.

| Verificação | Resultado observado |
| --- | --- |
| Abrir a página inicial | HTTP 200 |
| Criar sala com nome válido | HTTP 201; sala criada no lobby |
| Criar sala com nome vazio | HTTP 400; mensagem pedindo um nome |
| Iniciar com apenas um jogador | HTTP 409; exigência de pelo menos dois jogadores |
| Entrar com um segundo jogador | HTTP 201 |
| Entrar com nome duplicado | HTTP 409 |
| Enviar comando sem token | HTTP 401 |
| Iniciar pelo jogador convidado | HTTP 403 |
| Iniciar pelo anfitrião | HTTP 200; partida iniciada |
| Rolar fora da própria vez | HTTP 409 |
| Entrar como novo jogador após o início | HTTP 409 |
| Consultar a versão já conhecida | Resposta indicando que nada mudou |
| Rolar dados, comprar e passar a vez | Ações executadas e versões atualizadas |
| Desistir em uma partida com dois humanos | Partida encerrada com vencedor |
| Solicitar revanche | Retorno ao lobby |
| Convidado sair do lobby | Saída aceita |
| Último humano sair do lobby | HTTP 409; saída recusada |
| Adicionar os três estilos de robô | Operações aceitas |
| Configurar duração e iniciar a sala com robôs | Operações aceitas |
| Consultar a sala durante a vez dos robôs | Jogadas avançaram e a versão mudou |
| Ler o estado público da partida | Ordem dos baralhos exposta; tokens secretos não expostos |

### 2.3 O que ainda não foi validado

- Interação visual no navegador: o ambiente de automação do navegador estava indisponível.
- Toques, leitura, animações e disposição real dos elementos em iPhone e Android.
- Uma partida inteira entre aparelhos diferentes.
- Todas as regras de prisão, construção, hipoteca, dívida e falência em produção.
- Encerramento por limite de rodadas em uma partida completa.
- Carga simultânea, abuso, acessibilidade completa e desempenho medido por ferramentas como Lighthouse.
- Execução independente da suíte automatizada do projeto. O README declara testes existentes; essa declaração não equivale a uma execução nesta avaliação.

Por isso, observações de aparência e acessibilidade baseadas no código são **riscos identificados e propostas de melhoria**, e não uma inspeção visual concluída.

## 3. Problemas e riscos identificados

### 3.1 Ordem das cartas exposta — prioridade alta

**Evidência:** a resposta pública da sala inclui `game.decks`, com a ordem das cartas de Sorte e Surpresa. Isso foi reproduzido na publicação.

**Impacto:** um jogador com conhecimento técnico pode antecipar cartas futuras. Validar os dados e comandos no servidor não resolve a exposição de informações que deveriam ser secretas.

**Correção:** criar uma representação pública da partida e utilizá-la em todas as respostas: criação, entrada, consulta e execução de comandos. Somente o servidor deve conhecer a ordem dos baralhos e quaisquer outros dados internos.

**Critério de aceite:** nenhuma resposta ao navegador contém cartas futuras, tokens, hashes de tokens ou informações internas desnecessárias. O cliente continua exibindo corretamente a carta já revelada.

### 3.2 Identidade dependente de armazenamento que pode falhar — prioridade alta

**Evidência no código:** falhas ao gravar no `localStorage` são ignoradas, mas a identificação posterior é lida desse mesmo armazenamento. A observação de que a sessão continua sem lembrar não está sustentada por uma alternativa em memória.

**Impacto:** a pessoa pode criar ou entrar na sala, mas depois não ser reconhecida como participante. Perder o token durante uma partida também impede retomar aquele assento pelo fluxo atual de entrada.

**Correção:** manter identidade em memória durante a sessão, persistir quando possível e oferecer recuperação segura. Se não for possível garantir continuidade, explicar o problema antes de deixar o usuário acreditar que entrou normalmente.

**Critério de aceite:** com a gravação no armazenamento indisponível, a sessão atual continua jogável. Após recarregar, o comportamento é previsível e explicado. Recuperar um jogador nunca depende apenas de informar seu nome.

### 3.3 Saída e ausência de jogadores — prioridade alta

**Evidência:** a saída do último humano no lobby foi recusada no teste. O modelo também não oferece prazo por jogada, substituição de ausente nem mecanismo geral de transferência do anfitrião durante a partida.

**Impacto:** uma pessoa que fecha a aba pode bloquear a mesa. No lobby com um humano e robôs, a interface pode oferecer uma saída que o servidor recusa. Ao fim de uma partida, o anfitrião ausente pode impedir a revanche.

**Correção:** definir regras diferentes para sair do lobby, desistir da partida e encerrar uma sala vazia. Implementar presença, prazo configurável e substituição por robô ou passagem de controle conforme regras anunciadas.

**Critério de aceite:** nenhuma sala fica permanentemente dependente de uma pessoa ausente; ações de saída oferecidas na interface têm um resultado válido e compreensível.

### 3.4 Robôs dependem das consultas — decisão com limitações

**Evidência:** as consultas à sala fazem os robôs jogarem; os testes confirmaram seu avanço. O cliente deixa de consultar efetivamente enquanto a página está oculta.

**Impacto:** sem consultas de participantes ou espectadores, os robôs não progridem normalmente. Além disso, uma consulta GET altera o estado quando avança um robô, o que precisa ser considerado no desenho do serviço.

**Direção:** para uso casual, essa solução pode permanecer, desde que a pausa seja explicada. Se o produto prometer partidas autônomas ou torneios contínuos, será necessário um mecanismo de execução independente das páginas abertas.

**Critério de aceite:** alternar de aplicativo e retornar não causa confusão ou perda de estado; a interface indica reconexão e retoma a atualização.

### 3.5 Legibilidade e interação no celular — prioridade média

**Evidência no CSS:** o tabuleiro tem 11 colunas e nomes com tamanho entre 5,5 e 9 pixels. Em uma tela de 375 pixels, considerando margens e espaçamentos, cada casa fica próxima de 30 pixels.

**Impacto provável:** dificuldade para ler nomes, identificar proprietários e tocar na casa desejada. Ainda precisa de validação visual em aparelhos reais.

**Correção:** permitir ampliar o tabuleiro e dar destaque à casa atual em um cartão legível. Usar uma lista de propriedades como alternativa de navegação e reforçar o contexto fora das casas pequenas.

### 3.6 Ausência de limitação de frequência — prioridade média

**Evidência no código analisado:** não foi encontrado controle de frequência nas rotas de criação, entrada e comandos. Não foi feito teste de abuso.

**Impacto:** spam de salas, mensagens e solicitações pode aumentar consumo ou prejudicar a experiência.

**Correção:** limitar operações por endereço, sala e jogador conforme o tipo de ação. Consultas normais e vários familiares na mesma rede precisam continuar funcionando.

### 3.7 Mensagens e acessibilidade — prioridade média ou baixa

- **Duração:** “Até alguém falir” não descreve o encerramento implementado, que ocorre quando resta um jogador ativo. Usar “Até restar um jogador”.
- **Compartilhamento:** o fluxo pode informar “Link copiado!” mesmo quando a cópia falha. Mostrar confirmação apenas após sucesso e oferecer alternativa manual.
- **Detalhes de propriedade:** acrescentar foco inicial, contenção de foco quando apropriado, fechamento com Escape e retorno de foco ao elemento que abriu a janela.
- **Abas da partida:** completar a relação entre abas e painéis e o comportamento por teclado.
- **Informação por cor:** preservar nomes, símbolos e descrições para que propriedade e jogador não sejam identificados somente por cor.

## 4. Visão de produto proposta

Evoluir o Mesa Online para uma mesa virtual com identidade própria: jogadores reconhecíveis, acontecimentos compartilhados e tabuleiros temáticos, mantendo a entrada simples.

**Experiência desejada:** a pessoa abre o site, escolhe nome e retrato, cria ou entra em uma sala, entende as regras principais e acompanha cada acontecimento da partida. Compras, aluguéis, construções, dívidas e vitórias parecem eventos da mesa, com informação suficiente para decidir e participar.

Princípios:

- Começar deve continuar fácil.
- Toda ação relevante deve ser compreensível para quem agiu e para os demais.
- Animação deve ajudar a entender o jogo.
- Partidas devem resistir a recarregamento, ausência e conexão instável.
- Temas devem ter qualidade e consistência, sem misturar mudanças de aparência com regras ocultas.
- Recursos novos devem ser opcionais quando alterarem significativamente o equilíbrio.

## 5. Feedback compartilhado e pop-ups para ações

### 5.1 Ideia central de Felipe

Exibir avisos para todos os jogadores quando alguém compra algo, para na propriedade de outra pessoa ou executa outras ações. O objetivo é que todos saibam o que aconteceu de uma forma mais clara, bonita e divertida.

A proposta é transformar essa ideia em um sistema de eventos compartilhados: **todas as ações do jogo geram feedback**, com intensidade adequada ao acontecimento.

### 5.2 Como apresentar os acontecimentos

Recomendação: usar uma mesma linguagem visual de cartões, retratos, títulos e valores, com três formas de apresentação.

| Apresentação | Uso sugerido | Comportamento |
| --- | --- | --- |
| Aviso rápido | Passar a vez, rolar dados e ajustes simples | Aparece por alguns segundos e não bloqueia os controles |
| Cartão de acontecimento | Compra, aluguel, construção, hipoteca, carta e prisão | Mostra os envolvidos, a propriedade, o motivo e os valores |
| Janela de decisão ou resultado | Comprar ou recusar, resolver dívida, confirmar desistência e anunciar vitória | Exige ação apenas de quem precisa decidir; os demais recebem apresentação informativa |

Todos recebem o acontecimento, mas somente o jogador responsável deve ter uma decisão obrigatória. Exigir que cada participante feche uma janela a cada jogada tende a deixar a partida lenta. Essa diferença de apresentação preserva a ideia de avisos para tudo e reduz interrupções.

### 5.3 Catálogo inicial de eventos

| Acontecimento | Informação necessária |
| --- | --- |
| Entrada ou saída | Retrato, nome e alteração na mesa |
| Início da partida | Participantes, tema, regras selecionadas e primeiro jogador |
| Início e fim do turno | Jogador da vez e próxima pessoa |
| Rolagem | Dois dados, total e eventual dupla |
| Movimento | Origem, destino e efeitos do percurso |
| Salário | Jogador, motivo e valor recebido |
| Compra | Comprador, propriedade e preço |
| Compra recusada | Propriedade recusada e próximo efeito previsto pelas regras |
| Parada em propriedade alheia | Visitante, proprietário, imóvel e situação de cobrança |
| Aluguel | Pagador, recebedor, valor e motivo do cálculo |
| Propriedade hipotecada | Explicação de que o aluguel não é cobrado |
| Construção ou venda | Propriedade, alteração nas casas ou hotel e custo ou recebimento |
| Hipoteca ou quitação | Imóvel, valor e mudança na situação |
| Carta | Baralho, texto revelado e consequência |
| Imposto | Jogador, motivo e valor |
| Prisão | Motivo, tentativas, fiança ou carta utilizada |
| Dívida | Devedor, credor, total e opções disponíveis |
| Falência ou desistência | Jogador e destino dos bens |
| Vitória e revanche | Vencedor, motivo, patrimônio quando aplicável e próximo passo |
| Leilão, troca ou crédito futuros | Participantes, condições e resultado confirmado |

Não gerar pop-up para cada consulta de sincronização, abertura de aba ou tentativa inválida de comando. Ações inválidas recebem erro local; acontecimentos que mudam o jogo recebem feedback compartilhado.

### 5.4 Exemplos de texto

- **Compra:** “Felipe comprou Avenida Paulista por $320.”
- **Aluguel:** “Ana parou no imóvel de Felipe e pagou $80 de aluguel.”
- **Sem cobrança:** “A propriedade está hipotecada. Nenhum aluguel foi cobrado.”
- **Construção:** “João construiu uma casa em Pajuçara por $100.”
- **Dívida:** “Ana precisa levantar $150 para pagar o aluguel. Ela pode vender construções ou hipotecar propriedades.”
- **Vitória:** “Felipe venceu por patrimônio ao fim do limite de turnos.”

Os nomes e valores dos exemplos são ilustrativos.

### 5.5 Requisitos para sincronização

- O servidor gera eventos estruturados ao confirmar a ação.
- A mudança de estado e os eventos correspondentes são gravados juntos, usando o mesmo controle de concorrência.
- Cada evento tem identificador sequencial, tipo, jogador responsável, participantes afetados, dados públicos e relação com a versão da sala.
- Cada cliente acompanha o último evento exibido, evitando repetição quando recebe a mesma atualização por caminhos diferentes.
- Quem entra ou recarrega recebe o estado atual; eventos antigos ficam acessíveis pelo histórico, sem uma sequência interminável de pop-ups.
- Se várias jogadas ocorrerem entre consultas, o cliente recebe os eventos intermediários disponíveis, não apenas o último.
- Se o histórico incremental já tiver expirado, a resposta informa a necessidade de ressincronizar e apresenta um resumo.
- Eventos não carregam ordem de cartas futuras, tokens ou outros segredos.

O histórico textual atual ajuda a acompanhar a partida, mas seu limite de entradas e suas frases não devem ser a única base do sistema. Interpretar texto para descobrir compras e aluguéis seria frágil. A interface precisa de eventos com significado explícito.

### 5.6 Preferências e acessibilidade

- Controles separados para som e movimento reduzido.
- Opção de avisos rápidos ou apresentação mais detalhada.
- Mensagens disponíveis no histórico mesmo após desaparecerem.
- Retratos e cores acompanhados de nomes.
- Avisos acessíveis sem deslocar o foco a cada jogada de outra pessoa.
- Nenhuma informação importante comunicada somente por som ou animação.

**Critério de aceite:** em dois aparelhos, uma compra produz um único aviso por aparelho, com os mesmos dados. A reconexão não repete todos os avisos; uma decisão do comprador não bloqueia os controles dos espectadores.

## 6. Pseudo conta e identidade dos jogadores

### 6.1 Ideia de Felipe

Criar uma espécie de conta simples, acompanhada de menu e retrato dos jogadores, para dar continuidade e personalidade à experiência.

### 6.2 Primeira etapa: perfil de visitante

Recomendação inicial: um perfil leve, sem senha obrigatória.

- Apelido persistente.
- Retrato escolhido em uma biblioteca de avatares.
- Cor ou marcador preferido, ajustado quando houver conflito na sala.
- Preferências de som, animação e apresentação.
- Salas recentes e atalho “Continuar partida”.
- Identificação clara de que o perfil está salvo naquele navegador.

O perfil visual e a autorização de um assento são coisas diferentes. Saber o apelido ou copiar um identificador público não pode permitir assumir o controle de outro jogador.

### 6.3 Recuperação e conta opcional

Depois de a experiência básica estar estável, avaliar uma conta opcional que permita recuperar o perfil e as partidas em outro aparelho. Um link de acesso por e-mail é uma alternativa a investigar; não é requisito da primeira etapa.

Evitar pedir cadastro antes que a pessoa conheça o jogo. Também não apresentar armazenamento local como se fosse uma conta recuperável em qualquer dispositivo.

### 6.4 Retratos

- Começar com avatares prontos: animais, personagens originais, profissões, símbolos e estilos compatíveis com o jogo.
- Usar o retrato no lobby, turno, chat, avisos e resultado final.
- Mostrar robôs com retratos próprios e marcação inequívoca.
- Acrescentar envio de foto apenas depois de definir armazenamento, tamanho de arquivos e controles necessários.

**Critério de aceite:** nome e retrato permanecem ao reabrir o navegador quando o armazenamento funciona, e o jogador consegue distinguir seu perfil do seu assento em cada sala.

## 7. Menu, aparência e organização das telas

### 7.1 Menu principal

Estrutura sugerida:

1. Identidade do produto e perfil do jogador.
2. “Continuar partida”, quando houver uma sala recuperável.
3. Ações principais: jogar com amigos e jogar contra robôs.
4. Campo de entrada por código e suporte a link de convite.
5. Cartão do Magnata com resumo, participantes e modalidades.
6. Ajuda rápida, configurações e informações do projeto.

Criar uma identidade mais consistente entre “FelpZone”, “Mesa Online” e “Magnata”: FelpZone pode ser a marca do laboratório, Mesa Online o produto e Magnata o jogo.

### 7.2 Lobby

- Retratos e nomes organizados como uma mesa.
- Código e convite sempre fáceis de encontrar.
- Tema selecionado com prévia.
- Opções de duração, robôs e regras agrupadas.
- Indicação de presença e, futuramente, estado de prontidão.
- Explicação curta de quem inicia e do que falta para começar.
- Saída válida e previsível.

### 7.3 Partida no celular

- Identificar a pessoa da vez, seu retrato e a ação esperada.
- Mostrar saldo e alterações financeiras recentes com clareza.
- Reservar espaço para o acontecimento atual.
- Dar destaque à casa em que o jogador parou.
- Permitir ampliar o tabuleiro e consultar propriedades por lista.
- Facilitar acesso a bens, participantes, histórico e conversa.
- Oferecer retorno ao menu sem confundir navegação com desistência.

Uma barra de ação fixa pode ajudar, mas precisa ser testada com teclado virtual, áreas seguras do iPhone e telas pequenas para não cobrir informações.

### 7.4 Partida no computador

Usar a largura disponível para tabuleiro, participantes, acontecimento e ações. A composição deve continuar coerente quando aparece um erro, dívida ou resultado, sem deslocar o tabuleiro de forma confusa.

### 7.5 Direção visual

- Tipografia legível e hierarquia clara.
- Cartões de propriedade com identidade própria.
- Retratos e peças reconhecíveis.
- Animações curtas para dados, movimento e dinheiro.
- Contraste adequado para texto e ações.
- Estados visuais para carregamento, sucesso, erro e reconexão.

Evitar investir primeiro em efeitos complexos enquanto nomes, valores e ações continuam difíceis de ler.

## 8. Tabuleiros e mapas temáticos

### 8.1 Ideias de Felipe

- Tema inspirado em anime, como Naruto.
- Mapa baseado em Maceió.
- Mapa baseado em São Paulo.
- Mapa do Brasil em geral.
- Outras temáticas que deem personalidade às partidas.

### 8.2 Diferenciar tema de variante

**Tema visual:** altera nomes, arte, música, textos e apresentação, preservando posições, preços e regras. É o melhor ponto de partida.

**Variante de jogo:** altera economia, quantidade de casas, cartas, habilidades ou condições de vitória. Precisa de testes e equilíbrio próprios.

Apresentar essa diferença na configuração da sala. Um jogador não deve descobrir no meio da partida que escolheu regras diferentes pensando que escolheu apenas uma aparência.

### 8.3 Primeiros temas recomendados

| Tema | Possibilidades | Observação |
| --- | --- | --- |
| Maceió | Bairros, praias, lugares e cartas com situações locais | Pode dar ao projeto uma identidade pessoal forte |
| São Paulo | Regiões, avenidas, transporte e vida urbana | Facilita uma estética de metrópole |
| Brasil | Cidades e referências regionais | Escolher um critério consistente para agrupar propriedades |
| Ninja original | Vilas, clãs e missões fictícias | Permite explorar a atmosfera de anime com personagens e arte próprios |
| Fantasia ou espaço | Reinos, rotas, planetas e recursos | Boa extensão futura sem dependência de marcas existentes |

Para um tema explicitamente de Naruto, registrar a necessidade de verificar autorização para personagens, nomes, símbolos, imagens e música antes de uma publicação desse conteúdo. O documento não presume que esses materiais estejam liberados.

### 8.4 Organização dos temas

Cada tema deve definir identificação, nome, descrição, prévia, paleta, nomes das casas, textos de cartas, recursos visuais e versão. Os identificadores usados pelas regras permanecem estáveis quando a mudança é apenas visual.

- O tema é selecionado no lobby e fixado no início.
- Todas as pessoas recebem o mesmo tema e sua versão.
- Falha ao carregar arte não impede jogar.
- Recursos pesados devem ser dimensionados para celular.
- Um tema pode ser substituído por uma apresentação básica caso um recurso esteja indisponível.

**Critério de aceite:** a mesma partida com dois temas visuais produz os mesmos resultados econômicos e de regras, usando as mesmas ações e aleatoriedade de teste.

## 9. Crédito e novas funções financeiras

### 9.1 Ideia de Felipe

Adicionar funções como crédito e outros recursos econômicos que ampliem as escolhas dos jogadores.

### 9.2 Escopo recomendado

Tratar o crédito inicialmente como **uma regra opcional de dinheiro fictício dentro do Magnata**. Não vincular a crédito real, pagamentos ou produtos financeiros.

Antes de implementar, responder:

- Quem concede o empréstimo: banco do jogo ou jogadores?
- Qual o limite e qual a garantia?
- Qual o custo e quando ele é cobrado?
- Em qual momento o jogador pode contratar?
- Quando vence a dívida?
- Como a dívida entra no cálculo do patrimônio?
- O que acontece na falência, desistência e fim por turnos?
- Como impedir refinanciamento ilimitado ou adiamento permanente da falência?

### 9.3 Primeira versão proposta

- Banco do jogo como único credor.
- Limite de dívida ativa por jogador.
- Condições explícitas antes da confirmação.
- Vencimento contado por turnos próprios ou por ciclos claramente definidos.
- Possibilidade de quitação antecipada conforme regra anunciada.
- Dívida descontada do patrimônio final.
- Garantia ou limite de exposição definidos para preservar o risco de falência.
- Arredondamento monetário consistente e cálculo usando valores inteiros na unidade monetária adotada.
- Eventos compartilhados para contratação, cobrança, quitação e inadimplência.

Os números de limite, custo e prazo devem ser definidos depois de simulações. Nenhuma taxa foi escolhida neste documento.

### 9.4 Efeitos no equilíbrio

Crédito pode tornar compras mais interessantes, mas também prolongar partidas ou beneficiar excessivamente quem já tem patrimônio. Deve entrar depois da estabilização das regras existentes e, preferencialmente, depois de trocas e leilões.

Os robôs precisam entender o custo da dívida e as consequências sobre patrimônio. Caso contrário, a modalidade solo pode ficar injusta ou pouco convincente.

**Critério de aceite:** não existe ciclo de empréstimos que gere dinheiro ilimitado; dívidas são liquidadas ou consideradas em qualquer forma de encerramento; nenhum jogador contrata sem ver as condições.

## 10. Outras melhorias propostas

### 10.1 Trocas de propriedades

Permitir propostas entre jogadores, com propriedades e dinheiro, aceite explícito, validade e confirmação no servidor. Revalidar os bens na hora do aceite; uma proposta não pode transferir algo que mudou de dono. Definir restrições para propriedades hipotecadas ou com construções.

### 10.2 Leilões

Ao recusar uma compra, iniciar leilão segundo regras selecionadas. Definir participantes, incremento, prazo, encerramento, saldo necessário e comportamento dos robôs.

### 10.3 Partidas rápidas

Oferecer presets de duração com explicação do encerramento. Não prometer duração em minutos antes de medir partidas reais. “30 rodadas” e “30 turnos” precisam ser distinguidos; a versão atual calcula um limite de turnos a partir do número inicial de participantes.

### 10.4 Ajuda contextual

- Regras resumidas antes de começar.
- Explicações de construir de forma uniforme, hipotecar e quitar.
- Detalhamento de como um aluguel foi calculado.
- Sugestões de ações válidas diante de dívida.
- Tutorial curto que possa ser dispensado e reaberto.

### 10.5 Resultado e continuidade

Tela final com vencedor, motivo, patrimônio, dívidas, propriedades e destaques. Oferecer revanche e retorno ao menu; compartilhar resultado pode ser uma evolução posterior.

### 10.6 Instalação e novos jogos

Avaliar instalação como PWA depois de estabilizar a experiência. Continuar dependendo do servidor para as ações da partida; instalação não significa suporte a partidas offline.

Um segundo jogo curto, como Lig-4 ou Damas, pode aproveitar perfil, sala, presença e eventos. Deve entrar quando o primeiro jogo tiver uma experiência confiável de ponta a ponta.

## 11. Direção técnica para sustentar a evolução

### 11.1 Preservar o que já funciona

- Motor de regras separado da interface.
- Servidor como autoridade das jogadas.
- Tokens secretos fora do estado público.
- Controle de concorrência nas alterações.
- Temas definidos como dados quando não alterarem regras.

### 11.2 Melhorias necessárias

- Representação pública explícita da sala e da partida.
- Eventos estruturados e sequenciais.
- Identidade resiliente a falhas de armazenamento.
- Presença e política de ausência.
- Limitação de frequência nas operações relevantes.
- Identificadores de comandos para evitar efeitos repetidos em tentativas de reenvio.
- Política explícita de armazenamento em produção: uma falta de Redis deve produzir diagnóstico claro, evitando salas aparentemente normais em memória isolada.
- Registro de erros com contexto suficiente para investigação, sem registrar segredos.

### 11.3 Consultas periódicas e custo

A atualização periódica é aceitável para a fase atual. A evolução deve medir quantidade de consultas, tamanho das respostas e comandos de armazenamento por partida.

Eventos, chat e robôs aumentam o consumo. A estimativa do README não deve ser tratada como medição, e planos e preços precisam ser conferidos quando houver uma decisão de capacidade.

Trocar automaticamente para WebSocket não é requisito imediato. Primeiro medir a experiência e o custo; só mudar a arquitetura quando houver uma necessidade demonstrada.

## 12. Roadmap recomendado

| Etapa | Entregas principais | Condição para avançar |
| --- | --- | --- |
| **0 — Correções essenciais** | Ocultar baralhos; identidade alternativa; saída válida; texto de duração; cópia de convite confiável | Fluxos de sala e segurança da informação aprovados |
| **1 — Acontecimentos da mesa** | Eventos estruturados; avisos para ações; fila; histórico; reconexão sem repetição | Dois aparelhos recebem os mesmos acontecimentos sem duplicação |
| **2 — Perfil e apresentação** | Perfil de visitante; retratos; menu; lobby; layout da partida; legibilidade e acessibilidade | Uso confortável em celular e computador |
| **3 — Continuidade da partida** | Presença; prazo opcional; substituição por robô; transferência de anfitrião; recuperação | A partida resiste à ausência e à interrupção de um participante |
| **4 — Temas** | Estrutura de temas e primeiro mapa, preferencialmente Maceió ou Brasil | Tema funciona sem modificar indevidamente o motor |
| **5 — Estratégia** | Trocas e leilões com feedback e comportamento dos robôs | Regras e concorrência verificadas; partidas reais avaliadas |
| **6 — Economia opcional** | Crédito fictício, dívidas, patrimônio e decisões dos robôs | Simulações não mostram exploração ou prolongamento excessivo |
| **7 — Expansão** | Conta opcional, PWA, novos temas e segundo jogo | Uso real justifica cada expansão |

As etapas não são estimativas de prazo. Perfil e retratos podem acompanhar os avisos para melhorar sua apresentação, desde que isso não atrase as correções essenciais.

## 13. Plano de testes e critérios de qualidade

### 13.1 Cenários obrigatórios de sala

- Criar, entrar por código e entrar por convite.
- Rejeitar nome vazio, duplicado e sala cheia.
- Recarregar mantendo o assento.
- Bloquear armazenamento e conferir a alternativa de sessão.
- Entrar como espectador e impedir comandos de jogador.
- Sair do lobby, sair com robôs presentes e transferir o anfitrião.
- Reconectar depois de expiração ou remoção de sala com mensagem clara.

### 13.2 Cenários obrigatórios de jogo

- Compra, recusa, aluguel, salário e impostos.
- Cartas, prisão, saída por dupla, fiança e carta de liberdade.
- Construção e venda uniformes.
- Hipoteca, quitação e aluguel suspenso.
- Dívida, levantamento de recursos e falência.
- Desistência fora da vez.
- Encerramento por sobrevivência e por limite de turnos.
- Revanche, inclusive após ausência do anfitrião.
- Robôs diante de dívida, prisão e propriedades.

### 13.3 Cenários obrigatórios de feedback

- Compra aparece uma vez para quem comprou e para os outros participantes.
- Aluguel informa ambos os jogadores e o valor correto.
- Uma ação com vários efeitos preserva a sequência lógica.
- Receber atualização por resposta de comando e por consulta não duplica avisos.
- Retornar após perda de conexão não dispara uma longa fila obsoleta.
- Movimentos reduzidos e som desligado preservam entendimento.
- Uma janela informativa não impede outra pessoa de jogar.

### 13.4 Aparelhos e interação

- Safari no iPhone e Chrome no Android.
- Telas pequenas, orientação horizontal e teclado virtual.
- Navegação por teclado e inspeção com leitor de tela.
- Conexão lenta, queda temporária e troca de aplicativo.
- Nomes longos e muitos eventos em sequência.
- Computador com janela estreita e larga.

### 13.5 Novas regras

Para trocas, leilões e crédito, incluir testes de ações simultâneas, saldo alterado antes da confirmação, jogador que saiu, reenvio de comando e interação com o fim da partida.

## 14. Como medir se o produto melhorou

Medir com o mínimo de informação pessoal necessário:

- Tempo para criar uma sala e começar.
- Proporção de salas criadas que iniciam uma partida.
- Proporção de partidas que terminam e motivos de abandono.
- Quantidade de reconexões e falhas de comando.
- Duração real por modalidade.
- Ações que mais geram dúvidas em testes com pessoas.
- Quantidade de consultas e consumo de armazenamento por partida.
- Reclamações sobre avisos excessivos ou falta de contexto.

**Marco principal:** uma família consegue começar, jogar e concluir a partida em aparelhos diferentes sem assistência técnica.

## 15. Decisões que precisam ser fechadas antes de cada implementação

1. **Avisos:** quais durações padrão e qual apresentação para cada tipo de evento?
2. **Identidade:** perfil apenas local na primeira etapa ou recuperação entre aparelhos já necessária?
3. **Ausência:** quanto tempo esperar e quem pode autorizar uma substituição?
4. **Temas:** começar por Maceió, São Paulo, Brasil ou universo original?
5. **Regras:** manter um modo clássico e um modo com recursos extras?
6. **Crédito:** qual finalidade estratégica e quais limites impedem prolongamento excessivo?
7. **Robôs:** continuar pausando sem páginas ativas ou exigir execução autônoma?

Essas decisões devem ser tomadas perto da implementação correspondente. Não é necessário resolver todo o roadmap para começar as correções e o sistema de acontecimentos.

## 16. Fontes da análise

As referências abaixo apontam para a versão examinada, e não para uma versão futura do projeto.

- [Site publicado](https://felp-zone.vercel.app/).
- [README do Mesa Online](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/README.md).
- [Casos de uso de salas e leitura do estado](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/server/rooms.ts).
- [Modelo de sala e comandos](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/rooms/room.ts).
- [Motor do Magnata](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/games/magnata/engine.ts).
- [Identidade no navegador](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/client/seats.ts).
- [Sincronização da sala](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/client/useRoom.ts).
- [Tela inicial e preparação da modalidade solo](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/components/Home.tsx).
- [Lobby e compartilhamento](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/components/Lobby.tsx).
- [Interface da partida](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/components/magnata/MagnataTable.tsx).
- [Detalhes de propriedade](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/components/magnata/TileSheet.tsx).
- [Estilos e layout](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/app/globals.css).
- [Armazenamento das salas](https://github.com/FelpHendeson/FelpZone/blob/af6933ffc7a8bf11a772e8a058d46f6c8f85af34/mesa-online/src/server/store.ts).

## 17. Próxima entrega recomendada

Preparar uma atualização focada em **correções essenciais e acontecimentos compartilhados**, usando retratos simples para identificar os jogadores nos avisos. Depois validar essa atualização em uma partida real com família ou amigos.

Essa entrega cria a base para o restante: um menu mais bonito pode aproveitar o perfil; mapas temáticos podem aproveitar os cartões de acontecimentos; trocas, leilões e crédito podem aproveitar os mesmos eventos e confirmações.
