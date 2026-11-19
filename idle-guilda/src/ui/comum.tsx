import { useEffect, useState, type ReactNode } from 'react';
import { aoMudarImagens, imagemPronta } from '../arte/carregar';
import { iconeDeFolha } from '../arte/extras';
import { desenharQuadro, folha, quadroDa } from '../arte/folhas';
import { HEROIS } from '../arte/herois';
import { iconeItem, ICONES_MATERIAIS } from '../arte/icones';
import { desenhar } from '../arte/sprite';
import { BASES, CONJUNTOS, DADOS_RARIDADE, MATERIAIS, NOME_SLOT } from '../motor/dados/itens';
import { NOME_STAT, PERSONAGENS, STATS } from '../motor/dados/personagens';
import { modsDoItem, statsDoItem } from '../motor/status';
import type { Item, Material, PersonagemId, Stat } from '../motor/tipos';
import { CanvasPixel, Icone } from './pixel';
import { compacto, corRaridade, descreverMod, nomeItem } from './texto';

export function Recurso(props: { tipo: Material | 'ouro'; valor: number; falta?: boolean }) {
  const nome = props.tipo === 'ouro' ? 'Ouro' : MATERIAIS[props.tipo].nome;
  return (
    <span className={`recurso ${props.falta ? 'falta' : ''}`} title={nome}>
      <IconePintado id={props.tipo} tamanho={16} rotulo={nome}>
        <Icone chave={`mat-${props.tipo}`} sprite={ICONES_MATERIAIS[props.tipo]} rotulo={nome} />
      </IconePintado>
      {compacto(Math.floor(props.valor))}
    </span>
  );
}

export function Medidor(props: { rotulo?: string; valor: number; maximo: number; cor: string; texto?: string; fino?: boolean }) {
  const fracao = props.maximo > 0 ? Math.max(0, Math.min(1, props.valor / props.maximo)) : 0;
  return (
    <span className={`medidor ${props.fino ? 'fino' : ''} ${props.rotulo ? '' : 'sem-rotulo'}`}>
      {props.rotulo && <span className="medidor-rotulo">{props.rotulo}</span>}
      <span className="medidor-trilho" role="meter" aria-label={props.rotulo} aria-valuemin={0} aria-valuemax={props.maximo} aria-valuenow={Math.floor(props.valor)}>
        <span className="medidor-cheio" style={{ width: `${fracao * 100}%`, background: props.cor }} />
      </span>
      {props.texto !== undefined && <span className="medidor-texto">{props.texto}</span>}
    </span>
  );
}

/** Lado do canvas do retrato: cabe o quadro de 62 px das folhas sem cortar cabeça nem armas. */
const TAMANHO_RETRATO = 64;

export function Retrato(props: { id: PersonagemId; tamanho?: number; animar?: boolean; apagado?: boolean }) {
  const t = props.tamanho ?? 54;
  return (
    <CanvasPixel
      largura={TAMANHO_RETRATO}
      altura={TAMANHO_RETRATO}
      className={`retrato ${props.apagado ? 'apagado' : ''}`}
      estilo={{ width: t, height: t }}
      rotulo={PERSONAGENS[props.id].nome}
      desenho={(ctx, tempo) => {
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, TAMANHO_RETRATO, TAMANHO_RETRATO);
        // Spritesheet, se houver (quadro inteiro, pés na base); senão o sprite em texto ampliado 3×.
        const f = folha(`heroi-${props.id}`);
        const quadro = f && quadroDa(f, 'parado', props.animar ? tempo * 0.9 : 0);
        if (f && desenharQuadro(ctx, `heroi-${props.id}`, quadro!, TAMANHO_RETRATO / 2, TAMANHO_RETRATO - 2, 1)) return;
        ctx.save();
        ctx.scale(3, 3);
        desenhar(ctx, HEROIS[props.id], 1, props.animar ? Math.floor(tempo * 2) % 2 : 0);
        ctx.restore();
      }}
    />
  );
}

/** Se a imagem já carregou; re-renderiza quando ela carrega ou pode ser tentada de novo. */
function useImagemPronta(url: string | undefined): boolean {
  const [, setVersao] = useState(0);
  useEffect(() => (url ? aoMudarImagens(() => setVersao((v) => v + 1)) : undefined), [url]);
  return url ? imagemPronta(url) !== null : false;
}

/**
 * Ícone vindo de uma folha de ícones pintada (relíquias, materiais...). Sem
 * ícone na folha, mostra `children` (o ícone desenhado em código).
 */
export function IconePintado(props: { id: string; tamanho: number; rotulo?: string; children: ReactNode }) {
  const icone = iconeDeFolha(props.id);
  const pronta = useImagemPronta(icone?.url);
  // Sem ícone na folha, ou enquanto a folha carrega (ou se falhar), fica o desenho em código.
  if (!icone || !pronta) return <>{props.children}</>;
  const escala = props.tamanho / icone.tamanho;
  return (
    <span
      className={`icone icone-pintado ${escala < 1 ? 'reduzido' : ''}`}
      role="img"
      aria-label={props.rotulo ?? ''}
      style={{
        width: props.tamanho,
        height: props.tamanho,
        backgroundImage: `url(${icone.url})`,
        backgroundSize: `${icone.colunas * props.tamanho}px ${icone.linhas * props.tamanho}px`,
        backgroundPosition: `-${(icone.indice % icone.colunas) * props.tamanho}px -${Math.floor(icone.indice / icone.colunas) * props.tamanho}px`,
      }}
    />
  );
}

export function IconeItem(props: { item: Item; escala?: number }) {
  const escala = props.escala ?? 3;
  return (
    <span className={`icone-item raridade-${props.item.raridade}`}>
      <IconePintado id={props.item.base} tamanho={Math.round((escala * 32) / 3)}>
        <Icone chave={`item-${props.item.base}-${props.item.raridade}`} sprite={iconeItem(props.item)} escala={escala} />
      </IconePintado>
    </span>
  );
}

/** Detalhes de um item, com comparação opcional contra o que está equipado. */
export function DetalheItem(props: { item: Item; comparar?: Item; acoes?: ReactNode; compacto?: boolean }) {
  const { item } = props;
  const base = BASES[item.base];
  const stats = statsDoItem(item);
  const antes = props.comparar ? statsDoItem(props.comparar) : null;
  const statsUsados = STATS.filter((s) => stats[s] || antes?.[s]);
  return (
    <div className="item-detalhe">
      <div className="item-topo">
        <IconeItem item={item} />
        <span className="item-nome">
          <strong style={{ color: corRaridade(item) }}>{nomeItem(item)}</strong>
          <small>
            {DADOS_RARIDADE[item.raridade].nome} · {NOME_SLOT[base?.slot === 'acessorio' ? 'acessorio1' : (base?.slot ?? 'reliquia')]}
            {base?.armadura ? ` · ${base.armadura === 'media' ? 'média' : base.armadura}` : ''} · nv {item.nivel}
          </small>
          {item.conjunto && <small className="conjunto">◆ {CONJUNTOS[item.conjunto]?.nome}</small>}
        </span>
      </div>
      {!props.compacto && (
        <ul className="item-stats">
          {statsUsados.map((s: Stat) => {
            const v = stats[s] ?? 0;
            const dif = antes ? v - (antes[s] ?? 0) : 0;
            return (
              <li key={s}>
                {NOME_STAT[s].curto} {compacto(v)}
                {antes && dif !== 0 && <em className={dif > 0 ? 'melhor' : 'pior'}> {dif > 0 ? '▲' : '▼'}{compacto(Math.abs(dif))}</em>}
              </li>
            );
          })}
          {modsDoItem(item).map((m, i) => (
            <li key={`m${i}`} className="afixo">
              {descreverMod(m)}
            </li>
          ))}
        </ul>
      )}
      {props.acoes && <div className="item-acoes">{props.acoes}</div>}
    </div>
  );
}

/** Abas internas de uma tela. */
export function SubAbas<T extends string>(props: { abas: [T, string, boolean?][]; ativa: T; aoTrocar: (a: T) => void }) {
  return (
    <div className="subabas" role="tablist">
      {props.abas.map(([id, rotulo, alerta]) => (
        <button key={id} role="tab" aria-selected={props.ativa === id} className={props.ativa === id ? 'ativa' : ''} onClick={() => props.aoTrocar(id)}>
          {rotulo}
          {alerta && <span className="alerta-mini" aria-hidden />}
        </button>
      ))}
    </div>
  );
}
