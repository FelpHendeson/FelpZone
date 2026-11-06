# Felp Labs

Hub de experimentos pequenos de jogo. Cada lab responde uma única pergunta e registra a conclusão no próprio README. Os labs são agrupados por seção: uma para cada projeto que os usa e uma **Geral** para testes que não pertencem a nenhum projeto.

## Seções

| Seção | Pasta | Para quê |
| --- | --- | --- |
| Basilis: O Novo Mundo | `basilis/` | Labs do RPG de ação top-down ([história e plano](../basilis/docs/HISTORIA-E-PLANO.md)); juntos viram a base da engine |
| Geral | `geral/` | Técnicas de render, física, efeitos e ideias soltas |

## Labs

| Lab | Pergunta | Estado |
| --- | --- | --- |
| [Basilis 01 — Controles](basilis/01-controles/README.md) | Andar, atacar e esquivar ficam bons no celular e no navegador? | Concluído |
| [Basilis 02 — Cenário e escala](basilis/02-cenario/README.md) | O movimento num cenário de pixel art montado de uma spritesheet (gerada ou de IA) fica nítido em qualquer tela? | Concluído |
| [Basilis 03 — Combate](basilis/03-combate/README.md) | Colisão, dano, empurrão, recargas e inimigos que avisam antes de atacar ficam justos e legíveis no celular? | Concluído |
| [Basilis 04 — Animação](basilis/04-animacao/README.md) | Estados animados (parado, andar, atacar, dano, esquiva, morte) deixam herói e inimigos legíveis, com o golpe no quadro certo? | Concluído |
| [Basilis 05 — Personagem em camadas](basilis/05-personagem/README.md) | Um corpo base com pontos por quadro, camadas de personalização e troca de paleta dá um personagem bonito, variado e barato de desenhar, no jogo e no menu? | Em teste (parte 1 de 6) |

## Executar localmente

Requer Node.js 24 LTS e npm. Dentro de `labs`:

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite. Para testar no celular na mesma rede Wi-Fi, use `npm run dev:rede` e abra no celular o endereço de rede que o Vite mostrar. Para verificar as regras, execute `npm test`. Para verificar os tipos e gerar a versão de produção, execute `npm run build`.

## Criar um lab

1. Crie a pasta `<seção>/<número>-<nome>/` com um `index.html`, o código e um `README.md` com a pergunta, o que testar e a conclusão.
2. Acrescente o lab em [`hub/catalog.ts`](hub/catalog.ts) e na tabela acima.

O build encontra as páginas sozinho; o teste do catálogo falha se um lab listado não tiver página.

## Publicação

Publicado na Vercel como o projeto `felp-labs`.
