# F13.4 — Interface e navegação

Continuação autorizada em 26/11/2026. [Contrato e direção visual](../../prompts/idle-personagem-unico/13-4-interface-navegacao.md).

## Entrega

- Personagem ativo com miniatura, nome, nível, raça/core, atividade e progresso visíveis ao navegar/rolar.
- Seis sistemas e 30 sub-abas preservados. Navegação inferior no celular/tablet, lateral no desktop a partir de 960 px.
- Sub-abas com setas, Home/End, foco móvel e relação com o painel; item ativo permanece visível na faixa horizontal.
- Atalhos para atividade, viagem, Limiar e mochila cheia; só navegam, sem disparar ações ou consumir sorteio.
- Estado de conta compacto; acesso à gestão e retorno à jornada. Conta sem conexão fica em leitura com reconexão explícita.
- Confirmação de gravação/ação e erros com foco. Progresso do ciclo continua acessível sem anúncios a cada tick.
- Alvos de toque do cabeçalho com pelo menos 44 px; paleta, fontes e miniaturas locais existentes. Motor, balanceamento e save permanecem intactos.

## Verificação

61 testes web e 2 testes com Redis real passaram. Tipos, lint e build aprovados. Os quatro novos testes cobrem o roteamento de todas as atividades, prioridade de viagem/Limiar e ausência de mutação do estado ao consultar o destino.

Playwright/Chromium com API real e Redis temporário isolado verificou as 30 sub-abas, vínculo tab/painel, teclado (setas/Home/End/Tab), treino, coleta, viagem, venda, compra/equipar, caça e acesso à Guilda. Validou o cadastro/importação explícita de uma jornada casual de teste, bloqueio de ações ao ficar offline e retomada após reconectar; mochila cheia abre Materiais. Não foram criadas contas de teste em produção.

Inspeção visual mobile/desktop e verificações em 320, 390, 768 e 1440 px, sem overflow horizontal. A revisão ampliou os links do cabeçalho para toque e usou sua altura real para posicionar a lateral/foco. Nenhuma biblioteca ou fonte nova foi adicionada.

As primeiras execuções do roteiro foram corrigidas por usarem cores fictícias e por esperarem que uma viagem manual mantivesse a atividade (a regra existente a interrompe). O produto preservou as regras; o roteiro completo passou com IDs e expectativas reais. As regras do motor não foram modificadas nesta etapa.

## Limites

Esta entrega revisa estrutura e navegação. Não é uma nova auditoria completa com leitor de tela/axe, nem o tutorial da F13.5 ou a arte final da F13.6. O aceite final da web permanece na F13.8.
