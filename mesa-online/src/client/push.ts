"use client";

// Avisos no celular: registra o service worker e inscreve o aparelho no Web Push.

import { deletePushSubscription, fetchPushKey, savePushSubscription } from "./api";

export type PushStatus =
  | "loading"
  | "unsupported"
  /** iPhone/iPad fora do app instalado: precisa adicionar à tela de início. */
  | "install"
  | "server-off"
  | "denied"
  | "off"
  | "on";

export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  } catch {
    return null;
  }
}

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

export async function pushStatus(): Promise<PushStatus> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIos() && !isStandalone() ? "install" : "unsupported";
  }
  const { publicKey } = await fetchPushKey().catch(() => ({ publicKey: null }));
  if (!publicKey) return "server-off";
  if (Notification.permission === "denied") return "denied";
  const registration = await registerServiceWorker();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? "on" : "off";
}

export async function enablePush(): Promise<PushStatus> {
  const { publicKey } = await fetchPushKey();
  if (!publicKey) return "server-off";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await savePushSubscription(subscription.toJSON());
  return "on";
}

export async function disablePush(): Promise<PushStatus> {
  const registration = await registerServiceWorker();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await deletePushSubscription(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe();
  }
  return "off";
}
