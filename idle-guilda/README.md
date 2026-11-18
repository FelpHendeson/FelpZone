# LionHearth: Crônicas das Sky Islands

Idle RPG de gerenciamento de party em pixel art. **Sir LionHearth**, herdeiro da Ilha de Aço, parte para espalhar o nome da família pelas Sky Islands do reino de Hope. No caminho, reúne uma party de cinco heróis que luta sozinha, em ondas, mesmo com o jogo fechado. O seu papel é montar a party, distribuir atributos, escolher equipamentos e habilidades, forjar, explorar e fundir habilidades no Jardim.

A pasta e o projeto na Vercel continuam com o nome `idle-guilda`, das primeiras versões.

**Versão publicada:** [idle-guilda.vercel.app](https://idle-guilda.vercel.app/)

O design completo está no **[GDD](docs/GDD.md)**: personagens e lore, atributos, fórmulas de combate, habilidades, árvore, jardim, equipamentos, economia, ritmo e interface.

## Estado atual

**v1.0: o jogo reimaginado.** O motor, a interface e a arte foram refeitos. Saves das versões anteriores não são compatíveis.

- **Party de cinco** com raça, papel, elemento e lore:
  - Sir LionHearth (dano explosivo);
  - Quentin Salamander (tanque);
  - Cyrus Viper (raio em área);
  - Vesper Ashveil (dano constante);
  - Odalys Thornwick (buffs e debuffs).

  Os quatro últimos são recrutados na Taverna.
- **Sete atributos:** Vida, Ataque, Defesa e Velocidade, físicos e mágicos. A velocidade define a frequência dos ataques e a recarga das habilidades. Cada nível dá 3 pontos e 1 ponto de habilidade.
- **Combate contínuo:** em ondas, com aggro do tanque, elementos, críticos, escudos, dano contínuo, buffs e debuffs. Há um chefe a cada 10 ondas, e o **Leão das Chamas** é a transformação do Sir LionHearth.
- **Habilidades:**
  - Até 5 em uso por herói, além do ataque básico, com a ordem definindo a prioridade.
  - Cada uma tem tipo, escola, elemento, rank (D a S) e nível (1 a 10, sobe com o uso).
  - **Árvore** com dois ramos por herói.
  - **Jardim** de fusão, com 5 receitas secretas e fusões geradas por regras para qualquer combinação.
- **Equipamentos:**
  - 10 espaços (elmo, peitoral, manoplas, calças, botas, arma, mão secundária, 2 acessórios e relíquia);
  - 4 tipos de armadura;
  - 5 raridades com afixos;
  - 5 conjuntos com bônus de 2, 4 e 5 peças;
  - 10 relíquias com passivas.
- **Cidade:** Ferreiro (forjar, melhorar de +1 a +10, desmontar), Loja (comprar e vender itens e materiais), Taverna e Jardim.
- **Expedições** (15 min, 2 h e 8 h por mapa, com chance de relíquia) e **treino**.
- **5 mapas** liberados pelo nível do Sir LionHearth, cada um com monstros, material e conjunto próprios.
- **Bestiário:** as 8 criaturas com lore, atributos e pontos fracos. Cada marco de abates (100, 1.000 e 5.000) dá dano extra permanente contra a espécie.
- **Campanha de 21 capítulos**, que também ensina o jogo.
- **Menu inicial, prólogo, save automático e manual, backup por código, conta, ranking, mural, jogadores online e aplausos**, mantidos das versões anteriores e adaptados.

## Executar localmente

Requer Node.js 20 ou mais recente e npm. Dentro de `idle-guilda`:

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite. O servidor de desenvolvimento também atende `/api` (contas, save na nuvem e mundo) com um banco em memória, que se apaga ao reiniciar. Para testar no celular na mesma rede, use `npm run dev:rede`. Para as regras, `npm test`. Para os tipos e a versão de produção, `npm run build`.

Para revisar a arte, abra `/src/arte/preview.html` (sprites e ícones) ou `/src/arte/preview-batalha.html` (as cenas de batalha) no servidor de desenvolvimento.

## Arquitetura

| Pasta | Conteúdo |
| --- | --- |
| `src/motor/dados/` | Dados do jogo: personagens, habilidades e receitas, árvores, itens, conjuntos, relíquias, mapas, monstros e missões. |
| `src/motor/` | Regras em TypeScript puro: atributos (`status.ts`), combate (`combate.ts`), itens, progressão, ações do jogador, capítulos, save e avanço do tempo (`jogo.ts`). |
| `src/arte/` | Pixel art em texto: heróis, monstros, ícones de itens e materiais, cenários e a cena de batalha. |
| `src/ui/` | React: telas, abas, ficha do herói, cidade, expedições, mundo, conta e menus. |
| `src/nuvem.ts` | Chamadas às funções `/api`. |
| `api/` | Funções da Vercel: `conta.ts`, `save.ts` e `mundo.ts`, com as regras em `api/_lib/`. |

Decisões:

- **Simulação em passos de 0,5 s**, iguais com o jogo aberto ou fechado. Oito horas offline são simuladas em menos de 1 segundo.
- **Determinístico:** críticos, drops e sorteios usam um gerador com semente guardada no save. A mesma situação dá sempre o mesmo resultado, o que torna os testes reproduzíveis.
- **Um modelo de modificadores** serve para buffs, passivas, auras, conjuntos, relíquias, afixos e nós da árvore. Um sistema novo só precisa produzir modificadores.
- **Ações puras:** cada ação devolve um estado novo ou um erro. A interface não guarda regra.
- **Ritmo medido por um bot**, que joga como uma pessoa razoável. Os números estão no GDD.

## Publicação

Projeto `idle-guilda` na Vercel, ligado ao repositório com **Root Directory** `idle-guilda` e preset Vite. As funções de `api/` são publicadas junto.

As contas usam o **Upstash Redis** gratuito já conectado ao projeto, que é o mesmo banco do Mesa Online. Todas as chaves deste jogo começam com `idle-guilda:`. As variáveis estão em [`.env.example`](.env.example). Sem o banco, a API responde 503 e o jogo mostra as contas como indisponíveis; o save local e o backup continuam funcionando.

Segurança das contas:

- **Senha:** guardada só como hash `scrypt` com sal.
- **Sessão:** cookie `httpOnly`, com só o hash do token no servidor.
- **Limite de tentativas:** 10 a cada 15 minutos.
- **Save:** até 200 KB, validado no jogo ao carregar.
- **Exclusão:** o jogador pode excluir a conta, o que remove também o ranking e o mural.

## Próximos passos

Estão no fim do [GDD](docs/GDD.md#13-próximos-passos-propostos): chefes de história por mapa, fusão de três habilidades, reserva de heróis, gemas e reforja, ranking validado no servidor, sons e PWA.
