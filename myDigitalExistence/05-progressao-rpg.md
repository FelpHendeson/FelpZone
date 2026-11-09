# Raças, classes, atributos e habilidades

## Separação conceitual

**Requisitos:** raça e outras características inerentes ao nascimento; classe escolhida pelo jogador conforme o crescimento; elemento e habilidade core na invocação; ganhos de nível, atributos e habilidades pelos minigames; possibilidade de comprar habilidades com moeda do jogo.

| Sistema | Papel | Estado |
| --- | --- | --- |
| Raça | Origem e traços inatos | Requisito; catálogo pendente |
| Elemento | Afinidade inicial sorteada | Requisito; efeitos pendentes |
| Alma/core | Identidade e habilidade central | Requisito |
| Classe | Caminho escolhido de desenvolvimento | Requisito |
| Atributos | Capacidades numéricas | Requisito; lista proposta abaixo |
| Proficiência | Prática em domínio específico | Proposta do histórico |

Espadachim, Mago e Bárbaro são exemplos citados pelo autor, não uma lista final fechada. Humano, Elfo e Umbral foram exemplos do assistente; não são raças aprovadas. Transformações e híbridos foram levantados como expansão possível, sem receita ou custo definidos.

## Atributos propostos

Força (esforço físico), agilidade (coordenação), vitalidade (resistência), inteligência (aprendizado mágico) e controle de mana (precisão). Nomes, relação com saúde e efeitos por atividade precisam de protótipo. Sono e fome são necessidades, não atributos permanentes.

**Proposta de cálculo:** valor efetivo = base evoluída + modificadores de equipamento + efeitos temporários. Aplicar limites explícitos e ordem determinística; não acumular bônus novamente ao carregar o save.

## Categorias de habilidade

- **Core/alma — requisito:** habilidade central ligada à identidade.
- **Racial — requisito:** deriva da origem.
- **Classe — requisito:** acompanha especialização escolhida.
- **Genérica — requisito:** aprendizado mais amplo.
- **Outras — expansão:** categorias futuras somente quando houver necessidade.

**Proposta:** cada definição tem ID estável, categoria, pré-requisitos, custo de aprendizado, custos de uso, efeitos e versão. Estado aprendido registra nível/domínio e origem da aquisição.

Uma habilidade core pode afetar cuidado ou treino, e não somente dano; isso é proposta do histórico. Compra de habilidade não implica que habilidades de alma e raça possam ser vendidas na loja: elegibilidade precisa ser decidida.

## Progressão proposta

Atividade válida gera XP geral e prática específica. Ao cruzar um limiar, o personagem sobe de nível e recebe benefícios definidos no catálogo. Classe abre bônus e caminhos sem necessariamente bloquear todos os outros estilos; essa liberdade é proposta, não regra confirmada.

Separar XP geral, proficiência e qualidade de mana evita tornar todas as capacidades iguais ao nível do personagem. Tabelas de XP, níveis máximos, distribuição manual/automática de pontos, multiclasses, troca de classe e reembolso de habilidades estão pendentes.

## Balanceamento e aceite

Criar pequeno conjunto de personagens de teste, comparar resultados por atividade e detectar combinações dominantes. Aplicar progressão uma única vez por recompensa, recalcular efeitos após trocar item e explicar cada ganho na interface. Migrações de catálogo devem preservar habilidades aprendidas ou compensar alterações de maneira deliberada.
