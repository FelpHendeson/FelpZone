# Instruções para o agente codificador

Antes de implementar, leia o `README.md` e todos os documentos em `docs/`.

## Objetivo atual

A Fase 2 — consolidação do motor — está concluída. As etapas 1 a 6 da evolução sandbox e as Fatias 7.1 a 7.5 estão implementadas. O marco mínimo do Sistema 7 foi atingido: o jogador encontra a criatura e Mira por uma ação no mundo e retorna ao sandbox.

Os Sistemas 1 a 12 estão implementados e consolidados. O Sistema 12 — Banco de ações e combate — entrega combate por turnos determinístico integrado ao mundo, reutilizando as habilidades do Sistema 11. As Fatias 12.8 a 12.12 consolidam descoberta, vitalidade persistente, tempo, consequências e apresentação. Leia [Sistema 12](docs/SYSTEM-ACTION-COMBAT.md) e [Consolidação do Sistema 12](docs/SYSTEM-12-CONSOLIDATION.md).

O Sistema 13 — Progressão por prática e recompensas do Sistema — está **especificado, mas não implementado**. Leia [Sistema 13](docs/SYSTEM-PRACTICE-PROGRESSION.md) antes de propor código. Ele conecta treino e vitórias verificadas a proficiências e marcos, preserva o schema 7 no primeiro recorte e não autoriza equipamentos, loot, Jardim ou fórmulas definitivas. A especificação não autoriza implementação sem uma ordem posterior do autor.

O Sistema 11 — Núcleo do Sistema, Eteris, Númen e Progressão — está **implementado e consolidado nas Fatias 11.1 a 11.7** nos módulos `energetics`, `skills`, `training` e `system-interface`: vocabulário energético, catálogos validados, `GameState.system` no schema 7, ação de treino com custo temporal único, Árvore de habilidades com sigilo e a aba mobile `Sistema`. Leia [Sistema 11](docs/SYSTEM-ETERIS-NUMEN-PROGRESSION.md), [Estado, metas e horizonte](docs/PROJECT-STATUS.md) e [Roadmap](docs/ROADMAP.md) antes de propor código. Números, nomes e conteúdo de habilidades são protótipos. O combate já reutiliza os contratos públicos do Sistema 11, mas fórmulas e balanceamento definitivo continuam sem aprovação.

A interface jogável foi consolidada sob o princípio **aventura primeiro, dados sob demanda**. A navegação persistente possui quatro destinos — `Mundo`, `Jornadas`, `Mochila` e `Sistema` — enquanto ações locais aparecem em um painel contextual. Preserve essa hierarquia e consulte [Consolidação de UI/UX](docs/UI-UX-CONSOLIDATION.md) antes de acrescentar novas superfícies.

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
- O contrato de combatente do Sistema 12 não equivale oponente a monstro: pessoas e criaturas compartilham o mesmo contrato, diferindo apenas por conteúdo.
- Preserve as Fatias 12.8 a 12.12: revele ameaças somente por pré-requisitos declarativos, derive a vitalidade do jogador da `saude` atual e persista somente um resultado terminal verificável.
- Um confronto completo cobra o tempo exatamente uma vez no desfecho; turnos individuais nunca avançam o relógio.
- Vitória, derrota ou fuga devem formar uma única transação de mundo. React não calcula nem aplica consequências persistentes.
- No futuro Sistema 13, prática só poderá nascer de treino validado ou resolução de combate reproduzida; não aceite proficiência, nível, marco ou recompensa informados pela UI.

## Entrega esperada

- implementação limitada à etapa explicitamente autorizada;
- integração por contratos com o motor já consolidado;
- testes automatizados para cada nova regra;
- documentação atualizada para refletir apenas contratos implementados;
- nenhuma chave, segredo ou dependência de rede durante a partida.

Quando houver ambiguidade, preserve a modularidade e escolha a menor solução capaz de validar a experiência.
