// Opt-in developer measurements: open the app with ?perfil=1.
const enabled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perfil');
export function profile(...values: (string | number)[]) { if (enabled) console.debug(...values); }
