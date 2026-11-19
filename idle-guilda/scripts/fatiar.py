#!/usr/bin/env python3
"""
Transforma spritesheets geradas por IA em pixel art pronta para o jogo.

Lê arte-fonte/folhas.json, e para cada folha:
  1. recorta as células da grade (cada linha pode ter um número diferente de quadros);
  2. remove o fundo magenta (incluindo as bordas rosadas do JPG);
  3. reduz por média de blocos e binariza a transparência;
  4. unifica todos os quadros numa paleta única, limitada;
  5. espelha, se pedido (heróis olham para a direita, monstros para a esquerda);
  6. salva public/sprites/<nome>.png (quadros lado a lado) e o manifesto src/arte/folhas.json.

Uso: python3 scripts/fatiar.py [nome-da-folha ...]
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageEnhance

RAIZ = Path(__file__).resolve().parent.parent
FONTE = RAIZ / 'arte-fonte'
SAIDA_IMG = RAIZ / 'public' / 'sprites'
MANIFESTO = RAIZ / 'src' / 'arte' / 'folhas.json'
EXTRAS = RAIZ / 'src' / 'arte' / 'extras.json'


def eh_fundo(r, g, b, limite=100, branco=True, verde_max=999):
    """Magenta e suas misturas com o personagem nas bordas do JPG; branco das sobras da grade.
    `limite` maior deixa a chave mais estrita (para personagens com roxos e rosas).
    `branco=False` preserva brilhos brancos (armaduras prateadas).
    `verde_max` só aceita como fundo o magenta quase puro (itens violeta)."""
    if branco and r > 225 and g > 225 and b > 225:
        return True
    return r > limite and b > limite and g < min(r, b) * 0.8 and g < verde_max


def rosado(r, g, b, limite=70):
    """Resto de magenta misturado com o contorno (franja do JPG)."""
    return b > limite and r > limite and g < min(r, b) * 0.7 and abs(r - b) < 90


def chavear(cel, cfg):
    """RGBA com o magenta removido (mesma chave das folhas)."""
    px = cel.load()
    rgba = Image.new('RGBA', cel.size)
    q = rgba.load()
    for y in range(cel.size[1]):
        for x in range(cel.size[0]):
            r, g, b = px[x, y]
            q[x, y] = (0, 0, 0, 0) if eh_fundo(r, g, b, cfg.get('limiteFundo', 100), cfg.get('chaveBranca', True), cfg.get('verdeMax', 999)) else (r, g, b, 255)
    return rgba


def limpar(pequeno, cfg):
    """Binariza a transparência e tira a franja rosada da borda."""
    p = pequeno.load()
    w, h = pequeno.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if a < cfg.get('alfaMinimo', 110):
                p[x, y] = (0, 0, 0, 0)
            else:
                f = 255 / a
                p[x, y] = (min(255, round(r * f)), min(255, round(g * f)), min(255, round(b * f)), 255)
    for _ in range(cfg.get('passadasFranja', 2)):
        copia = pequeno.copy().load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = copia[x, y]
                if a == 0 or not rosado(r, g, b, cfg.get('limiteRosado', 90)):
                    continue
                viz = [copia[x + dx, y + dy][3] if 0 <= x + dx < w and 0 <= y + dy < h else 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                if 0 in viz:
                    p[x, y] = (0, 0, 0, 0)
    return pequeno


def processar_icones(nome, cfg):
    """Grade de ícones: cada célula é recortada no conteúdo, centrada num quadrado e reduzida."""
    im = Image.open(FONTE / cfg['arquivo']).convert('RGB')
    W, H = im.size
    col, lin = cfg.get('colunasGrade', 4), cfg.get('linhasGrade', 4)
    cw, ch = W / col, H / lin
    lado = cfg.get('tamanho', 32)
    icones = []
    for i, _ in enumerate(cfg['nomes']):
        x0, y0 = round((i % col) * cw), round((i // col) * ch)
        rgba = chavear(im.crop((x0, y0, round(x0 + cw), round(y0 + ch))), cfg)
        caixa = rgba.getchannel('A').getbbox()
        cx, cy = (caixa[0] + caixa[2]) / 2, (caixa[1] + caixa[3]) / 2
        m = max(caixa[2] - caixa[0], caixa[3] - caixa[1]) * 1.06
        quad = Image.new('RGBA', (round(m), round(m)), (0, 0, 0, 0))
        quad.paste(rgba, (round(m / 2 - cx), round(m / 2 - cy)))
        icones.append(limpar(quad.resize((lado, lado), Image.Resampling.BOX), cfg))
    junto = Image.new('RGB', (lado * len(icones), lado))
    for i, q in enumerate(icones):
        junto.paste(q.convert('RGB'), (i * lado, 0))
    paleta = junto.quantize(colors=cfg.get('cores', 96), method=Image.Quantize.MEDIANCUT)
    colunas = 8
    folha = Image.new('RGBA', (lado * colunas, lado * ((len(icones) + colunas - 1) // colunas)), (0, 0, 0, 0))
    for i, q in enumerate(icones):
        cor = q.convert('RGB').quantize(palette=paleta, dither=Image.Dither.NONE).convert('RGBA')
        cor.putalpha(q.getchannel('A'))
        folha.paste(cor, ((i % colunas) * lado, (i // colunas) * lado))
    folha.save(SAIDA_IMG / f'{nome}.png')
    return {'imagem': f'sprites/{nome}.png', 'tamanho': lado, 'colunas': colunas, 'indices': {n: i for i, n in enumerate(cfg['nomes'])}}


def processar_cenario(nome, cfg):
    """Recorta uma janela 16:9 em que o chão (fração `chao` da altura da fonte) cai na
    linha onde os lutadores pisam (`alvo` da altura da cena) e reduz para 320x180."""
    im = Image.open(FONTE / cfg['arquivo']).convert('RGB')
    W, H = im.size
    f, a = cfg['chao'], cfg.get('alvo', 0.69)
    h = min(H, W * 9 / 16, f * H / a, (1 - f) * H / (1 - a))
    w = h * 16 / 9
    y0 = f * H - a * h
    x0 = (W - w) / 2
    janela = im.crop((round(x0), round(y0), round(x0 + w), round(y0 + h)))
    reduzida = janela.resize((320, 180), Image.Resampling.BOX)
    # Fundos muito claros apagam lutadores prateados: `brilho` < 1 escurece.
    reduzida = ImageEnhance.Brightness(reduzida).enhance(cfg.get('brilho', 1))
    final = reduzida.quantize(colors=cfg.get('cores', 96), method=Image.Quantize.MEDIANCUT)
    final.save(SAIDA_IMG / f'{nome}.png')
    return {'imagem': f'sprites/{nome}.png'}


def processar(nome, cfg):
    im = Image.open(FONTE / cfg['arquivo']).convert('RGB')
    W, H = im.size
    colunas = cfg.get('colunasGrade', max(cfg['linhas']))
    cw, ch = W / colunas, H / len(cfg['linhas'])
    margem = cfg.get('margem', 4)
    reducao = cfg['reducao']
    larg = int((cw - 2 * margem) // reducao)
    alt = int((ch - 2 * margem) // reducao)

    quadros = []
    for linha, n in enumerate(cfg['linhas']):
        for coluna in range(n):
            x0 = round(coluna * cw) + margem
            y0 = round(linha * ch) + margem
            cel = im.crop((x0, y0, x0 + larg * reducao, y0 + alt * reducao))
            px = cel.load()
            # Alpha pela cor de fundo; RGB pré-multiplicado para a média não puxar magenta.
            rgba = Image.new('RGBA', cel.size)
            q = rgba.load()
            for y in range(cel.size[1]):
                for x in range(cel.size[0]):
                    r, g, b = px[x, y]
                    q[x, y] = (0, 0, 0, 0) if eh_fundo(r, g, b, cfg.get('limiteFundo', 100), cfg.get('chaveBranca', True), cfg.get('verdeMax', 999)) else (r, g, b, 255)
            pequeno = rgba.resize((larg, alt), Image.Resampling.BOX)
            p = pequeno.load()
            for y in range(alt):
                for x in range(larg):
                    r, g, b, a = p[x, y]
                    if a < cfg.get('alfaMinimo', 110):
                        p[x, y] = (0, 0, 0, 0)
                    else:
                        f = 255 / a
                        p[x, y] = (min(255, round(r * f)), min(255, round(g * f)), min(255, round(b * f)), 255)
            # Franja: rosado na borda some; rosado no meio do desenho vira contorno.
            # Com `franjaSoBorda` (personagens roxos), o miolo fica intacto e a borda
            # é limpa em algumas passadas.
            so_borda = cfg.get('franjaSoBorda', False)
            for _ in range(cfg.get('passadasFranja', 2 if so_borda else 1)):
                copia = pequeno.copy().load()
                for y in range(alt):
                    for x in range(larg):
                        r, g, b, a = copia[x, y]
                        if a == 0 or not rosado(r, g, b, cfg.get('limiteRosado', 70)):
                            continue
                        vizinhos = [copia[x + dx, y + dy][3] if 0 <= x + dx < larg and 0 <= y + dy < alt else 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                        if 0 in vizinhos:
                            p[x, y] = (0, 0, 0, 0)
                        elif not so_borda:
                            p[x, y] = (27, 27, 42, 255)
            quadros.append(pequeno)

    # Paleta única para todos os quadros (a mesma cor não varia entre quadros).
    junto = Image.new('RGB', (larg * len(quadros), alt))
    for i, q in enumerate(quadros):
        junto.paste(q.convert('RGB'), (i * larg, 0))
    paleta = junto.quantize(colors=cfg.get('cores', 28), method=Image.Quantize.MEDIANCUT)

    colunas_saida = cfg.get('colunasSaida', 8)
    linhas_saida = (len(quadros) + colunas_saida - 1) // colunas_saida
    folha = Image.new('RGBA', (larg * colunas_saida, alt * linhas_saida), (0, 0, 0, 0))
    for i, q in enumerate(quadros):
        cor = q.convert('RGB').quantize(palette=paleta, dither=Image.Dither.NONE).convert('RGBA')
        alfa = q.getchannel('A')
        cor.putalpha(alfa)
        if cfg.get('espelhar'):
            cor = cor.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        folha.paste(cor, ((i % colunas_saida) * larg, (i // colunas_saida) * alt))

    SAIDA_IMG.mkdir(parents=True, exist_ok=True)
    folha.save(SAIDA_IMG / f'{nome}.png')

    # Âncora: base dos pés e centro dos pés no primeiro quadro (parado). O centro
    # vem só das últimas linhas, para efeitos grandes (juba, asas) não deslocarem o personagem.
    primeiro = quadros[0]
    alfa = primeiro.getchannel('A')
    caixa = alfa.getbbox() or (0, 0, larg, alt)
    pes = alfa.crop((0, max(0, caixa[3] - 6), larg, caixa[3])).getbbox()
    centro = ((pes[0] + pes[2]) / 2) if pes else (caixa[0] + caixa[2]) / 2
    if cfg.get('espelhar'):
        centro = larg - centro
    return {
        'imagem': f'sprites/{nome}.png',
        'largura': larg,
        'altura': alt,
        'colunas': colunas_saida,
        'quadros': len(quadros),
        'pe': caixa[3],
        'centro': round(centro, 1),
        'animacoes': cfg['animacoes'],
        # Criaturas voadoras flutuam acima do chão (em unidades da cena).
        'elevacao': cfg.get('elevacao', 0),
    }


def main():
    config = json.loads((FONTE / 'folhas.json').read_text())
    manifesto = json.loads(MANIFESTO.read_text()) if MANIFESTO.exists() else {}
    extras = json.loads(EXTRAS.read_text()) if EXTRAS.exists() else {'cenarios': {}, 'icones': {}}
    nomes = sys.argv[1:] or list(config)
    SAIDA_IMG.mkdir(parents=True, exist_ok=True)
    for nome in nomes:
        cfg = config[nome]
        tipo = cfg.get('tipo', 'folha')
        if tipo == 'icones':
            extras['icones'][nome] = processar_icones(nome, cfg)
            print(f"{nome}: {len(cfg['nomes'])} ícones")
        elif tipo == 'cenario':
            extras['cenarios'][cfg['cenario']] = processar_cenario(nome, cfg)
            print(f"{nome}: cenário 320x180")
        else:
            manifesto[nome] = processar(nome, cfg)
            m = manifesto[nome]
            print(f"{nome}: {m['quadros']} quadros de {m['largura']}x{m['altura']}, pé em y={m['pe']}")
    MANIFESTO.write_text(json.dumps(manifesto, indent=2, ensure_ascii=False) + '\n')
    EXTRAS.write_text(json.dumps(extras, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
