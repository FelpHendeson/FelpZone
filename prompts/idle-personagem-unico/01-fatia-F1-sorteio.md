# Fatia F1 — Sorteio do personagem

> **Situação:** autorizada pelo autor em 23/11/2026. Execute somente esta fatia. A F0 já está na `main` (commit `293c932`).

## Contexto

Projeto `idle-personagem-unico`: idle RPG de personagem único sorteado, uma atividade por vez. Fontes de verdade, nesta ordem: `docs/GDD.md` (§3 a §5, §9.1), `docs/ORIGENS.md`, `docs/ARQUITETURA.md`, `docs/DECISOES.md`, `docs/ROADMAP.md`, `.cursor/rules/felpzone.mdc` e `.cursor/rules/idle-personagem-unico.mdc`. Leia também o código da F0 (`packages/motor`, `apps/web`) antes de começar.

## Regras de execução

- Trabalhe somente dentro de `idle-personagem-unico/` (e do job de CI, se precisar de ajuste). Não altere outros projetos.
- Trabalhe **direto na `main`**, sem branch nem PR. Ao final, faça o commit no estilo do repositório (`feat(idle-personagem-unico): ...`) e **dê push na `main`**. A Vercel publica sozinha a cada push em https://idle-personagem-unico.vercel.app; confirme que o job de CI do projeto passou.
- TypeScript `strict`. Textos de interface e de conteúdo em português do Brasil.
- Nada de `Math.random` no motor nem nos testes de regra: todo sorteio usa o RNG com semente do save.
- O motor continua **puro** (sem React, Next, DOM nem Node). Conteúdo é **dado** em `packages/motor/src/dados/`; regras ficam fora dele.
- Respeite os rótulos do GDD: **[Autor]** não muda; **[Proposta]/[Calibrar]** podem ser ajustados, mas toda mudança de número é registrada em `docs/CALIBRACAO.md` e no GDD.

## Objetivo

Implementar a **criação do personagem**: sorteio em cascata com orçamento de raridade, 5 chances, aceitar/rerolar, nome, aparência e ficha. Ao final, ao abrir o jogo pela primeira vez, a pessoa sorteia o personagem, aceita, dá nome, escolhe cores e vê a ficha na aba **Personagem**.

## Entrega

### 1. Conteúdo (`packages/motor/src/dados/`)

Tipos fortes, ids estáveis em `kebab-case`, tudo validado por teste de integridade (ids únicos, referências válidas, textos não vazios).

- **Raridades:** `Comum, Incomum, Raro, Épico, Ancestral, Primordial` (GDD §9.1).
- **Raças (8):** Humano, Anão, Elfo, Orc, Lobisomem, Sangue-Pálido, Draconato, Silfo, com raridade de raça, **tags de afinidade**, perfil (texto) e **habilidade de raça comum** (GDD §3.1). Sem status numéricos ainda (a F2 os cria).
- **Dons de raça:** **13 por raça** (5 Incomum, 4 Raro, 2 Épico, 1 Ancestral, 1 Primordial), nome e descrição curta, temáticos e coerentes com a raça (exemplos do GDD para o Lobisomem).
- **Cores (12):** as do GDD §3.2, cada uma com descrição, **tags de afinidade** e **2 a 3 técnicas** só como texto (nome, natureza, modo, descrição curta). O core **Ser das Trevas** usa **exatamente** o texto do autor (GDD §3.2). Equipar e usar técnicas é da F5.
- **Compatibilidade raça × core:** `alta` (2+ tags em comum), `media` (1), `excentrica` (0). Cada raça deve ter ao menos 1 core `alta` ou `media`.
- **Marca da Anomalia:** para todo par `excentrica`, uma marca com nome e descrição. Gere com um **gerador determinístico por modelos** a partir de raça e core, e cure à mão pelo menos os pares do GDD (Lobisomem + Ser das Trevas → **Lua sem Luz**) e mais 5 à sua escolha.
- **Origens:** as **22 especiais** de `docs/ORIGENS.md` (lore, efeito, gancho, restrição de raça, marca `bestaVinculada`) e o **gerador de origem comum** (berço, motivação, marca opcional, anos de estrada), com o bônus de ofício do berço como dado.
- **Efeitos:** use o tipo de modificador da F0 quando o efeito já tiver significado; quando depender de sistema que ainda não existe, guarde como `efeitoPendente: string` (documentado, **não aplicado**).

### 2. Sorteio (`packages/motor/src/sorteio/`)

Cascata de **GDD §4.2**, nesta ordem: **raça → core → dom de raça → origem → detalhes finais**.

- **Pesos [Calibrar]:** raça por raridade 70/22/8 (comum/incomum/rara; uniforme entre as raças da mesma raridade); core por categoria 70/25/5 (alta/média/excêntrica; uniforme dentro da categoria; renormalize se uma categoria estiver vazia); dom por raridade 60/28/9/2,5/0,5 (Incomum, Raro, Épico, Ancestral, Primordial); origem 92% comum / 8% especial, com **restrição de raça** respeitada.
- **Orçamento de raridade** (saldo inicial **100**, [Calibrar]): custos de **raça** Comum 0, Incomum 10, Rara 25; **core** alta 0, média 5, excêntrica 15; **dom** Incomum 5, Raro 15, Épico 30, Ancestral 50, Primordial 80; **origem** comum 0, especial 15 (+15 se tiver besta vinculada). Em cada passo, só entram no sorteio as opções cujo custo cabe no saldo (renormalizando os pesos); se nada couber, escolha a de **menor custo**.
- **5 chances:** o estado do sorteio vive no **save** (tentativa atual, tentativas restantes, histórico mínimo). Recarregar a página **não** pode devolver chances. A 5ª tentativa é **obrigatória**: depois dela só se pode aceitar. Pode aceitar antes.
- O sorteio inteiro é **determinístico por semente**: mesma semente do save, mesma sequência de tentativas. Guarde o necessário para **reproduzir** cada tentativa.
- API do motor (ações puras que devolvem estado novo ou erro): `iniciarSorteio`, `rerolar`, `aceitarSorteio`, `definirNomeEAparencia` (ou equivalente), com erros tipados.

### 3. Personagem e save

- **Save v2** com **migração real** v1 → v2 (a tabela de migrações da F0 deixa de estar vazia): adiciona `conta` com `personagens[]` (máx. **3**, o modelo já suporta 3; só o primeiro é criado nesta fatia), `personagemAtivoId` e `sorteio`.
- Ficha inicial do personagem: `id`, `nome`, `nivel` 1, `xp` 0, `racaId`, `coreId`, `dons[]`, `origem` (tipo, id, lore gerada), `bestaVinculadaId?`, `marcaAnomaliaId?`, `aparencia` (`corCabelo`, `corRoupa`), `criadoEm`. **Sem status, atividades ou inventário** (F2 em diante).
- **Nome:** 3 a 20 caracteres, letras (com acentos), números, espaço, hífen e apóstrofo; sem espaços nas pontas; rejeite entradas inválidas com erro tipado.
- **Aparência:** paleta fixa de 12 cores de cabelo e 12 de roupa; **miniatura de perfil** gerada por código (SVG simples, determinística, que varia com raça, core e cores). Sem arte externa.

### 4. Web (`apps/web`)

- **Tela de criação** (mobile-first) quando não há personagem: mostra o resultado atual em cartões (raça, core com rótulo de compatibilidade, dom com raridade, origem e lore, marca da anomalia se houver, orçamento usado), botões **Aceitar** e **Rerolar (n restantes)**; na última tentativa, só **Aceitar**.
- Depois de aceitar: etapa de **nome e aparência** com a miniatura ao vivo.
- Aba **Personagem → Status**: **ficha** com os dados acima, a lore e a miniatura. As demais abas continuam "Em construção".
- Valide em **360 px, 390 px** e desktop; sem erros no console; recarregar durante o sorteio mantém o estado.
- Só use dependências já presentes, salvo necessidade clara (registre no README).

### 5. Simulação em massa e calibração

- **Script** `packages/motor/scripts/simular-sorteio.ts` (ou equivalente executável por `npm run simular`) roda **N = 200.000** primeiras tentativas com sementes diferentes e imprime: distribuição de raças e raridades de raça; categorias de compatibilidade (geral e por raça); raridades de dom; origem comum × especial (**nominal** × **efetiva** depois do orçamento); frequência dos pares excêntricos; média de custo gasto; quantas vezes o orçamento forçou uma troca de opção.
- **Registre o resultado** em `docs/CALIBRACAO.md` (tabela nominal × observado, data, versão do motor). Se algum número efetivo destoar muito do nominal por causa do orçamento, **proponha** o ajuste no documento, mas **não mude** pesos ou custos por conta própria sem registrar o antes e o depois.

### 6. Testes (Vitest)

- **Determinismo:** mesma semente, mesma sequência de 5 tentativas; estado salvo e recarregado continua a sequência.
- **Chances:** recarregar não devolve chance; a 5ª obriga a aceitar; `rerolar` depois do esgotamento é erro.
- **Orçamento:** nenhuma tentativa gasta mais que 100, exceto quando o fallback de menor custo for inevitável (e nesse caso o teste prova que era inevitável).
- **Restrições:** origens com restrição de raça nunca saem para raça incompatível; todo par excêntrico resolve uma marca; toda raça tem core alta ou média.
- **Integridade do catálogo** (ids únicos, referências, textos), **estatística de passo isolado** com tolerância justificada (ex.: ±0,5 p.p. em 200 mil amostras por semente fixa) e **migração v1 → v2**.
- **Nome e aparência:** validação do nome; cores só da paleta.
- Manter os 57 testes da F0 passando.

### 7. Documentação

- Atualize `README.md` do projeto (estado, comandos, `npm run simular`), `docs/ROADMAP.md` (F1 concluída) e `docs/GDD.md` se algum valor [Calibrar] ou regra mudar; crie `docs/CALIBRACAO.md`.
- Atualize `prompts/idle-personagem-unico/README.md` (F1 concluída).

## Fora do escopo

Status numéricos, piso/teto e treino (F2); atividades; mapa; combate; itens; habilidades equipáveis e uso de técnicas (F5); API, banco, conta e sincronização (F9); Pergaminho do Novo Destino e criação do 2º/3º personagem (F9); pets e besta vinculada funcionando (F10; aqui ela é só dado e texto); Selo do Destino; arte final; PWA; mobile. **Não antecipe a F2.**

## Critérios de pronto

- `npm ci`, `npm audit --audit-level=high`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` passam em `idle-personagem-unico/`.
- O motor não importa `react`, `next`, `window`, `document` nem módulos do Node; sem `Math.random`.
- Jogo novo → tela de criação → aceita → nome e cores → ficha na aba Personagem, **testado no navegador** em celular e desktop; recarregar mantém tudo.
- `docs/CALIBRACAO.md` com a simulação de 200 mil sorteios.
- Job de CI do projeto verde e deploy da Vercel em `READY`.
- Nenhum segredo ou `.env` versionado; nada fora de `idle-personagem-unico/` (e do job de CI, se tocado) alterado.
- Relatório final com: o que foi validado, números da simulação, **decisões que o autor precisa conferir** e o que ficou de fora.
