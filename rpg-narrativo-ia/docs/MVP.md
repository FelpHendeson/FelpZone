# Escopo do MVP

## Objetivo

Validar em uma sessão curta se criar um personagem, ler eventos e observar consequências é divertido no celular.

O MVP cobre somente o primeiro dia após o Reset e deve durar aproximadamente 10 a 15 minutos.

## Fluxo obrigatório

1. Tela inicial e início de nova partida.
2. Escolha de nome e sobrenome.
3. Despertar sozinho no novo mundo.
4. Apresentação do Sistema.
5. Escolha entre três capacidades iniciais.
6. Decisão entre buscar água, abrigo ou localização.
7. Primeiro perigo ou criatura.
8. Primeiro encontro com outro humano.
9. Escolha moral com consequência posterior.
10. Abrigo temporário ou decisão de permanecer sozinho.
11. Resumo da trajetória e possibilidade de reiniciar.

## Sistemas mínimos

- personagem: identidade e atributos;
- progressão: capacidade inicial e uma possível recompensa;
- narrativa: eventos, condições e transições;
- efeitos: alteração determinística do estado;
- inventário: poucos recursos consumíveis;
- relações: confiança com um único personagem;
- histórico: acontecimentos e decisões anteriores;
- persistência: salvar, continuar e apagar partida.

## Atributos iniciais sugeridos

- saúde;
- energia;
- fome;
- humanidade;
- cautela.

Os nomes podem mudar durante a implementação se isso simplificar a leitura, mas não devem existir atributos sem uso real na campanha.

## Fora do MVP

- integração com IA;
- backend, conta ou sincronização entre dispositivos;
- combate tático completo;
- criação de itens complexa;
- assentamentos administráveis;
- múltiplas facções completas;
- mapa aberto;
- geração procedural;
- editor de campanhas;
- loja, anúncios ou monetização;
- imagens e ilustrações finais.

## Critérios de aceite

- A aplicação funciona em viewport móvel sem rolagem horizontal.
- A campanha pode ser concluída do início ao fim.
- Pelo menos uma escolha muda um evento posterior.
- Pelo menos uma escolha altera inventário e outra altera relação ou atributo.
- Recarregar ou fechar a página preserva a partida.
- Nova partida apaga o estado anterior mediante confirmação.
- O jogo funciona sem chave e sem chamadas de IA.
- Os testes do motor passam.
- Imagens ausentes aparecem como placeholders consistentes, nunca como links quebrados.

## Ordem recomendada

1. Inicializar projeto e testes.
2. Definir tipos e estado inicial.
3. Implementar condições e efeitos.
4. Criar campanha mínima sem design final.
5. Construir interface mobile.
6. Adicionar salvamento.
7. Completar conteúdo e consequências.
8. Adicionar PWA e testar em aparelho real.
