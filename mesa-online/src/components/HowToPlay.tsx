/** Regras resumidas do Magnata, para antes de começar e durante a partida. */
export function HowToPlay() {
  return (
    <div className="help">
      <p>
        Na sua vez, <strong>role os dados</strong> e ande. Caiu numa casa à venda? Pode <strong>comprar</strong>. Caiu na
        de outra pessoa? <strong>Paga aluguel</strong>.
      </p>
      <ul>
        <li>
          <strong>Cor completa:</strong> com todas as ruas de uma cor, o aluguel dobra e você pode construir casas (até 4)
          e depois um hotel, sempre de forma uniforme entre as ruas da cor.
        </li>
        <li>
          <strong>Dupla</strong> nos dados dá outra jogada; três duplas seguidas levam à prisão.
        </li>
        <li>
          <strong>Prisão:</strong> pague $50, use a carta de liberdade ou tente tirar dupla (até 3 vezes).
        </li>
        <li>
          <strong>Sem dinheiro?</strong> Venda construções pela metade do preço ou hipoteque propriedades. Hipotecada, a
          propriedade não cobra aluguel até você quitar (valor + 10%).
        </li>
        <li>
          <strong>Falência:</strong> se não der para pagar, você sai. A partida acaba quando resta um jogador ou, se a sala
          tiver limite de rodadas, vence o maior patrimônio.
        </li>
        <li>
          <strong>Empréstimos</strong> (só se a sala ligar a regra): até metade do valor das suas propriedades livres, no
          máximo $1.000; devolve +20% em 8 turnos seus.
        </li>
      </ul>
      <p className="muted">Toque em qualquer casa do tabuleiro para ver preço, aluguel e dono.</p>
    </div>
  );
}
