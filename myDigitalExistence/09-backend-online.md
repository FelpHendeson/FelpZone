# Backend online — plano de investigação

## O que está definido

**Requisito:** conta atrelada ao progresso e backend online com objetivo de hospedagem gratuita inicial. **Pendente:** linguagem, framework, provedor, banco, autenticação e política offline.

Render e Vercel foram possibilidades do autor; TypeScript/Hono com Cloudflare Workers/D1 e Supabase foram sugestões do assistente. Nenhuma dessas combinações foi escolhida. A escolha de Unity não obriga backend em C#.

## Candidatos para avaliar

- API JavaScript/TypeScript em Render ou Vercel, com persistência e autenticação a selecionar.
- API TypeScript/Hono em Cloudflare Workers com D1.
- Backend apoiado em Supabase para identidade e banco.
- API C# caso o benefício de manter a linguagem compense implantação e custo.

Esta lista registra caminhos, não garante compatibilidade, disponibilidade gratuita ou recomendação atual. **As cotas numéricas e condições de serviços citadas no histórico não foram revalidadas e não são adotadas como premissas.**

## Pesquisa necessária antes da escolha

Consultar documentação e preços oficiais vigentes e registrar data, links e resultado para cada candidato:

1. Gratuidade real para API, banco e autenticação no mesmo cenário.
2. Hibernação, expiração, limites de uso e exigência de cartão.
3. Persistência, transações e controle de concorrência.
4. Backup, restauração, exportação e exclusão de conta.
5. Região, latência e comportamento de primeiro acesso.
6. Compatibilidade do cliente Unity, tokens e renovação de sessão.
7. Observabilidade, proteção contra abuso e limite de gastos.
8. Custo e caminho de migração quando a cota acabar.

**Proposta:** executar uma prova pequena de login, invocação atômica e compra antes de comprometer o projeto com um provedor. O objetivo de custo zero não garante operação ilimitada nem elimina custos futuros de publicação ou arte.

## Autoridade do servidor — proposta

Servidor decide nascimento, slot, inventário, saldo, preços, recompensas e tempo relevante. Autenticar não basta: cada recurso precisa verificar dono. Nenhuma credencial administrativa ou segredo de servidor pode entrar no app ou repositório.

Para minigames, emissão de sessão e validação de resultados reduzem abuso, mas o cliente segue não confiável. Política de recompensas offline fica pendente; não prometer prevenção total de trapaça.

## Contrato conceitual de API — proposta

| Operação | Entrada essencial | Garantia |
| --- | --- | --- |
| Consultar estado | Sessão da conta | Somente dados autorizados |
| Invocar | Runa/opção, ID da operação | Limite de slots e resultado único |
| Cuidar | Personagem, ação, versão | Pré-requisitos e tempo válidos |
| Equipar | Item possuído, slot | Compatibilidade e propriedade |
| Comprar/vender | Oferta/item, quantidade | Débito/crédito e entrega atômicos |
| Aprender | Habilidade elegível | Pré-requisito e concessão únicos |
| Iniciar treino | Atividade e personagem | Sessão com prazo |
| Concluir treino | Sessão e resultado | No máximo uma recompensa |
| Excluir personagem | Alvo e confirmação | Política de vínculo aplicada |

Rotas, verbos, schemas, códigos de erro e provedor de login serão definidos após a escolha. Tokens não devem ser registrados em logs. Guardar somente dados pessoais necessários e planejar exclusão/exportação antes de abrir cadastro público.

## Dados e integridade

Tabelas ou coleções conceituais: contas, personagens, nascimento/invocações, necessidades, progressão, habilidades aprendidas, itens/inventário, equipamentos, carteiras, lançamentos, sessões de atividade, recompensas, pets e catálogos.

Definir unicidade de slots, chave de idempotência por conta/operação, IDs estáveis e versão otimista do estado. Backup precisa ter restauração testada; exportar catálogos e saves reduz dependência do provedor.

## Entrega da investigação

Uma decisão técnica curta com alternativa escolhida, motivos, limites verificados, custo esperado, plano de backup e critérios de saída. Nenhum serviço foi criado ou configurado nesta etapa de documentação.
