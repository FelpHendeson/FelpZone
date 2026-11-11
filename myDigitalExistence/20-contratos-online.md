# Especificação de integração online, contratos e segurança

Versão 1.0 — 11/11/2026. **Status: design técnico para G3; provedor, stack, custos, autenticação e banco NÃO escolhidos.** Não iniciar implementação remota antes da prova do loop local e de um ADR de infraestrutura. Complementa [backend](09-backend-online.md), [domínio](17-contratos-de-dominio.md) e [QA](19-ux-e-qa.md).

## 1. Fronteira de autoridade

Servidor é autoridade de:
- identidade, propriedade, limite de 3 personagens e resultado da invocação;
- saldos, inventário, vendas, compras e concessões;
- progressão, habilidades efetivamente aprendidas e tempo confiável;
- elegibilidade para ações, conclusão de treino e recompensas.

Cliente Unity controla apresentação, entrada do jogador e cache de leitura, mas nunca recebe segredo administrativo nem autoridade para mandar “saldo novo = X”, “nível novo = Y” ou “sorteio = esta raça”. Em G1/G2 essas operações são simuladas somente em armazenamento DEV_ONLY.

## 2. Escolha de hospedagem — ADR obrigatório

Avaliar alternativas:
- API JS/TS (Hono ou framework simples) em provedor gratuito viável;
- serviço com autenticação e banco gerenciados;
- API C# com persistência adequada se o custo operacional justificar.

Critérios: custo atual confirmado, banco persistente (não temporário), capacidade de transação e unicidade, exportação e backups, auth, limites e suspensão de serviço, latência para usuários alvo, implantação e caminhos de migração. Dados de preço ou cota só podem ser considerados após consulta à fonte oficial e data de verificação. A escolha de Unity não obriga API C#.

ADR deve trazer: contexto, opções, riscos, fornecedor vencedor, falhas previstas, custos, gatilhos de migração e decisão. Serviços pagos exigem aprovação explícita do criador.

## 3. API REST proposta (não implementada)

Versão prefixada /v1. Autorização Bearer para endpoints privados, HTTPS obrigatório. Qualquer POST de mutação econômica/invocação usa Idempotency-Key por conta. IDs são opacos e não sequenciais para recursos expostos.

| Método | Endpoint | Função | Idempotência |
| --- | --- | --- | --- |
| GET | /v1/me | sessão e preferências | leitura |
| GET | /v1/characters | lista de até 3 personagens, slots | leitura |
| GET | /v1/characters/{characterId} | estado completo autorizado | leitura |
| GET | /v1/catalog/runes | runas e disponibilidade | leitura |
| POST | /v1/summons | invocar por runa, ocupar slot | requerida |
| POST | /v1/characters/{characterId}/care | ação de cuidado validada | requerida |
| POST | /v1/characters/{characterId}/equip | equipar/desquipar item possuído | requerida |
| GET | /v1/inventory | inventário autorizado | leitura |
| GET | /v1/shop/offers | ofertas com versão de catálogo | leitura |
| POST | /v1/shop/purchases | compra, débito + entrega | requerida |
| POST | /v1/shop/sales | venda de item elegível | requerida |
| POST | /v1/skills/learn | aprendizado autorizado | requerida |
| POST | /v1/activities/sessions | iniciar sessão de minigame | requerida |
| POST | /v1/activities/sessions/{sessionId}/complete | fechar treino e conceder resultado | requerida |
| GET | /v1/operations/{operationId} | consultar operação incerta após timeout | leitura |
| DELETE | /v1/characters/{characterId} | exclusão (somente após política aprovada) | requerida |

Rotas e verbos são propostas de engenharia, ajustáveis antes da implementação. Não lançar DELETE sem definir destino de itens/pets e recuperação de dados.

## 4. Padrão de requisição/resposta

**Header cliente:** Authorization: Bearer token; Idempotency-Key: UUID em mutações críticas; X-Client-Version e Content-Type application/json.

**Envelope de sucesso — exemplo técnico:**
~~~json
{
  "data": {
    "operationId": "uuid",
    "characterId": "uuid",
    "stateVersion": 4
  },
  "meta": {
    "serverTime": "2026-11-11T00:00:00Z",
    "catalogVersion": "dev"
  }
}
~~~

**Envelope de erro:**
~~~json
{
  "error": {
    "code": "SLOT_LIMIT",
    "message": "Limite de personagens atingido",
    "retryable": false,
    "correlationId": "uuid"
  }
}
~~~

Códigos de domínio exemplificativos: AUTH_REQUIRED, NOT_OWNER, SLOT_LIMIT, INVALID_RUNE, OPERATION_CONFLICT, INSUFFICIENT_FUNDS, ITEM_INCOMPATIBLE, SESSION_EXPIRED, NETWORK_UNAVAILABLE, RATE_LIMITED, INTERNAL_ERROR. Distinguir 401/403/404/409/422/429/5xx apropriadamente. Não incluir stack traces, hashes, queries ou tokens no payload ao usuário.

**Exemplo invocação:**
~~~json
POST /v1/summons
Idempotency-Key: 8ce7c2fe-...
{
  "runeId": "dev_rune_01",
  "slotIndex": 1
}
~~~
A resposta contém CharacterId e BirthSnapshot autorizado, **não re-sorteia** no front. Uma segunda solicitação com mesma chave e mesmo payload retorna a resposta original. Chave reutilizada com payload diferente deve resultar em conflito, não realizar outra transação.

## 5. Concorrência e transações

**Invocar:** transação valida owner e contagem/slot, reserva slot único por conta, cria personagem + snapshot de nascimento + registro idempotente. Índice único por (account_id, slot_index) para personagens ativos onde o banco suportar. Sem double-spawn quando duas requisições disputam última vaga.

**Compra:** transação valida oferta/preço versão servidor, saldo, limite, debita carteira, adiciona instância e registra lançamento/auditoria. Rollback completo se a entrega falhar. Nunca confiar no preço da tela.

**Venda:** confirma instância, autorização e regra de item equipado, retira item e credita carteira na mesma transação; chave única evita duas vendas.

**Treino:** início cria sessão com duração/limites, conclusão consome sessão e concede progressão/recompensa no mesmo commit. Sessão terminal é imutável; reconsulta devolve resultado anterior.

**Cuidado:** tempo de servidor, validações e atualização de estado numa versão concorrente ou lock transacional. Duas ações simultâneas não podem perder evolução via last-write-wins cego.

**Excluir personagem:** bloqueado até CR-10/decisão de vínculo de pet, política de inventário e recuperação. Excluir conta do serviço requer processo separado de dados/privacidade.

## 6. Modelo de dados mínimo proposto

~~~text
accounts (id, auth_provider_subject, created_at, status)
characters (id, account_id, slot_index, version, created_at, deleted_at?)
character_births (character_id, rune_id, rune_version, generator_version, seed_ref, snapshot_json)
character_appearances (character_id, appearance_json, version)
character_needs (character_id, state_json, evaluated_at, version)
character_progression (character_id, progress_json, version)
learned_skills (character_id, skill_id, skill_version, acquired_at)
item_instances (id, account_id, definition_id, definition_version, ownership_state)
equipment (character_id, equip_slot_id, item_instance_id)
wallets (account_id, currency_id, balance, version)
ledger_entries (id, account_id, operation_id, amount, currency_id, type, created_at)
activity_sessions (id, account_id, character_id, activity_id, status, score, expires_at)
operations (account_id, idempotency_key, operation_type, payload_hash, response, status)
pets (futuro; vínculo e destino ainda pendentes)
catalogs (versões e definições publicáveis)
~~~

Usar migrações controladas, constraints de FK/unique/check, indices em ownerId e operationId, transações e verificação de propriedade em todas as consultas. Persistir saldo como inteiro na unidade monetária definida; não usar float para moedas.

## 7. Temporização, offline e reconciliação

- Online usa UTC do servidor para necessidades, cooldowns e sessão de atividade.
- Cliente pode exibir último snapshot cacheado com indicação “offline/desatualizado”.
- **Padrão inicial de G3:** não conceder moeda, XP ou itens por ação offline não validada; política offline futura poderá evoluir por decisão criativa.
- Ao retornar online, reconsultar estado e operationId pendentes, aplicando versioning. Não sincronizar um JSON velho sobrescrevendo save recente do servidor.
- Suspensão do Android pode interromper requisição; operação é reconciliada com sua chave original.
- Nenhuma operação usa horário local como autoridade para ganhos.

## 8. Antifraude realista

- Token autenticado + ownership guard por recurso + rate limit por conta/IP e endpoint;
- controle de sessionId, frequência máxima, duração esperada e limites de score por atividade;
- replay/idempotência, validação de payload, checagens de schema e detecção de anomalias;
- reconhecer que score/timing no cliente podem ser forjados: não prometer anticheat perfeito num jogo casual;
- não enviar RNG completo de invocação para cliente antes de resultado se isso permitir seleção de sementes;
- não incluir chaves administrativas em pacotes Unity.

## 9. Operação, backups, privacidade e recuperação

- Segredos em variáveis de ambiente, rotação e credenciais separadas por ambiente.
- Logs com correlationId e métricas agregadas sem registrar token/senha.
- Migração reversível ou plano de rollback, backups automatizados e restauração TESTADA.
- Exportação por conta e processo de exclusão planejados antes de testes públicos.
- Provedor de identidade com fluxo de recuperação e revogação, coleta mínima de dados, política de retenção a aprovar.
- Alertas de erro e limite de custos; documentação de hibernação e limites do plano gratuito verificados no momento da escolha.
- Política de ambientes DEV/STAGING/PROD: contas e itens de teste nunca compartilhados acidentalmente com produção.

## 10. Testes mínimos do gate G3

1. Duas invocações concorrentes para último slot -> somente uma confirmada.
2. Retry da mesma Idempotency-Key após timeout -> mesmo resultado.
3. Uso de chave anterior com payload diferente -> conflito explícito.
4. Comprar sem saldo -> zero débito, zero item.
5. Falha no meio da transação de venda -> rollback completo.
6. Concluir minigame duas vezes -> uma recompensa.
7. Acessar personagem de outro usuário -> negado e sem vazamento.
8. Abrir no segundo dispositivo -> versões sincronizadas sem sobrescrever.
9. Alterar relógio do Android -> não muda tempo do servidor ou recursos.
10. Perda da conexão durante operação -> recuperação sem operação fantasma.
11. Restaurar backup de teste -> dados e relacionamento coerentes.
12. Catálogo v2 -> personagens nascidos em v1 continuam válidos.

**Gate concluído somente com evidência de integração real; mock de HTTP não prova backend seguro.**
