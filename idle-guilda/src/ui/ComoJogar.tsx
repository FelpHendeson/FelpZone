import { Modal } from './Modal';

const PASSOS = [
  ['⚔', 'A batalha é contínua', 'A party luta sozinha, em ondas, mesmo com o jogo fechado (até 8 horas). Velocidade define a frequência dos ataques; Velocidade mágica e física aceleram a recarga das habilidades.'],
  ['📜', 'Siga os capítulos', 'O quadro dourado no topo conta a história e ensina o próximo passo. Cumpra e receba a recompensa.'],
  ['🛡', 'Monte a party', 'Até cinco heróis: tanque na frente, dano explosivo, dano constante, magia em área e suporte. Recrute na Taverna (Cidade).'],
  ['🎒', 'Equipe e melhore', 'Dez espaços: elmo, peitoral, manoplas, calças, botas, arma, mão secundária, dois acessórios e uma relíquia. Conjuntos dão bônus por peças.'],
  ['✨', 'Habilidades', 'Cada herói usa até 5 habilidades além do ataque básico. Elas sobem de nível com o uso, abrem na Árvore e se fundem no Jardim.'],
  ['🧭', 'Expedições', 'Mande heróis explorar (itens e relíquias) ou treinar (XP). Eles saem da batalha enquanto isso.'],
] as const;

export function ComoJogar({ aoFechar }: { aoFechar: () => void }) {
  return (
    <Modal
      titulo="Como jogar"
      aoFechar={aoFechar}
      rodape={
        <button className="principal" onClick={aoFechar} autoFocus>
          Entendi
        </button>
      }
    >
      <ol className="passos">
        {PASSOS.map(([icone, titulo, texto]) => (
          <li key={titulo}>
            <span className="passo-icone" aria-hidden>
              {icone}
            </span>
            <span>
              <strong>{titulo}</strong>
              <br />
              <small>{texto}</small>
            </span>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
