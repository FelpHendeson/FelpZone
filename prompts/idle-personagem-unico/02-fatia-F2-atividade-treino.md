# Fatia F2 — Loop de atividade e treino

> **Situação:** autorizada pelo autor e **concluída** em 24/11/2026. A F1 já estava na `main` (commit `c025163`).

## Contexto

Projeto `idle-personagem-unico`: idle RPG de personagem único sorteado, **uma atividade por vez**, até **12 h** offline. Fontes de verdade, nesta ordem: `docs/GDD.md` (§2, §3, §5, §6, §6.1, §16), `docs/ARQUITETURA.md` (§3.1 e §3.2), `docs/DECISOES.md`, `docs/CALIBRACAO.md`, `docs/ROADMAP.md`, `.cursor/rules/felpzone.mdc` e `.cursor/rules/idle-personagem-unico.mdc`. Leia o código da F0 e da F1 (`packages/motor`, `apps/web`) antes de começar.

## Regras de execução

- Trabalhe somente dentro de `idle-personagem-unico/` (e do job de CI, se precisar de ajuste). Não altere outros projetos.
- Trabalhe **direto na `main`**, sem branch nem PR. Ao final, commit no estilo do repositório (`feat(idle-personagem-unico): ...`) e **push na `main`**. Confirme o job de CI do projeto verde e o deploy da Vercel em `READY` (https://idle-personagem-unico.vercel.app).
- TypeScript `strict`. Textos de interface e de conteúdo em português do Brasil.
- Nada de `Math.random` no motor nem nos testes de regra; sorteios usam o RNG com semente do save.
- O motor continua **puro** (sem React, Next, DOM nem Node). Conteúdo é dado em `packages/motor/src/dados/`; regras fora dele. O tempo entra **por parâmetro** (`agora`); só a interface usa `relogioDoSistema`.
- Todo efeito numérico passa pelo **modelo único de modificadores** da F0.
- Respeite os rótulos do GDD: **[Autor]** não muda; **[Proposta]/[Calibrar]** podem ser ajustados, mas toda mudança de número vai para `docs/CALIBRACAO.md` e para o GDD, com o antes e o depois.

## Objetivo

O personagem criado na F1 passa a **fazer uma atividade de treino por vez**, em ciclos, ganhando status e XP, **também com o jogo fechado** (até 12 h). Ao reabrir, a pessoa vê o resumo "Enquanto você estava fora". A aba **Personagem → Status** mostra os 8 status com piso, valor e teto; a aba **Atividades → Treino** permite escolher o treino; uma barra fixa mostra a atividade atual.

## Entrega

### 1. Status, piso e teto (`packages/motor/src/personagem/` e `dados/`)

- Os **8 status** do GDD §5.1 (Vigor, Força, Resistência, Agilidade, Intelecto, Espírito, Percepção, Sorte), com ids estáveis.
- **Perfil numérico por raça** [Calibrar], coerente com o texto da F1 (`perfil`): `base_raça` de cada status e a **fração de piso** da raça. O GDD pede que o Humano tenha **piso alto e teto baixo** e o Draconato **teto alto e piso baixo**; a fórmula do §5.2 usa 0,55 fixo, então proponha a fração por raça (ex.: Humano 0,65, Draconato 0,45) e registre a mudança no GDD.
- Fórmulas do GDD §5.2 [Calibrar]: `teto(L) = base × (1 + 0,10 × (L − 1))`, `piso(L) = fração × teto(L)`, `ganho = ganho_base × (1 − (valor − piso)/(teto − piso))^0,6`. O valor nunca passa do teto nem fica abaixo do piso. Ao subir de nível, quem estava abaixo do novo piso sobe até ele; ninguém perde nada.
- **Nível e XP**: curva de XP [Calibrar] até o **nível 50** (GDD §5.3), com o nível máximo como dado. Na F2, XP vem só do treino.
- **Efeitos que já têm significado** passam de `efeitoPendente` para `modificadores` e **são aplicados**, quando dependem só de status, XP, ganho de treino ou velocidade de atividade. Exemplos: Corpo de Vento (Silfo, velocidade das atividades), Órfão do Templo Cinzento (+Espírito), A Voz do Poço (+Percepção), Soldado de uma Guerra Perdida (+Resistência), Cria da Matilha (+Agilidade), O Reencarnado (−5% de Vigor inicial), O Despertado Tardio (teto menor e +XP/+treino até o nível 20) e dons cujo texto seja só sobre status. Liste no README o que passou a valer e o que continua pendente.

### 2. Atividades e ciclos (`packages/motor/src/atividades/`)

- **Uma atividade por vez** (decisão [Autor]). Na F2 existem só as **atividades de treino**: uma por status (8), como dado (id, nome, status treinado, tempo base do ciclo [Calibrar], XP por ciclo [Calibrar]). Atividade combinada (ex.: "Corrida de resistência", Vigor + Agilidade) é opcional; se entrar, a regra é a mesma.
- Duração do ciclo = tempo base ÷ velocidade (velocidade vinda de modificadores). Cada ciclo completo aplica o ganho de status e o XP.
- Ações puras com erro tipado: `iniciarAtividade(estado, atividadeId, agora)`, `pararAtividade(estado, agora)`. Trocar de atividade **descarta o ciclo parcial** [Proposta]; documente a escolha. Sem viagem nesta fatia (o mapa é da F3).
- Sem `atividadeAtual`, o personagem fica **ocioso** e nada acontece.

### 3. Avanço do tempo e offline

- `avancar(estado, agora)` devolve **novo estado + resumo** (ciclos feitos, ganhos por status, XP, níveis ganhos, tempo simulado, se o limite de 12 h cortou tempo). Usa `calcularPassos`/limite da F0 e **matemática por ciclos** (ARQUITETURA §3.1), sem simular 86.400 passos.
- **Consistência**: avançar 3 h de uma vez dá o **mesmo estado** que três avanços de 1 h (e que muitos avanços de poucos segundos), inclusive com subida de nível no meio. O que sobra de um ciclo incompleto fica guardado.
- Relógio que volta no tempo não dá ganho nem quebra o save. Tempo além de 12 h é descartado.
- Só o **personagem ativo** avança (GDD §4.1: só um joga por vez).
- **Desempenho**: 12 h de avanço em menos de 50 ms no CI.

### 4. Save

- **Save v3** com migração real v2 → v3: cada personagem ganha `status` (valor por status), `atividadeAtual` (id e início do ciclo, ou nulo) e o que mais for preciso para o resto do ciclo. A migração calcula os status iniciais (piso do nível 1, com os modificadores de raça/origem/dom).
- Validação do save como entrada não confiável (valores finitos, dentro de piso/teto, atividade existente).

### 5. Web (`apps/web`)

- **Atividades → Treino**: lista dos 8 treinos com status treinado, duração do ciclo e ganho estimado por hora; botão para começar/trocar/parar. As outras sub-abas continuam "Em construção".
- **Barra fixa de atividade atual** (GDD §16): o que o personagem faz, progresso do ciclo e ganho por hora; "Ocioso" quando parado.
- **Personagem → Status**: os 8 status com barra piso → valor → teto, nível e barra de XP, além da ficha da F1.
- **"Enquanto você estava fora"**: ao abrir, se houve avanço relevante (ex.: ≥ 1 ciclo), mostra o resumo e o aviso se o limite de 12 h cortou tempo.
- Avança o tempo enquanto a página está aberta (intervalo curto), grava com frequência razoável e ao esconder a página (`visibilitychange`). Recarregar nunca dá ganho duplicado.
- Valide em **360 px, 390 px** e desktop, sem erros no console. Só dependências já presentes, salvo necessidade clara (registre no README).

### 6. Bot de ritmo e calibração

- Script `npm run ritmo` (no mesmo esquema do `npm run simular`) que joga como uma pessoa razoável (treina o status mais longe do teto, com sessões e pausas offline realistas) e mede: **tempo até os níveis 5, 10, 20 e 50**, ganho de status por hora por treino, quanto do teto se alcança por nível e o efeito do limite de 12 h para quem joga 1×/dia.
- Proponha alvos de ritmo (ex.: nível 10 no primeiro dia, nível 50 em semanas) e ajuste os números [Calibrar] até chegar perto. Registre tudo em `docs/CALIBRACAO.md` (números, data, versão) e no GDD.

### 7. Testes (Vitest)

- Piso/teto: invariantes, ganho decrescente perto do teto, subida de nível sem perda, perfis Humano × Draconato.
- Ciclos: duração com modificadores de velocidade, uma atividade por vez, trocar descarta ciclo parcial, ocioso não ganha nada.
- Offline: consistência por partição do tempo (propriedade com várias partições e sementes), limite de 12 h, relógio voltando, só o ativo avança, desempenho.
- Modificadores aplicados de raça/origem/dom; migração v2 → v3; validação de save adulterado.
- Manter os 140 testes da F1 passando.

### 8. Documentação

- Atualize `README.md` (estado, comandos, `npm run ritmo`, efeitos que passaram a valer), `docs/ROADMAP.md` (F2 concluída), `docs/GDD.md` (números e regras que mudaram), `docs/CALIBRACAO.md` e `prompts/idle-personagem-unico/README.md`.

## Fora do escopo

Mapa, locais e viagem (F3); coleta, ferramentas, mochila e venda (F3); combate, vida/mana em uso e recuo (F4); habilidades, técnicas e maestria (F5); Limiar (F6); missões e guilda (F7); produção e itens (F8); conta em nuvem (F9); pets e cuidados do pet (F10); dia/noite, clima e Crônica (F11); PWA e notificações. **Não antecipe a F3.**

## Critérios de pronto

- `npm ci`, `npm audit --audit-level=high`, `npm test`, `npm run lint`, `npm run typecheck` e `npm run build` passam em `idle-personagem-unico/`.
- O motor não importa `react`, `next`, `window`, `document` nem módulos do Node; sem `Math.random`.
- Personagem da F1 → escolhe um treino → ganha status e XP com a página aberta → fecha, reabre depois → vê "Enquanto você estava fora" com o ganho correto, **testado no navegador** em celular e desktop.
- Save v2 existente migra para v3 sem perder o personagem.
- `docs/CALIBRACAO.md` com o resultado do bot de ritmo.
- Job de CI do projeto verde e deploy da Vercel em `READY`.
- Nenhum segredo ou `.env` versionado; nada fora de `idle-personagem-unico/` (e do job de CI, se tocado) alterado.
- Relatório final com: o que foi validado, números do bot de ritmo, **decisões que o autor precisa conferir** e o que ficou de fora.
