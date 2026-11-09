# Roadmap e critérios de passagem

**Estado:** proposta de marcos funcionais, sem datas nem estimativas aprovadas. Planejado não significa concluído.

## Etapa 0 — Preparação

Resolver versão Unity, aparelho Android de referência, orientação, contrato de sprites e orçamento inicial de conteúdo. Escolher um pequeno conjunto de assets com origem/licença registrada.

**Passagem:** projeto abre no ambiente de desenvolvimento e uma cena simples roda no Android. Se o ambiente não suportar o fluxo, ajustar dependências e arte antes de ampliar o escopo.

## Etapa 1 — Prova visual local

Um humanoide modular, cenário simples, animação idle e troca de cabelo/roupa/item. Acrescentar animação de cuidado para validar sincronização.

**Passagem:** sem desalinhamento nas combinações de teste; leitura boa no celular; medições de desempenho registradas. Não construir grande catálogo antes dessa prova.

## Etapa 2 — Ciclo local

Necessidades, ações de cuidado, Circuito de Mana, progressão simples, inventário e persistência local de desenvolvimento. Relógio substituível permite testar ausência sem esperar dias.

**Passagem:** sessão completa demonstra cuidado → treino → ganho → compra/equipamento → retorno. Dados locais são de teste, sem valor na futura economia online.

## Etapa 3 — Investigação e integração online

Comparar fornecedores com fontes oficiais atuais, escolher identidade e banco, implementar estado autorizado, transações, idempotência e recuperação de rede. Incorporar runas e três slots.

**Passagem:** reconexão, login em outro aparelho, compra duplicada, invocação concorrente e restauração de dados verificadas.

## v0.1 — O Despertar

Entregar o [MVP](02-gdd-mvp.md), com uma experiência curta, sólida e bonita. Ajustar tutorial, necessidades, preços e treino a partir de observação real.

**Passagem:** critérios de aceite do GDD satisfeitos no Android definido, sem bloqueios de progresso e sem perda silenciosa de estado.

## v0.2 — Caminhos e classes

Espadachim, Mago e Bárbaro como candidatos; escolha de classe, habilidades específicas e primeiro minigame de combate. Validar o papel do elemento e da habilidade core.

**Passagem:** ao menos dois caminhos produzem escolhas diferentes sem tornar uma origem inviável.

## v0.3 — Companheiros

Pets, aquisição por sorteio/compra direta, cuidados e evolução básica. Definir vínculo e destino em exclusão antes da implementação.

**Passagem:** cuidar de dois seres reforça vínculo sem duplicar tarefas cansativas.

## v0.4 — Cotidiano

Novos minigames, comportamentos, itens e ambientes. Autonomia simples somente após validação da proposta.

## v0.5+ — Expansão

Híbridos, transformações raciais, equipamentos tecnológicos, coleções, especializações e possíveis sistemas sociais. Cada expansão exige escopo próprio; não há compromisso com multiplayer.

## Riscos e respostas propostas

- **Volume de arte:** um arquétipo primeiro; validar peças em lote pequeno.
- **Custo de desenvolvimento:** entregas curtas e testes reais desde o começo.
- **Rotina punitiva:** observar retorno após ausência e limitar perdas conforme regra aprovada.
- **Fraude/duplicação:** servidor autorizado, transações e testes de concorrência.
- **Gratuidade instável:** verificar condições, exportar dados e definir plano de migração.
- **Escopo crescente:** aceitar novos sistemas por marco e hipótese clara.

## Verificação proporcional

Documentação: links internos, distinção de status, coerência e escopo dos arquivos. Código futuro: testes de regras críticas, integração de persistência/economia e testes manuais visuais no Android. Não tratar checklist de planejamento como teste executado.

**Situação desta entrega:** somente documentação. Todos os marcos de implementação acima permanecem por iniciar.
