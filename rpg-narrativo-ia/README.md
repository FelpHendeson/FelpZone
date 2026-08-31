# Reset — RPG Narrativo Modular

Protótipo de um RPG narrativo mobile-first sobre uma humanidade obrigada a recomeçar depois que a própria existência passou por um Reset.

O jogo será uma aplicação web estática, modular e expansível. A IA participa somente da criação do projeto: ajuda a definir o mundo, escrever conteúdo e implementar o código. O jogo publicado não chama APIs de IA, não exige chave e não possui custo operacional inicial.

## Premissa

Durante o Reset, os planetas aumentaram drasticamente, a geografia foi refeita e todos os vestígios materiais da civilização desapareceram. Os humanos mantiveram suas memórias, mas foram espalhados pelo novo mundo e receberam poderes, capacidades mágicas e acesso individual a um Sistema.

Sem governos ou infraestrutura, a humanidade passa a viver sob a lei do mais forte. Assentamentos, facções e novos modelos de sociedade surgem enquanto cada pessoa tenta sobreviver e compreender o que aconteceu.

O jogador cria o nome e o sobrenome de um jovem que acabara de atingir a maioridade. Ele desperta sozinho, sem parentes ou aliados, e constrói sua identidade por meio das próprias escolhas.

## Documentação para implementação

Leia nesta ordem:

1. [Visão do produto](docs/PRODUCT.md): universo, experiência e limites conceituais.
2. [Escopo do MVP](docs/MVP.md): o que deve e não deve ser implementado agora.
3. [Arquitetura](docs/ARCHITECTURE.md): módulos, responsabilidades e fluxo de dados.
4. [Conteúdo e interface](docs/CONTENT-AND-UI.md): formato dos eventos, telas e placeholders.
5. [Instruções para agentes](AGENTS.md): regras práticas para trabalhar nesta pasta.

## Decisões já tomadas

- React, TypeScript e Vite.
- Aplicação responsiva, priorizando celular.
- Motor determinístico e conteúdo estruturado localmente.
- Sem backend, autenticação, banco remoto ou API de IA no MVP.
- Salvamento local no navegador.
- PWA instalável e preparada para funcionar offline.
- Imagens substituídas inicialmente por placeholders identificáveis.
- Módulos independentes dentro de um único aplicativo.

## Estado atual

**Especificação do MVP.** A aplicação ainda não foi inicializada e nenhuma dependência foi instalada.
