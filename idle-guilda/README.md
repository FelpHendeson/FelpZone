# Idle Guilda

Idle de RPG e gerenciamento de personagens. Você comanda uma pequena guilda de aventureiros que caçam, mineram e descansam sozinhos, inclusive com o jogo fechado. O seu papel é decidir: onde cada um trabalha, como distribuir os pontos de atributo, quais armas forjar e quem contratar. Nome provisório.

**Versão publicada:** [idle-guilda.vercel.app](https://idle-guilda.vercel.app/)

## Hipótese

Voltar ao jogo e ver o progresso acumulado já dá vontade de tomar a próxima decisão (montar a party, forjar uma arma, mudar de zona), mesmo com pouco conteúdo.

## Estado atual

**v0.3: menu, save e conta.** Sobre a v0.2, entraram:

- **Menu inicial:** Continuar (com o resumo do progresso), Novo jogo, Conta e Como jogar.
- **Menu no jogo (☰):** Salvar agora (mostra quando foi o último save), Conta, Backup, Como jogar, Menu inicial e Apagar guilda.
- **Save:** automático neste aparelho a cada 5 s e ao fechar, mais o botão manual.
- **Conta opcional**, só com apelido e senha (sem e-mail, então a senha não pode ser recuperada). Com a conta conectada, o progresso vai para a nuvem a cada 2 minutos, ao esconder a aba e no "Salvar agora". Em outro aparelho, é só entrar com a mesma conta. Se o aparelho e a nuvem tiverem progressos diferentes, o jogo pergunta qual usar e não envia nada antes da escolha. Um ☁ no topo mostra que o save na nuvem está ligado.
- **Backup:** um código de texto com todo o progresso, para copiar e colar em outro aparelho, mesmo sem conta.

### v0.2: party única e tutorial por objetivos

 A v0.1 tinha cada herói numa tarefa separada, com fadiga, mineração e muitos botões, e no teste ficou confusa. Nesta versão:

- **Uma party só:** até três heróis vão juntos para a zona e lutam juntos numa cena grande.
- **Papéis claros:** o **Guerreiro** (tanque) recebe todos os golpes; a **Mística** (cura) cura quem está mais ferido e dá +25% de XP ao grupo; a **Caçadora** (dano) bate forte e acha +25% de materiais. Sem tanque, o dano se divide entre todos.
- **Descanso automático do grupo:** se alguém cai abaixo de 25% da vida, a party volta ao acampamento e retorna quando todos se recuperam. O monstro continua ferido enquanto isso.
- **Dois atributos:** Poder (dano, ou cura na Mística) e Vigor (vida e defesa). Cada nível dá 2 pontos, e o botão "Distribuir sugerido" reparte conforme o papel.
- **Objetivos como tutorial:** 12 passos em sequência (forjar, equipar, contratar, avançar de zona), cada um com dica, atalho para a tela certa e recompensa em ouro. As abas mostram um marcador quando há algo a fazer nelas.
- **"Como jogar"** na primeira vez e no menu.
- **Zonas:** Campina Verde, Bosque Sombrio e Ruínas Antigas (níveis 1, 5 e 10). Cada botão mostra o XP por minuto esperado, medido simulando 10 minutos, ou avisa quando a zona é difícil demais.
- **Forja** com 4 armas (gosma, couro e fragmentos), **Taverna** para completar a party, **Diário** e **progresso offline** de até 8 horas com resumo.
- **Pixel art desenhada no código** (`src/arte/sprites.ts`), sem imagens externas.
- **Save** no `localStorage`. Saves da v0.1 não são compatíveis e o jogo começa do zero.

Ritmo medido com um bot que segue os objetivos: os sete primeiros saem em poucos minutos, o Bosque passa a compensar perto de 10 minutos e as Ruínas perto de 75. A sequência inteira leva cerca de 1 h 20.

## Executar localmente

Requer Node.js 20 ou mais recente e npm. Dentro de `idle-guilda`:

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite. O servidor de desenvolvimento também atende `/api` (contas e save na nuvem) com um banco em memória, que se apaga ao reiniciar. Para testar no celular na mesma rede, use `npm run dev:rede`. Para as regras, `npm test`. Para os tipos e a versão de produção, `npm run build`.

## Arquitetura

| Pasta | Conteúdo |
| --- | --- |
| `src/motor/` | Regras em TypeScript puro, sem React: tipos, dados (classes, zonas, armas), fórmulas, combate da party por segundo, objetivos, ações e save. Tudo determinístico e testado. |
| `src/arte/` | Sprites em texto, desenho no canvas e montagem da cena da party (luta ou acampamento). |
| `src/ui/` | Componentes React que mostram o estado e chamam as ações do motor. |
| `src/nuvem.ts` | Chamadas às funções `/api` a partir do jogo. |
| `api/` | Funções da Vercel: `conta.ts` (criar, entrar, sair) e `save.ts` (ler e gravar o save). As regras ficam em `api/_lib/`, testadas com um banco em memória. |

Decisões:

- **Simulação em passos de 1 s**, iguais com o jogo aberto ou fechado: oito horas offline são 28.800 passos, o que leva milissegundos.
- **A estimativa de cada zona é uma simulação curta** (10 minutos a partir da vida cheia), em vez de uma fórmula, para continuar correta quando as regras mudarem.
- **Saque pelo valor esperado:** os materiais acumulam frações (0,5 gosma por abate), então não há sorteio e os testes são reproduzíveis.
- **O motor emite acontecimentos estruturados** (`Evento`), e o texto é montado em `ui/texto.ts`.
- **As ações devolvem um estado novo ou um erro**, sem alterar o anterior.
- **Menos controles, mais consequência:** a decisão principal é a composição da party e a zona, não o microgerenciamento de cada herói.

## Publicação

Projeto `idle-guilda` na Vercel, ligado ao repositório com **Root Directory** `idle-guilda` e preset Vite. As funções de `api/` são publicadas junto.

As contas precisam de um **Upstash Redis**. Pode ser o mesmo banco gratuito do Mesa Online, porque todas as chaves deste jogo começam com `idle-guilda:`. Na Vercel, em **Storage**, abra o banco e use **Connect Project** para o projeto `idle-guilda`; a integração cria as variáveis de [`.env.example`](.env.example). Depois, faça um novo deploy. Sem o banco, a API responde 503 e o jogo mostra as contas como indisponíveis; o save local e o backup continuam funcionando.

Segurança das contas:

- **Senha:** guardada só como hash `scrypt` com sal.
- **Sessão:** token aleatório num cookie `httpOnly`, válido por 60 dias. O servidor guarda apenas o hash dele.
- **Limite de tentativas:** 10 tentativas de entrar a cada 15 minutos por apelido.
- **Save:** limitado a 200 KB, com formato conferido no servidor e validação completa no jogo ao carregar.

## Próximos passos possíveis

1. Algo em que gastar ouro depois da forja (melhorias da guilda, armaduras), já que ele sobra depois do tutorial.
2. Chefes que bloqueiam a próxima zona e exigem preparo.
3. Mais heróis do que vagas na party, com reservas treinando ou coletando.
4. Armaduras e um segundo espaço de equipamento.
5. Prestígio: aposentar um veterano para ganhar bônus permanentes.
6. Publicação como PWA, para instalar no celular.
