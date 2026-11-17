import type { SituacaoConta, SituacaoNuvem } from './Conta';
import { Modal } from './Modal';
import { quandoFoi } from './resumo';

interface Props {
  ultimoSalvo: number | null;
  conta: SituacaoConta;
  nuvem: SituacaoNuvem;
  aoSalvar: () => void;
  aoConta: () => void;
  aoBackup: () => void;
  aoAjuda: () => void;
  aoMenuInicial: () => void;
  aoApagar: () => void;
  aoFechar: () => void;
}

export function Menu(p: Props) {
  return (
    <Modal titulo="Menu" aoFechar={p.aoFechar}>
      <div className="menu-botoes">
        <button className="principal" onClick={p.aoSalvar}>
          💾 Salvar agora
          <small>
            Neste aparelho: {p.ultimoSalvo ? quandoFoi(p.ultimoSalvo) : 'ainda não'}
            {p.conta.apelido && ` · nuvem: ${p.nuvem.enviando ? 'enviando…' : p.nuvem.ultimoEnvio ? quandoFoi(p.nuvem.ultimoEnvio) : 'ainda não'}`}
          </small>
        </button>
        <button onClick={p.aoConta}>
          👤 {p.conta.apelido ? `Conta: ${p.conta.apelido}` : 'Entrar ou criar conta'}
          <small>{p.conta.apelido ? 'Save na nuvem ligado' : 'Para continuar em outro aparelho'}</small>
        </button>
        <button onClick={p.aoBackup}>
          📦 Backup
          <small>Copiar ou colar um código com todo o progresso</small>
        </button>
        <button onClick={p.aoAjuda}>❓ Como jogar</button>
        <button onClick={p.aoMenuInicial}>🏠 Menu inicial</button>
        <button className="perigo" onClick={p.aoApagar}>
          🗑 Apagar guilda
        </button>
      </div>
      <p className="dica">O jogo também salva sozinho a cada 5 segundos e ao fechar.</p>
    </Modal>
  );
}
