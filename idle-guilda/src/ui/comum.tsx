import type { ReactNode } from 'react';
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
      <Icone chave={`mat-${props.tipo}`} sprite={ICONES_MATERIAIS[props.tipo]} rotulo={nome} />
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

export function Retrato(props: { id: PersonagemId; tamanho?: number; animar?: boolean; apagado?: boolean }) {
  const t = props.tamanho ?? 54;
  return (
    <CanvasPixel
      largura={40}
      altura={40}
      className={`retrato ${props.apagado ? 'apagado' : ''}`}
      estilo={{ width: t, height: t }}
      rotulo={PERSONAGENS[props.id].nome}
      desenho={(ctx, tempo) => {
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 40, 40);
        // Spritesheet, se houver; senão o sprite em texto ampliado 2×.
        const f = folha(`heroi-${props.id}`);
        if (f && desenharQuadro(ctx, `heroi-${props.id}`, quadroDa(f, 'parado', props.animar ? tempo * 0.9 : 0), 18, 38, 1)) return;
        ctx.save();
        ctx.scale(2, 2);
        desenhar(ctx, HEROIS[props.id], 1, props.animar ? Math.floor(tempo * 2) % 2 : 0);
        ctx.restore();
      }}
    />
  );
}

export function IconeItem(props: { item: Item; escala?: number }) {
  return (
    <span className={`icone-item raridade-${props.item.raridade}`}>
      <Icone chave={`item-${props.item.base}-${props.item.raridade}`} sprite={iconeItem(props.item)} escala={props.escala ?? 3} />
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
