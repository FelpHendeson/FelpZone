# Roadmap em fatias

Segue o fluxo do repositório: **uma fatia por vez**, `implementar → testar → revisar → corrigir → consolidar → autorizar a próxima`. Nunca duas fatias em paralelo. Um prompt escrito **não** autoriza a execução da fatia; quem autoriza é o autor.

Alvo declarado: **web 100% primeiro**, port mobile depois. Rótulos e números como no GDD (todos **[Proposta]** até o autor aprovar).

| Fatia | Nome | O que entrega | Pronto quando |
| --- | --- | --- | --- |
| **F0** ✅ | Fundação | Workspace npm, `motor` vazio com RNG, tempo, save versionado e migração; app web mínimo com abas vazias; CI. | `npm test` e `npm run build` verdes; determinismo do RNG testado. |
| **F1** ✅ | Sorteio do personagem | Raças, cores, dons e **origens (comum gerada + especiais com lore)**, cascata com orçamento de raridade, 5 chances, aceitar/rerolar, nome e aparência, miniatura. | Mesma semente = mesmo resultado; tela de criação jogável; distribuição validada por simulação em massa. |
| **F2** ✅ | Loop de atividade + treino | Uma atividade por vez, ciclos, treino dos 8 status com piso/teto, nível/XP, offline de até 12 h, resumo "enquanto você estava fora". | Fechar o jogo, reabrir e receber o ganho correto; bot mede ritmo. |
| **F3** ✅ | Mapa e coleta | Regiões, locais, subáreas, viagem curta, coleta (madeira, minério, pesca, agricultura), ferramentas básicas, mochila e venda. | Trocar de atividade em outro local mostra "Movendo-se até…"; recursos por local e por tier. |
| **F4** ✅ | Combate por área | Áreas, monstros com taxa de aparição, drops, ataque básico, equipamento de combate, recuo automático. **Primeiro marco jogável completo.** | Cadeia treinar → coletar → vender → equipar → caçar funciona. |
| **F5** ✅ | Habilidades e core | Eixos, slots, ativas automáticas, passivas, técnicas do core, maestria e evolução. | Habilidades de coleta afetam coleta; core abre ramos. |
| **F6** ✅ | O Limiar | Morte, reino da morte, Barqueiro, Eco da Morte, drops exclusivos, set *O Retornado*. | Morrer não perde progresso; tempo offline no Limiar correto. |
| **F7** ✅ | Missões e Guilda | Missões de NPC, metas, quadro da guilda, ranks F→Divino, Mérito, provas de promoção, subáreas de NPC. | Missão avança sozinha enquanto se faz atividade. |
| **F8** ✅ | Forja, produção e nomeados | Produção, fusão por raridade, receitas, itens nomeados, acessórios e relíquias. | Fusão respeita falha parcial e *pity*; nomeado único por personagem. |
| **F9** ✅ | Conta e sincronização | Postgres (ou Redis), conta, `/api/v1`, ações autoritativas no servidor, até 3 personagens independentes, **cofre da conta** (conquistas, cosméticos, Pergaminhos), item de reroll. | Mesmo save em dois dispositivos; servidor reproduz o resultado. |
| **F10** | Pets | Reais e espirituais, nomear, **1 pet por atividade** (só trabalha quando o personagem trabalha ali), Fome/Energia, **cuidados como atividades do personagem (alimentar, descansar, treinar)**, besta vinculada, domar, União. | Pet atribuído a várias atividades só rende na que o personagem está; pet sem energia não ajuda. |
| **F11** | Mundo vivo | Dia/noite, clima, eventos aleatórios, Crônica, títulos, bestiário completo, profissões secundárias, **arcos de história das origens especiais**. | Hora do dia muda recursos e poder de raças/cores; origem especial abre seu arco. |
| **F12** | Competição | Campo de Provas, Arena assíncrona, bots, torneios, temporadas. | Torneio simulado reproduzível pela semente. |
| **F13** | Acabamento web | PWA, sons, arte, acessibilidade, balanceamento final. | Auditoria de ritmo e de segurança. |
| **F14** | Port mobile | Expo/RN usando o mesmo motor e a mesma API. | Paridade com a web. |

**Situação:** F0 concluída (commit `293c932`); F1 concluída em 23/11/2026; F2 a **F9 concluídas em 24/11/2026** (na F9, o banco da sincronização ainda precisa ser ativado pelo autor) (simulação e bot de ritmo em [`CALIBRACAO.md`](CALIBRACAO.md); relatório de cada fatia em [`../RELATORIO-idle-personagem-unico.md`](../RELATORIO-idle-personagem-unico.md)). O autor autorizou seguir até a F13 sem parar (24/11/2026).

## Regras de ordem

- F4 é o primeiro marco em que o jogo **já é jogo**; até lá, o foco é motor e loop.
- F9 pode subir antes (depois da F4) se o autor quiser jogar em dois dispositivos mais cedo. Isso é uma decisão dele, não do plano.
- Conteúdo (raças, monstros, itens) entra **só o necessário** para cada fatia; cresce em Atos depois.

## Marcos de conteúdo [Calibrar]

| Ato | Nível | Conteúdo mínimo |
| --- | --- | --- |
| **I** | 1–50 | 8 raças, 12 cores, 1 região com 4 locais, 6 áreas de combate, Limiar, guilda F→S, 4 ofícios de coleta. |
| **II+** | a definir | Novas regiões, raças, cores, ranks e temporadas. Entram por atualização. |

## Como cada fatia será pedida

1. Um arquivo em `prompts/idle-personagem-unico/NN-fatia-X-nome.md`, escrito antes da execução.
2. O agente lê `README.md`, `docs/GDD.md`, `docs/ARQUITETURA.md`, `docs/DECISOES.md` e o prompt da fatia.
3. Entrega com testes, depois revisão e *quality gates*, depois consolidação.
