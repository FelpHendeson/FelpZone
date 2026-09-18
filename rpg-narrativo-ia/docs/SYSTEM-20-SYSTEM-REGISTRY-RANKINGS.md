# Sistema 20 — Registro do Sistema, patentes e rankings

> **Estado:** implementado e consolidado nas Fatias 20.1 a 20.7 em 17 de setembro de 2026.

## Objetivo

Transformar o Sistema em uma instituição diegética capaz de reconhecer usuários, explicar progressão, atribuir classificações e comparar realizações dentro das regras de cada mundo.

## Distinções obrigatórias

- **Nível:** progresso interno do personagem.
- **Patente:** faixa de classificação concedida por uma regra ou instituição.
- **Ranking:** ordenação dentro de uma categoria e escopo.
- **Título:** reconhecimento nomeado por uma conquista ou cargo.
- **Cargo social:** autoridade em uma organização ou território.

Esses conceitos nunca são sinônimos e não devem compartilhar um único campo.

## Política de acesso ao Sistema

O pack declara uma política: universal, despertar, seleção, herança, concessão ou restrição. Ele também define quais espécies, grupos ou indivíduos são elegíveis e quais informações ficam visíveis.

No `first-day`, a política continua sendo acesso universal para humanos. Outras raças, a universalidade para todos os seres e o protagonista não humano continuam decisões de conteúdo futuro.

## Contrato conceitual

O pack pode declarar registros, categorias de patente, definições de ranking, métricas válidas, escopo, desempate, visibilidade e recompensas referenciadas. O estado registra acesso, reconhecimentos obtidos e snapshots mínimos quando um ranking não puder ser derivado do estado atual.

Rankings só consomem métricas canônicas produzidas pelos respectivos sistemas. A UI não informa pontuação, posição, patente ou recompensa.

A versão definitiva do schema é `schemaVersion: 14`. Saves v1–v13 migram com `registry` inicial: acesso segundo a política atual do pack, sem patentes nem rankings reconhecidos. O save guarda só `accessGranted`, `patentIds` e `recognizedRankingIds`; competidores e catálogo permanecem no pack.

## Integrações

- **Núcleo do Sistema e progressão:** nível, atributos e marcos.
- **Prática e combate:** fontes verificadas de realizações.
- **Profissões e organizações:** podem publicar rankings próprios sem redefinir nível.
- **Narrativa:** reage à reputação e aos reconhecimentos.
- **Interface do Sistema:** concentra registro, classificações e explicações.

## Primeiro ciclo jogável

Após uma realização verificável, o jogador entra em um ranking local de exploração ou combate. A tela explica a métrica, o escopo e a posição; uma patente só é concedida se sua regra própria também for satisfeita.

## Fatias propostas

1. Política de acesso e identidade no Registro.
2. Catálogos de patente, título e ranking.
3. Métricas derivadas e snapshots persistíveis.
4. Cálculo determinístico, desempates e privacidade.
5. Efeitos e recompensas atômicas de reconhecimento.
6. Superfície mobile dentro do Sistema.
7. Rankings locais de exemplo e testes de múltiplas políticas.

## Critérios de aceite

- Trocar a política do pack não exige editar o motor.
- Nível, patente, ranking, título e cargo permanecem separados.
- Só métricas registradas e verificáveis entram no cálculo.
- Rankings ocultos ou participantes desconhecidos não vazam no cliente.
- Empates são resolvidos de forma determinística.
- Recarregar a partida preserva reconhecimentos sem congelar catálogos no save.

## Fora do escopo inicial

- placar online ou multijogador;
- competição entre jogadores reais;
- economia baseada em ranking;
- fórmula universal de poder;
- definição definitiva de raças ou de quem recebe o Sistema em todos os mundos.
