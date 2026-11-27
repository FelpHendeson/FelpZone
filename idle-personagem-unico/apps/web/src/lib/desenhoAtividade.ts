import type { GestoAtividade } from "./animacaoAtividade";

type Pose = readonly [x: number, y: number, inclinacao: number, altura: number];
const POSES: Partial<Record<GestoAtividade, readonly Pose[]>> = {
  corrida: [[-7, 0, .11, 1], [1, -11, .13, 1], [8, 0, .11, 1], [1, -10, .13, 1]],
  pedras: [[0, 1, .08, .85], [0, 0, .09, .9], [0, -2, 0, 1], [0, 0, .05, .92]],
  impacto: [[0, 0, 0, 1], [-8, 0, -.05, 1], [5, 0, .04, 1], [-3, 0, 0, 1]],
  obstaculos: [[-20, 0, .08, 1], [-3, -20, .07, 1], [16, -24, .02, 1], [22, 0, .05, .93]],
  tomos: [[0, 0, .04, .97], [0, 0, .05, .95], [0, 0, .02, .97], [0, 0, .04, .97]],
  dados: [[0, 0, 0, 1], [0, 0, .04, .96], [5, 0, .07, 1], [0, 0, 0, 1]],
  meditacao: [[0, -3, 0, .98], [0, -8, 0, 1], [0, -13, 0, 1], [0, -7, 0, .98]],
  vigilia: [[0, 0, -.06, 1], [0, 0, -.02, 1], [0, 0, .07, 1], [0, 0, .02, 1]],
  agricultura: [[0, 0, 0, 1], [5, 0, .1, .9], [4, 0, .08, .89], [0, 0, 0, 1]],
};

function poligono(ctx: CanvasRenderingContext2D, cor: string, pontos: readonly (readonly [number, number])[]) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  pontos.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.closePath();
  ctx.fill();
}

export function desenharQuadroDeAtividade(ctx: CanvasRenderingContext2D, folha: HTMLCanvasElement, q: number, gesto?: GestoAtividade, variante = 1) {
  const poses = gesto && POSES[gesto];
  ctx.save();
  if (poses) {
    const [x, y, inclinacao, altura] = poses[q]!;
    ctx.translate(128 + x, 235 + y);
    ctx.transform(1, 0, -inclinacao, altura, 0, 0);
    ctx.translate(-128, -235);
  }
  ctx.drawImage(folha, q * 256, 0, 256, 256, 0, 0, 256, 256);
  ctx.restore();
  if (!gesto) return;

  const caixa = (cor: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = cor;
    ctx.fillRect(x, y, w, h);
  };
  const haste = (cor: string, x: number, y: number, giro: number, cabeca?: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    caixa("#39212a", -5, -66, 10, 81);
    caixa(cor, -3, -64, 5, 77);
    if (cabeca) {
      caixa("#292334", -14, -70, 28, 18);
      caixa(cabeca, -11, -69, 22, 12);
      caixa("#e3d8be", -9, -68, 15, 3);
    }
    ctx.restore();
  };
  const faiscas = (cor: string, x: number, y: number) => {
    caixa(cor, x + q * 5, y - q * 7, 4, 5);
    caixa(cor, x + 13 - q * 2, y - 12, 3, 3);
    caixa(cor, x - 8, y - q * 4, 5, 3);
  };
  const pedra = (x: number, y: number, cor: string, brilho: string, tamanho = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(tamanho, tamanho);
    poligono(ctx, "#292637", [[-24, 7], [-22, -6], [-10, -16], [8, -17], [22, -10], [27, 5], [20, 16], [-18, 17]]);
    poligono(ctx, cor, [[-22, 4], [-18, -6], [-8, -13], [8, -14], [19, -8], [23, 3], [15, 5], [5, 12], [-11, 10]]);
    poligono(ctx, brilho, [[-16, -4], [-8, -10], [8, -12], [17, -7], [7, -2], [-4, -5]]);
    ctx.restore();
  };
  const livro = (x: number, y: number, magia: boolean) => {
    poligono(ctx, "#492f45", [[x - 29, y - 6], [x - 20, y - 14], [x, y - 8], [x + 18, y - 15], [x + 26, y - 7], [x + 21, y + 9], [x, y + 17], [x - 23, y + 9]]);
    poligono(ctx, "#f1d8a4", [[x - 25, y - 8], [x - 11, y - 15], [x, y - 9], [x + 21, y - 15], [x + 22, y], [x, y + 11], [x - 21, y + 4]]);
    caixa("#936d61", x - 11, y - 5 + q % 2 * 4, 12, 2);
    caixa("#936d61", x + 4, y - 5, 11, 2);
    if (magia) faiscas("#c6adff", x + 2, y - 24);
  };
  const baseT = ["#b48b62", "#9ca5bb", "#ab78a8"][variante - 1] ?? "#b48b62";

  switch (gesto) {
    case "corrida":
      caixa("#e1b17b", 44 + 12 * q, 225, 18, 3);
      caixa("#aa886b", 20 + 9 * q, 235, 32, 3);
      faiscas("#dbc19b", 58 - q * 8, 232);
      break;
    case "pedras":
      pedra([174, 162, 153, 166][q]!, [208, 155, 121, 160][q]!, "#74788d", "#b4b5bb", .85 + variante * .09);
      break;
    case "impacto":
      caixa("#473038", 218, 132, 9, 108);
      caixa("#9c694c", 220, 142, 5, 77);
      caixa("#5d3c35", 199, 123, 39, 43);
      caixa("#b28a5d", 203, 126, 30, 34);
      caixa("#804e44", 212, 134, 13, 13);
      if (q === 2) faiscas("#ffd483", 206, 134);
      break;
    case "obstaculos":
      caixa("#5b3934", 188 - 18*q, 194, 41, 9);
      caixa("#ac7855", 188 - 18*q, 194, 41, 3);
      caixa("#79513f", 193 - 18*q, 201, 7, 33);
      caixa("#79513f", 220 - 18*q, 201, 7, 33);
      break;
    case "tomos": livro(164, 147, false); break;
    case "pratica": livro(171, 141, true); break;
    case "meditacao":
      caixa("#b1a6e3", 90 - q*5, 220 - q*4, 22, 3);
      caixa("#b1a6e3", 154 + q*5, 220 - q*4, 22, 3);
      faiscas("#d8c5ff", 72, 162); faiscas("#d8c5ff", 177, 147);
      break;
    case "vigilia":
      caixa("#3d3440", 185 + q*2, 141, 20, 26);
      caixa("#ffbf6d", 189 + q*2, 148, 12, 16);
      caixa("#ffe1a4", 191 + q*2, 150, 5, 9);
      faiscas("#dca371", 201, 140);
      break;
    case "dados": {
      const x = 157 + q * 19, y = [160, 120, 135, 194][q]!;
      caixa("#694437", 168, 210, 82, 14);
      caixa("#996347", 175, 224, 7, 15);
      caixa("#996347", 235, 224, 7, 15);
      caixa("#543745", x, y, 19, 19);
      caixa("#e5cfa1", x+2, y+1, 14, 14);
      caixa("#623f53", x+5+q%2*5, y+5, 3, 3);
      caixa("#623f53", x+10, y+10, 3, 3);
      break;
    }
    case "lenhador":
      caixa("#4b3236", 217, 136, 28, 91); caixa(baseT, 220, 136, 15, 82);
      caixa("#633e35", 227, 148, 3, 58);
      haste("#aa754e", 179, 149, [-.6, -.8, 1.05, .4][q]!, "#aebdca");
      if (q === 2) faiscas("#ecb883", 217, 137);
      break;
    case "mineracao":
      pedra(218, 211, baseT, "#bac1db", 1.1);
      haste("#aa754e", 177, 152, [-.5, -.8, 1.8, .6][q]!, "#9aaaca");
      if (q === 2) faiscas("#cee0f4", 202, 192);
      break;
    case "pesca":
      haste("#ae865e", 174, 148, .5 + q*.11);
      caixa("#afc9de", 208 + q*5, 92 + q*4, 2, 108 - q*4);
      caixa("#f18f83", 206 + q*5, 197 + q%2*3, 7, 7);
      caixa("#a1c9d3", 194 + q*5, 206, 30, 3);
      break;
    case "agricultura":
      haste("#ad7450", 170, 159, [1.4, 1.9, 2.4, 1.5][q]!, "#9da38b");
      caixa("#765148", 186, 216, 60, 15);
      caixa(baseT, 189, 215, 54, 4);
      caixa("#7a9c62", 227, 198, 4, 19); caixa("#aac980", 222, 201, 9, 5);
      break;
    case "forja":
      caixa("#2d2b3d", 202, 190, 45, 10); caixa("#80879c", 203, 191, 42, 4);
      caixa("#4d4b62", 216, 200, 17, 26); caixa("#5c566c", 207, 222, 37, 8);
      haste("#a2664e", 181, 144, [-.7, -.9, 2.0, .3][q]!, "#b0b3be");
      if (q === 2) faiscas("#ffc186", 216, 181);
      break;
    case "alquimia":
      caixa("#75949c", 169, 129, 10, 16);
      poligono(ctx, "#373049", [[165, 144], [181, 144], [189, 156], [189, 172], [157, 172], [157, 154]]);
      caixa(["#bf94db", "#79c8be", "#e79b8d"][variante - 1]!, 161, 154 + q%2*2, 24, 14);
      faiscas("#d5c6ee", 168, 125);
      break;
    case "culinaria":
      caixa("#3d3043", 168, 164, 63, 7); caixa("#5a5468", 177, 169, 40, 11);
      caixa("#d5a480", 182, 160 - q%2*3, 24, 4);
      faiscas("#e3ccad", 201, 149);
      break;
    case "alimentar":
    case "descansar":
    case "treinar": {
      const x = gesto === "treinar" ? 199 + q*5 : 204;
      caixa("#634737", x, 207, 33, 20); caixa("#a17b59", x+4, 205, 28, 15);
      caixa("#b38d67", x+20, 195, 19, 19); caixa("#634737", x+19, 190, 7, 12);
      caixa("#eee0b9", x+33, 201, 3, 3); caixa("#634737", x-7, 201 - q%2*4, 10, 4);
      if (gesto === "alimentar") caixa("#59808f", x+17, 226, 29, 8);
      if (gesto === "descansar") caixa("#a3bbd5", x+23+q*3, 177-q*4, 8, 3);
      if (gesto === "treinar") caixa("#d1ab73", x-12, 226, 12, 3);
      break;
    }
  }
}
