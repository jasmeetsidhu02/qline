import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Web push, for telling a customer their turn is near when the page is shut.
// Only runs in a browser: the barber's installed app does not need it.
const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushState =
  | 'unsupported' // this browser cannot do it at all
  | 'needs-install' // iPhone: only works once added to the Home Screen
  | 'off' // supported, not switched on yet
  | 'blocked' // the person said no, only their browser settings can undo it
  | 'on';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

function isStandalone() {
  if (!isWeb) return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return window.matchMedia?.('(display-mode: standalone)').matches || iosStandalone === true;
}

// iPhone and iPad, including iPads that report themselves as a Mac.
export function isIos() {
  if (!isWeb) return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function pushState(): PushState {
  if (!isWeb || !VAPID_PUBLIC_KEY) return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // Safari on iPhone only exposes these once the site is on the Home Screen.
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  if (isIos() && !isStandalone()) return 'needs-install';
  if (Notification.permission === 'granted') return 'on';
  if (Notification.permission === 'denied') return 'blocked';
  return 'off';
}

// The VAPID public key travels as base64url text but the browser wants bytes.
function keyToBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration('/');
  return existing ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/' }));
}

/**
 * Asks permission, subscribes, and stores the address against this ticket.
 * Must be called from a tap: browsers reject a permission prompt otherwise.
 */
export async function enablePush(token: string, lang: 'pa' | 'en'): Promise<PushState> {
  if (pushState() === 'unsupported' || pushState() === 'needs-install') return pushState();
  if (!supabase) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';

  const reg = await registration();
  await navigator.serviceWorker.ready;

  await subscribeAndSave(reg, token, lang);
  return 'on';
}

// Subscribing needs permission, which we already have by this point, so it
// never shows a prompt. Reuses an existing subscription when there is one.
async function subscribeAndSave(reg: ServiceWorkerRegistration, token: string, lang: 'pa' | 'en') {
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY),
    }));

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const { error } = await supabase!.rpc('save_push_subscription', {
    p_token: token,
    p_endpoint: json.endpoint ?? sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
    p_lang: lang,
  });
  if (error) throw error;
}

/**
 * Called whenever a ticket screen opens. If this person already allowed
 * notifications before, there is no prompt to show — but the new ticket still
 * needs its own subscription saved, otherwise nothing would ever reach them.
 */
export async function resaveSubscription(token: string, lang: 'pa' | 'en') {
  if (pushState() !== 'on' || !supabase) return;
  try {
    const reg = await registration();
    await navigator.serviceWorker.ready;
    await subscribeAndSave(reg, token, lang);
  } catch {
    // Their screen still updates on its own, so this is not worth a message.
  }
}
