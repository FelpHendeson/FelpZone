# Sistema 19 — Relacionamentos e vínculos persistentes

> **Estado:** implementado e consolidado nas Fatias 19.1 a 19.7 em 17 de setembro de 2026.

## Objetivo

Permitir relações consistentes que se transformem com convivência, escolhas e memória. O sistema deve sustentar amizade, rivalidade, mentoria, romance e confiança sem reduzir personagens a uma única barra de afinidade.

## Decisões confirmadas

- Relações são direcionais: o que A sente por B pode diferir do que B sente por A.
- Dimensões de relação são definidas e validadas pelo pack, como confiança, afinidade, respeito, medo, atração ou lealdade.
- Vínculos nomeados são estados explícitos; não surgem automaticamente só porque um número cruzou um limite.
- Mudanças decorrem de ações, eventos e escolhas validados.
- NPCs conservam agência. Romance, parceria, mentoria e ruptura exigem condições e transições declaradas.
- Memórias de NPC e valores de relacionamento são conceitos relacionados, mas distintos.

## Contrato conceitual

O pack declara dimensões, limites, vínculos possíveis, requisitos de transição, modificadores e textos de apresentação. O estado registra pares de atores, valores atuais, vínculos ativos e marcos relacionais já consumidos.

Efeitos de relação referenciam ator, alvo, dimensão e variação permitida. A UI nunca envia o novo valor final. O motor limita os valores, verifica o contexto e produz um resultado auditável.

A versão definitiva do schema é `schemaVersion: 13`. Saves v1–v12 migram com `bonds` vazio, sem conceder dimensões, vínculos ou a promessa de Mira.

## Integrações

- **NPCs persistentes:** identidades, memória, disposição e presença.
- **Narrativa:** escolhas e fatos alteram ou consultam relações.
- **Agenda e mundo vivo:** convivência depende de encontrar o personagem.
- **Família:** usa vínculos sociais como base, mas possui contrato próprio.
- **Grupos e organizações:** confiança e lealdade podem ser requisitos, sem substituir cargos.
- **Combate coletivo:** decisões com companheiros podem afetar vínculos.

## Primeiro ciclo jogável

O jogador encontra Mira, cumpre ou quebra uma promessa e vê confiança e afinidade reagirem de modo independente. Uma cena posterior oferece um vínculo de amizade somente quando os requisitos narrativos e relacionais são atendidos.

## Fatias propostas

1. Catálogo de dimensões e vínculos, com validação.
2. Estado direcional, migração e persistência.
3. Condições e efeitos tipados de relacionamento.
4. Integração com memórias e eventos de NPC.
5. Transições explícitas de vínculo e regras de agência.
6. Tela mobile de personagem com informação descoberta.
7. Jornada de Mira, testes de reciprocidade, sigilo e recarga.

## Critérios de aceite

- O motor distingue A→B de B→A.
- Não existe vínculo automático baseado apenas em pontuação.
- Conteúdo não pode alterar dimensões inexistentes nem ultrapassar limites.
- Falhas são atômicas e não deixam metade de uma relação modificada.
- Informações desconhecidas sobre um NPC não aparecem antecipadamente.
- A relação persiste sem copiar o catálogo para o save.

## Fora do escopo inicial

- casamento, filhos e parentesco, tratados no Sistema 25;
- simulação de conversa por IA;
- conteúdo sexual explícito;
- compatibilidade procedural de personalidade;
- controle mental ou remoção da agência de NPCs.
