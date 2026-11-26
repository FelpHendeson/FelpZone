# F13.4 — Interface e navegação

Autorizada pela continuação do autor em 26/11/2026. Commit na main, push e deploy já autorizados.

## Contrato

- Dar protagonismo ao personagem ativo sem esconder sua atividade, progresso ou riscos existentes.
- Preservar os seis destinos e todas as sub-abas. Mobile mantém navegação inferior; desktop ganha navegação lateral com rótulos legíveis.
- Navegação por teclado nas sub-abas, foco/seleção coerentes, relações tab/painel e item ativo visível ao chegar por atalho.
- Atalho contextual para atividade/viagem/Limiar e para mochila cheia, sem executar ação do motor ao navegar.
- Estado da conta compacto e acessível em todas as áreas; reconexão/reauth disponíveis. Conta sem confirmação permanece em leitura; não simular avanço local.
- Feedback de ações distingue andamento, erro e confirmação. Evitar anúncios a cada tick do relógio.
- Não alterar regras, sorteios, saves, balanceamento ou conteúdo; tutorial fica na F13.5 e arte final na F13.6.
- Verificar treinar/coletar/vender/equipamento/combate/guilda, seis destinos e suas sub-abas, teclado, conta online/offline e mobile/tablet/desktop. Testes, lint, tipos, build; publicar e conferir produção.

## Direção visual e revisão

Paleta existente: fundo #14121a, superfície #1f1c28, borda #34303f, texto #ece8f4, secundário #a59fb3, dourado #d9a441. Georgia em nome/títulos principais, corpo do sistema. Sem novas fontes ou imagens remotas.

Layout alinhado à esquerda, como uma ficha de jornada: retrato, nome e identidade sempre associados ao personagem; sua atividade ocupa o restante do cabeçalho. Os sistemas ficam ao redor dele, sem um dashboard de métricas ou cartões decorativos. A lateral desktop organiza os seis sistemas já existentes; no celular eles continuam ao alcance do polegar. Atalhos descrevem destinos, sem sugerir ações automáticas.

```text
Desktop: [retrato + identidade] [atividade e progresso]
         [seis destinos]       [título, sub-abas e conteúdo]
Mobile:  [retrato, identidade e conta]
         [atividade e atalho]
         [título, sub-abas e conteúdo]
         [seis destinos fixos embaixo]
```

Revisão antes da implementação: manter os nomes familiares dos sistemas e o emblema/miniatura atuais. Em vez de criar novas seções de resumo, usar o personagem e a atividade reais; cada aviso leva ao sistema que o resolve. Revisar screenshots em uma segunda passagem, especialmente altura do cabeçalho e alvos de toque em 320 px.
