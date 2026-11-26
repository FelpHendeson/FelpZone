import { describe, expect, it, vi } from "vitest";
import { criarArmazenamentoEmMemoria, criarEstadoInicial, serializarSave } from "@idle-pu/motor";
import { ClienteConta, type SituacaoConta } from "./clienteConta";
import { chaveDaConta, CHAVE_LEGADO, CHAVE_SAVE, isolarSaveLegado } from "./persistencia";
import { acao, iniciarJogoOnline, obterJogo, registrar, type Resposta } from "../servidor/api";
import { ArmazemMemoria } from "../servidor/armazem";

const T0 = 1_800_000_000_000;
const sessao = { nome: "ana", token: "token-ana" };
const corpo = (semente: string, revisao = 0) => ({ save: serializarSave(criarEstadoInicial(semente, T0)), revisao, procedencia: "servidor" });
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });

describe("identidade e cache do cliente", () => {
  it("mantém o cache online separado do convidado e não simula offline", async () => {
    const local = serializarSave(criarEstadoInicial("convidado", T0));
    const cache = corpo("ana");
    const arm = criarArmazenamentoEmMemoria({ [CHAVE_SAVE]: local, [chaveDaConta("ana")]: JSON.stringify(cache) });
    const buscar = vi.fn<typeof fetch>().mockRejectedValue(new Error("sem rede"));
    const cliente = new ClienteConta(arm, () => {}, buscar);
    await cliente.conectar(sessao);
    expect(cliente.atual?.conexao).toBe("desconectado");
    expect(cliente.atual?.jogo?.estado.ultimoTick).toBe(T0);
    expect(await arm.ler(CHAVE_SAVE)).toBe(local);
    expect(await arm.ler(chaveDaConta("bia"))).toBeNull();
  });
  it("preserva o save compartilhado legado sem torná-lo o convidado", async () => {
    const arm = criarArmazenamentoEmMemoria({ [CHAVE_SAVE]: "save-da-conta" });
    await isolarSaveLegado(arm, true);
    expect(await arm.ler(CHAVE_SAVE)).toBeNull();
    expect(await arm.ler(CHAVE_LEGADO)).toBe("save-da-conta");
    await arm.gravar(CHAVE_SAVE, "convidado-novo");
    await isolarSaveLegado(arm, false);
    expect(await arm.ler(CHAVE_SAVE)).toBe("convidado-novo");
  });
  it("uma resposta tardia de A não troca o estado de B", async () => {
    let liberar!: (r: Response) => void;
    const buscar = vi.fn<typeof fetch>().mockImplementation(() => new Promise((resolve) => { liberar = resolve; }));
    const atualizacoes: SituacaoConta[] = [];
    const arm = criarArmazenamentoEmMemoria();
    const cliente = new ClienteConta(arm, (s) => atualizacoes.push(s), buscar);
    await cliente.conectar(sessao, corpo("ana"));
    const pendente = cliente.enviar({ tipo: "aceitarSorteio" });
    await vi.waitFor(() => expect(buscar).toHaveBeenCalledOnce());
    await cliente.conectar({ nome: "bia", token: "token-bia" }, corpo("bia"));
    liberar(resposta(corpo("ana", 1)));
    await pendente;
    expect(cliente.atual?.sessao.nome).toBe("bia");
    expect(cliente.atual?.jogo?.estado.semente).toBe("bia");
    expect(atualizacoes.at(-1)?.sessao.nome).toBe("bia");
    expect(JSON.parse((await arm.ler(chaveDaConta("bia")))!).save).toContain('"semente":"bia"');
  });
  it("401 mantém a identidade expirada e nunca libera ações locais", async () => {
    const buscar = vi.fn<typeof fetch>().mockResolvedValue(resposta({ erro: { codigo: "sem_sessao", mensagem: "Expirou" } }, 401));
    const cliente = new ClienteConta(criarArmazenamentoEmMemoria(), () => {}, buscar);
    await cliente.conectar(sessao, corpo("ana"));
    expect(await cliente.enviar({ tipo: "aceitarSorteio" })).toBe("Expirou");
    expect(cliente.atual?.conexao).toBe("expirado");
    expect(cliente.atual?.sessao).toEqual(sessao);
    await cliente.enviar({ tipo: "rerolar" });
    expect(buscar).toHaveBeenCalledOnce();
  });
});

describe("cliente e API sob falha de rede", () => {
  it("recupera a mesma ação após perda da resposta e reload, sem executar duas vezes", async () => {
    const banco = new ArmazemMemoria(() => T0);
    const p = { token: null as string | null, corpo: { nome: "ana", senha: "senha-forte" } as unknown, agora: T0, ip: "teste" };
    const registro = await registrar(banco, p);
    const s = { nome: "ana", token: registro.corpo.token as string };
    const inicial = await iniciarJogoOnline(banco, { ...p, token: s.token, corpo: {} });
    const pedidos: unknown[] = [];
    let perder = true;
    let resultado!: Resposta;
    const buscar = vi.fn<typeof fetch>().mockImplementation(async (url, opcoes) => {
      const pedido = { ...p, token: s.token, corpo: opcoes?.body ? JSON.parse(String(opcoes.body)) : {} };
      if (String(url).endsWith("jogo/acao")) {
        pedidos.push(pedido.corpo);
        resultado = await acao(banco, pedido);
        if (perder) { perder = false; throw new Error("resposta perdida depois do commit"); }
      } else resultado = await obterJogo(banco, pedido);
      return resposta(resultado.corpo, resultado.status);
    });
    const arm = criarArmazenamentoEmMemoria();
    const primeiro = new ClienteConta(arm, () => {}, buscar);
    await primeiro.conectar(s, inicial.corpo);
    expect(await primeiro.enviar({ tipo: "aceitarSorteio" })).toBe("Sem conexão com o servidor.");
    primeiro.encerrar();
    const segundo = new ClienteConta(arm, () => {}, buscar);
    await segundo.conectar(s);
    expect(pedidos).toHaveLength(2);
    expect(pedidos[1]).toEqual(pedidos[0]);
    expect(segundo.atual?.jogo?.revisao).toBe(1);
    expect(segundo.atual?.conexao).toBe("online");
    expect(await arm.ler(`${chaveDaConta("ana")}:pendente`)).toBeNull();
  });
});
