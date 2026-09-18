# Sistema 27 — Economia, comércio e propriedade

> **Estado:** implementado e consolidado nas Fatias 27.1 a 27.7.

## Objetivo

Permitir obter, trocar, vender e administrar bens de modo consistente, sustentando as fantasias de comerciante, artesão, proprietário e gestor sem criar uma economia global incontrolável.

## Implementação

A versão definitiva do schema é `schemaVersion: 21`. `GameState.economy` guarda carteiras em unidades inteiras, estoques finitos, direitos de propriedade e ações consumidas. Preços vêm da oferta declarada; a UI não envia valor. Vender um graveto, comprar a ferramenta de estoque 1 e receber o esconderijo da Clareira formam uma transação atômica por ação. Propriedade não é item nem lar.

## Objetivo

Permitir obter, trocar, vender e administrar bens de modo consistente, sustentando as fantasias de comerciante, artesão, proprietário e gestor sem criar uma economia global incontrolável.

## Decisões confirmadas

- O pack define moedas, unidades, mercados, comerciantes, ofertas e regras de propriedade.
- Compra, venda, troca, pagamento e transferência são transações atômicas.
- Preços são derivados de regras declaradas e contexto verificável; a UI não envia preço final.
- Estoques são finitos quando o conteúdo assim determina.
- Propriedade é um direito registrado sobre um alvo válido, separado da posse física de um item.
- A primeira versão não simula oferta e demanda de todo o mundo.
- Não existe moeda premium, dinheiro real ou monetização.

## Contrato conceitual

O conteúdo declara moedas, tabelas ou políticas de preço, mercados, carteiras permitidas, ofertas, taxas, contratos simples e tipos de propriedade. O estado registra saldos, estoques mutáveis, transações necessárias para auditoria, ofertas consumidas e direitos de propriedade.

Todos os valores usam representação inteira na menor unidade definida. Conversões e arredondamentos seguem regra explícita do pack.

## Integrações

- **Itens, inventário e crafting:** mercadorias e produção.
- **Profissões:** acesso a mercados e serviços.
- **NPCs e relações:** comerciantes, negociação e confiança.
- **Organizações:** tesouros e permissões futuras.
- **Tempo:** validade, reposição e contratos.
- **Bases e assentamentos:** imóveis, armazenamento e projetos.

## Primeiro ciclo jogável

O jogador vende um material coletado, compra uma ferramenta de estoque limitado e adquire ou recebe o direito de usar um pequeno espaço. Saldos, itens, estoque e propriedade mudam juntos ou não mudam.

## Fatias propostas

1. Moedas, valores inteiros e validação.
2. Carteiras, estoques e persistência.
3. Compra, venda e troca atômicas.
4. Políticas de preço, taxas e reposição temporal.
5. Propriedade, uso, transferência e contratos simples.
6. Mercado mobile e confirmação clara de transação.
7. Jornada comerciante e testes de conservação de valor e itens.

## Critérios de aceite

- Nenhuma transação cria ou apaga valor ou item sem efeito declarado.
- Saldo, estoque e inventário nunca ficam parcialmente atualizados.
- Valores negativos, overflow, moeda desconhecida e propriedade inválida são rejeitados.
- Repetir a mesma confirmação não duplica uma compra.
- O motor aceita várias moedas e políticas sem regra específica por campanha.
- Preço e disponibilidade exibidos correspondem à mesma versão validada da oferta.

## Fora do escopo inicial

- bolsa de valores;
- inflação global simulada;
- mercado online;
- leilões em tempo real;
- empréstimos complexos e juros compostos;
- monetização com dinheiro real.
