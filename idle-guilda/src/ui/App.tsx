import { useCallback, useEffect, useRef, useState } from 'react';
import { receberAplausos, type Resultado } from '../motor/acoes';
import { aplicarTempoOffline, avancar, novoJogo, type ResumoOffline } from '../motor/jogo';
import { objetivoAtual, objetivoCumprido, type Destino } from '../motor/objetivos';
import { desserializar, serializar, type Save } from '../motor/save';
import type { Estado, PersonagemId } from '../motor/tipos';
import type { NomeIconeUi } from '../arte/ui';
import { INVENTARIO_MAXIMO } from '../motor/dados/itens';
import { baixarSave, consultarConta, enviarSave, ErroNuvem, excluirConta, pulso, sairDaConta } from '../nuvem';
import { Backup } from './Backup';
import { Barra } from './Barra';
import { Bestiario } from './Bestiario';
import { Batalha } from './Batalha';
import { Cidade, type AbaCidade } from './Cidade';
import { ComoJogar } from './ComoJogar';
import { Conflito } from './Conflito';
import { Conta, type SituacaoConta, type SituacaoNuvem } from './Conta';
import { Diario } from './Diario';
import { Expedicoes } from './Expedicoes';
import { Ficha } from './Ficha';
import { AvisoMochilaCheia, Mochila, useMelhorias } from './Mochila';
import { IconeUi } from './IconeUi';
import { Menu } from './Menu';
import { MenuInicial } from './MenuInicial';
import { Mundo } from './Mundo';
import { Objetivo } from './Objetivo';
import { Party, temNoDisponivel } from './Party';
import { Prologo } from './Prologo';
import { ResumoOfflineModal } from './ResumoOfflineModal';

const CHAVE_SAVE = 'idle-guilda:save:v3';
/** Pausas maiores que isso (aba escondida, celular bloqueado) contam como tempo fora. */
const LIMITE_TEMPO_FORA = 30;
const INTERVALO_NUVEM = 2 * 60 * 1000;
const INTERVALO_PULSO = 60 * 1000;

type Tela = 'inicio' | 'prologo' | 'jogo';
type Janela = 'menu' | 'conta' | 'backup' | 'ajuda' | 'diario' | 'bestiario' | null;

function retomar(save: Save): { estado: Estado; resumo: ResumoOffline | null } {
  const fora = (Date.now() - save.salvoEm) / 1000;
  if (fora < LIMITE_TEMPO_FORA) return { estado: avancar(save.estado, fora), resumo: null };
  return aplicarTempoOffline(save.estado, fora);
}

function carregarLocal() {
  const save = desserializar(localStorage.getItem(CHAVE_SAVE));
  return save ? { ...retomar(save), salvoEm: save.salvoEm } : { estado: null, resumo: null, salvoEm: null };
}

/** Mesma aventura (mesma semente inicial de heróis) e a nuvem não está à frente: dá para enviar sem perguntar. */
function nuvemAtrasada(local: Estado, remoto: Estado): boolean {
  const ids = (e: Estado) => e.herois.map((h) => h.id).join('|');
  return ids(local).startsWith(ids(remoto)) && remoto.tempo <= local.tempo && remoto.estatisticas.abates <= local.estatisticas.abates;
}

/** Abas da interface: os destinos do motor mais a Mochila, que só existe na UI. */
type DestinoUi = Destino | 'mochila';

const ABAS: [DestinoUi, NomeIconeUi, string][] = [
  ['batalha', 'batalha', 'Batalha'],
  ['party', 'party', 'Party'],
  ['mochila', 'mochila', 'Mochila'],
  ['cidade', 'cidade', 'Cidade'],
  ['expedicoes', 'expedicoes', 'Expedições'],
  ['mundo', 'mundo', 'Mundo'],
];

export function App() {
  const [inicial] = useState(carregarLocal);
  const [estado, setEstado] = useState<Estado | null>(inicial.estado);
  const [resumo, setResumo] = useState<ResumoOffline | null>(inicial.resumo);
  const [ultimoSalvo, setUltimoSalvo] = useState<number | null>(inicial.salvoEm);
  const [tela, setTela] = useState<Tela>('inicio');
  const [aba, setAba] = useState<DestinoUi>('batalha');
  const [destaqueFerreiro, setDestaqueFerreiro] = useState<string | null>(null);
  const [mochilaPara, setMochilaPara] = useState<{ heroi: PersonagemId } | null>(null);
  const [abaCidade, setAbaCidade] = useState<AbaCidade>('ferreiro');
  const [janela, setJanela] = useState<Janela>(null);
  const [heroiAberto, setHeroiAberto] = useState<PersonagemId | null>(null);
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

  useEffect(() => {
    consultarConta().then((r) => setConta({ disponivel: r !== null, apelido: r?.apelido ?? null }));
  }, []);

  const jogando = estado !== null;

  // Laço do jogo: avança pelo tempo real decorrido, guardando a fração do passo.
  useEffect(() => {
    if (!jogando) return;
    let ultimo = performance.now();
    let sobra = 0;
    const id = setInterval(() => {
      const agora = performance.now();
      const decorrido = (agora - ultimo) / 1000 + sobra;
      ultimo = agora;
      const atual = estadoRef.current;
      if (!atual) return;
      // Tudo passa por estadoRef: uma ação feita entre dois ticks parte do estado
      // já avançado, e o avanço seguinte parte do estado com a ação.
      if (decorrido >= LIMITE_TEMPO_FORA) {
        sobra = 0;
        const r = aplicarTempoOffline(atual, decorrido);
        estadoRef.current = r.estado;
        setEstado(r.estado);
        setResumo(r.resumo);
        return;
      }
      const passos = Math.floor(decorrido * 2) / 2;
      sobra = decorrido - passos;
      if (passos > 0) {
        const novo = avancar(atual, passos);
        estadoRef.current = novo;
        setEstado(novo);
      }
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

  useEffect(() => {
    if (!jogando || !conta.apelido) return;
    const id = setInterval(() => void enviarNuvem(), INTERVALO_NUVEM);
    return () => clearInterval(id);
  }, [jogando, conta.apelido, enviarNuvem]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 3500);
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

  // Presença no mundo e entrega dos aplausos recebidos, a cada minuto.
  useEffect(() => {
    if (!jogando || !conta.apelido) return;
    const bater = async () => {
      try {
        const n = await pulso();
        if (n > 0) {
          agir((e) => receberAplausos(e, n));
          setAviso(`👏 Sua guilda recebeu ${n} ${n === 1 ? 'aplauso' : 'aplausos'}!`);
        }
      } catch {
        // Sem conexão: tenta no próximo pulso.
      }
    };
    void bater();
    const id = setInterval(() => void bater(), INTERVALO_PULSO);
    return () => clearInterval(id);
  }, [jogando, conta.apelido, agir]);

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

  const aoExcluirConta = async (senha: string) => {
    await excluirConta(senha);
    setConta((c) => ({ ...c, apelido: null }));
    setNuvem({ enviando: false, ultimoEnvio: null, erro: null });
    setJanela(null);
    setAviso('Conta excluída. O progresso continua neste aparelho.');
  };

  const aoSairDaConta = async () => {
    await enviarNuvem();
    await sairDaConta().catch(() => undefined);
    setConta((c) => ({ ...c, apelido: null }));
    setNuvem({ enviando: false, ultimoEnvio: null, erro: null });
    setJanela(null);
  };

  const irPara = (destino: DestinoUi) => {
    setHeroiAberto(null);
    setAba(destino);
    window.scrollTo({ top: 0 });
  };

  const janelas = (
    <>
      {janela === 'ajuda' && <ComoJogar aoFechar={() => setJanela(null)} />}
      {janela === 'diario' && estado && <Diario estado={estado} aoFechar={() => setJanela(null)} />}
      {janela === 'bestiario' && estado && <Bestiario estado={estado} aoFechar={() => setJanela(null)} />}
      {janela === 'conta' && (
        <Conta
          conta={conta}
          nuvem={nuvem}
          aoEntrar={(a) => void aoEntrarNaConta(a)}
          aoSair={() => void aoSairDaConta()}
          aoExcluir={aoExcluirConta}
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

  if (tela === 'prologo') {
    return (
      <>
        <Prologo
          aoVoltar={() => setTela('inicio')}
          aoComecar={() => {
            const e = novoJogo();
            estadoRef.current = e;
            setEstado(e);
            setResumo(null);
            salvarLocal();
            if (apelidoRef.current) void enviarNuvem();
            setAba('batalha');
            setTela('jogo');
            setJanela('ajuda');
          }}
        />
        {janelas}
      </>
    );
  }

  if (tela === 'inicio' || !estado) {
    return (
      <>
        <MenuInicial
          estado={estado}
          conta={conta}
          aoContinuar={() => setTela('jogo')}
          aoNovoJogo={() => {
            const onde = conta.apelido ? 'deste aparelho e da sua conta' : 'deste aparelho';
            if (estado && !confirm(`Começar uma nova aventura? O progresso atual será apagado ${onde}.`)) return;
            setTela('prologo');
          }}
          aoConta={() => setJanela('conta')}
          aoAjuda={() => setJanela('ajuda')}
        />
        {janelas}
      </>
    );
  }

  const apagar = () => {
    if (confirm('Apagar esta aventura e começar do zero? Isso não pode ser desfeito.')) {
      localStorage.removeItem(CHAVE_SAVE);
      estadoRef.current = null;
      setEstado(null);
      setUltimoSalvo(null);
      setJanela(null);
      setTela('inicio');
    }
  };

  const objetivo = objetivoAtual(estado);
  const alerta = (id: DestinoUi, melhorias: number) => {
    if (aba === id) return false;
    if (id === 'mochila') return estado.inventario.length >= INVENTARIO_MAXIMO - 5 || melhorias > 0;
    if (objetivo && !objetivoCumprido(estado) && objetivo.destino === id) return true;
    if (id === 'party') return estado.herois.some((h) => h.pontosLivres > 0 || temNoDisponivel(h));
    if (id === 'expedicoes') return estado.herois.some((h) => h.atividade.tipo !== 'batalha' && estado.tempo >= h.atividade.fim);
    if (id === 'cidade') return estado.canteiros.some((c) => c && estado.tempo >= c.fim);
    return false;
  };

  return (
    <div className="app">
      <Barra estado={estado} nuvem={conta.apelido ? nuvem : null} aoMenu={() => setJanela('menu')} aoMochila={() => irPara('mochila')} />
      <main>
        <Objetivo
          estado={estado}
          abaAtual={aba}
          agir={agir}
          aoIr={(d) => {
            if (d === 'cidade' && objetivo) {
              const t = objetivo.titulo.toLowerCase();
              setAbaCidade(t.includes('recrute') ? 'taverna' : t.includes('venda') ? 'loja' : t.includes('fusão') ? 'jardim' : 'ferreiro');
            }
            irPara(d);
          }}
        />
        {aba === 'batalha' && <AvisoMochilaCheia estado={estado} agir={agir} />}
        {aba === 'batalha' && <Batalha estado={estado} agir={agir} aoAbrirHeroi={setHeroiAberto} aoBestiario={() => setJanela('bestiario')} />}
        {aba === 'party' && (
          <Party
            estado={estado}
            aoAbrir={setHeroiAberto}
            aoTaverna={() => {
              setAbaCidade('taverna');
              irPara('cidade');
            }}
          />
        )}
        {aba === 'mochila' && (
          <Mochila
            estado={estado}
            agir={agir}
            paraHeroi={mochilaPara}
            aoFerreiro={(uid) => {
              setAbaCidade('ferreiro');
              setDestaqueFerreiro(uid);
              irPara('cidade');
            }}
          />
        )}
        {aba === 'cidade' && <Cidade estado={estado} agir={agir} aba={abaCidade} aoTrocar={setAbaCidade} destaque={destaqueFerreiro} />}
        {aba === 'expedicoes' && <Expedicoes estado={estado} agir={agir} />}
        {aba === 'mundo' && <Mundo conta={conta} agir={agir} aoConta={() => setJanela('conta')} aoAviso={setAviso} />}
      </main>
      <Navegacao estado={estado} aba={aba} alerta={alerta} irPara={irPara} />
      {heroiAberto && (
        <Ficha
          estado={estado}
          heroi={heroiAberto}
          agir={agir}
          aoFechar={() => setHeroiAberto(null)}
          aoMochila={(heroi) => {
            setMochilaPara({ heroi });
            irPara('mochila');
          }}
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
          aoDiario={() => setJanela('diario')}
          aoBestiario={() => setJanela('bestiario')}
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

/** Barra de abas. Componente próprio para o cálculo de melhorias rodar só com estado. */
function Navegacao(props: { estado: Estado; aba: DestinoUi; alerta: (id: DestinoUi, melhorias: number) => boolean; irPara: (d: DestinoUi) => void }) {
  const melhorias = useMelhorias(props.estado).size;
  return (
    <nav className="abas">
      {ABAS.map(([id, icone, rotulo]) => (
        <button key={id} className={props.aba === id ? 'ativa' : ''} aria-current={props.aba === id ? 'page' : undefined} onClick={() => props.irPara(id)}>
          <IconeUi nome={icone} tamanho={20} />
          <span className="aba-rotulo">{rotulo}</span>
          {props.alerta(id, melhorias) && <span className="alerta" aria-label="(tem algo para fazer aqui)" />}
        </button>
      ))}
    </nav>
  );
}
