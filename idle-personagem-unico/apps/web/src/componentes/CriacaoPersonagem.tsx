"use client";

import {
  CORES_CABELO,
  CORES_ROUPA,
  NOME_MAX,
  aceitarSorteio,
  definirNomeEAparencia,
  gerarLoreOrigem,
  relogioDoSistema,
  rerolar,
  situacaoSorteio,
  tentativaAtual,
  validarNome,
  type CorPaleta,
  type EstadoJogo,
  type ResultadoAcao,
} from "@idle-pu/motor";
import { useState } from "react";
import { CartoesResultado } from "./CartoesResultado";
import { Miniatura } from "./Miniatura";

interface Props {
  readonly estado: EstadoJogo;
  /** Aplica e grava a ação; devolve a mensagem de erro, se houver. */
  readonly aoAgir: (resultado: ResultadoAcao) => Promise<string | null>;
}

export function CriacaoPersonagem({ estado, aoAgir }: Props) {
  const situacao = situacaoSorteio(estado);
  const resultado = tentativaAtual(estado);
  if (!situacao || !resultado) return <p className="aviso">Não há sorteio em andamento.</p>;
  return situacao.aceito ? <EtapaNome estado={estado} aoAgir={aoAgir} /> : <EtapaSorteio estado={estado} aoAgir={aoAgir} />;
}

function EtapaSorteio({ estado, aoAgir }: Props) {
  const situacao = situacaoSorteio(estado)!;
  const resultado = tentativaAtual(estado)!;
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function agir(resultadoAcao: ResultadoAcao) {
    setOcupado(true);
    setErro(await aoAgir(resultadoAcao));
    setOcupado(false);
  }

  const ultima = situacao.restantes === 0;
  return (
    <section className="criacao" aria-labelledby="titulo-sorteio">
      <header className="criacao-topo">
        <h1 id="titulo-sorteio">Sorteio do personagem</h1>
        <p className="suave">
          Tentativa {situacao.tentativa} de {situacao.maxTentativas}. Orçamento de raridade usado: {resultado.orcamento.gasto} de{" "}
          {resultado.orcamento.saldoInicial}.
        </p>
      </header>

      <CartoesResultado resultado={resultado} lore={gerarLoreOrigem(resultado.origem, resultado.racaId, null)} />

      {ultima && <p className="aviso">Última tentativa: agora só resta aceitar.</p>}
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      <div className="acoes">
        <button type="button" className="botao botao-principal" disabled={ocupado} onClick={() => agir(aceitarSorteio(estado))}>
          Aceitar
        </button>
        {!ultima && (
          <button type="button" className="botao" disabled={ocupado} onClick={() => agir(rerolar(estado))}>
            Rerolar ({situacao.restantes} {situacao.restantes === 1 ? "restante" : "restantes"})
          </button>
        )}
      </div>
    </section>
  );
}

function Paleta({ titulo, cores, valor, aoEscolher }: { titulo: string; cores: readonly CorPaleta[]; valor: string; aoEscolher: (id: string) => void }) {
  return (
    <fieldset className="paleta">
      <legend>{titulo}</legend>
      <div className="paleta-cores" role="radiogroup" aria-label={titulo}>
        {cores.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={c.id === valor}
            aria-label={c.nome}
            title={c.nome}
            className="amostra"
            style={{ background: c.hex }}
            onClick={() => aoEscolher(c.id)}
          />
        ))}
      </div>
      <p className="suave paleta-nome">{cores.find((c) => c.id === valor)?.nome}</p>
    </fieldset>
  );
}

function EtapaNome({ estado, aoAgir }: Props) {
  const resultado = tentativaAtual(estado)!;
  const [nome, setNome] = useState("");
  const [corCabelo, setCorCabelo] = useState(CORES_CABELO[0]!.id);
  const [corRoupa, setCorRoupa] = useState(CORES_ROUPA[0]!.id);
  const [tocado, setTocado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const validacao = validarNome(nome);
  const mensagemNome = tocado && !validacao.ok ? validacao.erro.mensagem : null;

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    setTocado(true);
    if (!validacao.ok) return;
    setOcupado(true);
    setErro(await aoAgir(definirNomeEAparencia(estado, { nome, corCabelo, corRoupa }, relogioDoSistema.agora())));
    setOcupado(false);
  }

  return (
    <section className="criacao" aria-labelledby="titulo-nome">
      <header className="criacao-topo">
        <h1 id="titulo-nome">Nome e aparência</h1>
        <p className="suave">O destino está aceito. Falta dizer quem é.</p>
      </header>

      <form className="form-nome" onSubmit={criar} noValidate>
        <div className="previa">
          <Miniatura parametros={{ racaId: resultado.racaId, coreId: resultado.coreId, corCabeloId: corCabelo, corRoupaId: corRoupa }} tamanho={128} rotulo="Prévia da miniatura de perfil" />
        </div>

        <div className="campo">
          <label htmlFor="campo-nome">Nome</label>
          <input
            id="campo-nome"
            type="text"
            value={nome}
            maxLength={NOME_MAX + 5}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={mensagemNome ? true : undefined}
            aria-describedby="ajuda-nome"
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => setTocado(true)}
          />
          <small id="ajuda-nome" className={mensagemNome ? "erro" : "suave"}>
            {mensagemNome ?? "De 3 a 20 caracteres: letras, números, espaço, hífen e apóstrofo."}
          </small>
        </div>

        <Paleta titulo="Cor do cabelo" cores={CORES_CABELO} valor={corCabelo} aoEscolher={setCorCabelo} />
        <Paleta titulo="Cor da roupa" cores={CORES_ROUPA} valor={corRoupa} aoEscolher={setCorRoupa} />

        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
        <div className="acoes">
          <button type="submit" className="botao botao-principal" disabled={ocupado}>
            Criar personagem
          </button>
        </div>
      </form>
    </section>
  );
}
