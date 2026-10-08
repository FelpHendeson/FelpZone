// Avisos no celular (Web Push). Grátis nos navegadores; no iPhone, só com o
// site instalado na tela de início (iOS 16.4+). Sem as chaves VAPID nas
// variáveis de ambiente, tudo aqui vira silêncio e nada quebra.

import { after } from "next/server";
import webpush, { type PushSubscription } from "web-push";
import type { Where } from "@/accounts/plaza";
import { GAMES } from "@/games/registry";
import { RoomError, playersToAct, type Room } from "@/rooms/room";
import { defaults, requireAccount, type Deps } from "./accounts";
import { keys, type Kv } from "./kv";

export interface PushPayload {
  title: string;
  body: string;
  /** Página aberta ao tocar no aviso. */
  url: string;
  /** Avisos com a mesma etiqueta se substituem no celular. */
  tag: string;
}

interface StoredSubscription extends PushSubscription {
  at: number;
}

const MAX_DEVICES = 5;
/** Quem mandou sinal da própria sala há menos que isso está olhando: não precisa de aviso. */
const LOOKING_MS = 45_000;
/** No máximo um "sua vez" por sala a cada 2 minutos. */
const TURN_THROTTLE_SECONDS = 120;

let configured: boolean | null = null;

export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

function ready(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(publicKey && privateKey);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:mesa-online@example.com", publicKey!, privateKey!);
  return configured;
}

/** Roda depois da resposta (no Next) ou na hora (fora de uma requisição, como nos testes). */
export function later(task: () => Promise<void>) {
  const safe = () => task().catch((error) => console.error("[mesa-online] aviso:", error));
  try {
    after(safe);
  } catch {
    void safe();
  }
}

async function readSubscriptions(kv: Kv, userId: string): Promise<StoredSubscription[]> {
  const json = await kv.get(keys.push(userId));
  return json ? (JSON.parse(json) as StoredSubscription[]) : [];
}

function parseSubscription(input: unknown): PushSubscription {
  const value = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = value?.endpoint;
  if (typeof endpoint !== "string" || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) throw new RoomError("Inscrição inválida.");
  const p256dh = value?.keys?.p256dh;
  const auth = value?.keys?.auth;
  if (typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 100) throw new RoomError("Inscrição inválida.");
  return { endpoint, keys: { p256dh, auth } };
}

export async function saveSubscription(token: string | null, input: unknown, deps: Deps = defaults(), now = Date.now()): Promise<number> {
  const account = await requireAccount(token, deps);
  const subscription = parseSubscription(input);
  const list = (await readSubscriptions(deps.kv, account.id)).filter((item) => item.endpoint !== subscription.endpoint);
  const next = [{ ...subscription, at: now }, ...list].slice(0, MAX_DEVICES);
  await deps.kv.set(keys.push(account.id), JSON.stringify(next));
  return next.length;
}

export async function removeSubscription(token: string | null, endpoint: unknown, deps: Deps = defaults()): Promise<void> {
  const account = await requireAccount(token, deps);
  const list = (await readSubscriptions(deps.kv, account.id)).filter((item) => item.endpoint !== endpoint);
  await deps.kv.set(keys.push(account.id), JSON.stringify(list));
}

/** Envia agora para todos os aparelhos da conta; apaga inscrições que o serviço recusou. */
export async function sendNow(userId: string, payload: PushPayload, deps: Deps = defaults()): Promise<number> {
  if (!ready()) return 0;
  const list = await readSubscriptions(deps.kv, userId);
  if (list.length === 0) return 0;
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    list.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 300, urgency: "high" });
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(subscription.endpoint);
        else console.error("[mesa-online] push falhou:", status ?? error);
      }
    }),
  );
  if (gone.length) await deps.kv.set(keys.push(userId), JSON.stringify(list.filter((item) => !gone.includes(item.endpoint))));
  return sent;
}

/** Agenda um aviso para depois da resposta. */
export function notify(userId: string, payload: PushPayload, deps: Deps = defaults()) {
  if (!ready()) return;
  later(async () => {
    await sendNow(userId, payload, deps);
  });
}

/**
 * Depois de uma jogada: avisa quem passou a ter que agir e não está com a
 * sala aberta (o último sinal da sala tem mais de 45 s).
 */
export function notifyTurn(previous: Room, next: Room, deps: Deps = defaults(), now = Date.now()) {
  if (!ready() || next.status !== "playing") return;
  const before = new Set(playersToAct(previous).map((player) => player.id));
  const fresh = playersToAct(next).filter((player) => player.userId && !player.bot && !before.has(player.id));
  if (fresh.length === 0) return;
  later(async () => {
    for (const player of fresh) {
      const where = await deps.kv.get(keys.where(player.userId!));
      const place = where ? (JSON.parse(where) as Where & { at?: number }) : null;
      const looking = place && place.status !== "menu" && place.code === next.code && now - (place.at ?? 0) < LOOKING_MS;
      if (looking) continue;
      if (!(await deps.kv.setNx(`${keys.push(player.userId!)}:vez:${next.code}`, "1", TURN_THROTTLE_SECONDS))) continue;
      await sendNow(
        player.userId!,
        { title: `Sua vez no ${GAMES[next.gameId].name}!`, body: `Sala ${next.code}: a mesa está esperando você.`, url: `/sala/${next.code}`, tag: `vez-${next.code}` },
        deps,
      );
    }
  });
}
