# Sistema 21 — Grupos e organizações

> **Estado:** definido e especificado pelo autor em 17 de setembro de 2026. Ainda não implementado.

## Objetivo

Oferecer um contrato único para o personagem pertencer, criar e liderar estruturas sociais como grupo de aventura, guilda, clã e facção, preservando regras próprias de cada tipo.

## Decisões confirmadas

- Organização, família e assentamento são conceitos diferentes, embora possam se relacionar.
- O pack define tipos de organização, cargos, permissões, requisitos e regras de associação.
- A filiação é explícita e possui estado: convidado, ativo, suspenso, desligado ou outro estado declarado.
- Personagens possuem agência para convidar, aceitar, recusar, sair ou aplicar decisões autorizadas.
- Cargo organizacional não é nível, patente do Sistema nem título social.
- A implementação começa por pertencimento e autoridade; tesouro, território e diplomacia entram em sistemas posteriores.

## Contrato conceitual

O catálogo descreve a organização, seu tipo, cargos, permissões válidas, requisitos de entrada e transições de filiação. O estado registra membros, cargos, estado da filiação, fatos de fundação e mudanças de liderança.

Comandos verificam a identidade do autor, a permissão exigida e a transição pedida. O cliente solicita uma intenção; o motor decide se ela é válida.

## Integrações

- **NPCs e relações:** convites e decisões consideram atores persistentes.
- **Party e combate coletivo:** uma party é uma organização temporária especializada.
- **Profissões e cidadania:** guildas e governos podem conceder permissões.
- **Território e assentamentos:** organizações podem administrar propriedades.
- **Facções e diplomacia:** especializam relações entre organizações.
- **Narrativa:** objetivos e cenas reagem a filiação e cargo.

## Primeiro ciclo jogável

O jogador cria ou aceita um pequeno grupo com Mira, atribui uma função permitida, consulta os membros e encerra ou abandona o grupo. As mudanças permanecem após salvar e carregar.

## Fatias propostas

1. Catálogos de tipos, cargos e permissões.
2. Estado, migração, índices e persistência.
3. Entrada, convite, aceite, saída e remoção.
4. Cargos, autorização e sucessão simples de liderança.
5. Condições e efeitos para campanha e objetivos.
6. Tela mobile de grupos e membros.
7. Party inicial e testes de agência, permissão e recarga.

## Critérios de aceite

- Não é possível executar ação sem a permissão requerida.
- Uma organização aceita novos tipos declarados sem `if` específico no motor.
- Filiações inválidas ou duplicadas são rejeitadas atomicamente.
- Remover catálogo referenciado produz erro de composição claro.
- O estado persiste apenas IDs, cargos e fatos mutáveis.
- A UI não consegue promover o jogador nem aceitar convite em nome de um NPC.

## Fora do escopo inicial

- tesouro e mercado;
- território e construções;
- guerras e diplomacia;
- família e herança;
- combate em grupo, tratado no Sistema 23.
