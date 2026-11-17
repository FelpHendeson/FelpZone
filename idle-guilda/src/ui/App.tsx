import { useCallback, useEffect, useRef, useState } from 'react';
import { novoJogo, type Resultado } from '../motor/acoes';
import { objetivoAtual, objetivoCumprido, type Destino } from '../motor/objetivos';
import { desserializar, serializar, type Save } from '../motor/save';
import { aplicarTempoOffline, avancar, type ResumoOffline } from '../motor/simulacao';
import type { Estado } from '../motor/tipos';
import { baixarSave, consultarConta, enviarSave, ErroNuvem, sairDaConta } from '../nuvem';
import { Backup } from './Backup';
import { Barra } from './Barra';
import { ComoJogar } from './ComoJogar';
import { Conflito } from './Conflito';
import { Conta, type SituacaoConta, type SituacaoNuvem } from './Conta';
import { Diario } from './Diario';
import { Expedicao } from './Expedicao';
import { FichaHeroi } from './FichaHeroi';
import { Forja } from './Forja';
import { Fundacao } from './Fundacao';
import { Menu } from './Menu';
import { MenuInicial } from './MenuInicial';
import { Objetivo } from './Objetivo';
import { ResumoOfflineModal } from './ResumoOfflineModal';
import { Taverna } from './Taverna';

const CHAVE_SAVE = 'idle-guilda:save:v2';
/** Pausas maiores que isso (aba escondida, celular bloqueado) contam como tempo fora. */
const LIMITE_TEMPO_FORA = 30;
const INTERVALO_NUVEM = 2 * 60 * 1000;

type Aba = Destino | 'diario';
type Tela = 'inicio' | 'fundacao' | 'jogo';
type Janela = 'menu' | 'conta' | 'backup' | 'ajuda' | null;

/** Aplica o tempo passado desde que o save foi feito. */
function retomar(save: Save): { estado: Estado; resumo: ResumoOffline | null } {
  const fora = (Date.now() - save.salvoEm) / 1000;
  if (fora < LIMITE_TEMPO_FORA) return { estado: avancar(save.estado, fora), resumo: null };
  return aplicarTempoOffline(save.estado, fora);
}

function carregarLocal() {
  const save = desserializar(localStorage.getItem(CHAVE_SAVE));
  return save ? { ...retomar(save), salvoEm: save.salvoEm } : { estado: null, resumo: null, salvoEm: null };
}

/** Mesma guilda (mesmos heróis) e a nuvem não está à frente: dá para enviar sem perguntar. */
function nuvemAtrasada(local: Estado, remoto: Estado): boolean {
  const ids = (e: Estado) => e.herois.map((h) => `${h.id}:${h.nome}`).join('|');
  return ids(remoto).length > 0 && ids(local).startsWith(ids(remoto)) && remoto.tempo <= local.tempo;
}

const ABAS: [Aba, string][] = [
  ['expedicao', 'Expedição'],
  ['forja', 'Forja'],
  ['taverna', 'Taverna'],
  ['diario', 'Diário'],
];

export function App() {
  const [inicial] = useState(carregarLocal);
  const [estado, setEstado] = useState<Estado | null>(inicial.estado);
  const [resumo, setResumo] = useState<ResumoOffline | null>(inicial.resumo);
  const [ultimoSalvo, setUltimoSalvo] = useState<number | null>(inicial.salvoEm);
  const [tela, setTela] = useState<Tela>('inicio');
  const [aba, setAba] = useState<Aba>('expedicao');
  const [janela, setJanela] = useState<Janela>(null);
  const [heroiAberto, setHeroiAberto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [conta, setConta] = useState<SituacaoConta>({ disponivel: null, apelido: null });
  const [nuvem, setNuvem] = useState<SituacaoNuvem>({ enviando: false, ultimoEnvio: null, erro: null });
  const [conflito, setConflito] = useState<Save | null>(null);

  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const apelidoRef = useRef(conta.apelido);
  apelidoRef.current = conta.apelido;
  // Enquanto o jogador não escolhe entre aparelho e nuvem, nada é enviado.
  const conflitoRef = useRef(conflito);
  conflitoRef.current = conflito;

  const salvarLocal = useCallback(() => {
    if (!estadoRef.current) return;
    const agora = Date.now();
    localStorage.setItem(CHAVE_SAVE, serializar(estadoRef.current, agora));
    setUltimoSalvo(agora);
  }, []);

  const enviarNuvem = useCallback(async (aoSair = false) => {
    if (!estadoRef.current || !apelidoRef.current || conflitoRef.current) return;
    setNuvem((n) => ({ ...n, enviando: true }));
    try {
      const r = await enviarSave(serializar(estadoRef.current, Date.now()), aoSair);
      setNuvem({ enviando: false, ultimoEnvio: r.recebidoEm, erro: null });
    } catch (e) {
      if (e instanceof ErroNuvem && e.status === 401) setConta((c) => ({ ...c, apelido: null }));
      setNuvem((n) => ({ ...n, enviando: false, erro: e instanceof Error ? e.message : 'erro' }));
    }
  }, []);

  /** Troca o jogo atual por um save (da nuvem ou de um backup). */
  const usarSave = useCallback(
    (save: Save) => {
      const r = retomar(save);
      estadoRef.current = r.estado;
      setEstado(r.estado);
      setResumo(r.resumo);
      salvarLocal();
    },
    [salvarLocal],
  );

  // Consulta a conta ao abrir.
  useEffect(() => {
    consultarConta().then((r) => setConta({ disponivel: r !== null, apelido: r?.apelido ?? null }));
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
    const salvamento = setInterval(salvarLocal, 5000);
    const aoEsconder = () => {
      if (document.visibilityState !== 'hidden') return;
      salvarLocal();
      void enviarNuvem(true);
    };
    document.addEventListener('visibilitychange', aoEsconder);
    window.addEventListener('pagehide', salvarLocal);
    return () => {
      clearInterval(id);
      clearInterval(salvamento);
      document.removeEventListener('visibilitychange', aoEsconder);
      window.removeEventListener('pagehide', salvarLocal);
    };
  }, [jogando, salvarLocal, enviarNuvem]);

  // Cópia periódica na nuvem enquanto houver conta conectada.
  useEffect(() => {
    if (!jogando || !conta.apelido) return;
    const id = setInterval(() => void enviarNuvem(), INTERVALO_NUVEM);
    return () => clearInterval(id);
  }, [jogando, conta.apelido, enviarNuvem]);

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
        salvarLocal();
      } else {
        setAviso(r.erro);
      }
    },
    [salvarLocal],
  );

  const aoEntrarNaConta = async (apelido: string) => {
    setConta({ disponivel: true, apelido });
    apelidoRef.current = apelido;
    setJanela(null);
    setAviso(`Conectado como ${apelido}`);
    try {
      const remoto = await baixarSave();
      const save = remoto ? desserializar(remoto.texto) : null;
      if (remoto) setNuvem({ enviando: false, ultimoEnvio: remoto.recebidoEm, erro: null });
      const local = estadoRef.current;
      if (!save) {
        if (local) await enviarNuvem();
      } else if (!local) {
        usarSave(save);
        setAviso('Progresso carregado da nuvem');
      } else if (nuvemAtrasada(local, save.estado)) {
        await enviarNuvem();
      } else {
        conflitoRef.current = save;
        setConflito(save);
      }
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'Não foi possível ler a nuvem.');
    }
  };

  const aoSairDaConta = async () => {
    await enviarNuvem();
    await sairDaConta().catch(() => undefined);
    setConta((c) => ({ ...c, apelido: null }));
    setNuvem({ enviando: false, ultimoEnvio: null, erro: null });
    setJanela(null);
  };

  const irPara = (destino: Aba) => {
    setHeroiAberto(null);
    setAba(destino);
    window.scrollTo({ top: 0 });
  };

  const janelas = (
    <>
      {janela === 'ajuda' && <ComoJogar aoFechar={() => setJanela(null)} />}
      {janela === 'conta' && (
        <Conta
          conta={conta}
          nuvem={nuvem}
          aoEntrar={(a) => void aoEntrarNaConta(a)}
          aoSair={() => void aoSairDaConta()}
          aoEnviar={() => void enviarNuvem()}
          aoFechar={() => setJanela(null)}
        />
      )}
      {janela === 'backup' && (
        <Backup
          textoAtual={estado ? serializar(estado, Date.now()) : null}
          aoCarregar={(save) => {
            usarSave(save);
            setJanela(null);
            setTela('jogo');
            setAviso('Backup carregado');
          }}
          aoFechar={() => setJanela(null)}
        />
      )}
      {conflito && estado && (
        <Conflito
          local={estado}
          remoto={conflito}
          aoUsarLocal={() => {
            conflitoRef.current = null;
            setConflito(null);
            void enviarNuvem();
          }}
          aoUsarRemoto={() => {
            usarSave(conflito);
            conflitoRef.current = null;
            setConflito(null);
          }}
        />
      )}
      {aviso && (
        <div className="aviso" role="status">
          {aviso}
        </div>
      )}
    </>
  );

  if (tela === 'inicio' || !estado) {
    if (tela === 'fundacao') {
      return (
        <>
          <Fundacao
            aoVoltar={() => setTela('inicio')}
            aoFundar={(nome) => {
              const e = novoJogo(nome);
              estadoRef.current = e;
              setEstado(e);
              setResumo(null);
              salvarLocal();
              if (apelidoRef.current) void enviarNuvem();
              setAba('expedicao');
              setTela('jogo');
              setJanela('ajuda');
            }}
          />
          {janelas}
        </>
      );
    }
    return (
      <>
        <MenuInicial
          estado={estado}
          conta={conta}
          aoContinuar={() => setTela('jogo')}
          aoNovoJogo={() => {
            const onde = conta.apelido ? 'deste aparelho e da sua conta' : 'deste aparelho';
            if (estado && !confirm(`Começar um jogo novo? O progresso atual será apagado ${onde}.`)) return;
            setTela('fundacao');
          }}
          aoConta={() => setJanela('conta')}
          aoAjuda={() => setJanela('ajuda')}
        />
        {janelas}
      </>
    );
  }

  const apagar = () => {
    if (confirm('Apagar a guilda e começar do zero? Isso não pode ser desfeito.')) {
      localStorage.removeItem(CHAVE_SAVE);
      estadoRef.current = null;
      setEstado(null);
      setUltimoSalvo(null);
      setJanela(null);
      setTela('inicio');
    }
  };

  const objetivo = objetivoAtual(estado);
  const pontosPendentes = estado.herois.some((h) => h.pontosLivres > 0);
  const alerta = (id: Aba) =>
    (objetivo && !objetivoCumprido(estado) && objetivo.destino === id && aba !== id) ||
    (id === 'expedicao' && pontosPendentes && aba !== id);

  return (
    <div className="app">
      <Barra estado={estado} nuvem={conta.apelido ? nuvem : null} aoMenu={() => setJanela('menu')} />
      <main>
        <Objetivo estado={estado} abaAtual={aba} agir={agir} aoIr={irPara} />
        {aba === 'expedicao' && (
          <Expedicao estado={estado} agir={agir} aoAbrirHeroi={setHeroiAberto} aoIrTaverna={() => irPara('taverna')} />
        )}
        {aba === 'forja' && <Forja estado={estado} agir={agir} />}
        {aba === 'taverna' && <Taverna estado={estado} agir={agir} aoContratar={() => irPara('expedicao')} />}
        {aba === 'diario' && <Diario estado={estado} />}
      </main>
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
      {janela === 'menu' && (
        <Menu
          ultimoSalvo={ultimoSalvo}
          conta={conta}
          nuvem={nuvem}
          aoSalvar={() => {
            salvarLocal();
            void enviarNuvem();
            setAviso(conta.apelido ? 'Salvo no aparelho e na nuvem' : 'Salvo neste aparelho');
          }}
          aoConta={() => setJanela('conta')}
          aoBackup={() => setJanela('backup')}
          aoAjuda={() => setJanela('ajuda')}
          aoMenuInicial={() => {
            salvarLocal();
            setJanela(null);
            setTela('inicio');
          }}
          aoApagar={apagar}
          aoFechar={() => setJanela(null)}
        />
      )}
      {resumo && !janela && <ResumoOfflineModal resumo={resumo} aoFechar={() => setResumo(null)} />}
      {janelas}
    </div>
  );
}
