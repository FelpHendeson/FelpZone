# Correção artística — personagens pessoais

Autor rejeitou retratos/sprites geométricos da F13.6 e autorizou refazer com liberdade de ferramentas/bibliotecas. Preservar os cenários e as ilustrações de raça aprovados.

- Substituir corpo e retrato pessoais por arte raster com o acabamento das ilustrações aprovadas.
- Gerar base com materiais identificáveis (cabelo/barba e tecido), mantendo sombra, luz, rosto e detalhes. Aplicar a paleta do save no renderer do jogo, sem redesenhar a silhueta com retângulos.
- Retrato recortado da mesma imagem personalizada do corpo; raça, cabelo, roupa e core continuam representados.
- Sem mudança de save/regra e sem perda de progresso. Manter cache offline, movimento reduzido e estado de leitura.
- Remover o renderer geométrico e exports que podem recolocar os bonecos rejeitados no jogo. Documentar nova pipeline e limitações honestamente.
- Revisar visualmente no cenário e no cabeçalho, oito raças e paletas claras/escuras. Testar troca rápida, cache/isolamento e falhas de asset. Só então commit/push/deploy já autorizados.
