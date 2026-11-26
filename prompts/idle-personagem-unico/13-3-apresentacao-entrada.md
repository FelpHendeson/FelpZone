# F13.3 — Apresentação e entrada

Autorizada em 26/11/2026 após a continuação do projeto. O autor também autorizou push e deploy, além de commits diretos na main.

## Contrato

- Tela de apresentação antes de criar/sortear personagem. Login, cadastro e recuperação acessíveis sem personagem local.
- Separar conta online e jogo deste aparelho com textos claros, preservando a F13.2.
- Depois da autenticação, seleção/continuação de personagens. Manter até três slots, pergaminhos e sorteio pendente conforme o motor; não rerolar/recriar ao navegar ou recarregar.
- Modo local continua disponível, com continuação explícita. Não importar automaticamente progresso para uma conta.
- Reaproveitar autenticação e criação atuais. Não alterar balanceamento, desbloqueios, arte final nem implementar o tutorial da F13.5.
- Verificar usuário novo e recorrente em mobile/desktop; testes, lint, tipos e build. Comitar, enviar main, acompanhar deploy e conferir produção.

## Direção visual

Manter os seis tons existentes: fundo #14121a, superfície #1f1c28, borda #34303f, texto #ece8f4, secundário #a59fb3, dourado #d9a441. Títulos em Georgia com corpo do sistema. Entrada como portal para uma jornada: texto alinhado à esquerda, emblema existente/miniatura à direita em desktop; ações e retrato empilhados no celular. Sem fonte remota, imagens externas ou efeitos que prejudiquem offline/foco.

O conteúdo explica decisões e atividade automática, tempo fora de até 12 h e O Limiar. A área de conta vem antes do personagem. A seleção usa a miniatura e as informações reais de cada existência; slots bloqueados explicam o pergaminho, sem sugerir compras ou regras novas.
