import { BATIDA_POINTS, DOMINO_MODES } from "@/games/domino/engine";

/** Regras resumidas do dominó e das quatro modalidades. */
export function DominoRules() {
  return (
    <div className="help">
      <p>
        São as 28 pedras do duplo-seis. Na sua vez, <strong>encaixe uma pedra numa das pontas</strong> da mesa: o número
        da pedra tem que ser igual ao da ponta. Sem pedra que sirva, o próprio jogo compra (quando há monte) ou passa por você.
      </p>
      <ul>
        <li>
          <strong>Começo:</strong> na primeira mão, começa quem tem a maior carroça (6|6, depois 5|5…). Nas outras, quem ganhou a mão anterior.
        </li>
        <li>
          <strong>Bater:</strong> quem fica sem pedras bate. <strong>Trancar:</strong> se ninguém consegue jogar, ganha quem tem menos pontos na mão.
        </li>
        <li>
          <strong>{DOMINO_MODES.bloqueio.name}:</strong> {DOMINO_MODES.bloqueio.description}
        </li>
        <li>
          <strong>{DOMINO_MODES.compra.name}:</strong> {DOMINO_MODES.compra.description} Com 3 ou 4 pessoas, cada um começa com 5 pedras.
        </li>
        <li>
          <strong>{DOMINO_MODES.pontos.name}:</strong> {DOMINO_MODES.pontos.description} Ao bater, leva os pontos dos outros arredondados para 5.
        </li>
        <li>
          <strong>{DOMINO_MODES.duplas.name}:</strong> parceiros frente a frente (1º e 3º contra 2º e 4º). Batida simples vale{" "}
          {BATIDA_POINTS.simples}, de carroça {BATIDA_POINTS.carroca}, lá-e-lô {BATIDA_POINTS["la-e-lo"]} (a pedra serve nas duas
          pontas) e cruzada {BATIDA_POINTS.cruzada} (carroça que serve nas duas pontas). Mão trancada vale 1 para a dupla com menos pontos.
        </li>
      </ul>
      <p className="muted">Toque numa pedra destacada para jogar. Se ela servir nas duas pontas, escolha o lado.</p>
    </div>
  );
}
