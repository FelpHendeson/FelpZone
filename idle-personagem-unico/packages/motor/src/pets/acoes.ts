/** Ações dos pets (F10): Estábulo, nomes, slots, soltar e União. */
import { CONFIG_PETS, LACO_DE_DOMA, PRECO_LACO } from "../dados/pets";
import { capacidadeDe, comAtivo, erro, falha, naCidade, precoDeCompra, type ResultadoAtividade } from "../atividades/acoes";
import { adicionarItens } from "../personagem/mochila";
import { fator, modificadoresDoPersonagem } from "../personagem/progressao";
import type { EstadoJogo } from "../save";
import { ESPECIES, especieDe, novoPet, SLOTS_PET, type SlotPet } from "./pets";

const reais = (pets: readonly { especieId: string }[]) => pets.filter((x) => especieDe(x).tipo === "real").length;

/** Compra um pet no Estábulo de Pedravau. */
export function comprarPet(estado: EstadoJogo, especieId: string, agora: number): ResultadoAtividade {
  const e = ESPECIES.get(especieId);
  if (!e?.preco) return falha("pet_inexistente", "O Estábulo não vende esse pet.");
  return comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "O Estábulo fica em Pedravau.");
    if (reais(p.pets) >= CONFIG_PETS.maximo) return erro("estabulo_cheio", `O Estábulo guarda até ${CONFIG_PETS.maximo} pets.`);
    const preco = precoDeCompra(p, e.preco!);
    if (p.ouro < preco) return erro("ouro_insuficiente", `Custa ${preco} de gold.`);
    const id = `pet-${p.petsCriados + 1}`;
    return { ...p, ouro: p.ouro - preco, petsCriados: p.petsCriados + 1, pets: [...p.pets, novoPet(id, e.id, e.nome)] };
  });
}

/** Compra um Laço de doma (Estábulo). */
export function comprarLaco(estado: EstadoJogo, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    if (!naCidade(p)) return erro("fora_da_cidade", "O Estábulo fica em Pedravau.");
    const preco = precoDeCompra(p, PRECO_LACO);
    if (p.ouro < preco) return erro("ouro_insuficiente", `Custa ${preco} de gold.`);
    const r = adicionarItens(p.mochila, LACO_DE_DOMA, 1, capacidadeDe(p));
    if (r.aceitos === 0) return erro("mochila_cheia", "Não há espaço na mochila.");
    return { ...p, ouro: p.ouro - preco, mochila: r.mochila };
  });
}

/** Dá nome ao pet (1 a 24 caracteres). */
export function nomearPet(estado: EstadoJogo, petId: string, nome: string, agora: number): ResultadoAtividade {
  const limpo = typeof nome === "string" ? nome.trim().replace(/\s+/g, " ") : "";
  if (limpo.length < 1 || limpo.length > 24) return falha("nome_invalido", "O nome do pet tem de 1 a 24 caracteres.");
  return comAtivo(
    estado,
    agora,
    (p) => (p.pets.some((x) => x.id === petId) ? { ...p, pets: p.pets.map((x) => (x.id === petId ? { ...x, nome: limpo } : x)) } : erro("pet_inexistente", "Pet desconhecido.")),
    true,
  );
}

/** Põe um pet num slot (ou tira, com `null`). O mesmo pet pode estar em todos. */
export function atribuirPet(estado: EstadoJogo, slot: SlotPet, petId: string | null, agora: number): ResultadoAtividade {
  if (!SLOTS_PET.includes(slot)) return falha("slot_invalido", "Slot inválido.");
  return comAtivo(
    estado,
    agora,
    (p) => {
      if (petId !== null && !p.pets.some((x) => x.id === petId)) return erro("pet_inexistente", "Pet desconhecido.");
      const slots = { ...p.petsPorSlot };
      if (petId === null) delete slots[slot];
      else slots[slot] = petId;
      return { ...p, petsPorSlot: slots };
    },
    true,
  );
}

/** Solta um pet real (vai embora). A besta vinculada não pode ser perdida. */
export function soltarPet(estado: EstadoJogo, petId: string, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    const pet = p.pets.find((x) => x.id === petId);
    if (!pet) return erro("pet_inexistente", "Pet desconhecido.");
    if (especieDe(pet).tipo === "espiritual") return erro("pet_espiritual", "A besta vinculada não pode ser solta.");
    const slots = { ...p.petsPorSlot };
    for (const s of SLOTS_PET) if (slots[s] === petId) delete slots[s];
    return { ...p, pets: p.pets.filter((x) => x.id !== petId), petsPorSlot: slots };
  });
}

/** Modo União (só espirituais): com a Sincronia cheia, dobra o bônus por 10 min (15 para o Fruto do Vínculo). */
export function ativarUniao(estado: EstadoJogo, agora: number): ResultadoAtividade {
  return comAtivo(estado, agora, (p) => {
    const besta = p.pets.find((x) => especieDe(x).tipo === "espiritual");
    if (!besta) return erro("pet_inexistente", "Só a besta vinculada tem o modo União.");
    if (p.uniaoRestanteMs > 0) return erro("uniao_ativa", "A União já está ativa.");
    if (besta.sincroniaMs < CONFIG_PETS.sincroniaMaximaMs) return erro("sincronia_incompleta", "A Sincronia ainda não está cheia.");
    const duracao = Math.min(CONFIG_PETS.uniaoMaximaMs, Math.round(CONFIG_PETS.uniaoMs * fator(modificadoresDoPersonagem(p, p.nivel), "pets.uniao")));
    return { ...p, uniaoRestanteMs: duracao, pets: p.pets.map((x) => (x.id === besta.id ? { ...x, sincroniaMs: 0 } : x)) };
  });
}
