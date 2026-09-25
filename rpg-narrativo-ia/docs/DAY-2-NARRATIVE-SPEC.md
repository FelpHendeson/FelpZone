# Dia 2 — Especificação narrativa e jogável

## Estado

**Especificado em 22 de setembro de 2026. Fatias A–G implementadas; playtest integrado validou cooperação, afastamento e ausência de encontro.**

Este documento é o próximo passo narrativo depois do fechamento das Fatias A–G do Dia 1.

Ele parte do estado real herdado da primeira noite e transforma o segundo dia no começo da convivência humana.

Referências:

- [Fundação narrativa — Reset](NARRATIVE-FOUNDATION.md);
- [Dia 1 — especificação narrativa e jogável](DAY-1-NARRATIVE-SPEC.md);
- [Dia 1 — Playtest da Fatia G](DAY-1-PLAYTEST.md);
- [Atividades contextuais](MECHANIC-CONTEXTUAL-ACTIVITIES.md).

---

# 1. Tese do Dia 2

O Dia 1 responde:

> **O que aconteceu comigo e como eu sobrevivo às primeiras horas?**

O Dia 2 começa a responder:

> **O que acontece quando outras pessoas também querem sobreviver aqui?**

O foco muda de descoberta individual para convivência.

O jogador não encontra uma sociedade pronta.

Ele encontra pessoas:

- cansadas;
- desconfiadas;
- feridas;
- curiosas;
- úteis;
- egoístas em algumas situações;
- generosas em outras;
- com ideias próprias sobre o que fazer a seguir.

A regra do Dia 2 é:

> **outros humanos não são conteúdo esperando o protagonista; eles também estão tentando viver.**

---

# 2. O Dia 2 não reinicia o jogador

Nenhuma rota deve pressupor um estado único.

O conteúdo precisa reconhecer pelo menos:

## 2.1 Relação com Mira

Possibilidades:

- passou a noite com Mira;
- conheceu Mira, mas preferiu ficar sozinho;
- evitou Mira;
- nunca chegou a conhecê-la.

Consequências:

- Mira pode estar próxima no amanhecer;
- pode estar em outra parte de sua rotina;
- pode reconhecer o jogador;
- pode manter distância;
- pode não fazer parte dos acontecimentos imediatos.

Mira não é requisito para o Dia 2 funcionar.

## 2.2 Recursos

O jogador pode começar o Dia 2 com combinações diferentes de:

- água;
- comida;
- gravetos;
- fogueira;
- ferramentas;
- itens encontrados;
- inventário quase vazio.

Nenhuma cena central deve exigir um item específico sem possuir uma rota alternativa coerente.

## 2.3 Estado físico

Fome, sede, energia, saúde e condições permanecem reais.

Um jogador que negligenciou necessidades no Dia 1 pode entrar no segundo dia em situação ruim.

A narrativa não cura o personagem por conveniência.

## 2.4 Exploração

O jogador pode conhecer:

- apenas a Clareira;
- a Nascente;
- a Grande Árvore;
- Mata Densa;
- outras descobertas do sandbox.

O conteúdo deve usar o que já foi descoberto sem revelar automaticamente o que não foi.

---

# 3. Objetivo de experiência

Ao final do Dia 2, o jogador deve compreender naturalmente que:

- existem vários sobreviventes na região;
- alguns deles já se encontraram sem o protagonista;
- pessoas possuem habilidades, opiniões e prioridades diferentes;
- recursos comuns criam problemas sociais;
- ajudar alguém é uma decisão, não uma obrigação;
- recusar cooperação não paralisa o mundo;
- o primeiro grupo humano ainda não é uma organização formal;
- ações práticas compartilhadas podem criar relação e informação;
- ninguém parece estar vindo restaurar a antiga ordem.

O Dia 2 não precisa ensinar ainda:

- cidadania;
- empregos formais;
- moeda;
- propriedade legal;
- assentamento formal;
- leis;
- facções;
- política institucional;
- romance;
- ranking regional.

Essas superfícies já existem no motor como protótipos, mas não devem ser apresentadas apenas porque o código permite.

---

# 4. Elenco novo do Dia 2

O Dia 2 introduz dois sobreviventes provisórios da fundação narrativa.

## 4.1 Caio Nascimento

**Idade provisória:** 27.

Experiência anterior:

- serviço militar temporário / segurança;
- familiaridade com vigia, disciplina, risco e organização básica.

Primeira impressão:

- atento;
- direto;
- pouco interessado em teorias;
- tenta reduzir riscos antes de discutir grandes planos.

Qualidade importante:

Caio é útil.

Ele não deve entrar como autoritário caricatural.

Ele percebe problemas que outras pessoas ignoram:

- água pode atrair gente;
- dormir sem vigia é perigoso;
- trilhas revelam posição;
- feridos diminuem mobilidade;
- criaturas podem voltar.

Tensão futura:

Caio tende a acreditar que emergência exige algum grau de coordenação.

Isso não significa que ele deve comandar.

## 4.2 Davi Moura

**Idade provisória:** 19.

Experiência anterior:

- estudante técnico;
- gamer;
- curioso;
- rápido em criar analogias para o Sistema.

Primeira impressão:

- fala mais quando fica nervoso;
- tenta entender o impossível;
- experimentou o Sistema cedo demais e se colocou em risco.

Estado inicial:

Davi chega ao primeiro encontro com:

- ferimento leve a moderado na perna;
- sede;
- mobilidade reduzida, mas não incapacitante.

O ferimento não cria um sistema médico novo nesta etapa.

Ele é uma pressão narrativa e pode responder a:

- água;
- repouso;
- ajuda disponível;
- cuidado de Mira, caso ela esteja presente;
- decisões futuras quando condições médicas forem aprofundadas.

Qualidade importante:

Davi não é apenas “o cara dos jogos”.

Ele pode formular hipóteses úteis sobre:

- Etéris;
- Númen;
- menus do Sistema;
- padrões de desbloqueio;
- diferenças entre usuários.

Ele também pode estar errado.

---

# 5. Situação inicial — rastros de mais de uma pessoa

O segundo dia não deve começar com Caio e Davi aparecendo magicamente na Clareira.

Depois do evento de amanhecer, o jogador volta ao sandbox.

A primeira pressão do Dia 2 surge no mundo.

## 5.1 Na Nascente

A área passa a poder revelar:

- duas trilhas humanas diferentes;
- marcas de alguém escorregando;
- gotas de sangue já secando;
- vegetação amassada na direção de uma margem rochosa.

A leitura deve deixar claro:

> mais de uma pessoa passou por ali.

## 5.2 Nova área provisória

Adicionar como proposta:

**Margem Rochosa**

ID sugerido:

`rocky-bank`

Função:

- pequena subárea próxima da Nascente;
- abrigo ruim, mas defensável;
- primeira cena com Caio e Davi;
- futura ligação com cursos d'água e exploração do Vale de Arkhé.

Ela não é um assentamento.

---

# 6. O primeiro encontro

O jogador encontra Caio e Davi na Margem Rochosa.

Situação:

- Davi está sentado ou apoiado, tentando poupar a perna;
- Caio mantém posição entre ele e quem chega;
- ambos têm evidências de que passaram a noite anterior tentando se mover;
- eles já conversaram entre si antes de conhecer o jogador.

Isso é importante.

O protagonista não junta duas peças vazias.

Ele encontra uma relação que já começou.

## 6.1 Se Mira estiver junto ou próxima

Mira pode:

- reconhecer o ferimento;
- pedir espaço para avaliar Davi;
- discordar de Caio sobre mover o rapaz imediatamente;
- lembrar o jogador de decisões da noite anterior.

Ela não assume liderança.

## 6.2 Se Mira não estiver presente

A cena funciona sem ela.

O jogador pode:

- oferecer água;
- ajudar Davi a se mover;
- manter distância;
- perguntar de onde vieram;
- observar antes de se aproximar;
- recusar envolvimento;
- mentir sobre recursos;
- ir embora.

## 6.3 Se o jogador evitar o encontro

Caio e Davi não ficam congelados.

Depois de tempo suficiente:

- eles podem chegar à Nascente;
- tentar alcançar a Clareira;
- ou montar um ponto temporário próprio.

O próximo encontro reconhece que o jogador os viu ou deliberadamente evitou.

---

# 7. Primeira tensão — água

A Nascente é o primeiro recurso socialmente importante.

Até aqui ela era apenas sobrevivência.

Agora surge a pergunta:

> **água encontrada por alguém pertence a essa pessoa?**

Caio não precisa reivindicar propriedade formal.

A tensão é mais simples:

- ele quer evitar que todos contaminem ou desperdicem a fonte;
- Davi precisa beber;
- Mira, se presente, tende a priorizar necessidade imediata;
- o jogador pode ter água própria ou depender da mesma fonte.

Possíveis posições do jogador:

- água deve ser usada por quem precisa;
- primeiro precisamos organizar coleta;
- cada um cuida da própria água;
- devemos guardar parte;
- não quero decidir por ninguém;
- ocultar que conhece outra fonte ou recurso.

Nenhuma escolha cria uma lei.

Ela cria memória e expectativa social.

---

# 8. Primeira atividade compartilhada

Depois do encontro, surge uma necessidade concreta.

Exemplos possíveis:

- buscar água;
- acompanhar Davi até um lugar melhor;
- verificar uma trilha;
- recolher material seco;
- manter vigia enquanto outro descansa.

Essa é a primeira aplicação da mecânica de [Atividades contextuais](MECHANIC-CONTEXTUAL-ACTIVITIES.md).

No Dia 2 ela deve ser pequena.

Não existe:

- emprego;
- salário;
- turno oficial;
- cargo;
- cidadania;
- obrigação institucional.

Existe:

> “precisamos fazer isso; quem vai?”

A atividade consome tempo real e pode gerar:

- recurso;
- relação;
- informação;
- prática;
- evento;
- risco.

---

# 9. Atividades iniciais propostas

## 9.1 Buscar água

Participantes possíveis:

- jogador sozinho;
- jogador + Mira;
- jogador + Caio;
- jogador + Davi apenas se sua condição permitir.

Resultado possível:

- água;
- conversa;
- observação de rastros;
- confiança.

## 9.2 Levar Davi para um ponto mais seguro

Possíveis destinos:

- Clareira;
- permanecer na Margem Rochosa;
- outro local conhecido do jogador.

Isso não teleporta NPC.

A atividade usa tempo e atualiza localização/estado por contrato explícito.

## 9.3 Verificar rastros próximos

Boa atividade para:

- Caio;
- Mira;
- jogador;
- futura Yasmin.

Pode revelar:

- outros humanos;
- criatura;
- passagem;
- informação de risco.

No Dia 2, o primeiro resultado deve apontar que existem mais pessoas na região, sem apresentar todo o elenco.

---

# 10. O grupo ainda não existe formalmente

Mesmo que quatro pessoas estejam juntas:

```text
jogador
Mira
Caio
Davi
```

isso não significa:

- party;
- organização;
- assentamento;
- cidadania;
- governo.

Eles são pessoas cooperando provisoriamente.

O Sistema 21 só deve entrar quando existir uma decisão explícita de formar um grupo com identidade e regras mínimas.

O Sistema 28 só entra quando existir:

- local assumido como base;
- alguma forma de autoridade reconhecida;
- projeto concreto de permanência.

No Dia 2, a narrativa apenas cria as razões para isso acontecer depois.

---

# 11. Protótipos sociais existentes devem ser recontextualizados

O pack atual possui conteúdo técnico histórico em que Mira pode:

- reconhecer residência;
- conceder profissão;
- formar grupo;
- negociar moeda;
- conceder propriedade;
- participar da reivindicação de acampamento.

Esses ciclos provaram os Sistemas 21, 26, 27 e 28.

Eles não representam mais a ordem canônica do prólogo.

Regra para a implementação do Dia 2:

> **capacidade técnica existente não implica disponibilidade narrativa imediata.**

Essas ações devem futuramente receber condições de desbloqueio coerentes com o crescimento da comunidade ou migrar para conteúdo posterior.

Não remover os sistemas.

Recontextualizar o conteúdo.

---

# 12. Davi e o Sistema

Davi é a primeira oportunidade de mostrar que pessoas diferentes investigam o Sistema sem depender do jogador.

Ele pode comentar observações como:

- todo mundo parece possuir a interface;
- textos básicos são semelhantes;
- aptidões iniciais diferem;
- algumas opções parecem aparecer depois de ações;
- Númen responde à prática.

Ele pode chamar conceitos por nomes de jogos antes de conhecer os termos corretos.

Exemplo:

> “Eu achei que era mana. Não é. Ou pelo menos o Sistema não chama assim.”

O jogo não deve usar Davi para despejar lore.

Ele formula hipóteses.

O jogador pode:

- concordar;
- corrigir com o que sabe;
- não se importar;
- experimentar junto;
- esconder informações.

Isso prepara a cultura futura de pesquisa do Sistema.

---

# 13. Caio e segurança

Caio é a primeira oportunidade de transformar segurança em problema social.

Ele pode perguntar:

- alguém ficou de vigia na noite anterior?
- há criaturas grandes por perto?
- a Clareira é visível demais?
- a fonte de água tem outro acesso?
- quantas pessoas sabemos que existem?

Ele pode sugerir:

> ninguém dorme sem alguém acordado se quatro pessoas estiverem juntas.

Isso ainda não é lei.

Pode virar:

- acordo;
- sugestão;
- conflito;
- atividade de vigia.

A reação do jogador pode afetar respeito/confiança, mas não deve simplesmente somar “pontos de Caio” por concordar.

---

# 14. Decisão do meio do dia — ficar juntos ou continuar móveis

Depois que Davi está minimamente estável, surge uma decisão prática.

Opções não exclusivas de rota:

- permanecer próximos durante algumas horas;
- levar Davi à Clareira;
- manter a Margem Rochosa como ponto temporário;
- buscar outros sobreviventes;
- cada um seguir seu caminho;
- jogador se recusar a participar.

A decisão não precisa ser um menu de rota.

Ela emerge de:

- conversas;
- localização;
- atividades;
- estado de Davi;
- presença de Mira;
- ações do jogador.

O mundo pode produzir um consenso sem o protagonista.

---

# 15. O jogador pode ir embora

O Dia 2 não deve punir a liberdade com “game over social”.

Se o jogador abandona o grupo:

- Caio tenta resolver o problema com os recursos disponíveis;
- Davi continua existindo;
- Mira decide por si mesma se permanece ou parte;
- a história coletiva progride.

Mais tarde o jogador pode encontrar:

- um acampamento improvisado;
- pessoas diferentes juntas;
- ressentimento;
- gratidão;
- indiferença;
- consequências de não ter ajudado.

A ausência do jogador é uma escolha que o mundo registra.

---

# 16. Fim do Dia 2 — ninguém vem buscar vocês

O segundo dia precisa terminar com mudança de escala.

Não é mais apenas:

> “existem outras pessoas.”

Passa a ser:

> “essas pessoas também não sabem o que aconteceu e ninguém parece estar vindo.”

A cena final pode variar.

## Com grupo próximo

Ao entardecer/noite:

- Caio pergunta o que será feito amanhã;
- Davi comenta que o Sistema continua funcionando como se aquilo fosse o novo normal;
- Mira, se presente, observa que esperar sem agir já é uma decisão.

Pode surgir a proposta:

- procurar mais gente no Dia 3;
- melhorar o abrigo;
- mapear água;
- dividir tarefas.

## Sozinho

O jogador pode observar:

- fumaça humana à distância;
- luz de uma fogueira;
- novos rastros;
- sinais de movimento perto da água.

O mundo prova que pessoas estão se organizando sem ele.

---

# 17. Jornada principal proposta

ID sugerido:

`day-two-others`

Título:

**Os outros**

Objetivo:

> Descubra quem mais está sobrevivendo perto de você e decida quanto espaço essas pessoas terão no seu segundo dia.

Etapas sugeridas:

```text
Os outros
├── Encontre sinais de mais de uma pessoa
├── Localize os sobreviventes
├── Entenda a situação de Davi
├── Tome uma decisão sobre ajudar ou se afastar
└── Descubra o que o grupo pretende fazer a seguir
```

A etapa de “ajudar” não exige ajuda.

Critério deve ser:

> decisão tomada.

A jornada pode concluir tanto por cooperação quanto por afastamento.

---

# 18. Jornadas laterais possíveis

## 18.1 Água para mais de um

Ativada pela situação na Nascente.

Pode envolver:

- coleta;
- compartilhamento;
- reserva;
- discussão.

## 18.2 Uma perna ruim

Ativada ao conhecer Davi.

Objetivo:

- melhorar sua condição imediata ou decidir não assumir responsabilidade.

Não deve exigir cura total.

## 18.3 Vigia

Ativada se pessoas permanecerem juntas até o fim do dia.

Primeira oportunidade para uma atividade compartilhada de segurança.

---

# 19. Relacionamentos no Dia 2

As relações começam a se diferenciar.

Mira:

- memória do Dia 1;
- confiança ou distância;
- reação ao modo como o jogador trata outros sobreviventes.

Caio:

- respeito por decisões práticas;
- desconfiança se o jogador parecer esconder risco;
- possível discordância sem hostilidade imediata.

Davi:

- gratidão se ajudado;
- curiosidade sobre o jogador e Númen;
- ressentimento possível se tratado como peso.

Importante:

> concordar não é sinônimo automático de ganhar relação.

Uma pessoa pode respeitar alguém com quem discorda.

---

# 20. Númen no Dia 2

Númen continua presente, mas não domina todo o dia.

O jogador pode:

- treinar;
- experimentar;
- comparar sensações com Davi;
- perceber aplicações corporais em outras pessoas.

Primeiro indício de diferença individual:

Caio pode demonstrar, sem entender completamente, uma aplicação física mais direta.

Exemplo:

- firmeza corporal;
- reação;
- explosão curta de esforço.

Não transformar isso em “Caio já é mestre”.

É apenas evidência de que:

> pessoas estão aprendendo coisas diferentes.

Isso prepara Ícaro e a discussão de crescimento desigual nos dias seguintes.

---

# 21. Tutorial e ajuda

O Dia 2 pode desbloquear ajuda apenas quando necessário.

Tópicos novos possíveis:

- pessoas persistentes;
- relações;
- atividades contextuais.

Não desbloquear ainda:

- cidadania;
- economia;
- assentamento;
- política.

A mensagem de atividade contextual deve ser curta:

> **Nova função disponível: Atividades**
>
> Algumas necessidades podem ser resolvidas com outras pessoas. Atividades consomem tempo e podem gerar recursos, prática, relações, informações ou acontecimentos.

---

# 22. Mapeamento para sistemas existentes

| Necessidade narrativa | Sistema |
| --- | --- |
| passagem do segundo dia | 1, 2, 24 |
| nova área e rastros | 3, 4, 18 |
| água e recursos | 5, 9 |
| jornada principal | 10 |
| Númen e treino | 11, 13, 22 |
| risco eventual | 12, 14, 15 |
| Caio, Davi e Mira persistentes | 17 |
| relações e memórias | 19 |
| grupo futuro, mas não automático | 21 |
| atividade com mais de uma pessoa | mecânica de Atividades Contextuais + 17/19/24/26/28 |
| ferimento de Davi | narrativa + condições existentes quando aplicável |
| futura base | 28, ainda não formalizada |
| futura organização social | 21/26/29, ainda bloqueados |

---

# 23. Lacunas técnicas reveladas

## 23.1 Atividades contextuais

O motor possui:

- ações individuais;
- NPCs persistentes;
- relações;
- profissões;
- assentamentos.

Falta um contrato pequeno para:

> uma atividade situada no mundo, com duração, participantes opcionais e resultados derivados dos sistemas existentes.

Essa lacuna está especificada separadamente em [Atividades contextuais](MECHANIC-CONTEXTUAL-ACTIVITIES.md).

Ela não será chamada de Sistema 30.

## 23.2 Estado físico de NPC

Davi ferido não justifica criar agora uma simulação completa de necessidades de NPC.

No primeiro recorte:

- usar fatos/condições narrativas fechadas;
- atividade pode alterar o estado do encontro;
- não criar fome/sede/saúde completas para todos os NPCs.

Se a campanha exigir isso repetidamente, especificar depois.

## 23.3 Conteúdo social protótipo precoce

Ações de cidadania, profissão, propriedade e assentamento hoje podem aparecer cedo demais dependendo do estado.

A implementação do Dia 2 deve revisar os gates de visibilidade/desbloqueio dessas superfícies sem remover os Sistemas 21–29.

---

# 24. Critérios narrativos de aceite

O Dia 2 estará pronto para implementação quando:

- funcionar com Mira presente ou ausente;
- Caio e Davi existirem independentemente do protagonista;
- o jogador puder cooperar ou se afastar;
- água gerar tensão sem inventar propriedade formal;
- pelo menos uma atividade compartilhada possuir consequência real;
- nenhum encontro criar party, cidadania ou assentamento automaticamente;
- abandonar os sobreviventes não congelar o mundo;
- o fim do dia apontar para organização futura sem fundá-la;
- o jogador continuar livre no Dia 3;
- Númen aparecer como fenômeno humano diverso, não como tutorial repetido.

---

# 25. Fora do Dia 2

Não implementar neste recorte:

- assentamento formal;
- eleições;
- leis;
- moeda comunitária;
- emprego formal;
- ranking regional;
- romance;
- casamento;
- Rowan;
- Helena;
- Lívia;
- Samuel;
- Nádia;
- Ícaro;
- Rafael;
- Yasmin como presença principal;
- facções;
- guerra;
- Sistema 30;
- simulação completa de necessidades de NPC.

Esses elementos continuam disponíveis para os dias e arcos seguintes.

---

# 26. Próximo passo técnico

Depois desta especificação:

1. especificar o contrato mínimo de implementação do Dia 2;
2. definir o primeiro recorte da mecânica de Atividades Contextuais;
3. adicionar Caio e Davi ao pack;
4. criar Margem Rochosa e descobertas da Nascente;
5. implementar a jornada `day-two-others`;
6. criar encontros condicionais por estado herdado do Dia 1;
7. provar duas rotas integradas:
   - cooperação;
   - afastamento;
8. garantir que ambas chegam ao Dia 3 sem formalizar assentamento.
