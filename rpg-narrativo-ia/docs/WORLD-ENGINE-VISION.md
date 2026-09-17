# Visão do produto — um motor de mundos jogáveis

> **Decisão do autor:** consolidada em 17 de setembro de 2026.

## A ideia central

Este projeto não é apenas uma campanha. Ele é um conjunto de blocos reutilizáveis para construir mundos, histórias e experiências de RPG diferentes sem reescrever o motor a cada nova ideia.

A melhor metáfora é um LEGO:

- os **sistemas** são os blocos;
- os **catálogos JSON** descrevem as peças disponíveis em cada mundo;
- um **pack de conteúdo** escolhe, configura e combina essas peças;
- uma **campanha** conta uma história sobre esse mundo;
- o **save** registra apenas a experiência particular daquele jogador.

O primeiro dia na Floresta dos Coelhos Chifrudos é o conjunto de teste atual. Nomes, números, personagens e acontecimentos desse pack não devem se tornar regras universais do motor.

## As quatro fantasias que o motor deve sustentar

O mesmo personagem deve poder alternar entre quatro formas de jogar, sem escolher um “modo” exclusivo:

1. **Viver:** criar vínculos, formar família, ter filhos, envelhecer, possuir uma casa e participar da rotina de uma comunidade.
2. **Crescer:** treinar, descobrir habilidades, dominar Eteris e Númen, enfrentar inimigos e aparecer em rankings.
3. **Pertencer:** formar grupo, família, clã ou guilda; assumir papéis; cuidar de companheiros e construir reputação.
4. **Liderar e construir:** exercer uma profissão, comerciar, obter títulos, administrar uma base, território ou assentamento e participar da política do mundo.

Essas fantasias compartilham tempo, personagens, recursos, condições, locais e consequências. Um ferreiro pode ser pai, membro de uma guilda, combatente ranqueado e administrador de uma vila — tudo na mesma partida.

## As camadas do produto

```text
┌─────────────────────────────────────────────────────────┐
│ Interface                                                │
│ traduz o estado e as ações; não decide as regras         │
├─────────────────────────────────────────────────────────┤
│ Campanha                                                 │
│ cenas, objetivos, encontros e consequências narrativas  │
├─────────────────────────────────────────────────────────┤
│ Pack de mundo                                            │
│ mapas, atores, itens, habilidades, organizações e leis   │
├─────────────────────────────────────────────────────────┤
│ Motores de domínio                                       │
│ tempo, relações, combate, economia, território etc.      │
├─────────────────────────────────────────────────────────┤
│ Estado e persistência                                    │
│ IDs, progresso, vínculos e fatos da partida              │
└─────────────────────────────────────────────────────────┘
```

O motor define **como algo pode funcionar**. O pack define **o que existe e quais variações estão habilitadas**. A campanha define **o que acontece nesta história**.

## Cânone atual e capacidade futura

No pack `first-day`, o reset alcançou a humanidade e todos os humanos possuem acesso ao Sistema. Isso continua sendo o cânone da campanha atual.

No motor, a política de acesso deve ser configurável pelo pack. Mundos futuros poderão definir acesso universal, despertar, seleção, herança, concessão ou restrição. Essa flexibilidade não retroage nem altera silenciosamente o pack atual.

O mesmo princípio vale para calendário, moedas, profissões, títulos, tipos de organização, progressão, família e governo: o motor oferece contratos; cada mundo escolhe o seu conteúdo.

## Regras arquiteturais permanentes

- Conteúdo declarativo nunca executa código.
- Todo conteúdo externo e todo save são validados nas fronteiras.
- Catálogo não é duplicado no save; o save referencia IDs e guarda apenas estado mutável.
- A interface solicita ações e apresenta resultados; regras não vivem no React.
- Uma ação de mundo é atômica e cobra seu custo temporal exatamente uma vez.
- Sistemas se integram por contratos públicos, sem importar detalhes internos uns dos outros.
- Aleatoriedade deve ser controlável e reproduzível em testes.
- Informações secretas continuam secretas até que uma regra explícita as revele.
- Migrações preservam partidas; elas não concedem recompensas nem produzem jogabilidade.
- A partida funciona localmente e sem IA em tempo de execução, backend ou serviço pago.
- Fórmulas e números do conteúdo inicial são protótipos até aprovação de balanceamento.

## Teste para qualquer novo sistema

Antes de implementar uma ideia, a especificação deve responder:

1. Qual comportamento reutilizável do mundo esse sistema representa?
2. O que é regra do motor e o que é conteúdo do pack?
3. Como adicionar ou remover conteúdo sem editar o motor?
4. Quais IDs e estados mínimos precisam ser persistidos?
5. Quais sistemas públicos ele consome e quais contratos oferece?
6. Qual é a menor experiência jogável que prova seu valor?
7. Como ele evita acoplamento a uma campanha, personagem ou interface específica?

Se uma ideia só funciona para uma cena, ela provavelmente pertence à campanha. Se descreve uma lei reutilizável, ela pertence ao motor.

## Programa de expansão

Os Sistemas 18 a 29 transformam essa visão em contratos implementáveis. Cada sistema deve ser entregue em fatias pequenas, com validação, testes e integração progressiva. A existência de uma spec não significa que a implementação já foi autorizada ou concluída.
