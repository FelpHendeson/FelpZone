# Instruções para o agente codificador

Antes de implementar, leia o `README.md` e todos os documentos em `docs/`.

## Objetivo

Entregar um MVP jogável do primeiro dia após o Reset, validando criação de personagem, eventos, escolhas, consequências e salvamento local.

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

## Entrega esperada

- aplicação executável com comandos documentados;
- campanha curta completa;
- testes automatizados do motor;
- PWA instalável;
- README atualizado com execução, validação e limitações;
- nenhuma chave, segredo ou dependência de rede durante a partida.

Quando houver ambiguidade, preserve a modularidade e escolha a menor solução capaz de validar a experiência.
