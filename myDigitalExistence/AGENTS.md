# AGENTS.md — Contrato dos agentes no myDigitalExistence

Versão 1.0 — 11/11/2026. **Ler antes de editar qualquer arquivo nesta pasta.**

## Missão
Entregar um jogo mobile Android 2D pixel art em **Unity + C#**: personagem humanoide modular, vida virtual, invocação por runas, progressão RPG, cuidados, mana, minigames, inventário e loja. Pets virão depois do primeiro MVP. O agente implementa e testa tecnicamente; o criador é diretor criativo com decisão final sobre conceitos.

## Autorização criativa limitada para pacote inicial (11/11/2026)

O criador autorizou expressamente a descrição e implementação de um **conjunto inicial de modelos humanoides, customizações, raças, runas, habilidades e equipamentos de inspiração genérica**, para formar uma V1 jogável e expandir depois. Ler **22-pacote-conteudo-v1.md a 26-plano-conteudo-e-aceite.md** antes de implementar conteúdo.

O catálogo listado nesses arquivos é **CANDIDATO_JOGAVEL**: o agente PODE criar sprites originais provisórios, definições e comportamento para os itens expressamente descritos, sem consultar por cada detalhe, desde que mantenha o conteúdo modular, versionado e sujeito à revisão do criador. Isso é uma **exceção limitada** à proibição de inventar conteúdo, não aprovação definitiva da identidade de qualquer raça, habilidade ou visual. Novos conceitos fora desse pacote ou alterações conceituais profundas continuam exigindo discussão criativa e aprovação. Valores numéricos permanecem DEV_BALANCE até revisão.

Na ordem de leitura, incluir os arquivos 22–26 depois dos contratos técnicos e antes de produzir assets de catálogo. O resto das instruções permanece válido.

## Autoridade obrigatória
**O usuário define conosco a parte criativa:** aparência do personagem e suas proporções; estilo, cabelos, rostos, raças, classes, elementos, habilidades, equipamentos, pets, universo/lore e as decisões conceituais que mudam a experiência (invocação, evolução, economia, mana e mecânicas). O agente pode propor alternativas e explicar trade-offs; **não transformar propostas em cânone sem aprovação explícita do criador**.

**Autonomia técnica:** o agente NÃO precisa consultar o usuário para estrutura de classes/métodos, nomes técnicos, arquitetura, patterns, testes, refatoração, organização de cenas/prefabs, integração Unity/Android, validação, performance, configuração Git, telas de desenvolvimento ou implementação fiel de especificações aprovadas. Deve tomar decisões técnicas justificáveis seguindo boas práticas do ecossistema C#/Unity.

**Sem paralisia:** quando faltar definição criativa, implemente infraestrutura genérica e use placeholders inequivocamente rotulados DEV_ONLY. Não invente raças, classes, poderes, preços, probabilidades, arte final ou cânone e apresente como oficial.

**Mudanças externas com risco** (gastos, publicação para público, apagar personagens/dados, expor segredo, sobrescrever arquivos alheios) exigem autorização específica. Não editar outros projetos do repositório.

## Ordem de leitura
1. README.md e 11-decisoes-pendencias.md (estado e decisões).
2. 15-governanca-criativa.md (quem aprova o quê).
3. 12-plano-mestre.md e 13-backlog-execucao.md (gates e prioridades).
4. 16-especificacao-unity.md, 17-contratos-de-dominio.md, 18-pipeline-visual.md, 19-ux-e-qa.md.
5. 02-gdd-mvp.md e capítulos 03–09 (requisitos de jogo).
6. 20-contratos-online.md (somente na fase G3).

Precedência: instrução explícita mais recente do usuário > decisão criativa aprovada > requisito de produto > contrato técnico > proposta. Reportar contradições em vez de alterar silenciosamente.

## Forma de executar
1. Inspecionar status Git, versão exata Unity, projeto/cenas e erros reais; documentação não prova código existente.
2. Selecionar menor item do backlog que desbloqueia um gate.
3. Projetar solução simples e testável; implementar em pequenas fatias verticais.
4. Usar princípios de responsabilidade única, composição, encapsulamento, separação Domain/Application/Infrastructure/Presentation, interfaces para limites de IO e testes automatizados proporcionais. Evitar singleton global onipotente, lógica de jogo em UI, reflexão desnecessária e frameworks sem benefício demonstrável.
5. Nomear tipos, métodos e variáveis em inglês claro, documentação ao usuário em português; código legível com validações, tratamento de falhas e comentários apenas onde agregam contexto.
6. Reutilizar recursos oficiais da versão Unity instalada; verificar compatibilidade de APIs antes de introduzir packages. Preservar arquivos .meta e referências serializadas.
7. Testar EditMode e PlayMode quando disponível. Compilar Android cedo; não declarar sucesso de build sem log ou teste verificável no dispositivo.
8. Commitar mudanças com mensagem como feat(mde): ... / fix(mde): ... / docs(mde): ... . Não incluir Library, Temp, caches, secrets, keystores ou builds volumosos.
9. Relatar o que foi implementado, testado, não testado, evidências, commit, bloqueios criativos e próximo item.

**Interação com computador/Unity:** só agir na UI se o acesso de computador estiver habilitado e autorizado. Observar estado real, salvar cenas, conferir Console e Git diff. Não alegar cliques, compilações, APKs ou validações inexistentes. Nunca destruir alterações locais do usuário para “limpar” ambiente sem aprovação.

**Assets:** usar apenas originais/autorizados ou placeholders DEV_ONLY; imagens online usadas como referências não são assets licenciados.

**Online:** backend deve autorizar propriedade, moeda, XP, itens, invocação e relógio; operações econômicas atômicas e idempotentes; tokens e segredos nunca no cliente. O cliente Unity não é confiável para recompensas.

## Marcos e status
G0: ambiente e APK mínimo Android.
G1: render humanoide modular + idle + troca de peça + quarto.
G2: cuidado + mana + progressão/inventário fictícios + save local DEV.
G3: conta, slots, invocação e economia online seguros.
G4: MVP 0.1 completo e testado.

Estado conhecido em 11/11/2026: o usuário informou que instalou Unity e Android aparece como plataforma de build. **Ainda não há comprovação de projeto Unity criado, APK funcional ou backend.** Não marcar itens como concluídos sem evidência.

Ver detalhes de responsabilidades e workflow em 15-governanca-criativa.md, e specs executáveis nos arquivos 16–20.
