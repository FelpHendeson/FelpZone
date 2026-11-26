import { validarAcao, type Acao, type Armazenamento, type EstadoJogo } from "@idle-pu/motor";
import { chaveDaConta } from "./persistencia";
import { chamarApi, enviarAcao, estadoDaResposta, type PedidoAcao, type RespostaApi, type Sessao } from "./sync";

export interface JogoOnline {
  readonly estado: EstadoJogo;
  readonly revisao: number;
  readonly procedencia: "servidor" | "importado";
}
export type Conexao = "sincronizando" | "online" | "desconectado" | "expirado";
export interface SituacaoConta {
  readonly sessao: Sessao;
  readonly jogo: JogoOnline | null;
  readonly conexao: Conexao;
  readonly ocupado: boolean;
  readonly mensagem: string | null;
}
export function jogoDaResposta(corpo: Record<string, unknown>): JogoOnline | null {
  const estado = estadoDaResposta(corpo);
  return estado && Number.isSafeInteger(corpo.revisao) && (corpo.revisao as number) >= 0 && (corpo.procedencia === "servidor" || corpo.procedencia === "importado")
    ? { estado, revisao: corpo.revisao as number, procedencia: corpo.procedencia } : null;
}

/** Uma identidade por instância. Nenhuma resposta tardia pode reativar uma sessão encerrada. */
export class ClienteConta {
  private geracao = 0;
  private situacao: SituacaoConta | null = null;
  private pendente: PedidoAcao | null = null;
  constructor(private readonly armazenamento: Armazenamento, private readonly notificar: (s: SituacaoConta) => void, private readonly buscar: typeof fetch = fetch) {}
  get atual() { return this.situacao; }
  encerrar() { this.geracao++; this.situacao = null; this.pendente = null; }
  private emitir(patch: Partial<SituacaoConta>) {
    if (!this.situacao) return;
    this.situacao = { ...this.situacao, ...patch };
    this.notificar(this.situacao);
  }
  private async adotar(corpo: Record<string, unknown>, geracao: number): Promise<boolean> {
    if (geracao !== this.geracao || !this.situacao) return false;
    const jogo = jogoDaResposta(corpo);
    if (!jogo) { this.emitir({ conexao: "desconectado", mensagem: "Resposta inválida do servidor." }); return false; }
    await this.armazenamento.gravar(chaveDaConta(this.situacao.sessao.nome), JSON.stringify(corpo));
    if (geracao !== this.geracao) return false;
    this.emitir({ jogo, conexao: "online", mensagem: null });
    return true;
  }
  async conectar(sessao: Sessao, corpo?: Record<string, unknown>) {
    this.encerrar();
    const geracao = this.geracao;
    this.situacao = { sessao, jogo: null, conexao: "sincronizando", ocupado: false, mensagem: null };
    this.emitir({});
    const bruto = await this.armazenamento.ler(`${chaveDaConta(sessao.nome)}:pendente`);
    if (geracao !== this.geracao) return;
    if (bruto) {
      try {
        const p = JSON.parse(bruto) as PedidoAcao;
        if (typeof p.idAcao === "string" && /^[a-zA-Z0-9_-]{16,80}$/.test(p.idAcao) && Number.isSafeInteger(p.revisao) && p.revisao >= 0 && validarAcao(p.acao)) this.pendente = p;
      } catch { /* Pedido corrompido não é executado. */ }
    }
    if (corpo && await this.adotar(corpo, geracao)) return;
    const cache = await this.armazenamento.ler(chaveDaConta(sessao.nome));
    if (geracao !== this.geracao) return;
    try {
      const jogo = cache ? jogoDaResposta(JSON.parse(cache)) : null;
      this.emitir({ jogo, conexao: "desconectado" });
    } catch { /* Cache inválido nunca é promovido a save local. */ }
    await this.sincronizar();
  }
  private falha(r: Exclude<RespostaApi, { ok: true }>) {
    this.emitir({ conexao: r.status === 401 ? "expirado" : "desconectado", mensagem: r.mensagem });
  }
  private async carregar(geracao: number) {
    const sessao = this.situacao?.sessao;
    if (!sessao) return;
    const r = await chamarApi("jogo", { token: sessao.token }, this.buscar);
    if (geracao !== this.geracao) return;
    if (r.ok) await this.adotar(r.corpo, geracao);
    else this.falha(r);
  }
  async sincronizar() {
    if (!this.situacao || this.situacao.ocupado) return;
    if (this.pendente) {
      await this.enviar(this.pendente.acao);
      if (this.pendente) return;
    }
    if (!this.situacao || this.situacao.conexao === "expirado") return;
    const geracao = this.geracao;
    this.emitir({ ocupado: true, conexao: "sincronizando" });
    try { await this.carregar(geracao); }
    catch { if (geracao === this.geracao) this.emitir({ conexao: "desconectado", mensagem: "Não foi possível salvar ou sincronizar. Tente novamente." }); }
    finally { if (geracao === this.geracao) this.emitir({ ocupado: false }); }
  }
  async enviar(acao: Acao): Promise<string | null> {
    if (!this.situacao || this.situacao.ocupado) return "Aguarde a operação em andamento.";
    if (this.situacao.conexao === "expirado") return "A sessão expirou. Saia e entre novamente para continuar.";
    if (!this.situacao.jogo && !this.pendente) return "Sincronize o jogo antes de agir.";
    if (this.pendente && JSON.stringify(this.pendente.acao) !== JSON.stringify(acao)) return "Há uma ação sem confirmação. Use Sincronizar para conferir o resultado antes de outra ação.";
    const geracao = this.geracao;
    const { sessao } = this.situacao;
    const chave = `${chaveDaConta(sessao.nome)}:pendente`;
    const pedido = this.pendente ?? { idAcao: crypto.randomUUID(), revisao: this.situacao.jogo!.revisao, acao };
    this.pendente = pedido;
    this.emitir({ ocupado: true, conexao: "sincronizando", mensagem: null });
    try {
      // Gravar antes de enviar permite recuperar o mesmo pedido após reload ou perda da resposta.
      await this.armazenamento.gravar(chave, JSON.stringify(pedido));
      if (geracao !== this.geracao) return null;
      const r = await enviarAcao(sessao, pedido, this.buscar);
      if (geracao !== this.geracao) return null;
      if (r.ok) {
        if (!await this.adotar(r.corpo, geracao)) return "Resposta inválida do servidor.";
        await this.armazenamento.remover(chave);
        if (geracao === this.geracao) this.pendente = null;
        return null;
      }
      if (r.status === 422 || r.codigo === "estado_desatualizado" || r.codigo === "id_reutilizado") {
        await this.armazenamento.remover(chave);
        if (geracao !== this.geracao) return null;
        this.pendente = null;
        await this.carregar(geracao);
      } else this.falha(r);
      return r.mensagem;
    } catch {
      if (geracao === this.geracao) this.emitir({ conexao: "desconectado", mensagem: "Não foi possível confirmar a ação. Sincronize para tentar novamente." });
      return "Não foi possível confirmar a ação. Sincronize para tentar novamente.";
    } finally { if (geracao === this.geracao) this.emitir({ ocupado: false }); }
  }
}
