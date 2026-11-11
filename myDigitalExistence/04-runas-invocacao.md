# Runas e invocação

## Requisitos

A entrada do jogo usa conta vinculada ao progresso. O jogador seleciona uma runa visualmente gravada em pedra, com brilho azul. Cada runa carrega possibilidades e a semente de um indivíduo; a invocação sorteia elemento e habilidades centrais menos genéricas.

Até três personagens por conta. Para criar outro quando o limite estiver ocupado, o jogador deve apagar um personagem. O limite de três refere-se aos humanoides; limite de pets é pendente.

## Modelo proposto

- **Runa:** catálogo de resultados e tendências permitidas.
- **Semente:** identidade aleatória inicial reproduzível.
- **Nascimento:** raça, elemento, aparência e habilidades de origem persistidos.
- **Desenvolvimento:** nível, classe, treino, necessidades e equipamentos mutáveis.

Raça é característica de nascimento no conceito do autor, mas a distribuição por runa ainda precisa ser definida. Probabilidades, raridades, custos, quantidade de opções visíveis e possibilidade de prever resultados são pendentes. Não há taxas aprovadas.

## Fluxo online proposto

1. Cliente pede opções de runas válidas.
2. Servidor identifica conta e vagas, e emite opções ou sessão de invocação.
3. Jogador escolhe uma opção e envia confirmação com chave idempotente.
4. Servidor valida propriedade da opção, limite e eventual custo.
5. Em transação, gera resultado, ocupa slot e registra nascimento.
6. Cliente recebe o personagem persistido e executa a animação de revelação.

A animação não determina o resultado. Se a conexão cair após confirmar, consultar a mesma operação antes de reenviar. Chamadas simultâneas não podem ultrapassar os três slots.

## Reprodutibilidade e evolução

**Proposta:** armazenar semente, versão do gerador, versão do catálogo e snapshot do nascimento. A mesma semente isolada não garante resultado igual após trocar algoritmo ou tabelas. Não recalcular atributos atuais a partir do nascimento e perder evolução.

A semente não é credencial, segredo de conta nem justificativa para confiar em resultados calculados pelo cliente.

## Exclusão

**Requisito:** remoção de personagem para liberar vaga. **Proposta:** tela mostra nome e consequências, confirmação separada e registro no servidor. Nunca substituir automaticamente o mais antigo.

**Pendente:** exclusão definitiva ou recuperável, destino de itens e saldo, vínculo dos pets, eventual período de recuperação e tratamento de operações de treino em andamento. Antes de implementar, decidir essas regras para não permitir duplicar itens por exclusão e restauração.

## Casos de aceite

Confirmar duas vezes retorna o mesmo resultado; quarto personagem é recusado; duas invocações concorrentes com uma vaga geram no máximo um indivíduo; nova versão de catálogo preserva o nascimento anterior.


## Primeiras runas candidatas (11/11/2026)

[24-runas-racas-classes-habilidades.md](24-runas-racas-classes-habilidades.md) descreve **Pulso, Véu e Forja** como três runas de pedra com brilho azul, além de seis habilidades centrais originais e afinidades elementares. Estas definições são CANDIDATO_JOGAVEL: o agente pode implementar previews/gerador de teste e, após infraestrutura G3, persistência autoritativa; a distribuição de raridade e seus pesos definitivos ainda serão refinados com o criador. Não alterar snapshots já gerados quando migrar catálogos.
