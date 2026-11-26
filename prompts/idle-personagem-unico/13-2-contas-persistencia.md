# F13.2 — Contas e persistência

Autorizada pelo autor em 26/11/2026: continuar os trabalhos e comitar diretamente na main. Preservar a F13.1 e as regras do motor.

## Entrega

- Sessão web em cookie HttpOnly, Secure e SameSite, com proteção de origem e identidade. Bearer mantido para cliente nativo.
- Migração das sessões antigas sem apagar o save; cache associado ao ID da conta, sem tokens persistidos em JavaScript.
- Recuperação sem e-mail por código de alta entropia de uso único, armazenado apenas como hash. Troca de senha revoga sessões; gerar código novo exige senha atual.
- Readiness verifica o banco de fato. Conferir a integração existente, sem provisionar nem contratar outro serviço.
- Testar persistência com Redis real, inclusive reinício, duas sessões, isolamento e recuperação. Validar fluxo web em mobile/desktop.
- Manter migração local explícita e casual. Não antecipar o redesenho de entrada/tutorial da F13.3/F13.5.

## Situação inicial

A Vercel já contém `KV_REST_API_URL`/`KV_REST_API_TOKEN` em preview e produção, vinculados a um store existente. O health público informa `banco: true`, mas apenas prova configuração: a F13.2 acrescenta readiness. Credenciais sensíveis não foram retornadas pela API de metadados. Não afirmar validação do Redis de produção sem evidência.
