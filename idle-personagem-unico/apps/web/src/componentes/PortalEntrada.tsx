"use client";

import { CATALOGO, MAX_PERSONAGENS, personagemAtivo, type EstadoJogo } from "@idle-pu/motor";
import type { ReactNode } from "react";
import type { Sessao } from "@/lib/sync";
import { Miniatura } from "./Miniatura";

export function MolduraEntrada({ children, aoInicio, sessao }: { children: ReactNode; aoInicio?: () => void; sessao: Sessao | null }) {
  return <div className="entrada">
    <header className="entrada-cabecalho">
      <button type="button" className="entrada-marca" onClick={aoInicio} disabled={!aoInicio} aria-label="Voltar à apresentação">
        {/* eslint-disable-next-line @next/next/no-img-element -- ícone local, disponível offline */}
        <img src="/icones/icone.svg" alt="" width={32} height={32} />
        <span>Personagem Único</span>
      </button>
      <span className="entrada-identidade">{sessao ? `Conta de ${sessao.nome}` : "Idle RPG"}</span>
    </header>
    <main id="conteudo" className="entrada-conteudo">{children}</main>
    <footer className="entrada-rodape">Uma atividade por vez. Uma história que continua.</footer>
  </div>;
}

export function Apresentacao({ estado, sessao, aoAcesso, aoLocal, aoConta, aviso }: {
  estado: EstadoJogo | null; sessao: Sessao | null; aoAcesso: (modo: "entrar" | "registrar") => void;
  aoLocal: () => void; aoConta: () => void; aviso: ReactNode;
}) {
  const p = estado ? personagemAtivo(estado) : null;
  return <MolduraEntrada sessao={sessao}>
    <div className="entrada-hero">
      <section className="entrada-apresentacao">
        <h1 tabIndex={-1}>Um destino para chamar de seu.</h1>
        <p className="entrada-lead">Sorteie um personagem. Escolha o que ele faz. Acompanhe quem ele se torna.</p>
        <p className="entrada-descricao">Treine, colete, produza e enfrente o desconhecido. Seu personagem segue trabalhando por até 12 horas enquanto você está fora.</p>
        {aviso}
        <div className="entrada-acoes">
          {sessao ? <button type="button" className="botao botao-principal" onClick={aoConta}>Escolher personagem</button> : <>
            <button type="button" className="botao botao-principal" onClick={() => aoAcesso("entrar")}>Entrar na minha conta</button>
            <button type="button" className="botao" onClick={() => aoAcesso("registrar")}>Criar uma conta</button>
          </>}
        </div>
        {!sessao && <div className="entrada-local">
          <button type="button" className="link" onClick={aoLocal}>{p ? `Continuar com ${p.nome} neste aparelho` : estado?.conta.sorteio ? "Continuar criação neste aparelho" : "Jogar neste aparelho"}</button>
          <p>Na conta, a jornada acompanha você entre aparelhos. No modo local, fica apenas neste navegador.</p>
        </div>}
      </section>
      <aside className="entrada-retrato" aria-label={p ? "Sua última jornada" : "O destino ainda não foi revelado"}>
        <div className="entrada-arco">
          {p ? <Miniatura tamanho={160} rotulo={`Retrato de ${p.nome}`} parametros={{ racaId: p.racaId, coreId: p.coreId, corCabeloId: p.aparencia.corCabelo, corRoupaId: p.aparencia.corRoupa }} /> :
            /* eslint-disable-next-line @next/next/no-img-element -- emblema local do jogo */
            <img src="/icones/icone.svg" width={180} height={180} alt="Uma figura sob a lua, no círculo do destino" />}
        </div>
        <p>{p ? p.nome : "Quem você será?"}</p>
        <span>{p ? `Nível ${p.nivel} · ${CATALOGO.racas.get(p.racaId)?.nome}` : "Raça, core e origem dão início à sua história."}</span>
      </aside>
    </div>
    <section className="entrada-pilares" aria-label="Como a jornada funciona">
      <div><h2>Você escolhe o rumo</h2><p>Uma atividade por vez. Equipamento, habilidades e lugar fazem a diferença.</p></div>
      <div><h2>O tempo faz parte</h2><p>Volte para descobrir o que mudou e decidir o próximo passo.</p></div>
      <div><h2>Até a morte é caminho</h2><p>O Limiar abre outra travessia. Sua história não termina ali.</p></div>
    </section>
  </MolduraEntrada>;
}

export function SelecaoPersonagens({ estado, sessao, ocupado, aoJogar, aoCriar, aoContinuarCriacao, aoInicio, aoAcesso, aviso, controles, podeIniciar, aoImportar }: {
  estado: EstadoJogo | null; sessao: Sessao | null; ocupado: boolean; aoJogar: (id: string) => void;
  aoCriar: () => void; aoContinuarCriacao: () => void; aoInicio: () => void; aoAcesso: () => void;
  aviso: ReactNode; controles: ReactNode; podeIniciar: boolean; aoImportar?: (() => void) | undefined;
}) {
  const personagens = estado?.conta.personagens ?? [];
  const sorteio = estado?.conta.sorteio;
  const pergaminhos = estado?.conta.cofre.pergaminhos ?? 0;
  const novoDisponivel = podeIniciar && !sorteio && personagens.length < MAX_PERSONAGENS && (personagens.length === 0 || pergaminhos > 0);
  return <MolduraEntrada sessao={sessao} aoInicio={aoInicio}>
    <header className="entrada-titulo"><h1 tabIndex={-1}>{personagens.length ? "Suas jornadas" : "Seu primeiro destino"}</h1><p>{sessao ? "Escolha com quem continuar. Seu progresso está ligado à conta." : "Esta jornada fica neste aparelho. Você pode conectar uma conta quando quiser."}</p></header>
    {aviso}{controles}
    {sorteio && <section className="entrada-pendente"><div><h2>Um destino está em criação</h2><p>Continue da tentativa em que parou. Navegar ou recarregar não devolve chances.</p></div><button type="button" className="botao botao-principal" disabled={ocupado} onClick={aoContinuarCriacao}>Continuar criação</button></section>}
    <section aria-label="Seleção de personagens" className="entrada-jornadas">
      {personagens.map((p) => <article className="entrada-personagem" key={p.id}>
        <Miniatura tamanho={80} rotulo={`Retrato de ${p.nome}`} parametros={{ racaId: p.racaId, coreId: p.coreId, corCabeloId: p.aparencia.corCabelo, corRoupaId: p.aparencia.corRoupa }} />
        <div><h2>{p.nome}</h2><p>Nível {p.nivel} · {CATALOGO.racas.get(p.racaId)?.nome}</p><p className="suave">{CATALOGO.cores.get(p.coreId)?.nome}</p></div>
        <button type="button" className="botao botao-principal" disabled={ocupado || !!sorteio || (!podeIniciar && estado?.conta.personagemAtivoId !== p.id)} onClick={() => aoJogar(p.id)}>Continuar com {p.nome}</button>
      </article>)}
      {personagens.length < MAX_PERSONAGENS && !sorteio && <article className="entrada-novo">
        <h2>{personagens.length ? "Outra existência" : "O destino ainda está por vir"}</h2>
        <p>{personagens.length ? `Um novo personagem usa 1 Pergaminho do Novo Destino. Você tem ${pergaminhos}.` : "Descubra sua raça, core e origem. Depois, dê nome à sua história."}</p>
        <button type="button" className="botao" disabled={ocupado || !novoDisponivel} onClick={aoCriar}>{personagens.length ? "Novo personagem" : "Sortear meu personagem"}</button>
        {!podeIniciar && <p className="suave">Sincronize a conta para continuar.</p>}
        {personagens.length > 0 && pergaminhos === 0 && <p className="suave">Conquiste pergaminhos avançando na Guilda. Até {MAX_PERSONAGENS} personagens; só o escolhido trabalha.</p>}
        {aoImportar && <div className="entrada-importar"><p>Já tem uma jornada neste aparelho? A importação é única e casual, sem publicar builds competitivos.</p><button type="button" className="link" disabled={ocupado} onClick={aoImportar}>Importar jornada deste aparelho</button></div>}
      </article>}
    </section>
    <div className="entrada-retorno"><button type="button" className="link" onClick={aoAcesso}>{sessao ? "Gerenciar conta" : "Entrar ou criar conta"}</button><button type="button" className="link" onClick={aoInicio}>Voltar à apresentação</button></div>
  </MolduraEntrada>;
}
