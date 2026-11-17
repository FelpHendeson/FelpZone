import { useCallback, useEffect, useRef, useState } from 'react';
import { novoJogo, type Resultado } from '../motor/acoes';
import { objetivoAtual, objetivoCumprido, type Destino } from '../motor/objetivos';
import { desserializar, serializar } from '../motor/save';
import { aplicarTempoOffline, avancar, type ResumoOffline } from '../motor/simulacao';
import type { Estado } from '../motor/tipos';
import { Barra } from './Barra';
import { ComoJogar } from './ComoJogar';
import { Diario } from './Diario';
import { Expedicao } from './Expedicao';
import { FichaHeroi } from './FichaHeroi';
import { Forja } from './Forja';
import { Fundacao } from './Fundacao';
import { Objetivo } from './Objetivo';
import { ResumoOfflineModal } from './ResumoOfflineModal';
import { Taverna } from './Taverna';

const CHAVE_SAVE = 'idle-guilda:save:v2';
/** Pausas maiores que isso (aba escondida, celular bloqueado) contam como tempo fora. */
const LIMITE_TEMPO_FORA = 30;

type Aba = Destino | 'diario';

function carregar(): { estado: Estado | null; resumo: ResumoOffline | null } {
  const save = desserializar(localStorage.getItem(CHAVE_SAVE));
  if (!save) return { estado: null, resumo: null };
  const fora = (Date.now() - save.salvoEm) / 1000;
  if (fora < LIMITE_TEMPO_FORA) return { estado: avancar(save.estado, fora), resumo: null };
  return aplicarTempoOffline(save.estado, fora);
}

const ABAS: [Aba, string][] = [
  ['expedicao', 'Expedição'],
  ['forja', 'Forja'],
  ['taverna', 'Taverna'],
  ['diario', 'Diário'],
];

export function App() {
  const [inicial] = useState(carregar);
  const [estado, setEstado] = useState<Estado | null>(inicial.estado);
  const [resumo, setResumo] = useState<ResumoOffline | null>(inicial.resumo);
  const [aba, setAba] = useState<Aba>('expedicao');
  const [heroiAberto, setHeroiAberto] = useState<string | null>(null);
  const [ajuda, setAjuda] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  const salvar = useCallback(() => {
    if (estadoRef.current) localStorage.setItem(CHAVE_SAVE, serializar(estadoRef.current, Date.now()));
  }, []);

  const jogando = estado !== null;

  // Laço do jogo: avança pelo tempo real decorrido, guardando a fração de segundo.
  useEffect(() => {
    if (!jogando) return;
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
  }, [jogando, salvar]);

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

  const irPara = (destino: Aba) => {
    setHeroiAberto(null);
    setAba(destino);
    window.scrollTo({ top: 0 });
  };

  if (!estado) {
    return (
      <Fundacao
        aoFundar={(nome) => {
          const e = novoJogo(nome);
          localStorage.setItem(CHAVE_SAVE, serializar(e, Date.now()));
          setEstado(e);
          setAba('expedicao');
          setAjuda(true);
        }}
      />
    );
  }

  const apagar = () => {
    if (confirm('Apagar a guilda e começar do zero? Isso não pode ser desfeito.')) {
      localStorage.removeItem(CHAVE_SAVE);
      setEstado(null);
    }
  };

  const objetivo = objetivoAtual(estado);
  const pontosPendentes = estado.herois.some((h) => h.pontosLivres > 0);
  const alerta = (id: Aba) =>
    (objetivo && !objetivoCumprido(estado) && objetivo.destino === id && aba !== id) ||
    (id === 'expedicao' && pontosPendentes && aba !== id);

  return (
    <div className="app">
      <Barra estado={estado} aoAjuda={() => setAjuda(true)} />
      <main>
        <Objetivo estado={estado} abaAtual={aba} agir={agir} aoIr={irPara} />
        {aba === 'expedicao' && (
          <Expedicao estado={estado} agir={agir} aoAbrirHeroi={setHeroiAberto} aoIrTaverna={() => irPara('taverna')} />
        )}
        {aba === 'forja' && <Forja estado={estado} agir={agir} />}
        {aba === 'taverna' && <Taverna estado={estado} agir={agir} aoContratar={() => irPara('expedicao')} />}
        {aba === 'diario' && <Diario estado={estado} aoApagar={apagar} />}
      </main>
      {aviso && (
        <div className="aviso" role="status">
          {aviso}
        </div>
      )}
      <nav className="abas">
        {ABAS.map(([id, rotulo]) => (
          <button key={id} className={aba === id ? 'ativa' : ''} onClick={() => irPara(id)}>
            {rotulo}
            {alerta(id) && <span className="alerta" aria-label="(tem algo para fazer aqui)" />}
          </button>
        ))}
      </nav>
      {heroiAberto && (
        <FichaHeroi
          estado={estado}
          heroiId={heroiAberto}
          agir={agir}
          aoFechar={() => setHeroiAberto(null)}
          aoIrForja={() => irPara('forja')}
        />
      )}
      {resumo && !ajuda && <ResumoOfflineModal resumo={resumo} aoFechar={() => setResumo(null)} />}
      {ajuda && <ComoJogar aoFechar={() => setAjuda(false)} />}
    </div>
  );
}
