# myDigitalExistence

Documentação de um jogo mobile de personagem virtual com progressão RPG em pixel art.

**Estado em 09/11/2026:** planejamento; esta entrega contém somente documentação. Não há projeto Unity, APK, backend ou funcionalidade implementada nesta pasta. O nome da pasta é confirmado; o título comercial do jogo ainda não foi escolhido.

## Como ler

- **Decisão:** escolha explícita do autor na conversa ou no pedido atual.
- **Requisito:** característica desejada pelo autor; a implementação e o balanceamento ainda precisam ser definidos.
- **Proposta:** solução sugerida pelo assistente, inclusive detalhes novos desta documentação; depende de validação.
- **Pendente:** pergunta sem resposta ou escolha técnica/criativa ainda necessária.
- **Histórico superado:** alternativa discutida antes da decisão final.

Uma proposta detalhada não se torna decisão por estar documentada. Números ilustrativos não representam balanceamento aprovado.

## Índice

1. [Visão e contexto](01-visao.md)
2. [GDD do MVP](02-gdd-mvp.md)
3. [Personagens modulares e direção artística](03-personagens-modulares.md)
4. [Runas e invocação](04-runas-invocacao.md)
5. [Raças, classes, atributos e habilidades](05-progressao-rpg.md)
6. [Cuidados, mana e minigames](06-cuidados-mana-minigames.md)
7. [Economia, loja e pets](07-economia-pets.md)
8. [Arquitetura Unity e persistência](08-arquitetura.md)
9. [Planejamento do backend online](09-backend-online.md)
10. [Roadmap e validação](10-roadmap.md)
11. [Decisões, histórico e pendências](11-decisoes-pendencias.md)

## Base confirmada

**Decisão:** Unity 2D + C# para o cliente. **Requisitos:** Android/mobile, pixel art, humanoide personalizável, conta ligada ao progresso, invocação por runas, até três personagens, cuidados e progressão RPG. Backend online com objetivo de custo inicial zero; fornecedor e tecnologia não escolhidos.

**Proposta de recorte:** primeiro validar um personagem modular local; depois entregar um MVP online com lar, cuidados, invocação, inventário, loja e um minigame de mana. Classes completas e pets entram em marcos posteriores.

## Contexto do repositório

Inspeção em 09/11/2026: branch padrão `main`; raiz com `basilis/`, `docs/`, `labs/`, `matrix-sim/`, `mesa-online/`, `prompts/` e `rpg-narrativo-ia/`. Esta ideia é independente: não pressupõe reutilização de código nem migração de outros jogos. A grafia `myDigitalExistence` segue o pedido explícito, apesar da convenção geral de kebab-case.

## Execução e próximos passos

Não há comandos de instalação ou execução nesta etapa. O primeiro passo é confirmar as pendências prioritárias e construir a prova visual descrita no [roadmap](10-roadmap.md). 

## Origem

Síntese dos requisitos de produto fornecidos para esta documentação. Alternativas anteriores de Godot e React Native foram substituídas pela escolha de Unity. Referências visuais conceituais não são assets licenciados nem telas implementadas.
