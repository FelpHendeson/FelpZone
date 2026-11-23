# Idle de Personagem Único (nome de trabalho)

Idle RPG em que o jogador **sorteia um único personagem** (raça, habilidade core e dons raros) e o acompanha para sempre. Você não controla as ações do personagem: escolhe **a atividade** que ele executa (treinar, coletar, produzir, aprender, combater) e **onde**. Ele trabalha sozinho, até 12 horas com o jogo fechado.

O jogo **não tem fim**: o conteúdo cresce por atualizações, e bots, torneios, rankings e temporadas dão objetivo de longo prazo.

> Projeto **novo**, independente do LionHearth (`idle-guilda`). Aproveita as boas ideias técnicas dele (motor em TS puro, simulação determinística, offline), mas é outro jogo.

## Estado atual

**Só planejamento.** Nenhum código foi escrito. O design completo e o plano de construção estão em:

- **[GDD](docs/GDD.md)**: personagem, sorteio, status, atividades, combate, mapa, itens, forja, morte (O Limiar), missões, guilda, habilidades, pets, competição e interface.
- **[Arquitetura](docs/ARQUITETURA.md)**: motor TS puro, web Next, API, banco, segurança e port mobile.
- **[Roadmap](docs/ROADMAP.md)**: fatias F0 a F14.
- **[Decisões](docs/DECISOES.md)**: o que o autor decidiu, o que é proposta e as perguntas abertas.

Prompts de implementação ficam em [`prompts/idle-personagem-unico/`](../prompts/idle-personagem-unico/README.md).

## Plataformas e stack (proposta)

| Camada | Escolha |
| --- | --- |
| Web | Next (App Router), mobile-first, PWA |
| Mobile | Expo (React Native), **depois** da web completa |
| API | TypeScript/Node, rotas do Next em `/api/v1` (Vercel) |
| Banco | Postgres (Neon) + Redis (Upstash); banco só a partir da F9; antes disso, save local |
| Motor | `packages/motor`, TS puro e determinístico, compartilhado por web, API e mobile |

## Como executar

Ainda não há o que executar. A **F0** cria o workspace; depois dela os comandos serão:

```bash
cd idle-personagem-unico && npm install && npm run dev
npm test
npm run build
```

## Próximo passo

O autor revisa o GDD e as perguntas abertas em `docs/DECISOES.md`. Depois disso, a **F0 (Fundação)** pode ser autorizada. Nenhuma fatia começa sem essa autorização.
