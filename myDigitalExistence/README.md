# myDigitalExistence

Documentação de um jogo mobile de personagem virtual com progressão RPG em pixel art.

**Estado da documentação em 11/11/2026:** planejamento estruturado. O usuário relatou que Unity está instalado e Android aparece nas opções de build; ainda não há evidência de um projeto Unity versionado, APK testado, backend ou funcionalidades implementadas nesta pasta. O nome da pasta é confirmado; o título comercial do jogo ainda não foi escolhido.

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
12. [Plano mestre de desenvolvimento](12-plano-mestre.md)
13. [Backlog de execução](13-backlog-execucao.md)
14. [Qualidade, testes e validação Android](14-qualidade-validacao.md)
15. [Governança criativa: quem decide o quê](15-governanca-criativa.md)
16. [Especificação técnica Unity 2D e Android](16-especificacao-unity.md)
17. [Contratos de domínio, dados e mecânicas](17-contratos-de-dominio.md)
18. [Pipeline visual de personagens modulares](18-pipeline-visual.md)
19. [Interface, fluxos e QA Android](19-ux-e-qa.md)
20. [API, sincronização e segurança online](20-contratos-online.md)
21. [Ordem de execução para agentes](21-roteiro-agentes.md)

**Para agentes de código e computador:** ler primeiro o [AGENTS.md](AGENTS.md). O documento determina autonomia técnica e reserva a direção criativa à construção conjunta com o criador.


## Acordo de execução e criação (11/11/2026)

**Confirmado:** o criador coelabora e aprova raças, classes, habilidades, aparências, customizações, equipamentos, pets, sistemas conceituais e direção artística. O agente participa propondo ideias, mas não transforma sugestões em conteúdo canônico sem aprovação. **Confirmado:** o agente tem autonomia para implementar as escolhas técnicas, criar código legível e testável com práticas consolidadas do mercado, operar a Unity quando autorizado, depurar e executar o backlog sem pedir autorização sobre detalhes rotineiros de engenharia.

Conteúdos não aprovados podem ser representados apenas por placeholders DEV_ONLY. As especificações 16–21 definem contratos e testes, não aprovam estilo, nomes, raridades ou balanço. Para implementação, seguir a [governança](15-governanca-criativa.md) e o [roteiro](21-roteiro-agentes.md).

## Base confirmada

**Decisão:** Unity 2D + C# para o cliente. **Requisitos:** Android/mobile, pixel art, humanoide personalizável, conta ligada ao progresso, invocação por runas, até três personagens, cuidados e progressão RPG. Backend online com objetivo de custo inicial zero; fornecedor e tecnologia não escolhidos.

**Proposta de recorte:** primeiro validar um personagem modular local; depois entregar um MVP online com lar, cuidados, invocação, inventário, loja e um minigame de mana. Classes completas e pets entram em marcos posteriores.

## Contexto do repositório

Inspeção em 09/11/2026: branch padrão `main`; raiz com `basilis/`, `docs/`, `labs/`, `matrix-sim/`, `mesa-online/`, `prompts/` e `rpg-narrativo-ia/`. Esta ideia é independente: não pressupõe reutilização de código nem migração de outros jogos. A grafia `myDigitalExistence` segue o pedido explícito, apesar da convenção geral de kebab-case.

## Execução e próximos passos

Não há comandos de instalação ou execução nesta etapa. O próximo passo é validar o ambiente com um APK mínimo (G0), depois construir a prova visual descrita no [plano mestre](12-plano-mestre.md) e no [backlog](13-backlog-execucao.md). 

## Origem

Síntese dos requisitos de produto fornecidos para esta documentação. Alternativas anteriores de Godot e React Native foram substituídas pela escolha de Unity. Referências visuais conceituais não são assets licenciados nem telas implementadas.
