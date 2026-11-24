"use client";

import {
  CATEGORIAS_PET,
  CONFIG_PETS,
  CUIDADOS,
  ESPECIES_PET,
  LACO_DE_DOMA,
  LOCAL_CIDADE,
  NOME_CATEGORIA_PET,
  PRECO_LACO,
  bonusDoPet,
  especieDe,
  petUtil,
  precoDeCompra,
  xpParaProximoNivelPet,
  type Personagem,
  type Pet,
  type SlotPet,
} from "@idle-pu/motor";
import { useState } from "react";
import { formatarDuracao, formatarNumero } from "@/lib/atividade";
import type { Agir } from "./acoes";
import { bonusDe } from "./PainelEquipamento";

interface Props {
  readonly personagem: Personagem;
  readonly ocupado: boolean;
  readonly agir: Agir;
}

const NOME_SLOT: Record<SlotPet, string> = { ...NOME_CATEGORIA_PET, cuidado: "Cuidados" };

function Barra({ rotulo, valor, maximo }: { rotulo: string; valor: number; maximo: number }) {
  const pct = Math.round((valor / maximo) * 100);
  return (
    <>
      <span className="suave">{rotulo}</span>
      <div className="progresso" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className={`progresso-preenchido${pct === 0 ? " progresso-cheio" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}

/** Texto dos bônus do pet, como os dos itens. */
function textoBonus(pet: Pet, p: Personagem): string {
  const mods = bonusDoPet(pet, p.status.espirito);
  return bonusDe({ id: "", nome: "", categoria: "equipamento", raridade: "comum", descricao: "", preco: 0, pilha: 1, equipamento: { slot: "arma", tier: 0, precoCompra: null, modificadores: mods } });
}

function CartaoPet({ pet, personagem: p, ocupado, agir }: { pet: Pet } & Props) {
  const [nome, setNome] = useState(pet.nome);
  const e = especieDe(pet);
  const espiritual = e.tipo === "espiritual";
  const proximo = xpParaProximoNivelPet(pet.nivel);
  const slots = (Object.entries(p.petsPorSlot) as [SlotPet, string][]).filter(([, id]) => id === pet.id).map(([s]) => NOME_SLOT[s]);
  return (
    <li className="recurso">
      <div style={{ flex: 1 }}>
        <strong>{pet.nome}</strong>{" "}
        <span className={`selo raridade-${e.raridade}`}>
          {e.nome} · {espiritual ? "espiritual" : `nível ${pet.nivel}`}
        </span>
        <p className="suave">{e.descricao}</p>
        <p className="suave">
          {textoBonus(pet, p)}
          {espiritual ? " (cresce com o Espírito)" : ""}
        </p>
        <p className="suave">{slots.length ? `Em: ${slots.join(", ")}` : "Sem atividade."}{!petUtil(pet) && " · cansado ou com fome: não ajuda"}</p>
        <div className="pet-barras">
          <Barra rotulo={`Energia (${formatarDuracao(pet.energiaMs)})`} valor={pet.energiaMs} maximo={CONFIG_PETS.energiaMaximaMs} />
          {!espiritual && <Barra rotulo={`Saciedade (${formatarDuracao(pet.saciedadeMs)})`} valor={pet.saciedadeMs} maximo={CONFIG_PETS.saciedadeMaximaMs} />}
          {!espiritual && proximo > 0 && <Barra rotulo={`XP ${pet.xp}/${proximo}`} valor={pet.xp} maximo={proximo} />}
          {espiritual && <Barra rotulo="Sincronia" valor={pet.sincroniaMs} maximo={CONFIG_PETS.sincroniaMaximaMs} />}
        </div>
        <div className="campo-linha">
          <input aria-label={`Nome de ${pet.nome}`} value={nome} maxLength={24} onChange={(ev) => setNome(ev.target.value)} />
          <button type="button" className="botao" disabled={ocupado || nome.trim() === pet.nome || !nome.trim()} onClick={() => agir({ tipo: "nomearPet", petId: pet.id, nome })}>
            Renomear
          </button>
          {espiritual ? (
            <button
              type="button"
              className="botao botao-principal"
              disabled={ocupado || p.uniaoRestanteMs > 0 || pet.sincroniaMs < CONFIG_PETS.sincroniaMaximaMs}
              onClick={() => agir({ tipo: "ativarUniao" })}
            >
              {p.uniaoRestanteMs > 0 ? `União: ${formatarDuracao(p.uniaoRestanteMs)}` : "Modo União"}
            </button>
          ) : (
            <button type="button" className="botao" disabled={ocupado} onClick={() => agir({ tipo: "soltarPet", petId: pet.id })}>
              Soltar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Personagem → Pets: os pets, o slot de cada atividade e o modo União. */
export function PainelPets({ personagem: p, ocupado, agir }: Props) {
  return (
    <section className="painel" aria-label="Pets">
      <article className="cartao">
        <h3>Pet por atividade</h3>
        <p className="suave">Cada atividade tem 1 vaga. O mesmo pet pode estar em todas, mas só trabalha (e só cansa) quando você trabalha ali.</p>
        {[...CATEGORIAS_PET, "cuidado" as const].map((s) => (
          <div key={s} className="campo-linha">
            <label htmlFor={`slot-${s}`} style={{ minWidth: "6rem" }}>
              {NOME_SLOT[s]}
            </label>
            <select
              id={`slot-${s}`}
              value={p.petsPorSlot[s] ?? ""}
              disabled={ocupado || p.pets.length === 0}
              onChange={(ev) => agir({ tipo: "atribuirPet", slot: s, petId: ev.target.value || null })}
            >
              <option value="">Nenhum</option>
              {p.pets.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </div>
        ))}
      </article>
      <article className="cartao">
        <h3>
          Pets ({p.pets.filter((x) => especieDe(x).tipo === "real").length} de {CONFIG_PETS.maximo} no Estábulo)
        </h3>
        {p.pets.length === 0 ? (
          <p className="suave">Nenhum pet ainda. Compre no Estábulo (Atividades → Pets) ou dome em combate levando um Laço de doma na mochila.</p>
        ) : (
          <ul className="lista-recursos">
            {p.pets.map((pet) => (
              <CartaoPet key={pet.id} pet={pet} personagem={p} ocupado={ocupado} agir={agir} />
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

/** Atividades → Pets: cuidados (atividades do personagem) e o Estábulo. */
export function PainelCuidados({ personagem: p, ocupado, agir }: Props) {
  const cuidado = p.petsPorSlot.cuidado ? p.pets.find((x) => x.id === p.petsPorSlot.cuidado) : undefined;
  const naCidade = p.localId === LOCAL_CIDADE && !p.viagem;
  const laco = precoDeCompra(p, PRECO_LACO);
  return (
    <section className="painel" aria-label="Cuidados dos pets">
      <article className="cartao">
        <h3>Cuidados</h3>
        <p className="suave">
          {cuidado ? (
            <>
              Recebe os cuidados: <strong>{cuidado.nome}</strong>. Troque em Personagem → Pets.
            </>
          ) : (
            "Escolha o pet que recebe os cuidados em Personagem → Pets."
          )}
        </p>
        <ul className="lista-recursos">
          {CUIDADOS.map((c) => {
            const atual = p.atividade?.id === c.id;
            return (
              <li key={c.id} className={`recurso${atual ? " treino-atual" : ""}${cuidado ? "" : " bloqueado"}`}>
                <div>
                  <strong>{c.nome}</strong>
                  <p className="suave">{c.descricao}</p>
                </div>
                {atual ? (
                  <button type="button" className="botao" disabled={ocupado} onClick={() => agir({ tipo: "pararAtividade" })}>
                    Parar
                  </button>
                ) : (
                  <button type="button" className="botao botao-principal" disabled={ocupado || !cuidado} onClick={() => agir({ tipo: "iniciarAtividade", atividadeId: c.id })}>
                    Começar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="suave nota">Comida para o pet: ração de viagem, pão, ensopado e torta (Taverna) ou lambari.</p>
      </article>
      <article className="cartao" aria-label="Estábulo">
        <div className="nivel-linha">
          <h3>Estábulo</h3>
          <span className="ouro">{formatarNumero(p.ouro, 0)} g</span>
        </div>
        {!naCidade && <p className="suave">O Estábulo fica em Pedravau.</p>}
        <ul className="lista-recursos">
          {ESPECIES_PET.filter((e) => e.preco).map((e) => {
            const preco = precoDeCompra(p, e.preco!);
            return (
              <li key={e.id} className={`recurso${p.ouro < preco ? " bloqueado" : ""}`}>
                <div>
                  <strong>{e.nome}</strong> <span className={`selo raridade-${e.raridade}`}>{formatarNumero(preco, 0)} g</span>
                  <p className="suave">{e.descricao}</p>
                </div>
                <button type="button" className="botao botao-principal" disabled={ocupado || !naCidade || p.ouro < preco} onClick={() => agir({ tipo: "comprarPet", especieId: e.id })}>
                  Comprar
                </button>
              </li>
            );
          })}
          <li className={`recurso${p.ouro < laco ? " bloqueado" : ""}`}>
            <div>
              <strong>Laço de doma</strong> <span className="selo raridade-incomum">{formatarNumero(laco, 0)} g</span>
              <p className="suave">Na mochila, dá chance de domar lobos, javalis, morcegos, sapos-cães, aranhas e enguias ao vencê-los. Você tem {p.mochila[LACO_DE_DOMA] ?? 0}.</p>
            </div>
            <button type="button" className="botao botao-principal" disabled={ocupado || !naCidade || p.ouro < laco} onClick={() => agir({ tipo: "comprarLaco" })}>
              Comprar
            </button>
          </li>
        </ul>
      </article>
    </section>
  );
}
