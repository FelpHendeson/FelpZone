# Dia 1 — Especificação técnica de implementação

## Estado

**Especificada em 21 de setembro de 2026. Ainda não implementada.**

Esta especificação converte [Dia 1 — especificação narrativa e jogável](DAY-1-NARRATIVE-SPEC.md) em trabalho técnico.

Ela também formaliza duas mecânicas novas necessárias ao crescimento narrativo:

- [Orientação e Central de Ajuda do Sistema](MECHANIC-SYSTEM-GUIDANCE.md);
- [Marcos narrativos do mundo](MECHANIC-NARRATIVE-MILESTONES.md).

## Meta

Entregar uma nova partida em que o jogador:

1. cria nome, sobrenome e sexo;
2. desperta;
3. conhece o Sistema;
4. escolhe uma aptidão inicial;
5. aprende Etéris;
6. aprende Númen;
7. executa um treino real;
8. entra em exploração livre;
9. percebe sinais de outra pessoa;
10. pode conhecer Mira;
11. toma pelo menos uma decisão social persistente;
12. escolhe passar a primeira noite junto ou separado;
13. continua jogando no Dia 2.

Sem implementar ainda o assentamento formal ou o ranking do Dia 7.

---

# 1. Save schema 24 — identidade

## CharacterIdentity

Adicionar:

```ts
export const CHARACTER_SEXES = ['male', 'female', 'unspecified'] as const;
export type CharacterSex = (typeof CHARACTER_SEXES)[number];

interface CharacterIdentity {
  firstName: string;
  lastName: string;
  sex: CharacterSex;
}
```

Nova partida aceita na UI apenas:

- `male`;
- `female`.

`unspecified` existe para migração segura de saves antigos e compatibilidade.

Não inferir sexo pelo nome.

## Migração v23 → v24

- preservar todos os campos atuais;
- `character.sex = 'unspecified'` em save antigo;
- nenhuma ação de mundo;
- nenhum avanço de relógio;
- não regravar durante leitura além do comportamento já adotado pelo projeto.

---

# 2. Criação de personagem

Atualizar a tela existente de criação.

Campos:

- nome;
- sobrenome;
- sexo.

UX mobile:

- escolha clara por controle de seleção;
- não usar dropdown se dois botões/radios forem mais legíveis;
- confirmação continua explícita;
- erro acessível se nada for escolhido.

Não adicionar aparência nesta fatia.

---

# 3. Orientação/ajuda — **implementada**

Módulo `guidance` implementado.

Sugestão de pasta:

```text
src/modules/guidance/
├── index.ts
├── types.ts
├── inspect.ts
└── state.ts
```

Conteúdo:

```text
content/first-day/ui/guidance.json
```

Integrar em:

- assemble/composição do pack;
- `IndexedWorld`;
- contexto consumido pela UI/core;
- validação;
- save schema 24;
- campanha via efeito `guidance.unlock`.

Não colocar texto canônico de tutorial dentro dos componentes.

---

# 4. Marcos narrativos — **implementados**

Ampliar `world-events`.

Novas sources nesta entrega:

```text
system.skill.proficiency.min
world.day.min
```

O trigger de `world.day.min: 7` pode ser adicionado ao pack somente quando o conteúdo do Dia 7 existir.

Nesta entrega, usar `system.skill.proficiency.min` no Dia 1.

Não implementar fontes futuras sem necessidade.

---

# 5. Objetivos — critério de habilidade — **implementado**

Adicionar ao Sistema 10:

```ts
{
  type: 'system.skill.proficiency.min';
  skillId: string;
  amount: number;
}
```

Regras:

- skill precisa existir no catálogo ativo;
- estado precisa possuir entrada conhecida;
- proficiência >= amount;
- avaliação é pura;
- não duplicar em `flags`.

A validação de objetivos passa a receber contexto de habilidades quando necessário.

Se a arquitetura atual tornar essa referência cruzada inconveniente, validar a referência em `composeWorld` em vez de acoplar o módulo de objetivos diretamente ao módulo de skills.

---

# 6. Nova jornada principal do Dia 1

Substituir o papel atual de `first-steps` por uma jornada menos rígida.

Manter ID estável quando possível para reduzir churn de save.

Proposta:

```text
Primeiro dia
├── Escolha uma aptidão inicial
├── Faça sua primeira prática de Númen
├── Reconheça a Clareira do Despertar
├── Garanta água
├── Encontre sinais de outra pessoa
└── Prepare-se para a noite
```

A etapa de encontrar Mira **não precisa ser obrigatória** para concluir sobrevivência do Dia 1.

Se o jogador evita Mira, o mundo segue.

Fogueira e refeição saem da sequência obrigatória e permanecem como:

- ações úteis;
- possível jornada lateral;
- condições que alteram a cena noturna.

## Critérios

Usar fatos canônicos:

- aptidão → `progression.ability.selected`;
- prática → `system.skill.proficiency.min`;
- clareira → discovery/visit;
- água → discovery, item ou estado mais apropriado após revisar o conteúdo;
- sinais humanos → discovery/presence;
- noite → flag narrativa somente se realmente representar uma decisão que não existe em outro estado canônico.

---

# 7. Reescrita do começo da campanha

Revisar eventos:

- `awakening`;
- `system-awakens`;
- `choose-ability`.

Adicionar eventos para:

- percepção de Etéris;
- interiorização/Númen;
- resultado da primeira prática;
- primeiros sinais humanos;
- conversa revisada com Mira;
- noite compartilhada;
- noite separada.

## Regra

A parte Etéris/Númen não deve fingir treino.

A narrativa orienta; a gameplay exige que o jogador volte ao sandbox/Sistema e execute `training.train`.

Depois que a proficiência atinge o marco, um world trigger pode iniciar o evento de resultado.

---

# 8. Primeira prática

Usar conteúdo atual:

- skill: `sharpened-senses`;
- training: `focused-perception-drill`.

O jogador recebe acesso à explicação e ao método.

Ao executar:

- custo de 1 período pelo contrato existente;
- desgaste normal;
- proficiência real;
- sincronização de objetivos;
- resolução do novo world trigger;
- evento curto descrevendo a primeira experiência prática de circulação/percepção.

Não conceder bônus extra apenas por ser tutorial, salvo efeito narrativo explicitamente aprovado depois.

---

# 9. Aptidões iniciais

Preservar inicialmente:

- `olhar-atento`;
- `resiliencia`;
- `voz-calma`.

Reescrever copy para deixar claro:

> aptidão inicial ≠ classe ≠ caminho de Númen.

Elas podem continuar influenciando:

- atributos;
- opções narrativas;
- facilidade contextual.

Não usar a escolha para bloquear permanentemente habilidades de Númen.

---

# 10. Mira

Manter ID persistente:

`mira-vale`

Não renomear IDs por mudança de sobrenome.

Nesta entrega, manter também o nome visível `Mira Vale` para evitar decisão estética precipitada.

Reescrever:

- descrição;
- primeira conversa;
- decisão de compartilhar;
- memória/fatos quando necessário.

Mira sabe pouco.

Ela não explica o sistema inteiro.

## Rotas

O encontro deve suportar:

- aproximação;
- cautela;
- ajuda;
- recusa;
- afastamento.

Conhecer Mira não cria automaticamente amizade, party, família ou romance.

Esses sistemas podem responder mais tarde a decisões explícitas.

---

# 11. Primeira noite

Criar resolução contextual baseada no estado.

Entradas possíveis:

- Mira conhecida ou não;
- Mira aceita permanecer ou não;
- fogueira ativa ou não;
- água disponível;
- refeição disponível;
- condição física;
- escolhas sociais anteriores.

Não é necessário escrever todas as combinações como eventos separados.

Preferir condições + alguns eventos bem escritos.

Saídas principais:

- noite compartilhada;
- noite separada.

Ambas:

- mantêm `status: playing`;
- levam ao Dia 2;
- não abrem Summary final;
- preservam mundo e sandbox.

---

# 12. Ajuda inicial do first-day

Criar tópicos:

```text
choices-and-consequences
system-basics
time
exploration
needs
inventory
eteris
numen
training
journeys
relationships-basics
```

Ordem do catálogo deve também servir como ordem de apresentação quando vários estão pendentes.

Não criar ainda tópicos de:

- política;
- assentamento;
- economia;
- família;
- diplomacia.

---

# 13. Feedback e UI

Reutilizar o feedback tipado existente.

Não voltar a classificar mensagens por texto.

Tutoriais usam componente próprio.

Requisitos:

- modal/card mobile-first;
- não bloquear combate;
- não aparecer sobre escolha narrativa;
- central acessível no Menu/Sistema;
- badge `Novo` opcional para tópico não visto;
- acessível por teclado;
- `aria-live` somente onde apropriado, sem ler blocos longos automaticamente.

---

# 14. Pack

Adicionar `guidance.json` ao first-day.

Atualizar schemas/assemble/compose.

O pack passa a conter:

```text
campaign/
system/
world/
ui/
  ├── labels.json
  └── guidance.json
```

Alterações de texto continuam sem exigir código.

---

# 15. Ordem de implementação

## Fatia A — Fundação persistida — **implementada**

- schema 24;
- `CharacterSex`;
- criação com sexo;
- migração;
- testes.

## Fatia B — Guidance — **implementada**

`guidance` foi publicada no schema 25, preservando o schema 24 como contrato histórico da identidade.

- catálogo;
- estado;
- pack;
- efeito `guidance.unlock`;
- Central de Ajuda;
- popup;
- testes.

## Fatia C — Critério + triggers — **implementada**

- objetivo `system.skill.proficiency.min`;
- world trigger `system.skill.proficiency.min`;
- world trigger `world.day.min`;
- validação cruzada;
- testes.

## Fatia D — Conteúdo energético — **implementada**

- começo reescrito para separar aptidão inicial de progressão energética;
- eventos Etéris/Númen implementados;
- ajuda de Etéris, Númen e Treinamento desbloqueada no momento narrativo;
- `focused-perception-drill` permanece como ação real de treino com custo temporal normal;
- `first-numen-practice` reage à proficiência canônica de `sharpened-senses`;
- primeira percepção de Etéris registra apenas linguagem sensorial (pressão, calor ou vibração), sem bônus mecânico.

## Fatia E — Sandbox e Mira

- jornada principal;
- sinais humanos;
- encontro revisado;
- opcionais desacoplados.

## Fatia F — Primeira noite

- contexto da noite;
- duas saídas principais;
- transição ao Dia 2.

## Fatia G — Playtest

Rota mínima:

```text
nova partida
→ aptidão
→ Etéris
→ Númen
→ treino
→ água
→ sinais
→ Mira
→ noite
→ Dia 2
```

Rota alternativa obrigatória:

```text
nova partida
→ treino
→ exploração
→ evita Mira
→ noite sozinho
→ Dia 2
```

---

# 16. Testes obrigatórios

Além dos testes unitários das mecânicas:

- schema 23 → 24;
- criação masculina;
- criação feminina;
- migration `unspecified`;
- guidance persistido;
- pack alterado muda tutorial;
- primeiro treino dispara marco narrativo uma vez;
- reload não repete trigger consumido;
- objetivo reconhece proficiência real;
- fogueira não é requisito para conhecer Mira;
- refeição não é requisito para conhecer Mira;
- Mira pode ser evitada;
- noite separada não completa o jogo;
- noite compartilhada não completa o jogo;
- início do Dia 2 preserva estado;
- testes existentes continuam verdes.

Gates finais:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

---

# 17. O que esta implementação NÃO deve fazer

- Dia 2 completo;
- ranking regional;
- empregos;
- assentamento formal;
- romance;
- casamento;
- novas facções;
- política;
- sistema 30;
- rewrite de combate;
- rewrite do orquestrador;
- IA runtime.

As mecânicas novas entram porque resolvem necessidades recorrentes do jogo, não porque precisamos aumentar a contagem de sistemas.

---

# 18. Resultado esperado

Depois desta entrega, o first-day deixa de ser principalmente uma demonstração técnica.

Ele passa a funcionar como:

> **o primeiro capítulo de uma vida longa em Reset, onde aprender uma mecânica já é parte da história.**
