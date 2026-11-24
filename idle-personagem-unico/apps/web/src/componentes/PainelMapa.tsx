import {
  ATIVIDADES_COLETA,
  ATIVIDADES_TREINO,
  AREAS_COMBATE,
  CATALOGO,
  EQUIPAMENTOS,
  NOME_SLOT,
  comprarEquipamento,
  FERRAMENTAS,
  LOCAL_CIDADE,
  LOCAIS,
  NOME_OFICIO,
  comprarFerramenta,
  duracaoViagemMs,
  irPara,
  modificadoresDoPersonagem,
  nivelEfetivoOficio,
  precoDeCompra,
  type Personagem,
} from "@idle-pu/motor";
import { formatarDuracao, formatarNumero, nomeLocal } from "@/lib/atividade";
import type { Agir } from "./acoes";
import { bonusDe } from "./PainelEquipamento";
import { PainelMercado } from "./PainelMochila";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
}

function oQueTem(localId: string): string {
  const coisas = [
    ...ATIVIDADES_COLETA.filter((a) => a.localId === localId).map((a) => CATALOGO.itens.get(a.itemId)!.nome),
    ...(ATIVIDADES_TREINO.some((a) => a.localId === localId) ? ["treinos"] : []),
    ...AREAS_COMBATE.filter((a) => a.localId === localId).map((a) => `caça em ${a.nome} (nível ${a.nivelRecomendado})`),
  ];
  return coisas.join(", ");
}

/** Mapa → Região: os locais, a viagem até cada um e o botão de ir. */
export function PainelRegiao({ personagem: p, ocupado, agir }: Props) {
  const mods = modificadoresDoPersonagem(p, p.nivel);
  const regiao = CATALOGO.regioes.get(CATALOGO.locais.get(p.localId)!.regiaoId)!;
  return (
    <section className="painel" aria-label="Região">
      <article className="cartao">
        <h3>{regiao.nome}</h3>
        <p className="suave">{regiao.descricao}</p>
      </article>
      <ul className="lista-treinos">
        {LOCAIS.map((l) => {
          const aqui = l.id === p.localId && !p.viagem;
          const indo = p.viagem?.destinoLocalId === l.id;
          const viagem = duracaoViagemMs(p.localId, l.id, mods);
          return (
            <li key={l.id} className={`cartao treino${aqui ? " treino-atual" : ""}`}>
              <div className="treino-info">
                <h3>
                  {l.nome} {aqui && <span className="selo raridade-incomum">Você está aqui</span>}
                </h3>
                <p className="suave">{l.descricao}</p>
                <p className="suave">Tem: {oQueTem(l.id)}.</p>
                {!aqui && <p className="suave">Viagem: {formatarDuracao(viagem || 0)}</p>}
              </div>
              {!aqui && (
                <button type="button" className="botao" disabled={ocupado || indo} onClick={() => agir((e, agora) => irPara(e, l.id, agora))}>
                  {indo ? "A caminho…" : `Ir para ${l.nome}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Mapa → Local atual: subáreas (movimento instantâneo dentro do local). */
export function PainelLocalAtual({ personagem: p }: { personagem: Personagem }) {
  const l = CATALOGO.locais.get(p.localId)!;
  return (
    <section className="painel" aria-label="Local atual">
      <article className="cartao">
        <h3>{l.nome}</h3>
        <p className="suave">{l.descricao}</p>
        {p.viagem && <p className="aviso">Saindo para {nomeLocal(p.viagem.destinoLocalId)}…</p>}
        <p className="suave nota">Dentro do local, ir de uma subárea a outra é instantâneo.</p>
      </article>
      <ul className="lista-treinos">
        {l.subareas.map((s) => (
          <li key={s.id} className={`cartao treino${s.id === p.subareaId ? " treino-atual" : ""}`}>
            <div className="treino-info">
              <h3>{s.nome}</h3>
              <p className="suave">{s.descricao}</p>
              {s.id === p.subareaId && <p className="suave">O personagem está aqui.</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Mapa → Estabelecimentos: Mercado e Ferreiro (só em Pedravau). */
export function PainelEstabelecimentos({ personagem: p, ocupado, agir }: Props) {
  const naCidade = p.localId === LOCAL_CIDADE && !p.viagem;
  if (!naCidade) {
    const viagem = duracaoViagemMs(p.localId, LOCAL_CIDADE, modificadoresDoPersonagem(p, p.nivel));
    return (
      <section className="painel" aria-label="Estabelecimentos">
        <article className="cartao">
          <h3>Mercado e Ferreiro ficam em {nomeLocal(LOCAL_CIDADE)}</h3>
          <p className="suave">Ir até lá para a atividade atual. A viagem leva {formatarDuracao(viagem)}.</p>
          <div className="acoes">
            <button
              type="button"
              className="botao botao-principal"
              disabled={ocupado || p.viagem?.destinoLocalId === LOCAL_CIDADE}
              onClick={() => agir((e, agora) => irPara(e, LOCAL_CIDADE, agora))}
            >
              {p.viagem?.destinoLocalId === LOCAL_CIDADE ? "A caminho…" : `Ir para ${nomeLocal(LOCAL_CIDADE)}`}
            </button>
          </div>
        </article>
      </section>
    );
  }
  const mods = modificadoresDoPersonagem(p, p.nivel);
  return (
    <section className="painel" aria-label="Estabelecimentos">
      <PainelMercado personagem={p} ocupado={ocupado} agir={agir} />
      <article className="cartao">
        <h3>Ferreiro</h3>
        <p className="suave">Ferramentas melhores rendem mais e trabalham mais rápido. A antiga fica com o Ferreiro.</p>
        <ul className="lista-recursos">
          {FERRAMENTAS.filter((f) => f.preco > 0).map((f) => {
            const atual = CATALOGO.ferramentas.get(p.ferramentas[f.oficio])!;
            const preco = precoDeCompra(p, f.preco);
            const nivel = nivelEfetivoOficio(p, f.oficio, mods);
            const motivo =
              f.grau <= atual.grau ? "Já tem igual ou melhor" : nivel < f.nivelMinimo ? `Exige ${NOME_OFICIO[f.oficio]} ${f.nivelMinimo}` : p.ouro < preco ? "Gold insuficiente" : null;
            return (
              <li key={f.id} className={`recurso${motivo ? " bloqueado" : ""}`}>
                <div>
                  <strong>{f.nome}</strong> <span className={`selo raridade-${f.raridade}`}>{NOME_OFICIO[f.oficio]}</span>
                  <p className="suave">
                    ×{formatarNumero(f.eficiencia, 2)} rendimento · ×{formatarNumero(f.velocidade, 2)} velocidade · {formatarNumero(preco, 0)} g
                  </p>
                  {motivo && <p className="suave">{motivo}.</p>}
                </div>
                <button type="button" className="botao botao-principal" disabled={ocupado || motivo !== null} onClick={() => agir((e, agora) => comprarFerramenta(e, f.id, agora))}>
                  Comprar
                </button>
              </li>
            );
          })}
        </ul>
        <h4 className="subtitulo">Armas e armaduras</h4>
        <ul className="lista-recursos">
          {EQUIPAMENTOS.filter((i) => i.equipamento?.precoCompra).map((i) => {
            const preco = precoDeCompra(p, i.equipamento!.precoCompra!);
            const semOuro = p.ouro < preco;
            return (
              <li key={i.id} className={`recurso${semOuro ? " bloqueado" : ""}`}>
                <div>
                  <strong>{i.nome}</strong> <span className={`selo raridade-${i.raridade}`}>{NOME_SLOT[i.equipamento!.slot]}</span>
                  <p className="suave">
                    {bonusDe(i)} · {formatarNumero(preco, 0)} g
                  </p>
                </div>
                <button type="button" className="botao botao-principal" disabled={ocupado || semOuro} onClick={() => agir((e, agora) => comprarEquipamento(e, i.id, agora))}>
                  Comprar
                </button>
              </li>
            );
          })}
        </ul>
        <p className="suave nota">O que você compra vai para a mochila; equipe em Mochila → Equipáveis.</p>
      </article>
    </section>
  );
}
