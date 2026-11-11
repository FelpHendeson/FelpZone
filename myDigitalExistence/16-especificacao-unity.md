# Especificação técnica Unity 2D — cliente Android

Versão 1.0 — 11/11/2026. **Status: contrato técnico proposto para implementação pelo agente**, sem criar cânone artístico. Atende [AGENTS](AGENTS.md), [governança](15-governanca-criativa.md), [plano mestre](12-plano-mestre.md) e [backlog](13-backlog-execucao.md).

## 1. Objetivo e limites

Construir cliente Unity 2D + C# que suporte: render de humanoide em peças; interação de cuidado; minigame de mana; RPG e inventário; navegação; ciclo mobile; persistência local DEV; integração online posterior. Deve rodar em Android e manter baixo custo de execução/edição num PC modesto.

A versão exata da Unity, template e aparelho Android devem ser descobertos no ambiente antes de instalar pacotes ou alterar configurações. **O usuário informou Unity instalado e Android visível na escolha de build**, não que SDK/NDK/JDK e APK tenham sido validados. Não fixar versão fictícia.

### Não autorizado tecnicamente por esta spec
Criar visual final, raça/classe/habilidade oficial, valores definitivos de game design, publicar na loja, adquirir plugins pagos, sobrescrever arte do usuário. Placeholder DEV_ONLY é permitido para integração.

## 2. Sequência de implantação na Unity (executar, não apenas documentar)

**G0.1 Diagnóstico**
1. Inspecionar versão Unity e licença em funcionamento; Git status, pasta de projeto se houver, módulos Android instalados, Console.
2. Se não existir projeto, criar projeto 2D leve dentro de myDigitalExistence/client (ou preservar localização existente; documentar escolha). A organização deve ser reproduzível e não tocar outros diretórios da FelpZone.
3. Configurar Visible Meta Files/Text serialization, Git ignore de diretórios regeneráveis; garantir arquivos .meta de cenas/scripts/arte.
4. Registrar Android: Editor > File > Build Profiles (ou Build Settings, conforme versão); checar Android Build Support, SDK, NDK, OpenJDK. Instalar apenas componentes exigidos, com autorização se uma instalação for necessária.
5. Criar cena mínima Bootstrap com fundo e texto de homologação, adicionar às cenas compiladas, criar Development Build APK, instalar no celular e registrar log/teste. Uma cena vazia que só roda no Editor NÃO cumpre G0.

**G1.1 Render**
6. Escrever abstrações de conteúdo e composição de sprites, carregar arte DEV_ONLY de origem permitida, criar personagem e prefab.
7. Renderizar idle; testar troca de cabelo/roupa/item sem reiniciar animações nem gerar frames dessincronizados.
8. Integrar sala/lar DEV_ONLY, interação por toque e UI adaptativa.
9. Testar apk novamente no Android alvo antes de grandes alterações.

**G2.1 Game loop**
10. Criar domínio sem dependência de MonoBehaviour: necessidades, progresso, relógio, efeitos.
11. Criar UI de cuidados com respostas visuais.
12. Criar Circuito de Mana com treinamento e pontuação.
13. Adicionar inventário, ganhos de desenvolvimento DEV_ONLY e persistência local de teste. Fechar um loop completo.
14. Só depois discutir backend no gate G3.

## 3. Organização do projeto — padrão de referência

~~~text
myDigitalExistence/
  AGENTS.md
  README.md, *.md
  client/
    Assets/
      Game/
        Art/
          Characters/
            DevOnly/
            Archetypes/
            Parts/
          Environments/
          Equipment/
          UI/
        Audio/
        Animations/
        Prefabs/
        Scenes/
          Bootstrap.unity
          CharacterSelection.unity
          Summoning.unity
          Home.unity
          ManaTraining.unity
        Scripts/
          Domain/
          Application/
          Infrastructure/
          Presentation/
            Character/
            Screens/
            UI/
            Input/
        Content/
          Definitions/
          DevOnly/
        Tests/
          EditMode/
          PlayMode/
    Packages/
      manifest.json
      packages-lock.json
    ProjectSettings/
  server/  # só após ADR de backend
~~~

Os caminhos de cena são nomes propostos para padronização técnica; se o projeto Unity já existir com outra estrutura, preferir migração consciente em vez de apagar cenas. Não versionar arquivos .unity por cópia binária; cenas/prefabs devem conservar GUIDs e .meta. Não mover assets durante trabalho com Unity aberta sem revisar referências.

## 4. Camadas e regras de dependência

| Camada | Contém | Pode depender de |
| --- | --- | --- |
| Domain | modelos imutáveis/mutáveis explícitos, invariantes, cálculos e políticas | bibliotecas .NET básicas e tipos próprios |
| Application | casos de uso, coordenadores de comandos, interfaces de gateways | Domain |
| Infrastructure | repositórios JSON DEV, HTTP, mapeamento DTO, relógio real, catálogo | Application/Domain |
| Presentation | MonoBehaviour, scene controllers, Canvas, SpriteRenderer, UI, áudio | Application, Domain DTOs de leitura |

- Domain NÃO usa UnityEngine, SceneManager, PlayerPrefs ou GameObject.
- ScriptableObjects são **definições de conteúdo** e configuração autoral; saves são snapshots/DTOs versionados e não alteram ScriptableObjects.
- MonoBehaviours recebem e exibem resultados de casos de uso; não calculam moeda, crescimento ou sorteio por conta própria.
- Pode usar interfaces/IClock/IRepository e factories simples; evitar um service locator global de dezenas de serviços, event bus sem rastreabilidade ou framework pesado de injeção.
- Se asmdefs ajudarem, criar Game.Domain, Game.Application, Game.Infrastructure, Game.Presentation, Game.Tests.EditMode, Game.Tests.PlayMode respeitando grafo acíclico. Primeiro validar compatibilidade com packages e runner de testes; asmdefs são engenharia, não dogma.
- Identificadores estáveis de dados são strings normalizadas; não usar nome de sprite ou enum ordinal como identidade persistida.

## 5. Inicialização e ciclo de vida

**Bootstrap**
- Monta os serviços mínimos: relógio, catálogo, save DEV/rede quando disponível, log, navegação.
- Verifica se existe perfil/sessão e informa status.
- Em G0/G1 carrega cenário DEV sem autenticação real.
- Em G3 reconcilia credenciais/estado antes de permitir transação econômica.
- Falhas nunca geram “novo personagem” automaticamente.

**Cenas e estado**
- SceneController gerencia transição; services/contexto de sessão vivem além de cada cena de maneira controlada.
- Personagem selecionado por ID, não por referência a GameObject destruído.
- Home renderiza estado e permite ações contextualizadas. Painéis de ficha, inventário e loja usam navegação simples e não duplicam regras.
- Minigame de Mana pode ter cena isolada para atualizar sem afetar Home; resultado aplicado por caso de uso, não diretamente pelo callback do botão.
- Carregamento, erro, retry e sucesso têm estados explícitos. Evitar “esperar eternamente” sem feedback.

**Mobile**
- Em OnApplicationPause/OnApplicationFocus: suspender interação e registrar estado de apresentação; no retorno, reconsultar relógio/estado e restaurar interface. Não assumir que o processo permanece vivo.
- Na versão online, ações monetárias pendentes devem ser reconciliadas pelo ID de operação, não repetidas como novas.
- Orientação e área segura (notch/insets) devem funcionar em layouts de teste; orientação final carece de aprovação de UX.

## 6. Input, interface e render

- Usar UI Canvas/RectTransforms/TextMeshPro ou solução nativa já presente no projeto; não depender de plugins pagos.
- Um sistema central de eventos de input por tela; não lançar comandos econômicos diretamente por cada OnClick sem guardas.
- Toques repetidos durante requisição: botão desabilitado/estado pending, porém a proteção verdadeira é no domínio/backend.
- Layout adaptável com safe area, tamanho legível, feedback de foco/seleção, controle por toque com mínimo de gestos obscuros.
- Personagem modular conforme [pipeline visual](18-pipeline-visual.md); separar componente de aparência de dados RPG.
- Animações e VFX não determinam nascimento nem concedem recompensas; são projeções do estado aprovado.
- Evitar Instantiate/Destroy repetidos a cada frame; animar transform/sprite existentes, usar pool somente após identificar gargalo.

## 7. Qualidade de código C# — regra de revisão

1. Um componente deve ter função clara; manter lógica em classes de domínio e aplicação.
2. Nomes expressivos em PascalCase para tipos/métodos/propriedades públicas, camelCase para locais/parâmetros e _camelCase para campos privados, sem abreviações opacas.
3. Não retornar null silencioso em erro de domínio; usar resultados tipados ou exceções de domínio tratadas no boundary.
4. Guard clauses, validações explícitas e mensagens contextualizadas; não engolir exceptions.
5. APIs assíncronas com Task e cancelamento quando apropriado; não usar async void fora de handlers que exijam void, com catch/log no limite.
6. Evitar alocação/JSON/parsing dentro de Update(); Update só quando necessário para animação/mecânica.
7. Nenhum magic number em domínio: configuração identificada por ID e catálogo de testes/produto.
8. Eventos de UI devem desinscrever em OnDisable/OnDestroy se registrados manualmente.
9. Usar logs estruturados/redigidos sem token ou informação sensível.
10. Testar casos limite, não apenas fluxo feliz.
11. Sem lock-in desnecessário em plugins não essenciais ou utilitários importados sem revisão.
12. Comentários descrevem invariantes e motivos; evitar repetir o óbvio da sintaxe.

## 8. Primeiro contrato técnico de cena

**Bootstrap.unity**
- AppRoot é responsável pela composição de dependências e roteamento.
- Canvas contém texto de build/dev e feedback de inicialização.
- Não criar usuário ou progresso real automaticamente.

**Home.unity DEV**
- RoomRoot: background neutro licenciado/temporário.
- CharacterRoot: visual base com componentes modular e animator/fame clock.
- HUD: barras/labels de necessidades, botões de cuidado, acesso a ficha/treino/loja.
- UIState: Loading/Ready/ActionPending/Error.
- Ações retornam resultados e atualizam todos os displays relevantes.

**ManaTraining.unity DEV**
- SessionPresenter recebe configuração neutra, pulso com estados NotStarted/Playing/Finished/Cancelled, entrada de toque e painel de resultado.
- Domain score separa simulação de animação e recompensa.
- Reexecutar cena não deve conceder uma segunda recompensa da mesma sessão.

## 9. Ferramentas de edição e CI

- Usar Git LFS somente para binários grandes se realmente necessário; documentar limites e instalação da ferramenta.
- Não editar scene/prefab YAML por texto quando a Unity aberta com interface autorizada puder produzir arquivo de forma segura; para automação headless, validar GUIDs e abrir cena após alterações.
- EditMode tests devem rodar no Test Runner. PlayMode tests validam integração. Um pipeline CI será definido quando houver projeto funcional.
- Revisar Console sem erros e referências Missing Script/Asset após operações de GUI.
- Registrar nome de versão Unity, build target, duração do build e dispositivo.
- Se o computador estiver lento, reduzir importações, limitar packages e fazer builds de engenharia ocasionais em vez de recompilar a cada mudança de documentação.

## 10. Definition of Done por gate

**G0**: cliente versionado, editor abre sem erro, APK mínimo instala e inicia no telefone real.
**G1**: 1 personagem DEV modular, idle, ao menos duas trocas de peças e quarto demonstrados em Android; pivôs e atlas verificados.
**G2**: cuidado e mana produzem estado previsível, ganhos local DEV não se duplicam, save recupera progresso após suspensão/reabertura.
**G3**: slots e resultados de invocação autoritativos, economia transacional, login e recuperação em segundo dispositivo, testes de replay/concorrência.
**G4**: critérios de [GDD](02-gdd-mvp.md) e [QA](19-ux-e-qa.md) demonstrados; conteúdo criativo necessário aprovado.

**Nenhuma data prometida**; arte de placeholder e dados de teste não representam conteúdo de produto.
