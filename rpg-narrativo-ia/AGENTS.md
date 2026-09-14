# Instruções para o agente codificador

Antes de implementar, leia o `README.md` e todos os documentos em `docs/`.

## Objetivo atual

A Fase 2 — consolidação do motor — está concluída. As etapas 1 a 6 da evolução sandbox e as Fatias 7.1 a 7.5 estão implementadas. O marco mínimo do Sistema 7 foi atingido: o jogador encontra a criatura e Mira por uma ação no mundo e retorna ao sandbox.

Os Sistemas 1 a 10 estão implementados e consolidados. O Sistema 10 — Objetivos, jornadas e registro de descobertas — entrega domínio, schema 6, sincronização após ações e escolhas narrativas, diário mobile e a jornada jogável `Primeiros passos`.

O Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão — está **aprovado para especificação e roadmap; a Fatia 11.1 está implementada** nos módulos isolados `energetics`, `skills` e `training` (catálogos e validação, sem tocar em `GameState`, schema, relógio, campanha ou UI). Leia [Sistema 11](docs/SYSTEM-ETERIS-NUMEN-PROGRESSION.md), [Estado, metas e horizonte](docs/PROJECT-STATUS.md) e [Roadmap](docs/ROADMAP.md) antes de propor código. As Fatias 11.2 em diante não podem ser executadas sem autorização explícita. Combate tem uma direção conceitual de banco de ações, mas continua sem sistema numerado, fórmulas ou implementação aprovada.

## Regras obrigatórias

- Use React, TypeScript e Vite.
- Priorize telas de celular e valide também em desktop.
- Mantenha regras do jogo fora dos componentes React.
- Modele campanhas e eventos como dados; não codifique a história diretamente na interface.
- Não adicione API de IA, backend, login, telemetria ou serviço pago.
- Não use imagens finais. Crie placeholders locais com proporção e identificação do uso futuro.
- Cada módulo deve expor tipos e funções públicas sem acessar internamente outro módulo.
- Prefira funções puras para condições, escolhas e efeitos.
- Salve uma versão do esquema junto com a partida para permitir migrações futuras.
- Inclua testes para regras e efeitos centrais.
- Não expanda facções, assentamentos, combate complexo ou geração procedural além do exigido pelo MVP.
- Trate dados persistidos e conteúdo de campanha como entradas não confiáveis e valide-os nas fronteiras.
- Toda nova garantia do motor deve possuir teste automatizado que falhe sem a correção.
- Preserve os rótulos de decisão de `docs/PROJECT-STATUS.md`: hipótese de agente não é requisito de produto.
- O motor narrativo será uma camada acionada pelo mundo; não deve permanecer como único loop de jogo.
- Preserve autoria de mapas em JSON hierárquico e navegação somente entre pai, filhos diretos e irmãos.
- Mantenha exploração, coleta e crafting como sistemas distintos, conectados por contratos.
- Cada local explorável possui progresso próprio; conclusão de zona é uma métrica agregada separada.
- Recursos renováveis possuem estado e tempo de recuperação; coleta nunca cria materiais infinitos.
- Trate o Sistema como interface diegética: menus e mensagens podem ser percebidos pelo personagem, mas regras continuam fora do React.
- Preserve a distinção conceitual: Eteris é energia ambiental; Númen é Eteris interiorizado e individualizado por um ser vivo.
- Não invente atributos, fórmulas de nível, curvas, velocidade de conjuração, regras de fusão, raças ou consequências de combate.
- Separe catálogos de habilidades, personagens e campanhas do estado persistido; prefira dados declarativos validados e nunca código executável em JSON.
- O cânone atual garante Sistema a todos os humanos. Protagonista não humano, raças não humanas concretas e Sistema universal para todos os seres permanecem em discussão.
- O futuro contrato de combatente não deve equivaler oponente a monstro, mas não implemente combate dentro do Sistema 11.

## Entrega esperada

- implementação limitada à etapa explicitamente autorizada;
- integração por contratos com o motor já consolidado;
- testes automatizados para cada nova regra;
- documentação atualizada para refletir apenas contratos implementados;
- nenhuma chave, segredo ou dependência de rede durante a partida.

Quando houver ambiguidade, preserve a modularidade e escolha a menor solução capaz de validar a experiência.
