# Domínio: documento de design (GDD)

> Versão 1 · rascunho para validação. Nada aqui está implementado, exceto o que já existe no "Modo Cidade" (v0.4).
> Números são pontos de partida para balancear com simulação, como fizemos com a visada.

## 1. Visão

**Domínio** é um RP de gangue de navegador. Você cria o seu personagem, funda um bonde no colégio e o leva da briga no pátio até uma organização que disputa o mundo.

O jogo cresce em **eras de escala**: Escola → Bairro → Cidade → Estado → País → Mundo. Cada era adiciona pontos, mecânicas e inimigos. O personagem, o bonde, a bandeira e a história atravessam todas elas.

Inspiração de clima: guerra de bondes e lealdade (estilo anime de gangue) e crime de cidade grande (estilo mundo aberto). Tudo **original**: cidade, gangues, personagens e arte inventados.

### Pilares

1. **Toda tela tem uma decisão interessante.** Se é só clicar "ok", automatiza.
2. **A hierarquia trabalha por você.** Você decide a estratégia e os capitães cuidam do dia a dia. Microgerenciar é opcional.
3. **Risco e recompensa sempre.** Mais lucro = mais visada, mais inimigos, mais chance de traição.
4. **É um RP.** Personagens com nome, rosto, passado e falas. O que acontece com eles importa.
5. **Pode pular tudo.** Tutorial, diálogos e cenas sempre têm "pular".

### Limites de conteúdo (decisões de design)

- **Era Escola, sem crime pesado.** Os personagens são menores de idade. Lá vale briga de mão, rivalidade, respeito, motos, bicos e encrenca com a diretoria. Drogas, armas de fogo, inferninhos, sequestro e assassinato só existem **depois do salto no tempo**, com todo mundo adulto.
- **Inferninhos:** o jogo modela o negócio da casa (shows, DJ, bebida, segurança, ambiente). A equipe aparece como funcionários contratados. **Pessoas nunca são mercadoria com preço.**
- Violência é mostrada de forma estilizada (ícones, texto, animação curta), sem gore.

## 2. Estrutura da campanha: eras de escala

| Era | Mapa | Duração alvo | Mecânicas novas | Polícia ("visada") |
|---|---|---|---|---|
| **1. Escola** | Colégio e arredores (~15 pontos) | 30–45 min | Respeito, recrutar, brigas, hierarquia básica (você + vice), bandeira e uniforme, motos | **Advertências** da diretoria e do inspetor |
| ⏳ *Salto no tempo* | Cena: "Anos depois..." | — | Quem do bonde continua com você? | — |
| **2. Bairro** | Um bairro (~25 pontos) | 45–60 min | Dinheiro, lotes vazios e construção, tipos de ponto com função, capitães, armas leves, eventos (bailão) | **PM** (a visada atual) |
| **3. Cidade** | Cidade gerada (~60–80 pontos, 4–6 gangues) | 1–2 h | Zonas neutras, pontos especiais, ações especiais, mercado, tenentes, alianças | **Polícia Civil**, com operações |
| **4. Estado** | Mapa de cidades (uma por uma) | várias sessões | Rotas entre cidades, facções estaduais, logística, governar cidades conquistadas | **Força-tarefa** |
| **5. País** | Mapa de estados | várias sessões | Contrabando por portos e fronteiras, cartéis, corrupção política | **Federal** |
| **6. Mundo** | Mapa-múndi estratégico | final | Conexões internacionais, lavagem, guerra de cartéis | **Cooperação internacional** |

- **Eras 1–3** são jogadas no mapa de pontos (como hoje).
- **Eras 4–6** são uma **camada estratégica**. O mapa mostra cidades, estados ou países como nós. Você só entra no mapa de pontos de uma cidade quando quer guerrear lá de perto. O resto é gerenciado pelos capitães, pela "política" que você escolher. Isso mantém o escopo viável e a partida sem arrastar.
- **Transição de era:** quando você vence uma era, acontece uma cena e uma escolha (quem promover, que território manter de base). O que se carrega: personagem (nível e habilidades), membros com nome, bandeira, uniforme, reputação e parte do dinheiro.
- **Modo Livre:** jogar qualquer era já desbloqueada direto, como partida avulsa. O jogo atual vira o **Modo Livre: Cidade**.

### 2.1 Era 1: Escola (detalhe)

- **Mapa:** Colégio Estadual de Porto Neon e arredores, com pátio, quadra, terraço, cantina, banheiro dos fundos, sala de música, portão, ponto de ônibus, fliperama, lanchonete, oficina de motos e mais **3 colégios rivais**.
- **Recursos:** **Respeito** (principal), **Grana** (pouca, vem de bicos: lavar carro, entregas, consertar moto) e **Advertências** (a "visada" da escola; 3 = suspensão, e você perde 3 dias).
- **Recrutar:** convencer alunos na quadra, no fliperama e na oficina. O recrutamento depende de Respeito e de **Lábia**.
- **Brigas:** o combate do jogo atual, só no braço. Aqui entra a primeira versão da **briga de bonde** (seção 6).
- **Motos:** compradas na oficina. Deixam atacar mais longe e são o começo da identidade do bonde.
- **Objetivo:** unificar os colégios da região sob a sua bandeira.
- **Final:** um confronto com o líder do colégio mais forte, seguido do salto no tempo.
- **Tutorial:** a Era Escola **é** o tutorial. Cada mecânica aparece quando é usada pela primeira vez.

## 3. Personagens e hierarquia

### 3.1 Criação do personagem (você)

- **Nome, vulgo, aparência** (avatar montado: rosto, cabelo, cicatriz, acessórios; arte simples em camadas).
- **Atributos** (distribui pontos):

  | Atributo | Efeito |
  |---|---|
  | **Força** | Poder em briga e na presença pessoal |
  | **Tática** | Bônus de ataque e defesa do bonde, ver chance real |
  | **Lábia** | Recrutar, negociar, alianças, interrogatório |
  | **Sangue-frio** | Visada menor nas ações, resistir a traição e a pressão |

- **Origem** (escolha que dá um bônus e uma fala diferente na história): *Filho do morro*, *Playboy desgarrado*, *Moleque de oficina*, *Lutador de academia*.
- **Nível e XP:** ganha nos confrontos, ações e eventos. Cada nível dá 1 ponto de atributo e, a cada 2 níveis, 1 habilidade.
- **Arma especial:** começa como algo simbólico (soco-inglês, taco de beisebol do avô). Após o salto no tempo, evolui para uma arma marcante com história.
- **Habilidades** (árvore em 3 ramos):
  - **Líder:** +lealdade, +limite de capitães.
  - **Lutador:** bônus pessoal em confrontos, entrar na briga.
  - **Cabeça:** economia, menos visada, ações especiais.

### 3.2 Postos

| Posto | Quantos | Papel |
|---|---|---|
| **Comandante** | 1 (você) | Decide a estratégia |
| **Vice** | 1 | Assume se você cair; dá bônus de lealdade. **Pode trair** se a lealdade dele cair |
| **Capitães** | 1–2 na Escola, até ~6 na Cidade | Cada um comanda um **setor** (grupo de pontos) e o gerencia pela política que você escolher |
| **Tenentes** | 1–2 por capitão | Lideram esquadrões; dão bônus em ataque e defesa |
| **Soldados** | sem nome | A base, como hoje |

- Todo membro com nome tem **nível, 2–3 traços** (*Brigão, Leal, Ganancioso, Esquentado, Esperto, Covarde, Carismático*), **lealdade (0–100)** e uma **fala/bordão**.
- **Lealdade** sobe com promoção, vitória, salário em dia e eventos. Cai com derrota, perda de amigos, salário atrasado e ser preterido.
- Abaixo de 25, o membro pode **desertar, dedurar ou trair** (com uma cena).
- **Morte e prisão:** membros com nome podem cair em confronto ou ser presos em batida. Isso é permanente (com opção de "modo leve" nas configurações).

## 4. Mapa e pontos

### 4.1 Tipos de ponto (com função)

| Tipo | Era | Função principal | Observação |
|---|---|---|---|
| Bar / Fliperama / Campinho / Academia | 1+ | **Recrutar** (só nesses tipos) | Academia recruta melhor (+Força) |
| Oficina de motos | 1+ | Motos, alcance de ataque | Vira desmanche na era 2 |
| Boca | 2+ | Dinheiro alto, visada alta | Mercado da seção 9 |
| Inferninho / Boate | 2+ | Respeito, **informação** (boatos de ataques rivais) | Gestão da casa, seção 9 |
| Desmanche | 2+ | Dinheiro e veículos | |
| Depósito | 2+ | Guardar armas e produto, aumentando o estoque | |
| Oficina de armas | 3+ | Melhorar armas | |
| Porto / Pista clandestina | 3+ | Contrabando, ligação com outras cidades (era 4) | |
| QG | 1+ | Coração do bonde | Se cair, você perde (ou foge para um QG reserva) |

### 4.2 Lotes vazios e construção

- O mapa tem **lotes vazios**. Quem controla um lote vizinho pode **comprá-lo e construir** qualquer tipo liberado na era.
- Construir custa dinheiro e **dias de obra**. Um ponto em obra é frágil: pode ser sabotado.
- Isso permite estratégias: um reduto recrutador, um bairro só de bocas (lucro e visada altos) ou um cinturão de defesa.

### 4.3 Zonas neutras (não dá pra tomar)

| Zona | Efeito |
|---|---|
| **Hospital** | Membros feridos se recuperam mais rápido se houver ponto seu perto |
| **Igreja / Projeto social** | Eventos ali reduzem a visada e melhoram a reputação no bairro |
| **Escola** (eras 2+) | Ação violenta perto dela gera muita visada |
| **Delegacia / Batalhão** | Pontos perto ficam mais visados; dá pra subornar ali |
| **Praça / Feira** | Lugar de evento e negociação; trégua obrigatória |

### 4.4 Pontos especiais (alvos de ação, não de domínio)

Banco, joalheria, lotérica, supermercado, caixa eletrônico avulso e mansão.

- Cada um tem **segurança**, **valor** e **visada gerada**, e o valor se recompõe com o tempo.
- São alvos das ações especiais (roubar, sequestrar o dono da mansão, extorquir o supermercado toda semana).

### 4.5 Geração do mapa

Gerado por **semente** (dá pra repetir ou compartilhar um mapa com amigos). As regras: bairros como regiões, ruas ligando vizinhos sem cruzar, número de pontos por era, QGs rivais longe do seu, zonas neutras espalhadas e lotes vazios ~20%.

## 5. Identidade do bonde

- **Bandeira:** editor simples com cor de fundo, padrão (listras, faixa, diagonal), **símbolo** (de uma lista: caveira, dragão, corvo, raio, coroa, cobra, lua, punho...) e um lema curto.
- **Uniforme:** **jaqueta do bonde** (cor, emblema nas costas com o símbolo, bordado com o nome) e acessório (bandana, boné, faixa na cabeça).
- **Onde aparece:** bandeira hasteada nos pontos dominados, no topo da tela e nos avatares dos membros (com a jaqueta). Os rivais também têm bandeira e uniforme.
- **Evolução:** na Era Escola é uma jaqueta customizada. Depois do salto no tempo, você pode redesenhar a marca, e isso é um momento de história.

## 6. Combate

- **Poder de ataque** = soldados × (1 + respeito/200) × multiplicador de arma × bônus de tenente × bônus de Tática × sorte(0,75–1,25).
- **Defesa:** guardas × tipo × nível × arma × bônus de terreno.
- **Briga de bonde** (confrontos importantes: QGs, líderes rivais, defesa avisada): 3 rodadas rápidas.
  - Em cada rodada você escolhe **Avançar**, **Segurar** ou **Cercar** (pedra, papel e tesoura com pesos).
  - Tenentes e o seu personagem podem usar **1 habilidade** por briga.
  - O resultado aparece numa cena curta com falas.
- Ataques comuns continuam instantâneos, pra não arrastar.

## 7. Armas e fornecedores (era 2+)

| Arma | Força | Visada extra | Observação |
|---|---|---|---|
| Mão / soco-inglês | 1,0 | 0 | Única opção na Era Escola |
| Faca, taco | 1,2 | +0 | |
| Pistola | 1,5 | +1/dia por esquadrão armado | |
| Escopeta | 1,8 | +2 | Forte na defesa |
| Fuzil | 2,2 | +3 | Era 3+ |

- Armas ficam no **arsenal** (depósito) e se **distribuem por setor**. Um setor armado gasta munição (custo por dia).
- **Fornecedores** (2 a 4 por era): cada um com **preço, qualidade, prazo e risco** (chance de a polícia rastrear a compra).
  - Um fornecedor pode subir o preço, sumir ou ser rival disfarçado (evento).

## 8. Ações especiais (era 2+ e 3+)

| Ação | Alvo | Custo | Sucesso depende de | Consequência |
|---|---|---|---|---|
| **Roubar** | Ponto especial | Esquadrão + 1 ação | Tática, armas, segurança do alvo | $$ alto, visada alta |
| **Sequestrar** | Dono de mansão, tenente rival | 2 ações + esquadrão | Tática, Sangue-frio | Resgate ou informação; guerra se for de rival |
| **Emboscar** | Esquadrão rival em movimento (precisa de informação) | 1 ação | Informação do inferninho, Tática | Destrói o ataque rival antes de chegar |
| **Assassinar** | Tenente ou capitão rival | 1 ação + membro de nível alto | Força ou Sangue-frio do executor | Enfraquece o setor rival; **guerra total**; o executor pode ser preso |
| **Negociar** | Gangue rival | 1 ação | Lábia, respeito | Trégua, troca de pontos, dinheiro |
| **Aliança** | Gangue rival | 1 ação + dias | Lábia, inimigo em comum | Ataques conjuntos; pode ser **traída** por eles ou por você |

As ações aparecem como botões no painel do ponto ou do líder rival, com a chance real visível (se você tiver Tática suficiente) ou estimada.

## 9. Economia e mercado (era 3+, versão simples na 2)

- **Produtos fictícios genéricos** (*erva*, *pó*, *sintético*), cada um com custo, margem, visada e demanda por bairro.
- **Fornecedor:** como as armas (preço × qualidade × risco).
- **Preço:** você define *barato / justo / caro*. Barato rouba clientes dos rivais (e eles reagem); caro dá margem e perde volume.
- **Demanda e concorrência:** cada bairro tem demanda base e ofertas rivais. Eventos mexem nisso ("carregamento barato no porto", "operação secou o mercado", "festa grande no fim de semana").
- **Inferninhos:** você escolhe a **atração da semana** (DJ, show ao vivo, noite temática), o nível da casa (popular ↔ exclusiva) e a segurança. Isso afeta o dinheiro, o respeito, a informação (boatos) e a visada.
- **Pra não ficar chato:** cada setor tem uma **política do capitão**, que roda sozinha:
  - **Segura:** menos visada.
  - **Equilibrada.**
  - **Agressiva:** preço baixo, guerra de mercado.
  - **Lucro máximo.**

  O jogador só abre a tela de mercado quando quer otimizar. Um relatório semanal mostra o que o capitão fez.

## 10. Eventos nos pontos

| Evento | Onde | Custo | Bônus (temporário) | Risco |
|---|---|---|---|---|
| **Bailão** | Campinho, praça, inferninho | $$ + 1 ação | +Respeito, +recrutamento no bairro por 3 dias | Visada; rival pode atacar o evento |
| **Racha de motos** | Rua larga, oficina | $ | +Respeito, membros ganham XP, chance de recrutar piloto | Acidente (membro ferido), polícia |
| **Torneio de luta** | Academia, pátio (Era Escola) | $ | XP para lutadores, recrutar lutador forte | Briga generalizada |
| **Churrasco do bonde** | QG | $ | +Lealdade de todos | Nenhum (mas custa) |
| **Ação social** | Igreja, praça | $$ | −Visada, +reputação no bairro | Rivais te acham fraco (menos respeito) |

## 11. Tutorial e diálogos

- **Tutorial guiado na Era Escola:** cada mecânica aparece na primeira vez, com destaque na interface, uma fala curta de um personagem e um "tentar agora".
- **Dicas mostradas nas outras eras:** um card ❔ discreto quando algo novo aparece (pontos especiais, mercado...).
- **Sempre pulável:** "Pular tutorial", "Pular cena" e "Desativar dicas" nas configurações. Diálogos têm "avançar", "auto" e "pular".
- **Diálogos com escolha** em momentos de RP (negociação, interrogatório, traição, transição de era). As escolhas afetam lealdade, respeito ou abrem caminhos.
- **Diário do bonde:** tudo que já foi explicado fica consultável no menu.

## 12. Lore (esboço)

- **Porto Neon:** cidade portuária com morro, centro antigo, zona industrial decadente e cais. A polícia é corrupta pela metade.
- **Era Escola:** Colégio Estadual de Porto Neon, com rivais no Colégio Técnico (os futuros *Corvos*), no Colégio do Cais (futuros *Dragões*) e no Instituto da Vila (futuras *Serpentes*). Os líderes rivais do Modo Cidade aparecem jovens, e dá pra recrutar ou fazer inimigos que voltam depois.
- **Personagens-chave:** um **vice** fiel desde o pátio (com um arco de possível traição), um mentor mais velho da oficina e um rival pessoal que te persegue por todas as eras.
- **Finais:** rei da cidade/estado/mundo, preso, morto, traído pelo vice ou **largar a vida** (final alternativo).

## 13. Interface (o que muda no layout v0.4)

- **Topo:** a bandeira do bonde no lugar do quadradinho de cor, e o nome da era.
- **Novo botão 👥 Bonde:** tela da hierarquia (organograma com avatares), membros, promoções e lealdade.
- **Novo botão 🔫 Arsenal** (era 2+), **📈 Mercado** (era 3+) e **📜 Diário**.
- **Painel do ponto:** botões de ação especial e de evento quando disponíveis.
- **Cenas de diálogo:** caixa de fala com avatar sobre o mapa escurecido, com "avançar", "auto" e "pular".

## 14. Arquitetura técnica

- Continua **site estático na Vercel**, sem servidor e sem custo.
- **Módulos ES:**
  - `data/` (tipos, armas, eras, falas)
  - `core/` (regras puras e testáveis)
  - `ui/` (mapa, HUD, telas)
  - `sim/` (simulador de balanceamento)
- **Dados separados das regras:** criar ponto, arma ou evento novo = editar um arquivo de dados.
- **Save versionado com migração:** cada versão do jogo converte o save antigo, e partidas não quebram com atualizações. Até 3 espaços de save.
- **Gerador de mapas com semente.**
- **Simulação automática** (o bot que já usamos) rodando a cada mudança de regra, pra pegar desequilíbrio cedo.

## 15. Roadmap

| Fase | Entrega | Jogável ao fim? |
|---|---|---|
| **F0: Fundação** | Reorganizar em módulos, save versionado (migrando o atual), simulador em `sim/` | Sim, igual ao atual |
| **F1: Identidade e personagem** | Criação do Comandante (atributos, origem, avatar), bandeira e jaqueta, membros com nome (vice e capitães), lealdade, motor de diálogos e de tutorial (puláveis) | Sim, Modo Cidade com personagens |
| **F2: Era Escola** | Mapa do colégio, advertências, brigas, recrutar por tipo, motos, briga de bonde (3 rodadas), tutorial guiado, cena do salto no tempo | Sim, **primeira era da campanha** |
| **F3: Era Bairro** | Lotes vazios e construção, tipos com função, armas e fornecedores, eventos (bailão, racha), capitães com setor e política | Sim |
| **F4: Era Cidade** | Mapa gerado grande, zonas neutras, pontos especiais, ações especiais, mercado, alianças, tenentes; o Modo Cidade atual vira a base | Sim |
| **F5: Estado / País / Mundo** | Camada estratégica, rotas, facções maiores, finais | Sim |
| **F6: Polimento contínuo** | Animações, sons, música, mais lore e falas, conquistas | — |

Cada fase termina com: simulação de equilíbrio, teste no PC e no celular, deploy e você jogando.

## 16. Decisões em aberto (pra validar)

1. **Morte permanente** de membros com nome: sim por padrão, com "modo leve" opcional?
2. **Duração das eras 1–3:** os alvos de 30 min a 2 h estão bons?
3. **Arte dos avatares:** emoji e camadas simples (rápido) ou ilustrações (mais bonito, mais trabalho)?
4. **Nome do colégio, das gangues juvenis e do seu vice:** tem preferência ou deixa comigo?
5. **Eras 4–6:** a camada estratégica abstrata (proposta) está ok, ou você imagina mapas de pontos em todas?
