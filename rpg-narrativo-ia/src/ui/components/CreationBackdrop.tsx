/**
 * Fundo pintado da criação de personagem. Todas as imagens disponíveis ficam empilhadas e só a
 * ativa aparece, para a troca entre passos e arquétipos ser um esmaecer suave. Sem imagens, não
 * desenha nada e a tela mantém o fundo padrão.
 */
export function CreationBackdrop({ sources, active, tint }: { sources: (string | undefined)[]; active?: string; tint?: string }) {
  const unique = [...new Set(sources.filter((src): src is string => Boolean(src)))];
  if (unique.length === 0) return null;
  return (
    <div
      className={active ? 'creation-backdrop creation-backdrop--on' : 'creation-backdrop'}
      style={tint ? { ['--backdrop-tint' as string]: tint } : undefined}
      aria-hidden="true"
    >
      {unique.map((src) => (
        <img key={src} src={src} alt="" className={src === active ? 'creation-backdrop__layer creation-backdrop__layer--active' : 'creation-backdrop__layer'} decoding="async" />
      ))}
    </div>
  );
}
