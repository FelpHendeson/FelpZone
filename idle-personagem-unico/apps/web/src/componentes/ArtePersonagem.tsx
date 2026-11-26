"use client";

import { CATALOGO, gerarSpritePersonagemSvg, type ParametrosMiniatura, type Personagem } from "@idle-pu/motor";
import { useMemo } from "react";
import { cenaDoPersonagem, quadroRaca } from "@/lib/arte";
import { nomeLocal } from "@/lib/atividade";

export function IlustracaoRaca({ racaId }: { racaId: string }) {
  const q = quadroRaca(racaId);
  if (!q) return null;
  return <span role="img" aria-label={`Ilustração de ${CATALOGO.racas.get(racaId)?.nome} em pixel art`} className="ilustracao-raca">
    {/* eslint-disable-next-line @next/next/no-img-element -- atlas local recortado por CSS, carregamento sob demanda */}
    <img src="/arte/racas-v1.webp" width={1774} height={887} loading="lazy" decoding="async" alt="" style={{ left: `${-q.coluna * 100}%`, top: `${-q.linha * 100}%` }} />
  </span>;
}

export function SpritePersonagem({ parametros: p, animado = false }: { parametros: ParametrosMiniatura; animado?: boolean }) {
  const { racaId, coreId, corCabeloId, corRoupaId } = p;
  const fonte = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(gerarSpritePersonagemSvg({ racaId, coreId, corCabeloId, corRoupaId }))}`, [racaId, coreId, corCabeloId, corRoupaId]);
  return <span className={`sprite-personagem${animado ? " sprite-animado" : ""}`} aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- sprite modular local em SVG, dois quadros exatos */}
    <img className="sprite-folha" src={fonte} width={96} height={64} alt="" />
  </span>;
}

export function CenaPersonagem({ personagem: p, leitura = false }: { personagem: Personagem; leitura?: boolean }) {
  const cena = cenaDoPersonagem(p);
  const atividade = p.atividade ? CATALOGO.atividades.get(p.atividade.id)?.nome : undefined;
  const situacao = p.limiar ? "No Limiar" : p.viagem ? `A caminho de ${nomeLocal(p.viagem.destinoLocalId)}` : atividade ?? "Descansando";
  return <figure className="cena-personagem" aria-label={`Cena de ${p.nome}`} data-raca={p.racaId} data-cena={cena.id} data-estado={leitura ? "leitura" : cena.estado}>
    <div className="cena-palco">
      <div className="cena-terreno" aria-hidden="true" style={{ backgroundImage: `url("${cena.arquivo}")`, backgroundPosition: cena.posicao, backgroundSize: cena.tamanho }} />
      <span className="cena-sombra" aria-hidden="true" />
      <div className="cena-ator"><SpritePersonagem parametros={{ racaId: p.racaId, coreId: p.coreId, corCabeloId: p.aparencia.corCabelo, corRoupaId: p.aparencia.corRoupa }} animado={!leitura && cena.estado !== "repouso"} /></div>
    </div>
    <figcaption><div><h2>{p.nome}</h2><p>Nível {p.nivel} · {CATALOGO.racas.get(p.racaId)?.nome} · {CATALOGO.cores.get(p.coreId)?.nome}</p></div>
      <div className="cena-situacao"><strong>{leitura ? "Último estado confirmado" : situacao}</strong><span>{p.limiar ? "O Limiar" : nomeLocal(p.localId)}</span></div>
    </figcaption>
  </figure>;
}
