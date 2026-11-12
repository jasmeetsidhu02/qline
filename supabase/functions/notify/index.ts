// QLine — push sender.
//
// The barber's app calls this straight after Next / Done / No-show. It asks
// the database what is due, sends those messages, and marks them sent. It is
// the only part of QLine that runs on a server, because a push message has to
// be signed with a private key that must never reach the app.
//
// Deploy:  npx supabase functions deploy notify
// Secrets: npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

import { buildMessage, type DueRow, ttlFor, urgencyFor } from './messages.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const env = (name: string) => Deno.env.get(name) ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const url = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const vapidPublic = env('VAPID_PUBLIC_KEY');
  const vapidPrivate = env('VAPID_PRIVATE_KEY');
  const vapidSubject = env('VAPID_SUBJECT') || 'mailto:support@example.com';

  if (!vapidPublic || !vapidPrivate) return json({ error: 'VAPID keys are not set' }, 500);

  let shopId = '';
  try {
    shopId = (await req.json())?.shop_id ?? '';
  } catch {
    return json({ error: 'Expected JSON body' }, 400);
  }
  if (!shopId) return json({ error: 'shop_id is required' }, 400);

  // Only staff of this shop may trigger its notifications. We check with the
  // caller's own token, so the database's row rules do the deciding.
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: who } = await asCaller.auth.getUser();
  if (!who?.user) return json({ error: 'Not signed in' }, 401);

  const { data: membership } = await asCaller
    .from('shop_members')
    .select('shop_id')
    .eq('shop_id', shopId)
    .maybeSingle();
  if (!membership) return json({ error: 'Not your shop' }, 403);

  // From here on we act as the service, because push addresses are private
  // and no logged-in user is allowed to read them.
  const asService = createClient(url, serviceKey);
  const { data: due, error } = await asService.rpc('claim_due_notifications', { p_shop_id: shopId });
  if (error) return json({ error: error.message }, 500);

  const rows = (due ?? []) as DueRow[];
  let sent = 0;
  let dropped = 0;
  const failures: string[] = [];

  await Promise.all(
    rows.map(async (row) => {
      const message = buildMessage(row);
      try {
        // Build the signed, encrypted request, then post it ourselves. Going
        // through fetch keeps this on web APIs that Deno runs natively.
        const details = webpush.generateRequestDetails(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } } as never,
          JSON.stringify(message),
          {
            vapidDetails: { subject: vapidSubject, publicKey: vapidPublic, privateKey: vapidPrivate },
            contentEncoding: 'aes128gcm',
            TTL: ttlFor(row.kind),
          },
        );

        const res = await fetch(details.endpoint, {
          method: 'POST',
          headers: { ...(details.headers as Record<string, string>), Urgency: urgencyFor(row.kind) },
          body: details.body as BodyInit,
        });

        if (res.ok) {
          sent++;
          return;
        }
        // The browser threw this subscription away: forget it, so we stop trying.
        if (res.status === 404 || res.status === 410) {
          await asService.rpc('drop_push_subscription', { p_endpoint: row.endpoint });
          dropped++;
          return;
        }
        failures.push(`${res.status} ${(await res.text()).slice(0, 120)}`);
      } catch (e) {
        failures.push(String(e).slice(0, 160));
      }
    }),
  );

  // The queue rows are already marked, so a failure here is not retried.
  // That is deliberate: a stale "you're next" an hour later is worse than
  // none, and the customer's own screen stays correct either way.
  return json({ due: rows.length, sent, dropped, failures });
});
