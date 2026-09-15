# Consolidação dos Sistemas 1 a 8

## Resultado

Em 10 de setembro de 2026, a base jogável até o Sistema 8 foi revisada como um conjunto. O marco está consolidado e não possui pendência crítica conhecida nos contratos implementados. A decisão posterior sobre o Sistema 9 está registrada ao final, sem alterar o escopo desta consolidação.

Este documento registra a verificação; as especificações de cada sistema continuam sendo as fontes normativas de comportamento.

## Base coberta

| Camada | Estado confirmado |
| --- | --- |
| MVP e motor narrativo | Criação de personagem, eventos, escolhas, condições, efeitos, relações, inventário, progressão, histórico e retorno ao sandbox. |
| Persistência e PWA | Save local em schema 4, migrações v1/v2/v3, validação com contexto e build instalável/offline. |
| Sistemas 1 e 2 | Horário por períodos, passagem de dias, eventos de ciclo e fase visual derivada. |
| Sistemas 3 e 4 | Navegação hierárquica, descoberta, desbloqueio, exploração percentual e conclusão agregada de zona. |
| Sistemas 5 e 6 | Coleta, renovação, pressão populacional, crafting, estruturas locais e cozinha. |
| Sistema 7 | `GameState` integrado, ação sandbox atômica, custo temporal único, sincronizações, UI mobile e ponte entre mundo e narrativa. |
| Sistema 8 | Catálogo, descoberta, disponibilidade, planejamento, persistência, interação e apresentação de presenças; Mira e coelho chifrudo como conteúdo protótipo. |

## Correções da revisão integrada

Três lacunas foram encontradas e corrigidas antes do fechamento:

1. escolhas da narrativa de Mira podiam definir um período anterior ao atual e fazer o relógio retroceder; `world.period` agora apenas avança dentro do mesmo dia;
2. um efeito de período válido em `presence.interact` era calculado, mas descartado antes do custo temporal; a ordem agora é efeito declarativo → `TimeCost` → sincronizações;
3. um save schema 4 com descoberta antiga e flag de gatilho consumido, mas listas de presença desatualizadas, podia permitir repetir Mira; a leitura agora sincroniza e depois reconcilia a resolução.

Os alvos de toque compactos do menu e das ações de coleta/fabricação também foram alinhados ao mínimo de 48 px definido para a interface mobile.

## Evidências de aceite

- suíte automatizada completa: 23 arquivos e 450 testes aprovados, incluindo regressões dos sistemas anteriores e casos adversariais do Sistema 8;
- lint e verificação de tipos aprovados;
- build de produção e artefatos PWA aprovados;
- fluxo visual conferido em 320 px, 360 px, 390 px e 1280 px;
- sem overflow horizontal nas larguras verificadas;
- sem erro ou aviso no console durante a verificação mobile;
- conteúdo oculto não aparece antes da descoberta;
- Mira só abre narrativa por escolha do jogador, retorna ao mesmo local e não repete depois de resolvida;
- o coelho permanece uma interação de sandbox sem combate;
- efeitos, custo temporal e persistência preservam atomicidade e imutabilidade.

## Limites preservados

Continuam como protótipo: textos, nomes, balanceamento, ícones, imagens e volume de conteúdo. Permanecem fora dos Sistemas 1 a 8: agenda, deslocamento autônomo, comportamento de criatura, combate, necessidades automáticas, backend, IA em runtime e sincronização em nuvem. Necessidades receberam depois especificação e implementação próprias no Sistema 9; combate recebeu especificação e núcleo implementado no Sistema 12. Os demais itens continuam sem implementação autorizada.

Esses limites não bloqueiam a consolidação porque não pertencem aos contratos aprovados dos Sistemas 1 a 8.

## Ponto de continuidade

No fechamento desta revisão, o próximo passo ainda era uma decisão de produto. Depois dela, o autor aprovou **Necessidades e sobrevivência leve** como Sistema 9, com a exigência de que o conteúdo atual sustente o jogador sem combate. A especificação posterior está em [Sistema 9 — Necessidades e sobrevivência leve](SYSTEM-NEEDS.md).
