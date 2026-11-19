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

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
FONTE = RAIZ / 'arte-fonte'
SAIDA_IMG = RAIZ / 'public' / 'sprites'
MANIFESTO = RAIZ / 'src' / 'arte' / 'folhas.json'


def eh_fundo(r, g, b, limite=100):
    """Magenta e suas misturas com o personagem nas bordas do JPG; branco das sobras da grade.
    `limite` maior deixa a chave mais estrita (para personagens com roxos e rosas)."""
    if r > 225 and g > 225 and b > 225:
        return True
    return r > limite and b > limite and g < min(r, b) * 0.8


def rosado(r, g, b, limite=70):
    """Resto de magenta misturado com o contorno (franja do JPG)."""
    return b > limite and r > limite and g < min(r, b) * 0.7 and abs(r - b) < 90


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
                    q[x, y] = (0, 0, 0, 0) if eh_fundo(r, g, b, cfg.get('limiteFundo', 100)) else (r, g, b, 255)
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
    }


def main():
    config = json.loads((FONTE / 'folhas.json').read_text())
    manifesto = json.loads(MANIFESTO.read_text()) if MANIFESTO.exists() else {}
    nomes = sys.argv[1:] or list(config)
    for nome in nomes:
        manifesto[nome] = processar(nome, config[nome])
        m = manifesto[nome]
        print(f"{nome}: {m['quadros']} quadros de {m['largura']}x{m['altura']}, pé em y={m['pe']}")
    MANIFESTO.write_text(json.dumps(manifesto, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
