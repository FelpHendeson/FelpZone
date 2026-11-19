import { EMOJI_UI, SPRITES_UI, type NomeIconeUi } from '../arte/ui';
import { largura } from '../arte/sprite';
import { Icone } from './pixel';

/**
 * Ícone de interface com tamanho fixo. Usa o sprite de src/arte/ui.ts e, se
 * ele ainda não existir, o emoji equivalente. Decorativo por padrão: passe
 * `rotulo` quando o ícone for a única indicação do que o elemento faz.
 */
export function IconeUi(props: { nome: NomeIconeUi; tamanho?: number; rotulo?: string }) {
  const tamanho = props.tamanho ?? 20;
  const sprite = SPRITES_UI[props.nome];
  const acessivel = props.rotulo ? { role: 'img', 'aria-label': props.rotulo } : { 'aria-hidden': true };
  if (sprite) {
    const escala = Math.max(1, Math.floor(tamanho / largura(sprite)));
    return (
      <span className="icone-ui" style={{ width: tamanho, height: tamanho }} {...acessivel}>
        <Icone chave={`ui-${props.nome}`} sprite={sprite} escala={escala} />
      </span>
    );
  }
  return (
    <span className="icone-ui emoji" style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.85 }} {...acessivel}>
      {EMOJI_UI[props.nome]}
    </span>
  );
}
