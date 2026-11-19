# LionHearth: Crônicas das Sky Islands (GDD)

Idle RPG de gerenciamento de party. A batalha é contínua: os heróis lutam sozinhos, em ondas, mesmo com o jogo fechado. O jogador decide **quem** luta, **como** cada herói cresce, **o que** cada um veste e **quais** habilidades usa.

Este documento descreve o que está implementado na v1.0 e marca o que é proposta.

## 1. Mundo e história

- **Reino de Hope:** ilhas flutuantes (as *Sky Islands*) sobre um mar de nuvens.
- **Ilha de Aço:** a maior delas, terra da família **LionHearth**.
- **Começo:** o jogador é **Sir LionHearth**, filho do lorde, cavaleiro reconhecido pela família, que parte para espalhar o nome LionHearth.
- **Campanha:** 21 capítulos (os objetivos) contam a viagem do Sir LionHearth da Ilha de Aço até a Cidadela das Nuvens. Ao mesmo tempo, funcionam como tutorial de cada sistema.

## 2. Personagens

Party fechada de cinco. Sir LionHearth começa a aventura; os outros entram pela **Taverna**, liberados pelo nível do Sir LionHearth.

| Personagem | Raça | Papel | Elemento | Entra |
| --- | --- | --- | --- | --- |
| **Sir LionHearth**, Cavaleiro de Hope | Humano | Dano explosivo, sustentação | Fogo | Início |
| **Quentin Salamander**, Escudeiro do Leão | Salamandrino | Tanque | Fogo | Nível 2 |
| **Cyrus Viper**, Aprendiz de Mago | Humano | Dano em área, escudos | Raio | Nível 5 |
| **Vesper Ashveil**, Lâmina da Névoa | Meio-elfa | Dano constante (DPS principal) | Sombra | Nível 10 |
| **Odalys Thornwick**, Feiticeira das Runas | Sylph | Buffs e debuffs | Natureza | Nível 14 |

**Vesper** e **Odalys** são criações para esta versão:

- **Vesper Ashveil:** sobrevivente de Vel’Nora, uma ilha que caiu nas nuvens. Golpes rápidos, críticos e veneno.
- **Odalys Thornwick:** sylph do Jardim Suspenso que grava runas no ar. Fortalece a party (Bênção de Hope, Canção do Vento) e enfraquece os inimigos (Maldição de Espinhos, Raízes Lentas).

Cada personagem tem atributos base e de crescimento próprios, tipos de armadura e arma permitidos, um peso de **ameaça** (o tanque atrai os golpes) e uma **linha** na formação (frente ou trás).

## 3. Atributos

Sete atributos, inspirados em RPGs de criaturas, mas aplicados ao combate contínuo:

| Atributo | Efeito |
| --- | --- |
| **Vida** | Dano que aguenta antes de cair |
| **Ataque físico** | Dano de golpes e habilidades físicas |
| **Defesa física** | Reduz dano físico: `k / (k + DEF)`, com `k = 50 + 5 × nível do atacante` |
| **Velocidade física** | Frequência do ataque básico e recarga das habilidades físicas |
| **Ataque mágico** | Dano de magias, curas e escudos mágicos |
| **Defesa mágica** | Reduz dano mágico |
| **Velocidade mágica** | Recarga das habilidades mágicas |

- **Atributos secundários**, vindos de passivas, conjuntos e relíquias: chance e dano crítico, roubo de vida, regeneração, redução de recarga, ameaça, espinhos, bônus elementais e bônus de XP, ouro e saque.
- **Cada nível** aumenta todos os atributos (crescimento do personagem) e dá **3 pontos** para distribuir e **1 ponto de habilidade** para a árvore. O botão "Distribuir sugerido" reparte os pontos conforme o papel do herói.

## 4. Combate contínuo

- **Passos de 0,5 s**, iguais com o jogo aberto ou fechado. São até 8 horas offline, simuladas em menos de 1 s.
- **Ataque básico:** cada lutador tem uma barra que enche pela velocidade, com intervalo de `2 × 30 / (30 + VEL)` segundos.
- **Habilidades** disparam sozinhas quando a recarga acaba, por ordem de prioridade, uma por passo. Curas e escudos só disparam quando alguém precisa.
- **Recarga efetiva:** `1,6 × recarga × 40/(40 + VEL da escola) × (1 − reduções)`, com no mínimo 1 s. As reduções (afixos, relíquias e −2% por nível da habilidade) somam no máximo 50%.
- **Alvos dos inimigos:** atacam quem tem mais ameaça. Provocar multiplica a ameaça por 20. Alguns inimigos atingem a party inteira, e o chefe faz isso a cada três golpes.
- **Elementos:** fraqueza dá ×1,5 e resistência dá ×0,6.
- **Crítico:** sorteado pelo gerador com semente, o que mantém o jogo determinístico.
- **Ondas:** de 1 a 4 inimigos. A cada 10 ondas vem um **chefe** (×7 de vida), que sempre deixa um item. A cada 10 ondas os inimigos sobem um nível, até 7 níveis acima do início do mapa.
- **Derrota:** a party volta ao acampamento, se recupera e tenta a mesma onda de novo.

## 5. Habilidades

- **Tipos:**
  - **ativa**;
  - **passiva** (algumas são **auras** que valem para a party inteira);
  - **transformação**: o **Leão das Chamas** dá +45% de ATQ, +30% de VEL e roubo de vida por 15 s, e o ataque básico vira fogo. Na cena, aparece uma juba de chamas.
- **Atributos de cada habilidade:** escola (física ou mágica), elemento, **rank** (D, C, B, A, S) e efeitos: dano (único, área, vários golpes), dano contínuo, cura, escudo, buff, debuff e provocar.
- **Nível da habilidade:** de 1 a 10, sobe com o **uso**. Cada nível soma +6% de potência e −2% de recarga.
- **Em uso:** até **5 habilidades** por herói, além do ataque básico. A ordem define a prioridade. Passivas também ocupam espaço, o que cria uma escolha.

### Árvore

Cada personagem tem dois ramos, com nós de **habilidade** e nós de **bônus**, que exigem nível, pontos e os nós anteriores.

Na árvore do Sir LionHearth, o **Leão das Chamas** exige os dois ramos: a *Fúria do Leão* e o *Cavaleiro de Hope*. A dualidade da lore vira regra de jogo.

### Jardim (fusão)

- **Como funciona:** você planta duas habilidades de um herói e, 20 minutos depois (inclusive offline), colhe uma terceira. As originais continuam com o herói.
- **Custo:** ouro e essência, que crescem com o rank.
- **Receitas secretas** dão habilidades únicas de rank A:
  - Golpe Justo + Rugido Flamejante = **Julgamento do Leão**;
  - Provocar + Muralha de Escamas = **Fortaleza Ígnea**;
  - Tempestade de Raios + Lança Trovejante = **Juízo do Trovão**;
  - Corte Duplo + Dança das Lâminas = **Eclipse de Lâminas**;
  - Bênção de Hope + Seiva Restauradora = **Jardim de Hope**.
- **Fusão sem receita:** é gerada pelas regras.
  - **Efeitos e rank:** junta os efeitos das duas com 80% da força de cada e sobe um rank.
  - **Elemento:** sai de uma tabela de combinações (Fogo + Raio = Plasma, Fogo + Sombra = Chama Negra, Luz + Sombra = Crepúsculo...).
  - **Nome:** prefixo do elemento e substantivo do tipo, como "Tempestade de Plasma" ou "Égide de Trovão".
  - **Criação:** acontece no próprio jogo, sem IA, e o resultado fica salvo no save.

## 6. Equipamentos

- **Dez espaços:** elmo, peitoral, manoplas, calças, botas, arma, mão secundária, dois acessórios e **relíquia**.
- **Tipos de armadura:** placas, malha, couro e seda. Cada personagem só usa alguns, e o mesmo vale para as armas: espada, lança, adaga e cajado; escudo, orbe e grimório.
- **Raridade:** comum, incomum, raro, épico e lendário. Multiplica os atributos e dá de 0 a 4 **afixos** (bônus percentuais sorteados).
- **Nível do item:** define a força base e o nome por época: rústico, de aço, de Hope, vulcânico e celeste.
- **Conjuntos:** um por mapa, com bônus por 2, 4 e 5 peças.
  - **Leão de Aço** (placas): DEF, ATQ e fogo, depois roubo de vida.
  - **Sombra da Névoa** (couro): VEL, crítico e dano crítico.
  - **Vigília de Hope** (seda): ATQ.M, recarga, VEL.M e cura.
  - **Escamas de Salamandra** (placas): vida, defesas e espinhos com regeneração.
  - **Runas do Vento** (seda): DEF.M, velocidades e dano.
- **Relíquias:** passivas especiais, mais fortes conforme a raridade. Alguns exemplos:
  - Coração de Brasa: fogo e roubo de vida.
  - Ampulheta Celeste: recarga.
  - Coroa Partida de Vel’Nora: XP e ouro.
  - Dado do Destino: crítico.

## 7. Economia e cidade

- **Lutar:** dá XP, ouro, material do mapa, às vezes essência e às vezes equipamentos (o chefe sempre deixa um).
- **Ferreiro:**
  - **Forjar:** você escolhe a peça; o nível vem do mapa e a raridade é sorteada. Com essência, a raridade melhora.
  - **Melhorar:** de +1 a +10, com +8% por nível.
  - **Desmontar:** devolve materiais e às vezes essência.
- **Loja:** 6 itens renovados a cada 15 minutos. Ela vende pelo valor do item, compra por 30% e também compra materiais.
- **Taverna:** recrutamento. O herói chega com 85% do nível médio da party.
- **Inventário:** 60 espaços. O que chega com o inventário cheio é vendido na hora.

## 8. Expedições e treino

- **Expedição:** cada mapa tem três missões: 15 min (1 herói), 2 h (até 2) e 8 h (até 3, com 45% de chance de relíquia). Quem sai deixa de lutar e volta com ouro, XP, materiais, equipamentos e acessórios.
- **Treino:** dá XP garantida por tempo, sem risco e sem saque, e pode ser interrompido.
- **Regra:** pelo menos um herói precisa ficar lutando.

## 9. Mapas e ritmo

| Mapa | Abre no nível | Inimigos | Material | Conjunto |
| --- | --- | --- | --- | --- |
| Arredores da Ilha de Aço | 1 | Gosma de Ferrugem, Lobo de Aço | Ferrugem | Leão de Aço |
| Bosque Suspenso | 8 | Lobo de Aço, Harpia | Pena | Sombra da Névoa |
| Ruínas da Velha Hope | 15 | Esqueleto Guardião, Espectro | Osso | Vigília de Hope |
| Forja Vulcânica | 23 | Golem de Magma, Diabrete de Brasa | Brasa | Escamas de Salamandra |
| Cidadela das Nuvens | 31 | Sentinela Celeste, Harpia | Núcleo | Runas do Vento |

O XP de um nível equivale a cerca de **20 + 3n² + n³ inimigos** do mesmo nível. Como o XP depende do nível do inimigo, o mapa antigo fica obsoleto.

Um bot que joga razoavelmente bem chega às seguintes marcas:

| Mapa | Tempo |
| --- | --- |
| Bosque | cerca de 1 h |
| Ruínas | cerca de 3 h |
| Vulcão | cerca de 8 h |
| Cidadela | cerca de 1 dia |

Sem equipamento, a party trava no primeiro chefe de cada mapa novo. Equipamentos, conjuntos e melhorias são o que faz avançar.

## 10. Bestiário

- **Registro:** cada espécie derrotada entra no bestiário, que fica na aba Batalha e no menu. Antes do primeiro abate, aparece só a silhueta e o mapa onde vive.
- **Marcos de abates:**

| Abates | Recompensa |
| --- | --- |
| 1 | Lore da criatura |
| 10 | Atributos, elemento, fraqueza e resistência |
| 100 | +5% de dano da party contra a espécie |
| 1.000 | +10% de dano contra a espécie |
| 5.000 | +15% de dano contra a espécie |

- **Função no ritmo:** os marcos dão um motivo para voltar a mapas antigos e deixam a farm visível. Cada marco é anotado no Diário.

## 11. Online ("pseudo online")

- **Conta opcional:** apelido e senha. O save vai para a nuvem e pode continuar em outro aparelho.
- **Ranking de renome:** soma níveis × 10, capítulos × 25 e monstros ÷ 100.
- **Mural do mundo:** registra níveis múltiplos de 5, recrutamentos, mapas novos, lendários e marcos de chefes.
- **Jogadores online** nos últimos 5 minutos.
- **Aplausos:** quem aplaude ganha +15 de ouro e quem recebe ganha +40. São 5 por dia.
- **Limitação:** o ranking confia no save enviado. Para um jogo entre amigos, isso é aceitável.

## 12. Interface

- **Telas:**
  - Menu inicial;
  - Prólogo;
  - Jogo com cinco abas: **Batalha, Party, Cidade, Expedições, Mundo**;
  - Ficha do herói em tela cheia: Status, Equipamento (boneco com 10 espaços), Habilidades, Árvore e História.
- **Capítulo atual:** fica sempre no topo e recolhe com um toque. As abas e sub-abas mostram um marcador quando há algo a fazer.
- **Menu (☰):** salvar, conta, backup, diário, como jogar, menu inicial e apagar.
- **Pixel art em imagens**, geradas por IA e tratadas por `scripts/fatiar.py`:
  - 5 heróis e o Leão das Chamas, com animações de parado, ataque, habilidade, dano e caído (a investida só no Leão das Chamas);
  - 8 monstros, com animações de ataque, dano e morte, e uma versão maior para os chefes;
  - 5 cenários pintados;
  - ícones pintados das 10 relíquias e dos materiais.
- **Pixel art desenhada no código**, usada enquanto as imagens carregam (ou se falharem) e no menu inicial e no ranking:
  - os mesmos heróis, monstros e a juba do Leão das Chamas;
  - 16 formas de item coloridas pela raridade (os equipamentos comuns só têm essa versão);
  - números de dano numa fonte de pixels.

## 13. Próximos passos propostos

1. Chefes com nome e mecânicas próprias por mapa, como um chefe de história no fim de cada um.
2. Fusão de três habilidades e um rank S, só por receita.
3. Mais heróis do que vagas, com reserva e troca de formação.
4. Encantamentos ou gemas nos itens e reforja de afixos.
5. Validação de progresso no servidor para um ranking justo.
6. Sons e PWA instalável.
