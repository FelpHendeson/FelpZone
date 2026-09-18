# Sistema 25 — Família, lar e linhagem

> **Estado:** implementado e consolidado nas Fatias 25.1 a 25.7.

## Objetivo

Sustentar a fantasia de vida: construir parceria, formar uma família, cuidar de filhos ou dependentes, compartilhar um lar e deixar uma linhagem, sem transformar NPCs em recompensas ou remover sua agência.

## Implementação

A versão definitiva do schema é `schemaVersion: 19`. `GameState.family` guarda laços, lares, marcos de estágio e ações consumidas. Parentesco, lar e vínculo afetivo permanecem contratos distintos. Rowan é um ator persistente, nunca um item. Crescimento usa a idade canônica do calendário e é idempotente.

## Distinções obrigatórias

- **Relação:** sentimentos e vínculos entre atores.
- **Parentesco:** vínculo familiar reconhecido.
- **Lar:** unidade de convivência e residência.
- **Linhagem:** continuidade e ascendência registradas.
- **Propriedade:** posse legal ou prática de um bem, tratada em sistema econômico.

Uma família pode viver em mais de um lar; pessoas no mesmo lar não são automaticamente parentes.

## Decisões confirmadas

- Parceria, casamento ou equivalentes são definidos pelo mundo e exigem transições explícitas e agência dos envolvidos.
- Filhos e dependentes são atores persistentes com identidade, idade e relações próprias.
- Parentalidade pode ser biológica, adotiva, tutelar ou outra forma declarada pelo pack.
- Crescimento ocorre por estágios de vida, não por uma simulação diária detalhada.
- Sobrenome, sucessão e herança são políticas do mundo, não regras universais.
- A primeira implementação prova convivência e cuidado antes de expandir gerações.

## Contrato conceitual

O pack declara tipos de parentesco, formas de parceria, políticas de lar, responsabilidades, transições e regras de linhagem. O estado registra vínculos explícitos entre IDs de atores, lares, responsáveis, dependentes e marcos familiares.

Relações derivadas, como irmãos por responsáveis em comum, devem ser calculadas de forma consistente ou materializadas por uma regra bem definida — nunca inferidas informalmente na interface.

## Integrações

- **Relacionamentos:** pré-condições e consequências afetivas.
- **Calendário e ciclo de vida:** idade e mudança de estágio.
- **NPCs persistentes:** cada membro possui estado próprio.
- **Propriedade e economia:** residência, sustento e herança futura.
- **Necessidades:** cuidado pode criar responsabilidades, sem punir por tempo offline.
- **Narrativa:** cenas e objetivos reagem à composição familiar.

## Primeiro ciclo jogável

Ao longo de uma rota de teste, dois adultos elegíveis estabelecem parceria e um lar compartilhado; posteriormente assumem responsabilidade por um dependente de conteúdo. Agenda, relações e save reconhecem a nova estrutura sem duplicar ou contradizer vínculos.

## Fatias propostas

1. Catálogo de parentesco, parceria e políticas de lar.
2. Grafo familiar validado e persistência.
3. Formação e dissolução de parceria com agência.
4. Lares, residência, responsáveis e dependentes.
5. Crescimento por estágio e marcos familiares.
6. Superfície mobile de família e lar.
7. Jornada vertical e testes de consistência genealógica.

## Critérios de aceite

- Não existem ciclos impossíveis de parentesco ou duplicação de vínculo exclusivo.
- Uma transição familiar valida todos os envolvidos antes de alterar o estado.
- Crianças e dependentes nunca são tratados como itens.
- O pack pode definir modelos familiares diferentes sem alterar o motor.
- O crescimento depende do calendário canônico e é idempotente.
- Informações familiares desconhecidas respeitam sigilo narrativo.

## Fora do escopo inicial

- conteúdo sexual explícito;
- genética ou reprodução procedural;
- gravidez simulada;
- geração aleatória de filhos;
- herança econômica completa;
- morte permanente, sucessão de protagonista ou árvore infinita de gerações.
