# Arquitetura Unity e persistência

**Decisão:** cliente Unity 2D + C#. Todo desenho abaixo é proposta de implementação, ainda sem código.

## Fronteiras

| Camada | Responsabilidade |
| --- | --- |
| Apresentação Unity | Cenas, UI, sprites, som, animações e entrada |
| Aplicação | Casos de uso: cuidar, equipar, invocar e concluir treino |
| Domínio C# | Modelos e regras locais de simulação sem dependência de cenas |
| Infraestrutura | Rede, sessão, cache, relógio e persistência |
| Backend | Identidade, estado autorizado, economia e validações |

O núcleo C# facilita testes sem abrir cenas, mas não implica compartilhar binário com um backend em outra linguagem. Se houver regras equivalentes em duas linguagens, manter exemplos de contrato e servidor como fonte autorizada.

## Estrutura futura sugerida

```text
myDigitalExistence/
  [documentos atuais]
  client/                    # futuro projeto Unity
    Assets/Game/
      Presentation/
      Application/
      Domain/
      Infrastructure/
      Content/
      Art/
    Packages/
    ProjectSettings/
  server/                    # somente após escolher backend
```

Essa árvore não foi criada. Não versionar caches, builds e pastas geradas da engine. Fixar versão do Editor e dependências ao iniciar o projeto, com instruções reproduzíveis no README.

## Cenas e conteúdo — proposta

Bootstrap inicializa sessão e serviços. Seleção/altar, lar e minigame podem ser cenas ou telas coordenadas conforme a prova de conceito. Evitar espalhar regras econômicas em componentes visuais.

Definições de runas, itens, raças, classes e habilidades usam IDs estáveis e versão. ScriptableObjects podem editar conteúdo no cliente; dados de execução do jogador não devem ser gravados neles como save. O catálogo econômico autorizado reside no servidor, com cópia compatível no cliente.

## Estado e persistência propostos

- Conta: identificador e preferências.
- Personagem: dono, slot, nascimento, aparência e versão.
- Progressão: nível, XP, atributos, classe, habilidades e proficiências.
- Necessidades: valores, efeitos e instante de avaliação.
- Equipamentos: instância e slot; inventário e carteira com dono explícito.
- Pet: identidade, vínculo, necessidades e evolução.
- Operações: invocação, atividade, recompensa e lançamento econômico.

Separar definição do catálogo, instância possuída e estado mutável. Snapshot de nascimento não substitui progresso atual.

## Rede e sincronização

**Proposta inicial:** MVP online para operações valiosas. Cache permite mostrar último estado com indicação de desatualização, sem conceder moedas locais. Protótipo local usa armazenamento de desenvolvimento separado, sem conversão automática em saldo online.

Cliente usa HTTPS, tempo limite, repetição limitada e IDs idempotentes para comandos. Servidor responde com versão do estado; conflitos exigem buscar estado atual, não sobrescrever com save antigo. Começar com uma sessão de mutação ativa por conta é uma opção a decidir.

## Ciclo mobile

Salvar estado local de apresentação ao suspender; ao retomar, atualizar sessão e estado remoto. Não assumir que o processo permaneceu vivo. Animações são reconstruíveis a partir do estado, sem executar novamente compra ou invocação.

## Desempenho e desenvolvimento

**Proposta:** sprites pequenos, atlas e efeitos contidos; medir no aparelho real, manter escopo de cenas curto e evitar dependências pesadas sem necessidade. Orçamento de memória, FPS e tamanho do app depende do Android alvo ainda pendente.

Validar cedo tempo de abertura, importação e build. Separar teste visual Unity da edição de documentos e catálogos.
