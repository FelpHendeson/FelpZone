/** Pictogramas de navegação editáveis, em grade de 16 pixels. */
const ICONES: Readonly<Record<string, readonly string[]>> = {
  atividades: ["................", "......xxxxxx....", "....xxxxxxxxxx..", "...xxx....xxxx..", "..xxx....xxx.xx.", "..xx....xxx..xx.", ".......xxx......", "......xxx.......", ".....xxx........", "....xxx.........", "...xxx..........", "..xxx...........", ".xxx............", "..x............."],
  combate: ["................", "..xx........xx..", "..xxx......xxx..", "...xxx....xxx...", "....xxx..xxx....", ".....xxxxxx.....", "......xxxx......", ".....xxxxxx.....", "....xxx..xxx....", "..xxxx....xxxx..", "...xx......xx...", "..x..x....x..x..", ".xx..........xx.", "................"],
  mapa: ["................", "................", "..xxxx....xxxx..", "..x..xxxxxx..x..", "..x..x....x..x..", "..x..x....x..x..", "..x..x....x..x..", "..x..x....x..x..", "..x..x....x..x..", "..x..x....x..x..", "..x..x....x..x..", "..x..xxxxxx..x..", "..xxxx....xxxx..", "................"],
  mochila: ["................", ".....xxxxxx.....", "....xx....xx....", "....xx....xx....", "...xxxxxxxxxx...", "..xx........xx..", "..x..........x..", "..x..xxxxxx..x..", "..x..x....x..x..", "..x..x....x..x..", "..x..xxxxxx..x..", "..x..........x..", "..xx........xx..", "...xxxxxxxxxx..."],
  missoes: ["................", "..xxxxxxxxxxx...", ".xx.........xx..", ".xx.xxxxxx..xx..", "..x.........x...", "..x..xxxxx..x...", "..x.........x...", "..x..xxxx...x...", "..x.........x...", "..x..xxxxx..x...", "..x.........x...", "..xx........xx..", "...xxxxxxxxxxx..", "................"],
  personagem: ["................", "......xxxx......", ".....xxxxxx.....", "....xxxxxxxx....", "....xx.xx.xx....", "....xxxxxxxx....", ".....xxxxxx.....", "......xxxx......", "....xxxxxxxx....", "...xxxxxxxxxx...", "..xxxxxxxxxxxx..", "..xxxxxxxxxxxx..", "..xxxxxxxxxxxx..", "................"],
};
export function IconePixel({ id }: { id: string }) {
  const linhas = ICONES[id];
  if (!linhas) return null;
  return <svg viewBox="0 0 16 16" width={24} height={24} aria-hidden="true" focusable="false" shapeRendering="crispEdges" fill="currentColor">
    {linhas.flatMap((linha, y) => [...linha].map((pixel, x) => pixel === "x" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null))}
  </svg>;
}
