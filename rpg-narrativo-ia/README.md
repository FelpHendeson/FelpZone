# Reset — RPG Narrativo Modular

Protótipo jogável de um RPG narrativo mobile-first sobre uma humanidade obrigada a recomeçar depois que a própria existência passou por um Reset.

O jogo é uma aplicação web estática, modular e expansível. A IA participa somente da criação do projeto: ajuda a definir o mundo, escrever conteúdo e implementar o código. O jogo publicado não chama APIs de IA, não exige chave e não possui custo operacional inicial.

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
5. [Fase 2 — Consolidação do motor](docs/PHASE-2-ENGINE.md): trabalho autorizado para a próxima entrega.
6. [Roadmap de mecânicas](docs/ROADMAP.md): evolução planejada depois da consolidação.
7. [Instruções para agentes](AGENTS.md): regras práticas para trabalhar nesta pasta.

## Como executar

Requisitos: Node.js 20 ou superior.

```bash
cd rpg-narrativo-ia
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`. No celular da mesma rede, use o endereço local que o Vite mostrar.

Outros comandos:

```bash
npm test        # testes do motor, condições, efeitos, transições e persistência
npm run lint    # ESLint
npm run typecheck
npm run build   # build de produção com PWA
npm run preview # serve o conteúdo de dist/
```

A partida fica em `localStorage` neste navegador. Não há login, backend nem chave.

## Estrutura implementada

```text
src/
├── core/             # estado, condições, efeitos e motor imutável
├── modules/          # personagem, progressão, inventário, relações, mundo, narrativa
├── campaigns/        # dados da campanha do primeiro dia
├── infrastructure/   # persistência com schemaVersion
├── ui/               # telas mobile-first e ImagePlaceholder
└── tests/            # testes automatizados do núcleo
```

O fluxo da interface dispara ações; o motor em TypeScript puro devolve um novo estado. Campanhas são dados, não JSX.

## Estado atual

**MVP jogável do primeiro dia concluído.** A fase atual é consolidar o motor narrativo e de escolhas antes de adicionar novas mecânicas. Consulte [Fase 2 — Consolidação do motor](docs/PHASE-2-ENGINE.md).

## Decisões já tomadas

- React, TypeScript e Vite.
- Aplicação responsiva, priorizando celular.
- Motor determinístico e conteúdo estruturado localmente.
- Sem backend, autenticação, banco remoto ou API de IA no MVP.
- Salvamento local no navegador.
- PWA instalável e preparada para funcionar offline.
- Imagens substituídas inicialmente por placeholders identificáveis.
- Módulos independentes dentro de um único aplicativo.

## Limitações atuais

- Textos e nomes ainda são provisórios.
- Cenas, retratos e ícones são placeholders locais, sem arte final.
- Só existe a campanha do primeiro dia.
- O salvamento não sincroniza entre dispositivos e falha de forma controlada se `schemaVersion` for incompatível.
- A validação atual do salvamento ainda precisa rejeitar integralmente estruturas internas incompletas ou malformadas.
- Fora do MVP: combate tático, facções, assentamentos, mapa aberto, geração procedural, editor e qualquer serviço pago.
- A instalação PWA e o modo offline dependem de HTTPS ou `localhost`.

## O que foi validado nesta entrega

- `npm test`: 16 testes em condições, efeitos, transições e persistência.
- `npm run lint` e `npm run typecheck`.
- `npm run build`: bundle estático com `sw.js` e manifesto.
- Verificação visual em viewport 360×800 e 1280×800: criação de personagem, primeiro evento, painel de personagem, manifesto PWA ligado, coluna limitada no desktop e sem rolagem horizontal.
