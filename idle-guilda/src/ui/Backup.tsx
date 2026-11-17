import { useState } from 'react';
import type { Save } from '../motor/save';
import { Modal } from './Modal';
import { codigoDeBackup, lerCodigoDeBackup, resumoDoEstado } from './resumo';

interface Props {
  /** Save atual já serializado. */
  textoAtual: string | null;
  aoCarregar: (save: Save) => void;
  aoFechar: () => void;
}

export function Backup({ textoAtual, aoCarregar, aoFechar }: Props) {
  const codigo = textoAtual ? codigoDeBackup(textoAtual) : '';
  const [copiado, setCopiado] = useState(false);
  const [colado, setColado] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch {
      setErro('Não deu para copiar sozinho: selecione o código e copie.');
    }
  };

  const carregar = () => {
    const save = lerCodigoDeBackup(colado);
    if (!save) {
      setErro('Código inválido. Confira se copiou ele inteiro.');
      return;
    }
    if (confirm(`Carregar este progresso?\n\n${resumoDoEstado(save.estado)}\n\nO progresso atual deste aparelho será substituído.`)) {
      aoCarregar(save);
    }
  };

  return (
    <Modal titulo="Backup" aoFechar={aoFechar}>
      {textoAtual && (
        <>
          <h3>Copiar progresso</h3>
          <p className="dica">Guarde este código ou cole em outro aparelho para continuar de onde parou.</p>
          <textarea className="codigo" readOnly value={codigo} rows={3} onFocus={(e) => e.target.select()} />
          <button onClick={copiar}>{copiado ? '✓ Copiado' : 'Copiar código'}</button>
        </>
      )}
      <h3>Carregar progresso</h3>
      <textarea
        className="codigo"
        value={colado}
        rows={3}
        placeholder="Cole aqui um código de backup"
        onChange={(e) => {
          setColado(e.target.value);
          setErro(null);
        }}
      />
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      <button disabled={!colado.trim()} onClick={carregar}>
        Carregar código
      </button>
    </Modal>
  );
}
