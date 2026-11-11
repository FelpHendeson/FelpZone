# Pacote criativo inicial — myDigitalExistence V1

**11/11/2026 · Revisão 1.0 · Status: CANDIDATO JOGÁVEL, não cânone definitivo.**

O criador autorizou desenvolver descrições de modelos humanoides, personalização, raças, equipamentos e habilidades iniciais inspiradas nos princípios de várias obras para viabilizar um primeiro jogo completo. **O agente pode implementar este catálogo como conteúdo de partida revisável, sem pedir aprovação a cada arquivo.** Expansões criativas e alterações definitivas de identidade seguem coautoria e aprovação do criador (ver 15-governanca-criativa.md).

## 1. Filosofia: referências, não cópia

- Shadow Slave: poder singular que tem implicações, limites e cresce conforme o uso; NÃO replicar Aspectos, Sombras, personagens, relíquias ou nomes.
- Lord of Mysteries: capacidades conceituais e caminhos de aperfeiçoamento com custos; NÃO copiar Vias, Sequências, poções, rituais ou cosmologia.
- Naruto: treino de energia, afinidades e combinações criativas; NÃO copiar jutsus, selos, clãs ou personagens.
- Black Clover: diversidade de manifestações mágicas; NÃO copiar grimórios/personagens ou habilidades exclusivas reconhecíveis.
- Jujutsu Kaisen: limitações e condições com consequência mecânica; NÃO copiar técnicas reconhecíveis ou rituais específicos.
- Bleach: poderes como expressão da identidade e evolução da arma/energia; NÃO copiar zanpakutō, liberações ou símbolos.
- RPGs clássicos: classes, traços de raça, atributos, itens, equipamento e aprendizado.

A cada poder, exigir **aplicação cotidiana**, **aplicação futura em minigame/combate**, **limite real** e **possível evolução**. Criar arte, nomes, silhuetas e efeitos originais. Imagens de buscas são somente referências, não assets licenciados.

## 2. Escopo do pacote a ser construído em etapas

| Área | Alvo para base de conteúdo V1 |
| --- | --- |
| Sprite humanoide | 1 arquétipo técnico, 3 compleições compatíveis |
| Raças | Humano, Elfo, Dracônico, Vesperino (4 propostas) |
| Customização | cabelo, pele, olhos, corpo, marcas, roupas, acessórios e equipamentos |
| Runas | Pulso, Véu e Forja, todas em pedra com brilho azul |
| Afinidades | Brasa, Maré, Brisa, Rocha, Alvor e Penumbra |
| Habilidades core | 6 núcleos originais, associados à invocação |
| Classes | Espadachim, Arcanista e Bárbaro; classe escolhida ao evoluir |
| Habilidades adicionais | 4 raciais, 6 de classe, 4 genéricas |
| Equipamentos | 18 peças iniciais, combináveis e visualmente diferenciadas |
| Jogo | lar, cuidados, Circuito de Mana, segundo treino opcional |
| Pets | planejados após v0.1; V1 depende do roadmap e feedback |

O alvo V1 não muda os marcos: **G0** projeto/APK mínimo, **G1** personagem modular, **G2** ciclo local, **G3–G4** MVP online, **v0.2** classes/combate, **v0.3** pets. V1.0 representará uma base consolidada após validar as fundações, não uma promessa de tudo na v0.1.

## 3. Regras de design

- Raça é característica do nascimento. Classe é escolha posterior. Habilidade core vem da origem e não depende da classe.
- Todas as quatro raças compartilham o arquétipo humanoide nesta versão, com overlays raciais. Cor da pele, apresentação de gênero e cabelo não determinam raça ou aptidão.
- Personagem pode exercitar mais de uma área, mesmo que classe beneficie seu estilo principal.
- Não duplicar habilidades copiando diferenças apenas de cor/dano; cada núcleo precisa mudar a maneira de resolver alguma tarefa.
- O item de entrada pode ter personalidade estética; "básico" significa fácil de entender e compatível com progressão inicial, não feio ou banal.
- Conteúdo deve usar IDs e catálogos versionados, com definições separadas de save. Resultados de invocação, economia e treino online são autoritativos no servidor.

## 4. Conteúdo proposto e localização dos detalhes

**Humano:** anatomia sem marca obrigatória e adaptação a treinos.  
**Elfo:** orelhas alongadas e sensibilidade ao fluxo mágico.  
**Dracônico:** chifres discretos, escamas parciais e cauda opcional em camada traseira.  
**Vesperino:** olhos com reflexo crepuscular e marcas geométricas discretas.  

**Runa do Pulso:** movimento, ritmo, ressonância e ação.  
**Runa do Véu:** percepção, silêncio, vestígios e limites.  
**Runa da Forja:** transformação, proteção, calor e matéria.  

**Núcleos:** Contrapeso, Véu de Ruído, Cinza Fria, Sopro Vítreo, Leitura de Vestígios e Âncora Breve. Ver fichas completas em 24-runas-racas-classes-habilidades.md.

**Equipamentos:** espadas, bastões, machado leve, túnicas, coletes, roupa de viagem, botas, capuzes e acessórios. Ver 25-equipamentos-iniciais.md.

**Aparência e animações:** 23-modelos-e-personalizacao-v1.md.  
**Entrega e critérios de aceite:** 26-plano-conteudo-e-aceite.md.

## 5. Estados de conteúdo e direitos de decisão

DEV_ONLY = apenas teste técnico sem intenção de ser conteúdo.  
CANDIDATO_JOGAVEL = esta coleção inicial que o agente **pode implementar e mostrar**; detalhes revisáveis.  
REVISADO = passou por teste de qualidade e feedback de experiência.  
APROVADO = identidade, arte e regra final acordadas com o criador.  
SUBSTITUIDO = manter referência histórica e migrar dados se necessário.

A autorização para descrever e implementar este **pacote base** não é autorização para inventar dezenas de novos sistemas definitivos sem conversa. A engenharia continua autônoma; o conteúdo criado fica sujeito ao crivo criativo do usuário. Não rotular protótipo como aprovado por ter sido codificado.

## 6. Critérios de aceite de V1 de conteúdo

- 4 raças distinguíveis visualmente sem quatro rigs completos.
- Os 3 corpos e camadas selecionadas se alinham em todas as animações suportadas.
- Runas, afinidades, classes e core pertencem a campos distintos e salvam corretamente.
- 6 núcleos com pelo menos uma função jogável/visual observável ou módulo explicitamente marcado como não lançado.
- Pelo menos 18 itens definidos e testados em inventário, equipamento e aparência, sem inventário enganoso.
- O catálogo pode crescer por dados sem inserir condicionais específicas por nome em MonoBehaviour.
- Conteúdo aprovado pode substituir candidato sem quebrar snapshots de personagens existentes.

**Não houve implementação Unity nem geração de sprites nesta entrega documental.**
