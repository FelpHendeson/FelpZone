# Fatia F9 — Conta e sincronização

> **Situação:** autorizada pelo autor em 24/11/2026 (F7 a F13 "sem parar"). A F8 já está na `main` (commit `ed3359e`). Manter o relatório único.

## Contexto

Fontes de verdade: `docs/GDD.md` (§4.1 conta e existências), `docs/ARQUITETURA.md` (§3.2, §5, §6, §8), `docs/DECISOES.md`, `docs/CALIBRACAO.md`. Leia o código da F0 a F8.

## Objetivo

Conta opcional com **sincronização** entre aparelhos, servidor como **autoridade** (aplica as ações no mesmo motor, com o relógio dele), **até 3 personagens** independentes por conta e o **Cofre da Conta** (conquistas, Pergaminhos do Novo Destino, Álbum de Descobertas).

## Restrição do autor

Não criar recurso pago. A API fica pronta e testada; **sem banco configurado, responde 503 e o jogo segue local**. Ativar o banco (Upstash pela Vercel) fica registrado como pendência do autor.

## Entrega

1. Motor: ações serializáveis (`aplicarAcao`, entrada não confiável), cofre derivado dos personagens, Pergaminho do Novo Destino (ranks C e A), criação do 2º/3º personagem gastando pergaminho, troca do personagem ativo. Save v10 com migração v9 → v10.
2. API `/api/v1`: `saude`, `auth/registrar`, `auth/entrar`, `auth/sair`, `jogo` (GET), `jogo/acao`, `jogo/importar`. Senha com `scrypt` + sal; token *bearer* guardado só como hash; limite de pedidos por IP; uma ação por vez por conta; relógio do save limitado ao do servidor.
3. Web: ações da interface no mesmo formato serializado; Personagem → Conta (personagens, cofre, conquistas, sincronização com escolha entre o jogo da conta e o deste aparelho).
4. Testes do motor e da API; teste no navegador com e sem banco; documentação e relatório.

## Fora do escopo

Cosméticos e histórico de temporadas no cofre (F12/F13); recuperação de senha e e-mail; cookie `httpOnly` (o token *bearer* serve à web e ao mobile).
