# Economia, loja e pets

## Requisitos da economia

Minigames dão moedas e progressão. Uma loja permite gerenciar itens e vendas. Habilidades podem ser compradas com dinheiro do jogo. Equipamentos de RPG e ficção científica e roupas com atributos fazem parte da visão; coleções temáticas são futuras.

Dinheiro aqui significa moeda interna. Compras com dinheiro real, anúncios, moeda premium e assinatura não foram definidos.

## Modelo econômico proposto

Uma moeda principal no início, saldo por conta e inventário por conta, com equipamento vinculado ao personagem ativo. **Pendente:** confirmar quais recursos são compartilhados e quais pertencem a cada indivíduo.

Fontes: recompensas válidas e venda de itens elegíveis. Gastos: equipamentos, suprimentos e habilidades autorizadas pelo catálogo. Não vender de volta por valor igual ou maior que o custo de compra; validar itens únicos, equipados ou vinculados antes de vender.

**Proposta:** garantir cuidado básico gratuito ou barato e uma atividade sempre disponível. Não criar ciclo em que personagem sem saúde não possa ganhar moedas e, sem moedas, não possa recuperar saúde.

## Operações e rastreabilidade — proposta

- Servidor valida preço, saldo, estoque, propriedade e pré-requisitos.
- Compra debita e entrega item numa única transação.
- Venda remove item e credita na mesma transação.
- Aprendizado debita e registra habilidade de forma atômica.
- Cada operação possui chave idempotente, ID e lançamento de origem/destino.
- Repetir requisição devolve o resultado anterior; não aplica novo débito.

Não aceitar preço enviado pelo cliente nem comando de “adicionar moedas”. Manter valores inteiros de moeda e impedir saldo negativo. Catálogo versionado permite saber qual regra autorizou a transação.

## Balanceamento pendente

Definir duração típica de rodada, moedas por sessão, preços e tempo para primeira compra útil. Verificar inflação, repetição excessiva, revenda explorável e concentração em um minigame. Nenhuma taxa ou preço do produto foi aprovado.

## Pets do personagem

**Requisito:** o humanoide tem seu próprio pet, também sujeito a cuidados parecidos. Aquisição por sorteio ou compra direta a preço significativamente maior; outros meios podem ser explorados.

**Proposta de recorte:** pets após o primeiro MVP, com um companheiro ativo, poucos tipos e necessidades simplificadas. “Um ativo” não significa limite total aprovado.

Raça do pet, raridade, evolução, transferência, vínculo por conta/personagem, limite, reprodução e bônus de combate são pendentes. Cuidado do pet não precisa duplicar todas as tarefas do humanoide; testar ações compartilhadas como proposta.

## Sorteio e compra direta — proposta

Apresentar opções e custos com clareza; compra direta garante o tipo escolhido conforme catálogo. Sorteio gera resultado no servidor e persiste histórico. Probabilidades, duplicatas, garantia após tentativas e moeda de aquisição precisam de decisão antes da implementação. Não pressupor gacha monetizado.

## Aceite futuro

Pet persiste com seu dono, cuidado altera somente o alvo correto e aquisição não se duplica em reconexão. Antes de excluir humanoide, informar e aplicar a política aprovada de destino de seu pet e respectivos itens.


## Equipamentos de entrada da V1 (11/11/2026)

O criador autorizou descrições de equipamentos básicos de RPG com personalidade estética própria. [25-equipamentos-iniciais.md](25-equipamentos-iniciais.md) lista 18 peças candidatas, slots, aparência, compatibilidade, kits e efeitos conceituais. É conteúdo CANDIDATO_JOGAVEL, sem preços ou balanceamento final. O agente pode implementar modelos, sprites originais provisórios e inventário compatível sem aprovar automaticamente números definitivos. Pets continuam fora do primeiro MVP, conforme roadmap.
