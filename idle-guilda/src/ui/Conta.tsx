import { useState } from 'react';
import { acessarConta, ErroNuvem } from '../nuvem';
import { Modal } from './Modal';
import { quandoFoi } from './resumo';

export interface SituacaoConta {
  /** null enquanto consulta o servidor. */
  disponivel: boolean | null;
  apelido: string | null;
}

export interface SituacaoNuvem {
  enviando: boolean;
  ultimoEnvio: number | null;
  erro: string | null;
}

interface Props {
  conta: SituacaoConta;
  nuvem: SituacaoNuvem;
  aoEntrar: (apelido: string) => void;
  aoSair: () => void;
  aoEnviar: () => void;
  aoFechar: () => void;
}

export function Conta({ conta, nuvem, aoEntrar, aoSair, aoEnviar, aoFechar }: Props) {
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [apelido, setApelido] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (conta.disponivel === false) {
    return (
      <Modal titulo="Conta" aoFechar={aoFechar}>
        <p>As contas estão indisponíveis agora. Seu progresso continua salvo neste aparelho, e você pode levar para outro pelo Backup no menu.</p>
      </Modal>
    );
  }

  if (conta.apelido) {
    return (
      <Modal titulo="Conta" aoFechar={aoFechar}>
        <p>
          Conectado como <strong>{conta.apelido}</strong>.
        </p>
        <p className="dica">
          O progresso vai para a nuvem a cada 2 minutos e ao sair do jogo. Em outro aparelho, entre com o mesmo apelido e senha.
        </p>
        <p className={nuvem.erro ? 'erro' : 'dica'}>
          {nuvem.enviando
            ? '☁ Enviando…'
            : nuvem.erro
              ? `☁ Falhou: ${nuvem.erro}`
              : nuvem.ultimoEnvio
                ? `☁ Última cópia na nuvem: ${quandoFoi(nuvem.ultimoEnvio)}`
                : '☁ Ainda sem cópia na nuvem'}
        </p>
        <div className="linha-botoes">
          <button className="principal" disabled={nuvem.enviando} onClick={aoEnviar}>
            Salvar na nuvem agora
          </button>
          <button onClick={aoSair}>Sair da conta</button>
        </div>
      </Modal>
    );
  }

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      aoEntrar(await acessarConta(modo, apelido, senha));
    } catch (e) {
      setErro(e instanceof ErroNuvem ? e.message : 'Algo deu errado. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={modo === 'entrar' ? 'Entrar' : 'Criar conta'} aoFechar={aoFechar}>
      <div className="seletor" role="tablist">
        <button role="tab" aria-selected={modo === 'entrar'} className={modo === 'entrar' ? 'ativa' : ''} onClick={() => setModo('entrar')}>
          Já tenho conta
        </button>
        <button role="tab" aria-selected={modo === 'criar'} className={modo === 'criar' ? 'ativa' : ''} onClick={() => setModo('criar')}>
          Criar conta
        </button>
      </div>
      <form className="formulario" onSubmit={enviar}>
        <label className="campo">
          Apelido
          <input
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            autoComplete="username"
            maxLength={16}
            required
            minLength={3}
          />
        </label>
        <label className="campo">
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
            required
            minLength={6}
            maxLength={72}
          />
        </label>
        {modo === 'criar' && (
          <p className="dica">Não pedimos e-mail, então não dá para recuperar a senha. Guarde-a bem.</p>
        )}
        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
        <button className="principal" type="submit" disabled={enviando || conta.disponivel === null}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </Modal>
  );
}
