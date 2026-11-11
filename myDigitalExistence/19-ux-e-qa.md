# Especificação funcional de interface e QA — Android

Versão 1.0 — 11/11/2026. Define comportamento técnico e aceites; **direção artística, orientação definitiva, catálogo e números de economia permanecem decisões criativas**.

## 1. Padrão de telas e estados

Cada tela deve expressar os estados Loading, Ready, ActionPending, Empty, ErrorRecoverable e Fatal/Blocked quando relevantes. Mostrar erros recuperáveis sem resetar progresso. Toda ação com alteração de estado precisa feedback visível, bloqueio temporário para reentrância e opção de consultar estado após timeout.

Componente de estado comum:
- IsLoading, IsProcessing, LastErrorCode, LastOperationId;
- Exibição não pressupõe operação concluída até retorno confirmado;
- Não fazer spawn, compra ou recompensa em OnEnable/Start após retorno a uma tela;
- Carregamento de telas não deve disparar side effects econômicos.

As telas podem ser Scenes ou Panels conforme custo; implementação deve usar navegação centralizada, e não chamadas cruzadas arbitrárias entre MonoBehaviours.

## 2. Fluxo de telas do MVP

### A. Bootstrap e entrada
Objetivo: abrir app em estado íntegro, verificar configurações/cache/sessão; UI fornece login/recuperação quando online. Durante G0–G2: banner DEV_MODE e perfil local artificial.
- Falha de rede: explicar que login precisa conexão e oferecer tentativa novamente.
- Sessão inválida: voltar ao login sem mostrar dados privados da conta anterior.
- Não criar novo save se um snapshot existente estiver temporariamente indisponível.

### B. Seleção de personagem
Até três slots humanoides, ocupados/vagos. Ocupado apresenta nome, aparência resumida e progresso quando disponível. Vago oferece invocação. **Quarto slot não existe**.
- Ao tocar ocupado: selecionar e entrar no lar.
- Ao tocar livre: altar de runa.
- Exclusão exige ação deliberada e confirmação; política de itens/pets continua pendente e deve bloquear implementação destrutiva até definida.
- Slots não podem ser usados como array instável de índice após exclusão.

### C. Altar de invocação
Requisito visual: runa gravada em pedra com brilho azul; demais detalhes de arte serão definidos juntos. Mostrar opções disponíveis conforme catálogo. Confirmar runa, gerar resultado único no backend e revelar ao usuário.
- O resultado não é sorteado durante a animação.
- Se falha de rede após confirmar, consultar operação pendente; jamais rolar de novo automaticamente.
- Mostrar raça/elemento/core (quando esses conteúdos forem criados/aprovados) e permitir prosseguir.
- Conteúdo de DEV mostra rótulo DEV_ONLY, sem universo inventado.

### D. Lar/vida virtual
A personagem ocupa o centro da experiência. HUD acessa necessidades, interação, ficha, treino, inventário e loja. Ações de cuidado:
- selecionar ação;
- validar elegibilidade;
- apresentar animação/feedback;
- atualizar estado confirmado;
- apresentar mensagem em caso de restrição.

Não exigir que o personagem ande autonomamente para que a primeira versão seja divertida. Autonomia avançada só entra após validação criativa.

### E. Treino de mana
- Introdução tutorial reproduzível;
- iniciar sessão e configurar regras do treino;
- HUD com indicador de pulso, área de precisão, número de tentativas, botão/gesto;
- feedback de precisão sem depender exclusivamente de cor;
- conclusão, interrupção, expirado ou resultado;
- painel do resultado com score e recompensas confirmadas;
- se retornar depois de fechar o jogo, não conceder duas vezes.

Parâmetros de dificuldade, regra de qualidade da mana e recompensas serão cocriados; desenvolvimento pode usar dados DEV.

### F. Ficha e progressão
Separar:
- identidade/nascimento (origem, raça, elemento, core);
- classe/caminho (escolha conforme regras ainda abertas);
- atributos permanentes e modificados;
- habilidades por categoria;
- necessidades e propriedades de mana.

Indicadores precisam explicar base vs bônus e evolução por ação. Nenhuma habilidade não aprovada deve aparecer como catálogo oficial.

### G. Inventário e equipamento
Mostra objetos possuídos, filtros simples, detalhe do item e compatibilidade. Ao equipar: feedback, atualização visual e recálculo sem acumular stats. Item inválido mostra motivo. Venda de item equipado só depois da política correspondente aprovada.

### H. Loja e economia
Moeda interna, ofertas, preço do catálogo, confirmação de compra/venda, saldo atualizado. Cliente não pode impor preço nem quantidade de recompensas. Desabilitar clique repetido melhora UX, mas não substitui idempotência de backend.

### I. Configurações e conta
Opção de áudio, informações de versão e sessão, sair da conta e acesso às práticas de dados quando houver cadastro público. Não enviar credenciais para analytics ou logs.

## 3. Interface técnica e acessibilidade

- Safe area para notch, barras do sistema e áreas reservadas.
- Layout escalável a resoluções e proporções distintas; registrar orientação escolhida criativamente, não assumir portrait como decisão final.
- Alvos de toque confortáveis para dedos, espaçamento e hierarquia visual nítida.
- Ícones acompanhados de texto ou descrições em fluxos críticos.
- Informações de fome, sono, saúde, mana e higiene não dependem só de cor.
- Feedback de input mesmo quando ação é negada; loading visível e cancelamento quando seguro.
- Animação e flashes mágicos não devem comprometer leitura; contemplar redução de efeitos se testadores relatarem incômodo.
- Idioma inicial de documentação e telas pode ser pt-BR como proposta; arquitetura deve permitir localização futura.
- Não requer telas polidas completas antes de G1: interface DEV só precisa permitir observação e teste.

## 4. Máquina de estados das telas

Proposta de ViewState por feature: Idle → Loading → Ready → Submitting → Ready/Error → Recovering → Ready.

Regras:
1. Nunca iniciar a mesma mutação automaticamente ao trocar de cena.
2. Manter OperationId enquanto aguarda resultado, inclusive após timeout.
3. Mensagem de sucesso exige confirmação de estado; animação não significa transação concluída.
4. Em erro transitório, permitir reconsulta antes de reenviar.
5. Após logout, limpar estado sensível em memória.
6. Na ausência de assets/definições, mostrar placeholder seguro e log; não crashar nem fabricar conteúdo.

## 5. Checklist de aceitação por cenário

| Caso | Ação | Esperado |
| --- | --- | --- |
| UX-001 | Abrir com save local válido | restaura sem duplicar efeitos |
| UX-002 | Voltar ao app após suspensão | tela íntegra, tempo aplicado uma vez |
| UX-003 | Trocar cabelo/item em animação | sprite sincronizado, sem flicker |
| UX-004 | Iniciar treino e cancelar | sem recompensa confirmada indevidamente |
| UX-005 | Repetir conclusão da sessão | no máximo uma recompensa |
| UX-006 | Abrir 3 slots ocupados | opção de nova invocação bloqueada |
| UX-007 | Perder conexão na invocação | sem reroll automático, resultado reconciliado |
| UX-008 | Fazer compra sem saldo | erro legível, sem débito/item |
| UX-009 | Item incompatível | erro, aparência/progressão preservadas |
| UX-010 | Usar conta B para consultar personagem A | acesso negado |
| UX-011 | Abrir em tela menor/proporção distinta | sem botões cortados ou textos ilegíveis |
| UX-012 | Modo avião | explica limitações, não entrega moedas offline |
| UX-013 | Pressionar compra duas vezes rapidamente | no máximo um pedido efetivo |
| UX-014 | Atualizar catálogo após nascimento | personagem preserva origem e evolução |
| UX-015 | Deslogar | não exibe dados privados da sessão antiga |
| UX-016 | Corromper JSON de teste | tratamento recuperável, sem apagar silenciosamente |

Os casos online são **não aplicáveis** para G1/G2; não marcá-los “passou”. Ver também [matriz de QA](14-qualidade-validacao.md).

## 6. Testes automatizados e evidência manual

**EditMode:** domínio puro, necessidades com relógio fake, cálculos de stats, compatibilidade, transações locais, migração/salvamento e score de mana.

**PlayMode:** cenas carregam, UI transmite ações corretas, animação sincronizada com peças, trocar equipamento, retorno da tela de minigame e estado Pending/Error.

**Android real:** instalar APK, interagir com 1 mão, testar tamanho de tela, alternar app e retomar, usar sem internet quando aplicável, observar performance/FPS/memória, demonstrar troca modular em vídeo ou screenshots.

Registrar:
~~~text
Build/version/commit:
Unity Editor:
Dispositivo / Android / resolução:
Gate / casos:
Resultado: Passed / Failed / Blocked / NotApplicable
Erros Console/Logcat:
FPS e memória (quando medidos):
Evidência:
Responsável e próximo passo:
~~~

**Não inventar medições ou simular que teste físico ocorreu.**

## 7. Critérios de qualidade e release

- Console sem erros críticos e prefab sem Missing Script.
- Navegação sem travamento ou perda de estado.
- Ações importantes com mensagens de erro claras.
- nenhum saldo negativo, duplicação de personagem/recompensa ou sobrescrita cross-account.
- visual modular fiel à especificação aprovada, legível em aparelho alvo;
- app abre e retorna após interrupção;
- licença dos assets rastreável;
- changelog e commit identificável;
- rollback e versão anterior recuperáveis se release falhar.

## 8. Dependências de aprovação criativa

Orientação visual, animações finais, cor/estética, aparência, interação emocional, sons, lista de equipamentos, conteúdo das runas, taxa de necessidades, trajetória RPG e economia definitiva devem ser aprovados pelo criador. O agente pode prototipar layout com placeholders, submeter amostra de arte e então implementar refinamentos.
