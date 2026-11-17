import { Modal } from './Modal';

const PASSOS = [
  ['⚔', 'A party luta sozinha', 'Seus heróis caçam monstros automaticamente, até com o jogo fechado (por até 8 horas). Você não precisa clicar para atacar.'],
  ['🎯', 'Siga os objetivos', 'O quadro amarelo no topo diz o próximo passo e onde fazê-lo. Cumpra e toque em "Receber" para ganhar ouro.'],
  ['🛡', 'Monte a party', 'O Guerreiro protege, a Mística cura e a Caçadora causa dano. Contrate na Taverna e forje armas na Forja.'],
  ['⬆', 'Evolua e avance', 'Cada nível dá pontos de Poder ou Vigor. Zonas mais difíceis dão mais XP e ouro. Se a party recua demais, volte uma zona.'],
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
