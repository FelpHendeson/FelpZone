export type IconName =
  | 'world'
  | 'journal'
  | 'character'
  | 'inventory'
  | 'menu'
  | 'progression'
  | 'registry'
  | 'society'
  | 'relationships'
  | 'family'
  | 'domain'
  | 'territory'
  | 'economy'
  | 'politics'
  | 'map'
  | 'help';

// Traço fino, 24×24, sem preenchimento — direção da UI/UX 3.0 (docs/UI-REDESIGN-3-VISION.md).
const PATHS: Record<IconName, string[]> = {
  world: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18', 'M3.5 9h17', 'M3.5 15h17', 'M12 3c2.5 2.6 3.6 5.6 3.6 9s-1.1 6.4-3.6 9c-2.5-2.6-3.6-5.6-3.6-9S9.5 5.6 12 3'],
  journal: ['M6 3.5h10.5a1.5 1.5 0 0 1 1.5 1.5v14.5H7.5A1.5 1.5 0 0 1 6 18z', 'M6 18a1.5 1.5 0 0 1 1.5-1.5H18', 'M9.5 7.5h5', 'M9.5 10.5h3.5'],
  character: ['M12 4a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7', 'M5 20c.6-3.6 3.4-6 7-6s6.4 2.4 7 6'],
  inventory: ['M5 8.5h14v10.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19z', 'M8.5 8.5V6.5a3.5 3.5 0 0 1 7 0v2', 'M5 13h14', 'M11 13v2h2v-2'],
  menu: ['M4 4h6.5v6.5H4z', 'M13.5 4H20v6.5h-6.5z', 'M4 13.5h6.5V20H4z', 'M13.5 13.5H20V20h-6.5z'],
  progression: ['M12 3l2.4 5.6L20 9.2l-4.3 3.9 1.3 5.9L12 16l-5 3 1.3-5.9L4 9.2l5.6-.6z'],
  registry: ['M6 3.5h12v17l-6-3.5-6 3.5z', 'M9 8.5h6', 'M9 11.5h4'],
  society: ['M5 21V4', 'M5 4.5h11l-2.2 3.5L16 11.5H5'],
  relationships: ['M8.5 6.5a3 3 0 1 0 0 6a3 3 0 1 0 0-6', 'M15.5 6.5a3 3 0 1 0 0 6a3 3 0 1 0 0-6', 'M3 19.5c.5-2.8 2.7-4.5 5.5-4.5c1.4 0 2.6.4 3.5 1.2c.9-.8 2.1-1.2 3.5-1.2c2.8 0 5 1.7 5.5 4.5'],
  family: ['M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6A4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z'],
  domain: ['M4 11l8-6.5 8 6.5', 'M6 9.5V20h12V9.5', 'M10 20v-5h4v5'],
  territory: ['M4 20l5-12 4 7 2.5-4L20 20z', 'M15.5 5.5V3', 'M15.5 3.5h3l-1 1 1 1h-3'],
  economy: ['M12 4v16', 'M6 7.5h12', 'M4 14l2-6.5 2 6.5a2 2 0 0 1-4 0', 'M16 14l2-6.5 2 6.5a2 2 0 0 1-4 0', 'M8.5 20h7'],
  politics: ['M4 9.5L12 5l8 4.5', 'M5 9.5h14', 'M6.5 9.5v8', 'M10 9.5v8', 'M14 9.5v8', 'M17.5 9.5v8', 'M4 20h16'],
  map: ['M4 6.5l5-2 6 2 5-2v13l-5 2-6-2-5 2z', 'M9 4.5v13', 'M15 6.5v13'],
  help: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18', 'M9.6 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8v.5', 'M12 16.8v.2'],
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={['ui-icon', className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/** Motivo "canto-trava": o Sistema enquadrando a superfície que ele mesmo renderiza. */
export function SystemCorners() {
  return <span className="sys-corners" aria-hidden="true" />;
}
