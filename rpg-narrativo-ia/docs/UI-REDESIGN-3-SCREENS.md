# UI/UX 3.0 — Telas (previews ASCII)

Companheiro de [UI-REDESIGN-3-VISION.md](UI-REDESIGN-3-VISION.md). Larguras em ~40 colunas simulam a tela de celular (320–375px) que já é o alvo documentado. `░` marca a barra de acento lateral do domínio (cor conforme a legenda de cada tela); `┌╴ ╶┐ └╴ ╶┘` nos cantos marcam o motivo "canto-trava" descrito na visão — usado só nas superfícies indicadas, não em todo cartão.

Cada tela indica, em itálico, o que mudou em relação à tela atual e por quê. Onde nada relevante muda, a tela nem aparece aqui — por exemplo `CombatScreen` e `CreateCharacterScreen` continuam como estão.

---

## 1. HUD persistente

*Sem mudança estrutural — só ganha o motivo de canto-trava, por ser a superfície mais "o Sistema falando com você" de toda a interface.*

```text
┌╴                                  ╶┐
  Alvorecer · Dia 8            ☰
  ┌──┐
  │FH│  Sobrevivente
  └──┘  Felipe Hendeson
  ░ sede 72  fome 58  saude 91  energia 64
└╴                                  ╶┘
```

---

## 2. Mundo (tela inicial)

*O cartão-herói do local ganha o canto-trava (é a "cena renderizada pelo Sistema"). Resto é o `WorldPanel` atual — já está bom: imagem de cena real, progresso, CTA primário. Nenhuma reestruturação de conteúdo, só o tratamento da moldura.*

```text
┌╴                                  ╶┐
  [ cena: Clareira do Despertar ]
  Zona descoberta · Sistema ativo

  Local atual
  Clareira do Despertar
  O claro irregular onde você...

  Exploração            62%
  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░

  [ ⌕ Explorar        1 período ]
  [ ⌁ Ações locais    4 opções  ]
└╴                                  ╶┘
  ❖ Orientação do Sistema  (consultar)

  ░ Ao seu redor
    Mapa              3 rotas →
    Pessoas e criaturas  2 aqui →

  Pontos de interesse (1)
  Ameaças neste local (0)

  Mundo  Jornadas  Personagem  Mochila  Menu
```

---

## 3. Menu — reorganizado em 3 grupos

*Era uma grade plana de 8 cartões do mesmo peso. Agora os mesmos 8 destinos (nenhum some, nenhum ganha clique a mais) vivem em 3 grupos nomeados, cada um com a cor do seu domínio na barra lateral. `Sociedade` muda de vizinhança — passa a ficar ao lado de `Relacionamentos`/`Família` (é sobre gente, não sobre terra), sem mudar o que a tela de Sociedade mostra.*

```text
┌╴                                  ╶┐
  Central do Sistema
  Abra só o domínio que você
  quer consultar agora.
└╴                                  ╶┘

  EU E O SISTEMA
  ┌──────────────────────────────┐
  │░ Progressão                  │
  │  6 habilidades · 2 treinos  →│
  ├──────────────────────────────┤
  │░ Registro                    │
  │  2 patentes · rankings      →│
  └──────────────────────────────┘

  PESSOAS
  ┌──────────────────────────────┐
  │░ Relacionamentos  [●][●][●]  │
  │  3 vínculos conhecidos      →│
  ├──────────────────────────────┤
  │░ Sociedade                   │
  │  1 grupo · 2 posições       →│
  ├──────────────────────────────┤
  │░ Família e lar                │
  │  0 pessoas reconhecidas     →│
  └──────────────────────────────┘

  MUNDO E REFERÊNCIA
  ┌──────────────────────────────┐
  │░ Domínio                     │
  │  0 territórios · economia   →│
  ├──────────────────────────────┤
  │░ Mapa completo    6 rotas   →│
  ├──────────────────────────────┤
  │░ Ajuda             5 tópicos→│
  └──────────────────────────────┘

  Mundo  Jornadas  Personagem  Mochila  Menu
```

`[●][●][●]` no cartão de Relacionamentos = miniaturas de retrato reais dos vínculos conhecidos (até 3 + contagem), não glifo.

---

## 4. Domínio — de uma tela longa para 3 entradas

*Hoje `SystemPanel` com `section="domain"` concatena território (`settlements`), economia (`economy`) e política (`politics`) numa rolagem só. São três sistemas de save distintos; a tela devia refletir isso. Mesma profundidade de clique: `Menu → Domínio` já existia, só que agora essa tela é um hub de 3 cartões em vez do conteúdo direto.*

```text
┌╴                                  ╶┐
  ← Domínio
└╴                                  ╶┘

  ┌──────────────────────────────┐
  │░ Base e território           │
  │  reivindicações e projetos  →│
  ├──────────────────────────────┤
  │░ Economia                    │
  │  carteira · estoques        →│
  ├──────────────────────────────┤
  │░ Política                    │
  │  mandatos · acordos · leis  →│
  └──────────────────────────────┘
```

Cada sub-tela (`Base e território`, `Economia`, `Política`) é o conteúdo que `SystemPanel` já renderiza hoje para aquele sistema — só isolado em sua própria tela com cabeçalho e botão de voltar, em vez de uma sanfona dentro da sanfona de Domínio.

---

## 5. Personagem

*Estrutura igual (`SystemIdentity`, calendário, próximo marco). O avatar do jogador permanece glifo com iniciais — de propósito: não existe, e não deveria existir, um retrato gerado da aparência do jogador. Ganha o canto-trava no cabeçalho, como o resto das superfícies "do Sistema".*

```text
┌╴                                  ╶┐
  Sobrevivente
  ┌──┐
  │FH│  Felipe Hendeson
  └──┘  Olhar Atento
        Nível 3
└╴                                  ╶┘

  Linha da vida
  Dia 8 · Alvorecer
  24 anos · Adulto

  ░ Próximo marco · Nível 4
  ✓ 10 explorações concluídas
  ○ 1 habilidade nova no Jardim
```

---

## 6. Mochila

*Sem mudança estrutural (abas em grade já seguem o limite "sem carrossel" da UI/UX 2.0). Itens com `src` já trocam glifo por ícone real — isso já está implementado (`InventoryPanel` usa `ImagePlaceholder` com fallback). O rework só adiciona a barra de acento nos itens equipados/preparados, pra diferenciar visualmente "ativo" de "guardado".*

```text
┌╴                                  ╶┐
  Pertences carregados
  Mochila              7 itens
└╴                                  ╶┘

  [Visão geral][Consumíveis][Equip.][Mat.]

  Preparação
  1  Unguento improvisado   [Remover]
  2  —

  ░ Equipado
    Mão principal  Ferramenta improv.

  ┌────┬────┬────┬────┐
  │[img]│[img]│[img]│[img]│
  │Água │Carne│Grav.│Fruto│
  │ ×2  │ ×1  │ ×3  │ ×1  │
  └────┴────┴────┴────┘
```

---

## 7. Relacionamentos

*Hoje cada vínculo é listado com glifo genérico de pessoa. Passa a mostrar o retrato real de Mira/Caio/Davi (já tem `src` desde a fatia de arte) — a mudança mais visível deste rework em telas pequenas, porque troca texto-apenas por rosto reconhecível.*

```text
┌╴                                  ╶┐
  ← Relacionamentos
└╴                                  ╶┘

  ┌──────────────────────────────┐
  │ (retrato)  Mira Vale          │
  │ ░ confiança 64 · amistoso     │
  ├──────────────────────────────┤
  │ (retrato)  Caio Nascimento    │
  │ ░ confiança 48 · cauteloso    │
  ├──────────────────────────────┤
  │ (retrato)  Davi Moura         │
  │ ░ confiança 71 · grato        │
  └──────────────────────────────┘
```

---

## 8. Progressão

*Lista de habilidades ganha o ícone real (`olhar-atento.webp` etc.) no lugar do glifo `❖` genérico que hoje marca toda entrada por igual, independentemente de qual habilidade é.*

```text
┌╴                                  ╶┐
  ← Progressão
└╴                                  ╶┘

  Eteris e Númen
  ░ Proficiência atual: 2

  Habilidades conhecidas
  (ícone) Olhar Atento     nv. 2
  (ícone) Resiliência      nv. 1
  (ícone) Voz Calma        nv. 1

  Jardim de habilidades
  Treinamento
```

---

## 9. Registro

*Conteúdo igual (patentes, rankings, o tópico de ajuda `regional-registry` do Dia 7). Só recebe a cor dourada já existente (`--gold`) de forma consistente na barra lateral — hoje o dourado só aparece em algum destaque pontual, não como identidade de toda a tela.*

```text
┌╴                                  ╶┐
  ← Registro
└╴                                  ╶┘

  ░ Patente: Batedor da Clareira

  Rankings locais
  Exploração   #— (sem dado suficiente)
  Combate      #— (sem dado suficiente)

  ░ Primeiro ciclo de avaliação
    concluído — Registro regional
    habilitado. (ver Ajuda)
```

---

## Resumo de cor por domínio (aplicada em toda tela acima)

| Domínio | Telas | Cor |
| --- | --- | --- |
| Mundo | Mundo, Mapa, Pessoas | `--accent` (verde-água) |
| Sistema | Progressão, Registro, Personagem | `--accent-system` (azul) / `--gold` (Registro) |
| Pessoas | Relacionamentos, Sociedade, Família | `--accent-social` (âmbar) — novo |
| Domínio | Base e território, Economia, Política | `--accent-domain` (terra) — novo |
| Perigo | ameaças, combate | `--danger` (nunca reaproveitado fora disso) |

Nenhuma tela listada aqui introduz um destino novo no rodapé, uma mecânica nova ou um campo novo de save — é reorganização e tratamento visual sobre o que já existe e já passou pelos 1012 testes atuais.
