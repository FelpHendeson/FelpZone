# Mecânica — Marcos narrativos do mundo

## Estado

**Especificada e implementada em 21 de setembro de 2026.**

Esta é uma extensão do módulo existente `world-events`, não um novo sistema numerado.

Hoje um gatilho narrativo pode surgir somente de `discovery.revealed`.

A narrativa dos Sete Dias exige que acontecimentos também possam nascer de fatos canônicos como treino e passagem do tempo.

## Princípio

Não criar flags de campanha para duplicar fatos que o estado já conhece.

Errado:

```text
treino aumenta proficiência
+
setar flag first-training=true
+
gatilho lê flag
```

Preferido:

```text
proficiência canônica mudou
↓
world trigger avalia o próprio GameState
↓
evento é iniciado
```

## Infraestrutura existente reaproveitada

O módulo já possui:

- catálogo de gatilhos;
- validação;
- resolução determinística;
- `world.trigger.<id>.consumed`;
- consumo idempotente;
- abertura de sessão narrativa.

Essas garantias devem ser preservadas.

Não criar novo estado persistido apenas para esta ampliação.

## Fontes aprovadas para a primeira extensão

```ts
type WorldTriggerSource =
  | { type: 'discovery.revealed'; discoveryId: string }
  | {
      type: 'system.skill.proficiency.min';
      skillId: string;
      amount: number;
    }
  | {
      type: 'world.day.min';
      day: number;
    };
```

### discovery.revealed

Comportamento atual.

### system.skill.proficiency.min

Elegível quando:

- habilidade existe no pack;
- personagem conhece a habilidade;
- proficiência atual >= `amount`;
- gatilho ainda não foi consumido;
- nenhuma sessão narrativa está aberta.

Uso no Dia 1:

- após a primeira prática real de Sentidos Aguçados, iniciar o pequeno acontecimento que traduz mecanicamente a sensação de Númen em experiência narrativa.

### world.day.min

Elegível quando:

- `state.world.day >= day`;
- gatilho ainda não consumido;
- nenhuma sessão narrativa está aberta.

Uso futuro já previsto:

- Dia 7 → abertura do Registro regional.

## Determinismo

Se mais de um gatilho estiver elegível:

- manter ordem declarada do catálogo;
- `resolveEligibleWorldTrigger` continua escolhendo o primeiro;
- os demais continuam não consumidos;
- ao encerrar a sessão e voltar ao mundo, a resolução pode abrir o próximo em momento seguro.

Não marcar gatilho como consumido antes de realmente iniciar sua sessão.

## Validação de pack

O contexto do catálogo precisa passar a conhecer:

- campanha;
- exploração;
- habilidades.

Validação:

- `skillId` precisa existir;
- `amount` deve ser inteiro seguro não negativo ou positivo conforme contrato da proficiência;
- `day` deve ser inteiro positivo;
- evento alvo precisa existir e aceitar início pelo mundo;
- ID de gatilho continua único.

Não exigir unicidade por source: dois acontecimentos diferentes podem legitimamente depender do mesmo marco, desde que a ordem seja determinística.

A implementação permite múltiplos triggers para a mesma descoberta. O índice `byDiscoveryId` permanece compatível apontando para o primeiro trigger declarado; a resolução completa usa `definitions` e preserva a ordem do catálogo.

## Integração com sandbox

Depois de uma ação atômica:

1. construir estado final;
2. validar/sincronizar sistemas;
3. verificar gatilho elegível;
4. iniciar no máximo uma sessão;
5. retornar estado.

O gatilho não cobra tempo adicional.

O tempo já foi cobrado pela ação que causou o marco.

## Integração com transições narrativas

Ao concluir uma sessão e retornar à exploração:

- verificar novamente gatilhos elegíveis;
- respeitar flag de consumo;
- nunca interromper uma sessão já aberta.

Isso permite encadear acontecimentos sem persistir uma fila explícita.

## Fontes futuras possíveis

Somente adicionar quando uma história concreta pedir.

Candidatas:

- `bond.exists`;
- `registry.patent.held`;
- `organization.membership.exists`;
- `settlement.project.completed`;
- `civic.profession.granted`;
- `economy.property.owned`.

Não implementar todas agora.

## Testes mínimos

- discovery atual continua funcionando;
- proficiência abaixo do mínimo não dispara;
- ao atingir o mínimo dispara uma vez;
- continuar acima não repete;
- dia abaixo do mínimo não dispara;
- atingir o dia dispara uma vez;
- save/reload respeita flag de consumo;
- sessão aberta impede novo trigger;
- dois gatilhos elegíveis respeitam ordem;
- depois de encerrar o primeiro, segundo pode ser resolvido;
- pack com skill inexistente falha;
- pack com evento inválido falha.

## Valor narrativo

Essa extensão permite que a história responda a gameplay real.

Exemplos:

```text
treinou → sentiu mudança → cena
chegou ao Dia 7 → ranking abriu → cena
criou vínculo → conversa futura
terminou uma construção → acontecimento comunitário
ganhou patente → reação de NPCs
```

O objetivo é fazer o mundo reagir ao que o jogador **fez**, não apenas ao que um roteiro mandou fazer.
