import { TRUCO_MODES } from "@/games/truco/engine";

/** Regras resumidas do Truco. */
export function TrucoRules() {
  return (
    <div className="help">
      <p>
        Baralho de 40 cartas (sem 8, 9 e 10). Cada um recebe 3 cartas; a mão é melhor de 3 rodadas e quem fizer 2 marca. Vence
        quem chegar a <strong>12 pontos</strong>. Com 4 pessoas, 1º e 3º jogam contra 2º e 4º.
      </p>
      <ul>
        <li>
          <strong>Força das cartas:</strong> 4 &lt; 5 &lt; 6 &lt; 7 &lt; Q &lt; J &lt; K &lt; A &lt; 2 &lt; 3, e as manilhas acima de todas.
        </li>
        <li>
          <strong>{TRUCO_MODES.paulista.name}:</strong> {TRUCO_MODES.paulista.description}
        </li>
        <li>
          <strong>{TRUCO_MODES.mineiro.name}:</strong> {TRUCO_MODES.mineiro.description}
        </li>
        <li>
          <strong>Truco!</strong> Na sua vez, peça truco (a mão vale 3). A outra dupla aceita, corre (você ganha o valor de antes) ou
          pede Seis; depois vêm Nove e Doze.
        </li>
        <li>
          <strong>Empate (cangou):</strong> se a 1ª rodada empatar, vale a próxima; se empatar depois, vale quem fez a 1ª.
        </li>
        <li>
          <strong>Carta coberta:</strong> da 2ª rodada em diante, dá para jogar uma carta virada; ela perde para todas.
        </li>
        <li>
          <strong>Mão de onze:</strong> a dupla com 11 olha as cartas do parceiro e decide se joga (vale 3, sem truco) ou corre (a outra
          dupla ganha 1). Com as duas duplas em 11, é mão de ferro: sem truco.
        </li>
      </ul>
    </div>
  );
}
