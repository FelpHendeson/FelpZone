---
name: felpzone-revisar-entrega
description: Revisa implementações do RPG narrativo contra o escopo autorizado, arquitetura, testes e documentação. Use quando o usuário pedir revisão, validação, Bugbot, auditoria de commit ou conferência de uma fatia entregue.
---

# Revisar uma entrega do FelpZone

## Definir o alvo

1. Leia `rpg-narrativo-ia/AGENTS.md`, `README.md`, `docs/PROJECT-STATUS.md` e os documentos do sistema revisado.
2. Identifique o prompt autorizado em `prompts/rpg-narrativo-ia` e o commit ou intervalo que implementou a entrega.
3. Se o usuário não indicar um intervalo, use o commit de implementação mais recente e seu pai. Não misture commits posteriores de prompts ou documentação sem relação.
4. Examine `git status`, `git diff --check`, diff, arquivos completos afetados e testes existentes.

## Revisão

Quando um revisor Bugbot estiver disponível, execute exatamente uma revisão e confirme manualmente cada achado antes de relatá-lo. Não terceirize a decisão final.

Procure prioritariamente:

- comportamento incorreto e estados impossíveis;
- mutação de entradas ou estruturas prometidas como imutáveis;
- validação superficial de saves, JSON, catálogos e índices;
- divergência entre estruturas redundantes;
- custo de tempo ou efeitos aplicados mais de uma vez;
- quebra de idempotência, atomicidade ou recuperação de save;
- vazamento de conteúdo oculto;
- acoplamento indevido entre módulos ou regras dentro de React;
- escopo implementado sem autorização;
- testes que cobrem apenas o caminho feliz;
- documentação que afirma algo diferente do código.

Em mudanças visuais, inclua navegação por teclado, semântica, foco, toque, overflow e larguras mobile/desktop.

## Saída

Não corrija código durante uma revisão, salvo pedido explícito separado. Apresente primeiro os achados, ordenados por gravidade:

| Severidade | Local | Achado |
|---|---|---|
| P0-P3 | arquivo:linha | impacto, cenário de reprodução e correção esperada |

Use P0 para perda crítica ou comprometimento, P1 para falha grave, P2 para defeito que deve ser corrigido antes da próxima fatia e P3 para melhoria não bloqueante.

Depois informe:

- partes do contrato que passaram;
- testes e gates executados;
- riscos ou lacunas de cobertura;
- conclusão: `APROVADO` ou `CORREÇÃO NECESSÁRIA`.

Se não houver achados, diga isso explicitamente; não invente problemas para preencher o relatório.
