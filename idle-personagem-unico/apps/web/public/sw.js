/* Service worker do Idle de Personagem Único (F13).
 * O jogo salva no aparelho; aqui só guardamos a interface para abrir sem rede.
 * - Páginas: rede primeiro, cópia em cache se cair a conexão.
 * - Arquivos estáticos do Next (com hash no nome): cache primeiro.
 * - API: nunca em cache. */
const PREFIXO = "idle-pu-";
const VERSAO = "idle-pu-animacoes-v1";
const ESSENCIAIS = ["/", "/manifest.webmanifest", "/icones/icone-192.png", "/icones/icone-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k.startsWith(PREFIXO) && k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icones/") || url.pathname.startsWith("/arte/")) {
    e.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(VERSAO).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.headers.get("content-type")?.includes("text/html")) {
            const copia = res.clone();
            e.waitUntil(caches.open(VERSAO).then((c) => c.put("/", copia)));
          }
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error())),
    );
  }
});
