import {
  CATALOGO,
  CONFIG_HABILIDADES,
  RAMOS_CORE,
  estagio,
  fatorMaestria,
  nomeComEstagio,
  slotsPassivas,
  xpParaProximaMaestria,
  type Habilidade,
  type Personagem,
} from "@idle-pu/motor";
import { formatarNumero } from "@/lib/atividade";
import type { Agir } from "./acoes";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
}

const ROTULO_ESCOPO: Record<string, string> = { combate: "Combate", coleta: "Coleta", producao: "Produção", viagem: "Viagem", pets: "Pets", geral: "Geral" };

function eixos(h: Habilidade): string {
  const natureza = h.natureza === "fisica" ? "Física" : `Mágica${h.subtipo ? ` (${h.subtipo})` : ""}`;
  const modo = h.modo === "ativa" ? "Ativa" : "Passiva";
  const duracao = h.duracao === "aura" ? "aura" : h.duracao === "com-duracao" ? "com duração" : "permanente";
  return `${modo} · ${natureza} · ${duracao} · ${ROTULO_ESCOPO[h.escopo]}`;
}

function Maestria({ p, id }: { p: Personagem; id: string }) {
  const prog = p.habilidades[id]!;
  const proximo = xpParaProximaMaestria(prog.maestria);
  return (
    <div className="maestria">
      <span className="suave">
        Maestria {prog.maestria}
        {estagio(prog.maestria) > 1 && ` · estágio ${estagio(prog.maestria) === 2 ? "II" : "III"}`} · efeito ×{formatarNumero(fatorMaestria(prog.maestria), 2)}
      </span>
      {proximo > 0 && (
        <div className="progresso" role="progressbar" aria-label="Maestria" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((prog.xp / proximo) * 100)}>
          <div className="progresso-preenchido progresso-xp" style={{ width: `${(prog.xp / proximo) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function Linha({ p, h, children }: { p: Personagem; h: Habilidade; children: React.ReactNode }) {
  return (
    <li className="recurso habilidade">
      <div>
        <strong>{nomeComEstagio(h, p.habilidades[h.id]!.maestria)}</strong> <span className={`selo raridade-${h.raridade}`}>{h.modo === "ativa" ? "Ativa" : "Passiva"}</span>
        <p className="suave">{eixos(h)}</p>
        <p>{h.descricao}</p>
        {h.ativa && <p className="suave">Recarga de {formatarNumero(h.ativa.recargaMs / 1000, 0)} s{h.ativa.efeitos.every((e) => e.tipo === "cura") ? " · só com a vida abaixo de 50%" : ""}</p>}
        {h.passiva?.auraVidaAbaixo !== undefined && <p className="suave">Aura: vale com a vida abaixo de {formatarNumero(h.passiva.auraVidaAbaixo * 100, 0)}%.</p>}
        {h.pendente && <p className="suave">Ainda sem efeito: {h.pendente}</p>}
        <Maestria p={p} id={h.id} />
      </div>
      <div className="botoes-coluna">{children}</div>
    </li>
  );
}

/** Personagem → Habilidades: slots, prioridade, ramo do core, conhecidas e livros. */
export function PainelHabilidades({ personagem: p, ocupado, agir }: Props) {
  const slots = slotsPassivas(p);
  const conhecidas = Object.keys(p.habilidades).map((id) => CATALOGO.habilidades.get(id)!);
  const livres = conhecidas.filter((h) => !p.ativasEquipadas.includes(h.id) && !p.passivasEquipadas.includes(h.id));
  const livros = Object.keys(p.mochila).filter((id) => CATALOGO.itens.get(id)?.livro);
  const ramos = RAMOS_CORE.filter((r) => r.coreId === p.coreId);
  const ramoAtual = p.ramoId ? CATALOGO.ramos.get(p.ramoId) : undefined;
  const botao = (rotulo: string, acao: Parameters<Agir>[0], principal = false, desabilitado = false) => (
    <button type="button" className={`botao${principal ? " botao-principal" : ""}`} disabled={ocupado || desabilitado} onClick={() => agir(acao)}>
      {rotulo}
    </button>
  );

  return (
    <section className="painel" aria-label="Habilidades">
      <article className="cartao">
        <h3>Ramo de {CATALOGO.cores.get(p.coreId)!.nome}</h3>
        {ramoAtual ? (
          <p>
            <strong>{ramoAtual.nome}</strong>: {ramoAtual.descricao}
          </p>
        ) : p.nivel < CONFIG_HABILIDADES.nivelRamo ? (
          <p className="suave">
            No nível {CONFIG_HABILIDADES.nivelRamo} o core abre dois caminhos: {ramos.map((r) => r.nome).join(" ou ")}. A escolha é para sempre.
          </p>
        ) : (
          <ul className="lista-recursos">
            {ramos.map((r) => {
              const h = CATALOGO.habilidades.get(r.habilidadeId)!;
              return (
                <li key={r.id} className="recurso">
                  <div>
                    <strong>{r.nome}</strong>
                    <p className="suave">{r.descricao}</p>
                    <p>
                      Ensina <strong>{h.nome}</strong>: {h.descricao}
                    </p>
                  </div>
                  {botao("Escolher", { tipo: "escolherRamo", ramoId: r.id }, true)}
                </li>
              );
            })}
          </ul>
        )}
      </article>

      <article className="cartao">
        <div className="nivel-linha">
          <h3>Ativas</h3>
          <span className="suave">
            {p.ativasEquipadas.length}/{CONFIG_HABILIDADES.slotsAtivas} · disparam sozinhas, na ordem
          </span>
        </div>
        {p.ativasEquipadas.length === 0 && <p className="suave">Nenhuma ativa equipada.</p>}
        <ol className="lista-recursos">
          {p.ativasEquipadas.map((id, i) => (
            <Linha key={id} p={p} h={CATALOGO.habilidades.get(id)!}>
              {botao("↑ Subir", { tipo: "moverPrioridade", habilidadeId: id, direcao: -1 }, false, i === 0)}
              {botao("↓ Descer", { tipo: "moverPrioridade", habilidadeId: id, direcao: 1 }, false, i === p.ativasEquipadas.length - 1)}
              {botao("Tirar", { tipo: "desequiparHabilidade", habilidadeId: id })}
            </Linha>
          ))}
        </ol>
      </article>

      <article className="cartao">
        <div className="nivel-linha">
          <h3>Passivas</h3>
          <span className="suave">
            {p.passivasEquipadas.length}/{slots} · +1 slot a cada {CONFIG_HABILIDADES.niveisPorSlotPassiva} níveis
          </span>
        </div>
        {p.passivasEquipadas.length === 0 && <p className="suave">Nenhuma passiva equipada.</p>}
        <ul className="lista-recursos">
          {p.passivasEquipadas.map((id) => (
            <Linha key={id} p={p} h={CATALOGO.habilidades.get(id)!}>
              {botao("Tirar", { tipo: "desequiparHabilidade", habilidadeId: id })}
            </Linha>
          ))}
        </ul>
      </article>

      <article className="cartao">
        <h3>Conhecidas, fora dos slots</h3>
        <p className="suave nota">Escolha o build conforme a atividade: passivas de coleta só ajudam coletando; as de combate, caçando.</p>
        {livres.length === 0 && <p className="suave">Todas as habilidades conhecidas estão equipadas.</p>}
        <ul className="lista-recursos">
          {livres.map((h) => {
            const cheio = h.modo === "ativa" ? p.ativasEquipadas.length >= CONFIG_HABILIDADES.slotsAtivas : p.passivasEquipadas.length >= slots;
            return (
              <Linha key={h.id} p={p} h={h}>
                {botao(cheio ? "Slots cheios" : "Equipar", { tipo: "equiparHabilidade", habilidadeId: h.id }, true, cheio)}
              </Linha>
            );
          })}
        </ul>
      </article>

      {livros.length > 0 && (
        <article className="cartao">
          <h3>Livros na mochila</h3>
          <ul className="lista-recursos">
            {livros.map((id) => {
              const item = CATALOGO.itens.get(id)!;
              const sabe = Boolean(p.habilidades[item.livro!.habilidadeId]);
              return (
                <li key={id} className={`recurso${sabe ? " bloqueado" : ""}`}>
                  <div>
                    <strong>{item.nome}</strong>
                    <p className="suave">{item.descricao}</p>
                  </div>
                  {botao(sabe ? "Já sabe" : "Ler", { tipo: "lerLivro", itemId: id }, true, sabe)}
                </li>
              );
            })}
          </ul>
        </article>
      )}
    </section>
  );
}

/** Atividades → Aprendizado: praticar uma habilidade (maestria). */
export function PainelAprendizado({ personagem: p, ocupado, agir }: Props) {
  const praticando = p.atividade?.id === "praticar-habilidade" ? p.atividade.habilidadeId : undefined;
  return (
    <section className="painel" aria-label="Aprendizado">
      <p className="suave nota">Praticar no Campo de Treino de Pedravau: 10 de maestria por ciclo de 30 s. Usar a habilidade (ativa disparada, passiva em ação) também dá maestria, mais devagar.</p>
      <ul className="lista-recursos">
        {Object.keys(p.habilidades).map((id) => {
          const h = CATALOGO.habilidades.get(id)!;
          const maxima = p.habilidades[id]!.maestria >= CONFIG_HABILIDADES.maestriaMaxima;
          return (
            <li key={id} className={`recurso${praticando === id ? " treino-atual" : ""}`}>
              <div>
                <strong>{nomeComEstagio(h, p.habilidades[id]!.maestria)}</strong> <span className="suave">· {h.modo === "ativa" ? "ativa" : "passiva"}</span>
                <Maestria p={p} id={id} />
              </div>
              {praticando === id ? (
                <button type="button" className="botao" disabled={ocupado} onClick={() => agir({ tipo: "pararAtividade" })}>
                  Parar
                </button>
              ) : (
                <button type="button" className="botao botao-principal" disabled={ocupado || maxima} onClick={() => agir({ tipo: "iniciarAprendizado", habilidadeId: id })}>
                  {maxima ? "Máxima" : "Praticar"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
