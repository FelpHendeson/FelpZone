import { useCallback, useEffect, useRef, useState } from 'react';
import { novoJogo, type Resultado } from '../motor/acoes';
import { desserializar, serializar } from '../motor/save';
import { aplicarTempoOffline, avancar, type ResumoOffline } from '../motor/simulacao';
import type { Classe, Estado } from '../motor/tipos';
import { Barra } from './Barra';
import { CartaoHeroi } from './CartaoHeroi';
import { Diario } from './Diario';
import { Forja } from './Forja';
import { Fundacao } from './Fundacao';
import { ResumoOfflineModal } from './ResumoOfflineModal';
import { Taverna } from './Taverna';

const CHAVE_SAVE = 'idle-guilda:save';
/** Pausas maiores que isso (aba escondida, celular bloqueado) contam como tempo fora. */
const LIMITE_TEMPO_FORA = 30;

type Aba = 'guilda' | 'forja' | 'taverna' | 'diario';

function carregar(): { estado: Estado | null; resumo: ResumoOffline | null } {
  const save = desserializar(localStorage.getItem(CHAVE_SAVE));
  if (!save) return { estado: null, resumo: null };
  const fora = (Date.now() - save.salvoEm) / 1000;
  if (fora < LIMITE_TEMPO_FORA) return { estado: avancar(save.estado, fora), resumo: null };
  return aplicarTempoOffline(save.estado, fora);
}

export function App() {
  const [inicial] = useState(carregar);
  const [estado, setEstado] = useState<Estado | null>(inicial.estado);
  const [resumo, setResumo] = useState<ResumoOffline | null>(inicial.resumo);
  const [aba, setAba] = useState<Aba>('guilda');
  const [aviso, setAviso] = useState<string | null>(null);

  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  const salvar = useCallback(() => {
    if (estadoRef.current) localStorage.setItem(CHAVE_SAVE, serializar(estadoRef.current, Date.now()));
  }, []);

  // Laço do jogo: avança pelo tempo real decorrido, guardando a fração de segundo.
  useEffect(() => {
    if (!estado) return;
    let ultimo = performance.now();
    let sobra = 0;
    const id = setInterval(() => {
      const agora = performance.now();
      const decorrido = (agora - ultimo) / 1000 + sobra;
      ultimo = agora;
      if (decorrido >= LIMITE_TEMPO_FORA) {
        sobra = 0;
        const r = aplicarTempoOffline(estadoRef.current!, decorrido);
        setEstado(r.estado);
        setResumo(r.resumo);
        return;
      }
      const passos = Math.floor(decorrido);
      sobra = decorrido - passos;
      if (passos > 0) setEstado((e) => (e ? avancar(e, passos) : e));
    }, 250);
    const salvamento = setInterval(salvar, 5000);
    const aoEsconder = () => document.visibilityState === 'hidden' && salvar();
    document.addEventListener('visibilitychange', aoEsconder);
    window.addEventListener('pagehide', salvar);
    return () => {
      clearInterval(id);
      clearInterval(salvamento);
      document.removeEventListener('visibilitychange', aoEsconder);
      window.removeEventListener('pagehide', salvar);
    };
    // Reinicia apenas ao fundar ou apagar a guilda.
  }, [estado === null, salvar]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2500);
    return () => clearTimeout(id);
  }, [aviso]);

  const agir = useCallback(
    (acao: (e: Estado) => Resultado) => {
      const atual = estadoRef.current;
      if (!atual) return;
      const r = acao(atual);
      if (r.ok) {
        estadoRef.current = r.estado;
        setEstado(r.estado);
        salvar();
      } else {
        setAviso(r.erro);
      }
    },
    [salvar],
  );

  if (!estado) {
    return (
      <Fundacao
        aoFundar={(nome: string, classe: Classe) => {
          const e = novoJogo(nome, classe);
          localStorage.setItem(CHAVE_SAVE, serializar(e, Date.now()));
          setEstado(e);
        }}
      />
    );
  }

  const apagar = () => {
    if (confirm('Apagar a guilda e começar do zero? Isso não pode ser desfeito.')) {
      localStorage.removeItem(CHAVE_SAVE);
      setEstado(null);
      setAba('guilda');
    }
  };

  return (
    <div className="app">
      <Barra estado={estado} />
      <main>
        {aba === 'guilda' &&
          estado.herois.map((h) => <CartaoHeroi key={h.id} estado={estado} heroi={h} agir={agir} />)}
        {aba === 'forja' && <Forja estado={estado} agir={agir} />}
        {aba === 'taverna' && <Taverna estado={estado} agir={agir} />}
        {aba === 'diario' && <Diario estado={estado} aoApagar={apagar} />}
      </main>
      {aviso && (
        <div className="aviso" role="status">
          {aviso}
        </div>
      )}
      <nav className="abas">
        {(
          [
            ['guilda', 'Guilda'],
            ['forja', 'Forja'],
            ['taverna', 'Taverna'],
            ['diario', 'Diário'],
          ] as const
        ).map(([id, rotulo]) => (
          <button key={id} className={aba === id ? 'ativa' : ''} onClick={() => setAba(id)}>
            {rotulo}
          </button>
        ))}
      </nav>
      {resumo && <ResumoOfflineModal resumo={resumo} aoFechar={() => setResumo(null)} />}
    </div>
  );
}
