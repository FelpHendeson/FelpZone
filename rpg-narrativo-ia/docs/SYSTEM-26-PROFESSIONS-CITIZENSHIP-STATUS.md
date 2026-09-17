# Sistema 26 — Profissões, cidadania e posição social

> **Estado:** definido e especificado pelo autor em 17 de setembro de 2026. Ainda não implementado.

## Objetivo

Permitir trajetórias que não dependem da aventura: o jogador pode tornar-se artesão, comerciante, cidadão, autoridade ou nobre conforme as regras do mundo, acumulando deveres, privilégios e reconhecimento.

## Distinções obrigatórias

- **Profissão:** atividade praticada e desenvolvida.
- **Cidadania:** pertencimento reconhecido a uma comunidade política.
- **Ofício:** função exercida em uma organização ou assentamento.
- **Título social ou nobiliárquico:** reconhecimento concedido por autoridade válida.
- **Reputação:** percepção de um ator por uma comunidade.

Nenhum desses conceitos é equivalente a nível, patente do Sistema ou ranking.

## Decisões confirmadas

- O pack define profissões, graus, qualificações, autoridades emissoras, direitos e deveres.
- Progressão profissional exige prática ou marcos verificáveis, não pontos informados pela UI.
- Cidadania, ofício e título possuem origem, escopo e condição de revogação.
- Um ator pode acumular papéis compatíveis e deve receber erro claro quando houver conflito.
- Privilégios são permissões tipadas consumidas por outros sistemas.
- A narrativa pode reconhecer posição social sem codificar nomes específicos no motor.

## Contrato conceitual

O catálogo descreve trajetórias profissionais, qualificações, posições sociais, permissões, deveres, incompatibilidades e autoridades capazes de conceder ou retirar cada estado. O save registra concessões, progresso verificado, reputações por escopo e compromissos ativos.

## Integrações

- **Prática e crafting:** comprovam experiência profissional.
- **Organizações:** guildas, governos e negócios atribuem funções.
- **Relacionamentos e NPCs:** reputação e confiança afetam oportunidades.
- **Economia:** trabalho, comércio e contratos.
- **Assentamentos:** cidadania, cargo e administração.
- **Sistema:** pode registrar conquistas, sem confundir status social com patente.

## Primeiro ciclo jogável

O jogador solicita cidadania em um assentamento, cumpre requisitos declarados e escolhe iniciar uma profissão. Uma atividade válida registra prática; um benefício de cidadão só pode ser usado no escopo que o concedeu.

## Fatias propostas

1. Catálogos e vocabulário de papéis sociais.
2. Concessões, escopos, incompatibilidades e persistência.
3. Qualificações e progresso profissional verificável.
4. Cidadania, reputação e autoridades emissoras.
5. Permissões consumíveis por organizações e assentamentos.
6. Perfil mobile de ocupação e posição social.
7. Jornada cidadão–profissão e testes de revogação.

## Critérios de aceite

- O motor não contém `if` para comerciante, ferreiro ou nobre específicos.
- Uma autoridade só concede estados dentro de sua permissão e escopo.
- Revogação não apaga o histórico necessário nem deixa privilégios órfãos.
- Progresso profissional possui fonte reproduzível.
- Papéis incompatíveis são rejeitados antes da mutação.
- Conteúdo novo pode criar outra profissão sem migração de código.

## Fora do escopo inicial

- mercado e moeda, tratados no Sistema 27;
- construção e território;
- política entre facções;
- simulação completa de emprego de todos os NPCs;
- fórmula universal de classes sociais.
