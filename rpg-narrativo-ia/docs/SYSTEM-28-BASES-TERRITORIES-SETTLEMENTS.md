# Sistema 28 — Bases, territórios e assentamentos

> **Estado:** definido e especificado pelo autor em 17 de setembro de 2026. Ainda não implementado.

## Objetivo

Permitir que abrigo vire base, propriedade vire território e um conjunto de pessoas e estruturas forme um assentamento administrável. O jogador pode construir, organizar e liderar sem que o jogo se transforme em uma planilha desconectada do mundo.

## Decisões confirmadas

- Local, território, propriedade, base e assentamento são conceitos distintos e relacionados por IDs.
- O pack define tipos de estrutura, projetos, funções, capacidade, requisitos e progressão possível.
- Construção consome recursos e tempo por meio de transação atômica.
- Residentes e trabalhadores continuam NPCs persistentes, com agenda e agência.
- A produção acontece quando o relógio avança e possui limites, insumos e destino explícitos.
- Autoridade para administrar deriva de propriedade, cargo ou organização; não basta abrir a tela.
- O primeiro marco é uma base pequena, não uma cidade completa.

## Contrato conceitual

O conteúdo declara regiões administráveis, projetos, estruturas, vagas, funções, receitas produtivas, capacidades e requisitos de evolução. O estado guarda reivindicações, estruturas construídas, projetos em andamento, armazenamento, moradores, atribuições e indicadores derivados.

Indicadores como segurança, abrigo ou capacidade devem nascer de fontes rastreáveis. Um número agregado não pode substituir o estado que o produziu.

## Integrações

- **Navegação e cenário:** localização física e pontos de interação.
- **Recursos, crafting e economia:** custos, armazenamento e produção.
- **Tempo:** progresso e ciclos produtivos.
- **NPCs, família e organizações:** moradores, trabalhadores e autoridade.
- **Profissões e cidadania:** funções e direitos locais.
- **Necessidades:** abrigo e sustento, sem avanço offline.

## Primeiro ciclo jogável

O jogador reivindica um acampamento permitido, inicia um abrigo, entrega recursos e avança tempo até a conclusão. Depois atribui um NPC elegível a uma função simples e consulta produção e capacidade reais.

## Fatias propostas

1. Território, reivindicação e autoridade.
2. Catálogo de projetos, estruturas e capacidades.
3. Construção atômica com custo e tempo.
4. Armazenamento, vagas e atribuição de moradores.
5. Produção limitada acionada pelo relógio.
6. Painel mobile de base e projetos.
7. Evolução acampamento–base e testes de integração.

## Critérios de aceite

- Uma construção impossível não consome recurso nem tempo.
- Apenas autoridade válida inicia, cancela ou atribui projetos.
- Produção não ocorre com o aplicativo fechado e não duplica após recarga.
- NPCs não podem ocupar funções incompatíveis ou dois locais exclusivos.
- Capacidade e armazenamento respeitam limites declarados.
- Um novo tipo de estrutura entra por conteúdo, não por componente React dedicado.

## Fora do escopo inicial

- simulação urbana em tempo real;
- guerra territorial;
- arquitetura livre em grade;
- automação infinita de recursos;
- diplomacia entre governos;
- população abstrata sem atores quando a decisão exige um NPC individual.
