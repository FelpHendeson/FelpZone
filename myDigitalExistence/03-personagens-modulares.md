# Personagens modulares e direção artística

## Requisito e objetivo

**Requisito:** uma base humanoide reutilizável, personalizada por cima, para facilitar criação de personagens e cosméticos. Equipamentos também podem alterar atributos; aparência e efeito precisam permanecer separados nos dados.

## Composição proposta

Pilha inicial: sombra → peças traseiras → corpo → detalhes raciais → rosto/olhos → cabelo traseiro/frontal → roupa → armadura → acessórios → equipamento de mão → efeitos frontais. A ordem real varia por direção, pose e peça; não deve ser uma lista imutável que produza espadas atrás do braço errado.

**Proposta:** um único arquétipo humanoide no MVP, com variações compatíveis. Raças com silhuetas incompatíveis exigem outro arquétipo ou adaptação explícita, sem promessa de que toda roupa servirá em todo corpo.

## Contrato de arte a validar

- Mesma resolução de quadro, origem, pivô e escala por arquétipo.
- Mesmo conjunto de direções, nomes de animação, quadros e tempos.
- Âncoras coerentes para mão, cabeça, costas e chão.
- Metadados de compatibilidade de peça, slot e arquétipo.
- Regras para esconder cabelo sob capacete, manga sob armadura e conflitos de acessórios.
- Paletas e contraste que mantenham expressão e leitura no celular.
- Fallback visível para peça ausente e validação de catálogos.

Resolução, pixels por unidade, quantidade de direções e frames **não foram decididos**. Testar uma amostra antes de produzir coleções.

## Animação proposta

Prioridade: idle, comer, dormir, limpar e celebrar. Andar, treinar e atacar vêm conforme os minigames exigirem. Cada camada acompanha um único relógio de animação; trocar equipamento não reinicia partes do corpo em momentos diferentes.

**Proposta técnica:** sprites em camadas com renderizadores sincronizados em Unity. Animação quadro a quadro é a primeira hipótese; rig esquelético depende de avaliação visual. Evitar escolher a solução apenas pela quantidade de ferramentas disponíveis.

## Personalidade e presença

**Proposta do histórico:** temperamento, preferências e pequenas ações autônomas por máquina de estados; sem exigir IA generativa. Um primeiro recorte pode usar somente reações a fome, sono e interação. Recusar atividades, circular sozinho e autonomia ampla são pendentes de design.

## Produção sustentável

Criar primeiro um corpo, um cabelo, uma roupa e um item de mão. Verificar todas as combinações e animações. Só ampliar o catálogo depois de validar alinhamento, oclusão e custo de produção.

Registrar autor, origem, licença e permissão de uso de cada asset. Imagens de busca usadas como inspiração na conversa não concedem direitos de reutilização.

## Aceite da prova visual

Trocar peças durante a animação sem desalinhamento, manter pixel art legível no Android alvo e exibir fallback para combinação incompatível. Medir custo de memória e tempo por quadro antes de definir o orçamento de conteúdo.


## Primeiro catálogo concreto (11/11/2026)

A [especificação de modelos e personalização V1](23-modelos-e-personalizacao-v1.md) propõe um arquétipo humanoide, três compleições, cabelo/olhos/paletas e overlays de quatro raças. **Status CANDIDATO_JOGAVEL**, autorizado para implementação técnica e arte provisória original; proporções 96×128/PPU são hipóteses de teste, não padrão visual congelado. Usar [18-pipeline-visual.md](18-pipeline-visual.md) como contrato de render. O visual final depende de revisão conjunta com o criador.
