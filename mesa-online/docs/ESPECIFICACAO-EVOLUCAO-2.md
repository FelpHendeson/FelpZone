# Especificação — Evolução 2: entender o que acontece e onde cada um está

## 1. Problema relatado

As reclamações de quem jogou vieram de três lados:

1. **"Não sei o que está acontecendo."** O dinheiro aumentava ou diminuía sem explicação. Os avisos rápidos no topo passavam despercebidos ou sumiam antes de serem lidos.
2. **"Não sei onde estou."** O tabuleiro inteiro numa tela de celular tem casas de cerca de 30 px. Os peões eram pontinhos e "teleportavam" de uma casa para outra.
3. **Cada pessoa quer controlar o próprio foco:** acompanhar a vez, olhar para si, olhar para outro jogador ou mover a vista livremente.

## 2. Decisões

| Tema | Decisão |
| --- | --- |
| Avisos | Os avisos rápidos dão lugar a **janelas de acontecimento** (diálogos) que narram cada **lance**: tudo o que uma jogada causou, numa janela só. |
| Bloqueio | A janela só **bloqueia a tela e pega o foco** quando a pessoa tem algo a decidir (rolar, comprar, pagar, passar a vez) ou no fim da partida. Nas jogadas dos outros, ela aparece igual, mas o fundo continua tocável: com robôs jogando a cada 2,5 s, uma janela bloqueante tornaria câmera, abas e conversa inacessíveis. |
| Decisão | Os botões da decisão ficam **dentro** da janela do lance da própria pessoa: "Sua vez!" → 🎲 Rolar → "foi para X, comprar por $Y?" → Comprar → "Passar a vez". |
| Dinheiro | Cada janela mostra quem ganhou ou perdeu quanto, e o saldo resultante. Uma faixa fixa no topo mostra o saldo de todos, com a variação (+/−) ao lado do retrato. |
| Câmera | O tabuleiro fica numa janela quadrada ampliada (2,2× por padrão; 1,6× a 3×). Os modos são: **🎯 Vez** (padrão), **🙋 Eu**, **✋ Livre**, **🗺️ Tudo**, e tocar num jogador da faixa foca nele. A escolha fica salva no perfil de cada pessoa. |
| Peões | Os peões têm o retrato e andam **casa a casa** (140 ms por casa). Saltos maiores que 24 casas e idas para a prisão vão direto, e em movimento reduzido andam sempre direto. Quem está jogando pulsa e fica maior; o peão em foco ganha um contorno. |

## 3. Modelo

**Lance (`src/games/magnata/beats.ts`):** a função `buildBeats(eventos, contexto, saldoAntes, saldoDepois)` divide os acontecimentos novos em lances.

- **Quando começa um lance novo:** numa vez nova, a cada rolagem (exceto logo depois do início da vez) e no fim da partida.
- **Mudanças de saldo:** vêm da comparação do dinheiro antes e depois da atualização. Elas ficam com o último lance que tem acontecimentos. Assim, uma compra seguida de "passar a vez" mantém o −$X na compra.
- **Lances silenciosos:** um lance só com "Vez de outra pessoa" não abre janela. "Sua vez!" abre.

**Fila (`src/client/useBeats.ts`):** os lances novos entram numa fila sem repetição, guardando o último `seq`. Quem entra ou recarrega a página começa do estado atual. Com mais de 14 acontecimentos perdidos, aparece um resumo e o que importa agora. O modo "só o essencial" mostra apenas os lances que envolvem a pessoa.

**Tempo da janela:** fecha sozinha com uma barra de tempo, em 2,8 s + 0,45 s por linha (máximo 5,5 s).

- Com 3 ou mais na fila: 1,6 s.
- Lance da própria pessoa já superado por uma ação dela: 0,7 s.
- Decisão pendente ou resultado: não fecha sozinha.
- O botão **OK/Próximo** avança, e **"Pular para agora"** vai direto ao mais recente.

**Câmera (`BoardViewport`):** é uma janela com rolagem sobre um "palco" com margem de mesa (40% da largura) em volta do tabuleiro ampliado. A margem permite centralizar até as casas da borda. O peão em foco fica a 42% da altura, acima da janela de acontecimentos.

- No modo Vez, a câmera segue quem está sendo narrado (ou, sem narração, quem joga).
- Arrastar ou rolar com o dedo passa para o modo Livre.
- Uma legenda mostra quem está em foco, a casa e os últimos dados.

## 4. Acessibilidade

- **Janela que pede decisão:** é um diálogo (`role="dialog"`, `aria-modal`), recebe o foco no botão principal e fecha com Escape.
- **Janelas informativas:** são regiões `status` com `aria-live="polite"` e não tiram o foco de ninguém.
- **Movimento reduzido:** desliga a animação das janelas e o passo a passo dos peões. A barra de tempo continua, porque é informação.
- **Câmera:** os botões indicam o modo ativo com `aria-pressed`. Os jogadores da faixa têm nome, saldo e "jogando agora" no rótulo.

## 5. Critérios de aceite

- [x] Cada jogada dos robôs aparece numa janela com dados, movimento, consequência e mudança de saldo (verificado no navegador, com iPhone simulado).
- [x] A pessoa joga a vez inteira só pelos botões da janela.
- [x] Escape fecha a janela de decisão. As janelas dos outros não bloqueiam câmera nem faixa.
- [x] A câmera mantém o peão em foco visível acima da janela, inclusive nas casas da borda.
- [x] Compra seguida de passar a vez: o −$ aparece na janela da compra (coberto por teste).
- [x] Duas pessoas jogando ao mesmo tempo, sem erros.

**Ainda não validado:** iPhone real (rolagem por toque, Safari) e leitor de tela.
