---
name: felpzone-quality-gates
description: Executa a bateria técnica reproduzível do rpg-narrativo-ia com testes, lint, TypeScript e build. Use quando o usuário pedir testes, validações, gates, checagem técnica ou confirmação de que uma implementação está saudável.
---

# Executar os gates técnicos

## Procedimento

1. Confirme que `rpg-narrativo-ia/package.json` existe.
2. Inspecione `git status` para registrar o estado inicial sem descartar alterações.
3. Execute a partir da raiz do repositório:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .cursor/skills/felpzone-quality-gates/scripts/run-gates.ps1
```

O script deve ser executado, não apenas lido. Ele roda todos os gates mesmo quando um deles falha e encerra com código diferente de zero se houver qualquer reprovação.

Se as dependências estiverem ausentes, peça autorização antes de acessar a rede e instale-as com o gerenciador indicado pelo lockfile. Não altere versões para fazer um gate passar.

## Diagnóstico

Para cada falha:

1. registre o comando e a mensagem relevante;
2. determine se a regressão pertence à entrega revisada;
3. não mascare falhas com exclusões, redução de cobertura ou relaxamento de tipos;
4. só corrija quando o usuário também tiver autorizado implementação ou correção;
5. após uma correção, rode a bateria completa novamente.

## Saída

Relate uma linha para cada gate — testes, lint, tipos e build — com `APROVADO` ou `REPROVADO`. Inclua contagem de testes quando disponível e finalize com o resultado geral.
