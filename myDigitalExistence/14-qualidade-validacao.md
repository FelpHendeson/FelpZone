# Qualidade, testes, segurança e entregas Android

> Revisão 1.0 — 11/11/2026 | Estado: plano de verificação proposto, ainda sem testes executados.

## 1. Princípio de validação

Não basta “rodar no Editor”. A prova técnica existe quando um APK inicia, a interface é utilizável e o estado é consistente em um Android de referência. Não afirmar compatibilidade com versões, resoluções ou GPUs não testadas. Os critérios abaixo complementam [GDD](02-gdd-mvp.md) e [plano mestre](12-plano-mestre.md).

## 2. Pirâmide de testes para Unity

**EditMode (automático, rápido):**
- Funções puras de necessidades: limites, ausência prolongada, relógio regressivo e valores inválidos.
- XP e level-up: limiares, múltiplos níveis, limites e nenhuma repetição indevida.
- Cálculo de atributos: base + equipamento + efeitos e remoção determinística dos bônus.
- Compatibilidade de item/arquétipo/slot.
- Regras de custo e conversão, usando dados simulados.
- Serialização versionada e migração de snapshots, sem perda silenciosa.

**PlayMode (integrado):**
- Troca de peça durante animação e retorno ao estado padrão.
- Troca de cena e destruição/recriação de objetos sem efeito fantasma.
- Input de toque e UI, acionamento único por toque, feedback.
- Minigame de mana: sucesso, erro, interrupção e retorno.
- Retomar aplicativo após suspensão e orientação definida.

**API/contrato (quando houver backend):**
- Login, expiração, revogação e renovação de sessão.
- Isolamento de dados por conta/personagem e invalidação de propriedade.
- Transações, rollback e unicidade de operações.
- Versionamento de estado, retry, idempotência e respostas a timeout.
- Falha de banco/conexão com recuperação e sem concessão dupla de moeda.
- Regras temporais baseadas em hora confiável.

**Exploratório em dispositivo:**
- UX, diversão, tamanho de toque e legibilidade.
- Animações sem glitches em diferentes velocidades e equipamentos.
- Consumo, aquecimento, travamento e retorno após alternar aplicativos.
- Comportamento com internet lenta/intermitente, dados móveis e modo avião.

## 3. Matriz de testes de maior risco

| ID | Cenário | Resultado esperado |
| --- | --- | --- |
| T-001 | Criar personagem com 2 slots livres | ocupa somente um slot |
| T-002 | Criar quarto personagem | rejeita sem apagar personagem existente |
| T-003 | Duas requisições simultâneas na última vaga | no máximo uma criação efetiva |
| T-004 | Repetir invocação com mesma chave | retorna resultado anterior |
| T-005 | Fechar app durante reveal | ao retornar, exibe nascimento já salvo, sem novo sorteio |
| T-006 | Trocar armadura no frame intermediário | peças mantêm alinhamento e animação |
| T-007 | Equipar item incompatível | bloqueia/explica, sem estado parcial |
| T-008 | Salvar e reabrir com itens equipados | atributos corretos, sem bônus empilhados |
| T-009 | Avançar tempo simulado em 24h | limites de necessidades respeitados |
| T-010 | Alterar relógio local | não acelera ganhos online |
| T-011 | Toques repetidos no botão de recompensa | no máximo uma concessão |
| T-012 | Desconectar durante compra | estado reconciliado, sem saldo/item duplicado |
| T-013 | Vender item equipado | regra prevista aplicada sem perder consistência |
| T-014 | Requisição usando ID de outro jogador | negada, sem vazamento de dados |
| T-015 | Reabrir no segundo aparelho | progresso coerente e conflitos tratados |
| T-016 | Minigame sem tocar | erro/resultado consistente, sem recompensa acima do limite |
| T-017 | Falha de serviço/erro 5xx | feedback e retry controlado sem ação duplicada |
| T-018 | Tentar treinar sem recursos mínimos | mensagem clara e caminho de recuperação |
| T-019 | Excluir humanoide com pet (futuro) | política explícita e aplicada atomicamente |
| T-020 | Atualizar catálogo após nascimento | características antigas preservadas |
| T-021 | Android suspende processo | reentrada sem telas quebradas |
| T-022 | Usuário desloga com sessão antiga em memória | dados privados não reaparecem |

Para testes ainda não implementados, marcar **N/A por escopo** em vez de “passou”.

## 4. Critérios de qualidade visual

- Um único sistema de coordenadas e pivôs validado para o arquétipo.
- Nenhum vazamento de sprites por cima/por baixo em poses de teste.
- Texto, barras e efeitos distinguíveis sem depender só de cor.
- Escala pixel art consistente e sem blur inesperado em dispositivo real.
- Feedback visual/sonoro das ações e possibilidade de desativar sons.
- Personagem continua expressivo com inventário vazio ou item inválido.
- Fallback coerente para sprite ou catálogo ausente.

**P:** teste de combinações representativas por matriz (direção × animação × cabelo × roupa × item), automatizando validações de arquivo/slot e conferindo visualmente exemplos de cada tipo. Não testar somente o sprite base.

## 5. Performance e estabilidade

Registrar a cada gate:
- aparelho/modelo, Android, resolução e taxa de atualização;
- Unity Editor, configuração de build e backend de scripting;
- FPS médio e piores quedas relevantes durante animações e transições;
- memória usada, picos de GC e tempo de carregamento;
- duração de build e tamanho do APK;
- travamentos, erros relevantes do log e motivo provável.

**ABERTO:** valores mínimos/máximos aceitos e conjunto de aparelhos. Defini-los após baseline real. Não importar assets ou packages pesados sem revisar impacto no PC do desenvolvedor e no smartphone.

## 6. Segurança e privacidade

- Nunca confiar em moeda, custo, origem sorteada, posição de slot ou tempo enviados pelo cliente.
- Tokens autenticados com expiração; segredos de backend fora do APK e do Git.
- Autorização por recurso: todo personagem/pet/item pertence ao solicitante.
- Compras e concessões atômicas e idempotentes; logs de operação sem credenciais.
- Bloquear repetição, abuso de taxa e resultados implausíveis; reconhecer limites de anticheat no cliente.
- Definir coleta mínima, finalidade, exclusão/exportação, retenção e contato de suporte antes do cadastro público.
- Planejar backups regulares, restaurar em ambiente seguro e registrar o resultado.
- Ao distribuir para público, revisar políticas e requisitos Android/loja vigentes (versão alvo, permissões, privacidade e assinatura).

## 7. Empacotamento Android

**Gate técnico inicial:**
1. Confirmar instalação de Android Build Support, SDK, NDK e OpenJDK pelo Unity Hub.
2. Verificar package identifier e orientação inicial; selecionar cena de teste.
3. Executar build de desenvolvimento.
4. Instalar o APK no dispositivo autorizado e abrir o jogo.
5. Registrar resultado, logs de erro e configuração exata.

Para distribuição formal, preparar assinatura, armazenamento seguro da chave e Android App Bundle quando exigido pela loja. Não compartilhar keystore nem suas senhas. Nunca incluir chaves no repositório. Não assumir que basta o APK rodar localmente para atender a uma loja.

## 8. Definition of Done (DoD)

Um item só está **CONCLUÍDO** quando:
- comportamento exigido implementado sem hardcode incompatível com expansão planejada;
- cenários de sucesso, falha e interrupção verificados;
- evidência anexada (commit, teste, screenshot ou registro);
- nenhuma regressão crítica conhecida;
- performance aceitável no dispositivo testado ou desvio registrado;
- documentação e changelog atualizados;
- claro o que ficou de fora e por quê.

Um MARCO só é concluído quando todos os seus bloqueadores P0 passaram. Arte, interface e backend precisam funcionar juntos no fluxo real.

## 9. Esquema de versões e incidentes

- 0.0.x: protótipos internos de infra/arte e loop.
- 0.1.0: primeiro MVP online, somente após G4.
- 0.1.1: correções sem alterar promessa principal.
- 0.2.0: novo conjunto coerente de funcionalidades.
- Versão de catálogo/dados deve ser controlada separadamente da versão do app.

Para bug crítico: registrar reprodução → causa → teste de regressão → correção → validação Android → nova versão. Não esconder correção entre marcos.

## 10. Modelo de relatório de teste

~~~text
Versão:
Build/commit:
Unity:
Android/dispositivo:
Gate/item:
Cenários executados:
Passou/Falhou/Bloqueado/N/A:
FPS/memória/tamanho:
Bugs/gravidade:
Evidências:
Ação seguinte:
~~~

## 11. Estado atual

Ainda não foram executados os testes desta matriz nem gerado APK verificado nesta documentação. O Unity foi declarado instalado e a opção Android foi vista no menu; o primeiro teste necessário é ENV-05 (APK de cena mínima) após preparar e abrir o projeto.
