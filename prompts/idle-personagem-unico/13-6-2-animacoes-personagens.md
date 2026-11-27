# Animações por quadros — personagens aprovados

Autorizado pelo autor: seguir com animações e sprites. Commits/main, push/deploy já autorizados.

- Preservar o acabamento raster aprovado, os cenários e a paleta pessoal.
- Folha por raça, 4×4: quatro quadros de repouso, caminhada, ataque corporal genérico e gesto de trabalho. Criar referência humana, revisar no cenário e adaptar às oito raças.
- PNG fonte imagegen preservado, WebP lossless. Normalização técnica por alpha/apoio dos pés, com escala consistente dentro de cada folha e sem cortar mãos/chifres/orelhas/caudas.
- Controlador visual puro mapeia estado confirmado para animação; não inventar dano, morte, vitória, equipamento ou avanço do jogo. Professões usam gesto comum neste pacote; animações específicas com ferramentas precisam de folhas próprias.
- Transições sem quadro de outra raça/paleta. Cadências próprias por estado, repouso e Limiar mais lentos, pausar em leitura, aba oculta e movimento reduzido. Retratos mantêm a arte estática aprovada.
- Carregamento sob demanda por raça, cache limitado, fallback estático detalhado durante carga/falha, PWA offline após visitar.
- Testar mapeamento, quadros/alpha, paletas, cancelamento, oito raças, responsividade, leitura/visibilidade/reduced-motion, falha e offline. Revisão visual com animações rodando, lint/tipos/testes/build e release autorizado.

## Entrega consolidada — 27/11/2026

Implementação publicada na `main`, commit `b271466`, Vercel READY e conferida no endereço público. Oito folhas de 16 poses, pipeline reproduzível e fontes versionadas. Registrados 445 testes e revisão dos 32 ciclos no navegador, com limites documentados. [Fontes e validação](../../idle-personagem-unico/docs/ANIMACOES-V1.md), [roadmap](../../idle-personagem-unico/docs/ROADMAP.md) e [retomada em outro computador](../../idle-personagem-unico/docs/RETOMADA.md). F13.7/F13.8 continuam planejadas; ferramentas por profissão, armas visíveis e outros atores requerem pacotes próprios.
