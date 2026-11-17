# Idle Guilda

Idle de RPG e gerenciamento de personagens. Você comanda uma pequena guilda de aventureiros que caçam, mineram e descansam sozinhos, inclusive com o jogo fechado. O seu papel é decidir: onde cada um trabalha, como distribuir os pontos de atributo, quais armas forjar e quem contratar. Nome provisório.

**Versão publicada:** [idle-guilda.vercel.app](https://idle-guilda.vercel.app/)

## Hipótese

Voltar ao jogo e ver o progresso acumulado já dá vontade de tomar a próxima decisão (subir um atributo, forjar uma arma, mudar de zona), mesmo com pouco conteúdo.

## Estado atual

**v0.1 jogável**, com:

- **Fundação:** escolha da classe e do nome do primeiro aventureiro.
- **Três classes:** Guerreiro (Força, mais vida), Caçadora (Destreza, mais saque) e Mística (Mente, mais XP, frágil).
- **Tarefas:** caçar em três zonas (Campina Verde, Bosque Sombrio e Ruínas Antigas, liberadas nos níveis 1, 5 e 10), minerar e descansar.
- **Vida e fadiga:** a fadiga reduz o rendimento até 50%. O *descanso automático* tira o herói da luta com vida baixa ou exausto e o devolve à tarefa quando ele se recupera. Sem descanso automático, ele pode ser nocauteado.
- **Níveis:** cada nível dá +1 no atributo principal da classe e 2 pontos livres para distribuir. Cada atributo tem um efeito próprio.
- **Forja:** quatro armas feitas de ouro e materiais (gosma, couro, minério e fragmento arcano). Uma arma com afinidade rende 50% a mais na classe certa, e cada unidade fica com um único herói.
- **Taverna:** contratação de até três heróis (150 e 900 de ouro).
- **Progresso offline:** até 8 horas, com um resumo ao voltar. Uma aba escondida por mais de 30 s também conta como tempo fora.
- **Diário** com os acontecimentos importantes e um botão para apagar a guilda.
- **Pixel art desenhada no código:** os sprites são grades de texto com paleta (`src/arte/sprites.ts`), sem imagens externas.
- **Save** no `localStorage`, validado ao carregar.

Ritmo medido por simulação, jogando de forma simples: Bosque por volta de 10 min, Ruínas por volta de 30 min e nível 16 em cerca de 4 h. O minério é o gargalo, o que dá motivo para minerar.

## Executar localmente

Requer Node.js 20 ou mais recente e npm. Dentro de `idle-guilda`:

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite. Para testar no celular na mesma rede, use `npm run dev:rede`. Para as regras, `npm test`. Para os tipos e a versão de produção, `npm run build`.

## Arquitetura

| Pasta | Conteúdo |
| --- | --- |
| `src/motor/` | Regras em TypeScript puro, sem React: tipos, dados (classes, zonas, armas), fórmulas, simulação por segundo, ações e save. Tudo determinístico e testado. |
| `src/arte/` | Sprites em texto, desenho no canvas e montagem das cenas de cada tarefa. |
| `src/ui/` | Componentes React que mostram o estado e chamam as ações do motor. |

Decisões:

- **Simulação em passos de 1 s**, iguais com o jogo aberto ou fechado: oito horas offline são 28.800 passos por herói, o que leva milissegundos.
- **Saque pelo valor esperado:** os materiais acumulam frações (0,5 gosma por abate), então não há sorteio e os testes são reproduzíveis.
- **O motor emite acontecimentos estruturados** (`Evento`), e o texto é montado em `ui/texto.ts`.
- **As ações devolvem um estado novo ou um erro**, sem alterar o anterior.
- **O monstro continua ferido enquanto o herói descansa**, para que um herói fraco avance devagar em vez de ficar travado. O botão da zona marca *perigoso* quando o herói lutaria menos da metade do tempo.

## Publicação

Projeto `idle-guilda` na Vercel, ligado ao repositório com **Root Directory** `idle-guilda` e preset Vite. É um site estático, sem variáveis de ambiente.

## Próximos passos possíveis

1. Algo em que gastar ouro depois da forja (treinos, melhorias da guilda), já que ele sobra no meio do jogo.
2. Chefes que bloqueiam a próxima zona e exigem preparo.
3. Traços de personalidade (preguiçoso, ganancioso etc.) e grupos em que um tanque protege os outros.
4. Armaduras e um segundo espaço de equipamento.
5. Prestígio: aposentar um veterano para ganhar bônus permanentes.
6. Publicação como PWA, para instalar no celular.
