---
name: felpzone-implementar-fatia
description: Implementa uma fatia autorizada do RPG narrativo modular com escopo estrito, testes e documentação coerente. Use ao executar prompts de sistema, implementar uma fatia ou desenvolver a próxima etapa do rpg-narrativo-ia.
---

# Implementar uma fatia do FelpZone

## Preparação

1. Trabalhe em `rpg-narrativo-ia`.
2. Leia integralmente `AGENTS.md`, `README.md`, `docs/PROJECT-STATUS.md` e os documentos diretamente relacionados ao sistema.
3. Se houver um prompt autorizado em `../prompts/rpg-narrativo-ia`, leia-o integralmente e trate seus limites como contrato da entrega.
4. Inspecione `git status`, o histórico recente, a implementação atual e os testes dos módulos afetados. Preserve alterações alheias.
5. Declare qual fatia será implementada e o que permanecerá fora do escopo.

## Implementação

1. Faça a menor mudança completa que satisfaça a fatia autorizada.
2. Preserve as fronteiras entre regras do jogo, conteúdo, persistência e React.
3. Trate saves e conteúdo como entradas não confiáveis nas fronteiras públicas.
4. Mantenha operações de domínio puras e sem mutação sempre que o contrato exigir.
5. Adicione um teste que falharia sem cada nova garantia ou correção.
6. Atualize documentação apenas para refletir comportamento realmente implementado.
7. Não antecipe a próxima fatia, mesmo que pareça simples.

Para mudanças de UI, priorize celular, impeça overflow horizontal involuntário e valide também uma largura desktop.

## Validação e entrega

Execute a skill `felpzone-quality-gates`. Se algum gate falhar, investigue, corrija somente causas pertencentes ao escopo e repita a bateria.

Ao concluir, informe:

- fatia e contrato atendido;
- arquivos alterados;
- decisões técnicas relevantes;
- resultado dos gates;
- pendências reais e itens deliberadamente fora do escopo.

Não faça `commit` ou `push` sem solicitação explícita. Nunca declare a próxima fatia autorizada apenas porque a implementação terminou.
