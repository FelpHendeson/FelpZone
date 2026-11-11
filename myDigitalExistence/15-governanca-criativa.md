# Governança criativa e técnica — myDigitalExistence
Versão 1.0 — 11/11/2026

## 1. Acordo confirmado
O usuário será diretor criativo e coprojetista das mecânicas. Eu/agentes colaboramos com ideias, explicações, propostas e consequências, mas ele aprova a identidade final de **raças, classes, elementos, habilidades, aparência dos corpos, partes customizáveis, equipamentos, pets, mundo e regras conceituais da experiência**.

Técnica é responsabilidade autônoma do agente: especificar implementações, escrever e revisar código, operar Unity autorizada, criar testes, configurar Android, organizar arquivos, depurar e propor escolhas de engenharia. **Não solicitar aprovação para detalhes técnicos rotineiros.**

## 1.1 Autorização adicional para o conteúdo inicial

Em 11/11/2026, o criador autorizou a elaboração de **descrições concretas** para bases de personagens, opções comuns de aparência, raças, classes, núcleos e equipamentos de entrada — inspirados em diversos universos, mas originais — para viabilizar uma V1. Por isso, o agente pode produzir e implementar o pacote especificado nos documentos 22–26 como **CANDIDATO_JOGAVEL**, sem consultas para cada detalhe técnico ou sprite provisório.

Este estado não equivale a APROVADO: o criador mantém a palavra final sobre direção criativa, lore, visuais definitivos, habilidades definitivas, economia, expansão do catálogo e balanceamento. Quando o pacote for apresentado em uma build, ele poderá revisar/ajustar conteúdo antes de lançamento. Conteúdo novo **fora do pacote** ainda exige criação conjunta, salvo novos pedidos explícitos do criador.

Ampliação da sequência de status: IDEIA → PROPOSTA → **CANDIDATO_JOGAVEL (autorizado apenas para a base descrita)** → REVISADO → APROVADO → EM IMPLEMENTAÇÃO/VALIDADO conforme contexto. O status de execução técnica não promove status criativo automaticamente.

## 2. Matriz de autonomia
| Área | Agente decide sozinho? | Limite |
| --- | --- | --- |
| Arquitetura C#, scenes, prefabs, serviços, testes, logging | Sim | Respeitar o que já foi implementado e specs |
| C#/Unity tooling, build, otimização e correções | Sim | Sem alterar assets autorais ou apagar dados |
| Nomenclatura técnica, estilo de código e dependências justificadas | Sim | Código legível, manutenção e licença |
| Navegação prototipada com placeholders DEV_ONLY | Sim | Não vender mockup como arte aprovada |
| Customização visual, base corporal, proporções e direção artística | Não | Criar conjuntamente |
| Raças, classes, elementos, habilidades e pets concretos | Não | Conceber e aprovar conjuntamente |
| Runas, significado, raridades, probabilidades e regras de nascimento | Não | Conceber e aprovar conjuntamente |
| Regras conceituais de mana, necessidades, evolução e minigames | Não | Contratos técnicos podem ser feitos antes |
| Preços, chances, recompensa, monetização e balanço definitivo | Não | Testes com dados fictícios são permitidos |
| Contrato técnico de dados, autenticação, validação, persistência | Sim | Custos/segurança e privacidade precisam ser respeitados |
| Gastar dinheiro, publicar publicamente, apagar dados | Não | Autorização explícita para efeito externo |

## 3. Estados de conteúdo
IDEIA → PROPOSTA → EM DISCUSSÃO → APROVADO → EM IMPLEMENTAÇÃO → VALIDADO. SUBSTITUÍDO indica decisão antiga. Proposta em documento, exemplo de código ou imagem NÃO é aprovação. Registre aprovação expressa, data, responsável e arquivos afetados em 11-decisoes-pendencias.md. Na ausência dessa evidência, use abstrações e placeholders.

## 4. Como não bloquear a execução
1. Ao encontrar decisão criativa em aberto, separá-la do contrato técnico.
2. Implementar componentes, serviços e dados parametrizáveis sem escolher conteúdo definitivo.
3. Se necessário testar, usar IDs dev_* e conteúdo neutro DEV_ONLY que não integre catálogo de produção.
4. Descrever duas ou três propostas para debate com o usuário, sem consultas repetidas sobre detalhes de implementação.
5. Após aprovação, transformar definição em ficha canônica, configurar catálogo e testar consequência.
6. Quando alterar mecânica já aprovada, abrir proposta de revisão, não mudar silenciosamente o comportamento.

## 5. Workshops para nossa criação conjunta
| ID | Conteúdo | Entregável de design | Engenharia que pode avançar |
| --- | --- | --- | --- |
| CR-01 | Estética geral | linguagem de pixel art, proporções, paleta e interface | renderizador modular com arte de teste |
| CR-02 | Customização | slots e variações de corpo, cabelo, rosto e pele | modelos de dados, compatibilidade |
| CR-03 | Raças | anatomias, origens, passivos | raceId, archetypeId, tags e catálogos |
| CR-04 | Runas | opções, significado, escolhas e sorteio | gerador versionado e transação |
| CR-05 | Habilidades core e elementos | conceitos, limites e crescimento | registro e sistema de efeitos extensível |
| CR-06 | Classes | caminhos, acesso, progressão | classe e proficiência parametrizadas |
| CR-07 | Equipamentos | slots, estética, atributos e raridades | inventário, composição e modificadores |
| CR-08 | Mana, cuidados e minigames | sensação de jogo, ganhos e rotinas | simulação por relógio, entradas e score |
| CR-09 | Loja e economia | custo, moedas, recompensas, revenda | ledger e compra transacional |
| CR-10 | Pets | aparência, aquisição, vínculo, cuidados | vínculos e sistema de necessidades genérico |

Essas pautas são sugestões para discussão, não decisões de design final.

## 6. Template de proposta/aprovação
### CR-XX — Título
- Status: proposta / em discussão / aprovado / substituído
- Conceito e fantasia desejada:
- Alternativas examinadas:
- Consequências para aparência e animações:
- Consequências para RPG, progressão e equilíbrio:
- Interações com sistemas existentes:
- Decisão expressa do criador:
- Data e referência da aprovação:
- Dados para catálogo e critérios visuais de aceite:

## 7. Regras de protótipo não-canônico
Não inventar nomes “oficiais” para raça ou habilidade. IDs dev_humanoid_01, dev_rune_01, dev_skill_01 podem testar toda a arquitetura. Números de mana, moeda e XP em teste são DEV_ONLY, não equilíbrio aprovado. Manter esses dados separados de conteúdo final e bloquear importação automática para produção.

## 8. Padrão de qualidade para conteúdo criativo aprovado
Uma ficha só vira conteúdo implementável quando o conceito foi aprovado, suas interações foram definidas, visual/slots e compatibilidade foram avaliados, há testes adequados e o criador avaliou o resultado quando isso influencia a experiência.

A contribuição do agente não deve ser passiva: propor ideias com criatividade e espírito crítico faz parte do trabalho. A palavra final sobre o cânone pertence ao criador.
