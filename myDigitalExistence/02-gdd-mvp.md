# GDD — MVP v0.1: O Despertar

**Estado:** proposta de recorte derivada dos requisitos; não é escopo aprovado nem implementação.

## Hipótese a validar

Cuidar de um humanoide expressivo e perceber mudanças visuais e de progressão cria vontade de voltar, mesmo com apenas um ambiente e um minigame. Validar a qualidade desse ciclo antes de multiplicar conteúdo.

## Ciclo principal

Conta → selecionar/invocar personagem → entrar no lar → observar necessidades → cuidar → treinar mana → receber moedas e XP → comprar/equipar → salvar progresso → retornar.

A conta comporta até três personagens como requisito do produto. **Proposta:** somente um fica ativo por vez; reservar os três slots já no MVP online, sem simular todos em tempo real.

## Conteúdo mínimo proposto

| Área | Entrega mínima |
| --- | --- |
| Conta | Login, reconexão e recuperação de progresso |
| Invocação | Pequeno catálogo de runas, nascimento persistido, limite de três |
| Visual | Um arquétipo corporal, cabelo e peças trocáveis |
| Lar | Um cenário, toque para ações e reações de estado |
| Cuidados | Alimentar, dormir, limpar e recuperar saúde |
| Mana | Reserva e qualidade visíveis, um treino jogável |
| Progressão | Nível geral, XP e primeiro ganho de atributo ou habilidade |
| Inventário | Listagem, detalhes e equipar/desequipar |
| Loja | Compras com moeda do jogo e venda de itens elegíveis |
| Salvamento | Estado persistente e feedback de sincronização |

Quantidade de raças, runas, itens, frames, níveis e duração de sessão serão escolhidas após a prova visual. Classes completas, segundo minigame e pets são recortes posteriores propostos.

## Fluxos e telas

- **Entrada:** verificar sessão; mostrar carregamento, erro recuperável e tentativa novamente.
- **Seleção:** apresentar slots, nome, resumo e escolha do ativo.
- **Altar:** escolher runa de pedra com brilho azul; confirmar; apresentar resultado registrado.
- **Lar:** personagem em destaque; necessidades com texto/ícones; acessos a cuidados, treino, ficha, inventário e loja.
- **Treino:** explicar gesto, permitir praticar, concluir ou sair, apresentar recompensa confirmada.
- **Ficha:** separar origem, classe, atributos, necessidades e habilidades por categoria.
- **Loja:** preço, saldo, efeito, confirmação e resultado; impedir cliques repetidos durante operação.
- **Gerência:** exclusão explícita com aviso de perda; jamais apagar automaticamente ao tentar um quarto personagem.

**Proposta de UX:** não depender só de cor, oferecer texto legível e controles de toque confortáveis. Reduzir efeitos e permitir som desligado. Orientação e opção de treino acessível permanecem pendentes.

## Primeira sessão proposta

O tutorial conduz uma invocação, uma ação de cuidado, uma troca de peça e uma rodada de mana. Encerrar com progressão compreensível e próximo objetivo pequeno. Não exigir longos formulários nem várias moedas para explicar o básico.

## Critérios de aceite do MVP

- Login na mesma conta recupera os personagens em outro dispositivo.
- Invocação repetida por falha de rede não gera dois personagens.
- Três slots ocupados bloqueiam nova invocação; exclusão requer escolha consciente.
- Personagem mantém peças alinhadas nas animações de repouso e cuidado.
- Necessidades mudam e respondem às ações; retorno após ausência respeita a regra escolhida.
- Treino concede recompensa uma única vez e informa quanto mudou.
- Compra/venda e equipamento sobrevivem ao reinício sem saldo negativo ou duplicação.
- Rede indisponível tem feedback e caminho de recuperação sem perda silenciosa.
- Um teste real no Android alvo verifica fluidez, memória e retomada após suspensão.

## Fora do MVP proposto

Mundo aberto, arena online, marketplace, sistema completo de hibridização, coleções sazonais, múltiplos lares e comportamento autônomo elaborado. Esses cortes não removem a visão futura.
