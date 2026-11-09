# Decisões, histórico e pendências

## Registro de decisões e requisitos

| ID | Estado | Registro e origem |
| --- | --- | --- |
| D01 | Decisão | Unity 2D + C#; stack confirmada para o cliente |
| D02 | Decisão | Documentação Markdown em `myDigitalExistence/` no FelpZone |
| R01 | Requisito | Jogo mobile de pet/personagem/entidade virtual humanoide em pixel art |
| R02 | Requisito | Base visual reutilizável e personalização em camadas |
| R03 | Requisito | Conta vinculada ao progresso |
| R04 | Requisito | Invocação por runa de pedra com brilho azul, semente, elemento e habilidades centrais |
| R05 | Requisito | Até três personagens; apagar um antes de criar outro no limite |
| R06 | Requisito | Classe escolhida ao crescer; raça ligada ao nascimento |
| R07 | Requisito | Habilidades core, de classe, de raça e genéricas |
| R08 | Requisito | Fome, sono, saúde, sujeira e desenvolvimento de mana por treino |
| R09 | Requisito | Minigames rendem moedas e progressão; loja, itens, vendas e compra de habilidades |
| R10 | Requisito | Pet do personagem, cuidados, sorteio e compra direta mais cara |
| R11 | Requisito | Backend online com objetivo de custo inicial zero, fornecedor a planejar |
| R12 | Requisito | Base jogável, sólida e bonita antes de expansão temática |

Requisitos registram intenção do produto, não aprovação de todas as regras necessárias para implementá-la.

## Histórico tecnológico

1. A conversa começou com possibilidades de Android, APK e PWA.
2. O assistente propôs Godot para o jogo e alternativas de infraestrutura.
3. Também foi considerada a alternativa React Native + Expo.
4. O autor escolheu Unity; essa escolha substitui as recomendações anteriores.

**Histórico superado:** Godot/GDScript e React Native/Expo/Skia como stack principal. Codespaces e EAS Build não foram aprovados como fluxo Unity. Não transportar instruções de build Expo para este projeto.

**Ainda aberto:** backend TypeScript, C# ou outra tecnologia e hospedagem em Render, Vercel, Cloudflare, Supabase ou alternativa. Nenhuma recomendação anterior resolve a escolha.

## Propostas explicitamente não confirmadas

MVP chamado O Despertar; divisão v0.1–v0.5; um arquétipo inicial; classe flexível; proficiências; quatro propriedades de mana; Circuito de Mana; bônus diário sem punição severa; autonomia por máquina de estados; economia autorizada pelo servidor e comandos idempotentes. As propostas são bases de trabalho para validar, não decisões atribuídas ao autor.

## Pendências prioritárias antes do protótipo

- Qual versão Unity será fixada? Qual Android/aparelho de referência?
- Retrato ou paisagem? Como testar tamanho de texto e gesto com uma mão?
- Qual resolução de sprite, direções, pivôs, paleta e formato das camadas?
- Quais assets iniciais podem ser produzidos ou usados com licença adequada?
- Qual limite pequeno de conteúdo demonstra o ciclo sem atrasar a prova visual?

## Pendências antes do MVP online

- Provedor, banco, autenticação, linguagem e condições gratuitas verificadas.
- Regras de conta, recuperação, múltiplos dispositivos e sincronização.
- Carteira/inventário compartilhados ou individuais?
- Catálogo e probabilidades das runas; custo e transparência de resultados.
- Exclusão recuperável? Destino de itens, moeda e pets?
- Taxas de necessidades, ausência, saúde e possível morte.
- Níveis, XP, atributos, classe, limites de treino e elegibilidade de habilidades à venda.
- Regra de mana diária e duração/acessibilidade do primeiro minigame.
- Preços, recompensas, revenda e acesso a cuidados sem saldo.
- Offline somente leitura ou atividades com reconciliação? Como limitar abuso?
- Requisitos de desempenho, publicação, privacidade e dados mínimos.

## Pendências de expansão

Catálogo final de raças/classes/elementos; hibridização; raridades de pets e duplicatas; autonomia; conteúdo de ficção científica; monetização; social e multiplayer. Nenhum prazo aprovado.

## Manutenção do registro

Ao aprovar uma proposta, registrar data e evidência da escolha e atualizar os documentos afetados. Ao implementar, registrar verificação e versão separadamente. Não promover “planejado” a “implementado” por completar uma tarefa de documentação.

## Proveniência e limites

Fonte: requisitos de produto fornecidos para esta documentação.

Esta documentação sintetiza as ideias, com foco exclusivo no produto. Regras detalhadas novas aparecem como propostas. Não foram verificadas nesta entrega cotas comerciais nem produzidos executáveis.
