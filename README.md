# QLine

A simple digital queue for small salons and barber shops.

- **Customers** scan the shop's QR code, which opens `/s/<shop-slug>` in their phone browser. No app to download.
- **The barber** uses the same app on a phone (or any browser) to run the line.
- **A spare tablet or TV** can show `/display/<shop-slug>` on the wall.

## Stack

Expo (React Native) with Expo Router and TypeScript — one codebase for Android, iOS and web.
Supabase for the database, login and live updates. NativeWind (Tailwind) for styling.

## Run it locally

```bash
npm install
cp .env.example .env     # fill in from Supabase, see below
npx expo start -c        # press w for the browser, or scan the QR with Expo Go
```

`.env` needs:

| Variable | Where it comes from |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → **Publishable** key |
| `EXPO_PUBLIC_APP_URL` | Optional. The address the shop QR code should point to. Leave empty locally; set it to the live site once deployed. |

Never put the Supabase **secret** key in `.env` — everything with `EXPO_PUBLIC_` is bundled into the app where anyone can read it. The publishable key is safe because the database enforces its own rules (see below).

## Database

Run these once each, in order, in Supabase → SQL Editor:

| File | What it adds |
|---|---|
| `supabase/migrations/001_init.sql` | Tables, row-level security, the customer functions (join, status, leave) |
| `supabase/migrations/002_staff_queue.sql` | Staff functions: the queue, Next, Done/No-show, walk-ins |
| `supabase/migrations/003_better_eta.sql` | Waiting-time estimate that counts the person already in the chair |
| `supabase/migrations/004_notifications.sql` | Push subscriptions and the "what should be sent now" function |
| `supabase/migrations/005_hindi.sql` | Lets notifications be stored and sent in Hindi |
| `supabase/migrations/006_linter_fixes.sql` | Pins `shop_today`'s search_path (see the note inside before "fixing" the other linter warning) |
| `supabase/migrations/007_barbers_and_services.sql` | Barbers and services become real: `call_next` takes the calling barber, the staff board shows each customer's choice, waits use the chosen service's length |
| `supabase/migrations/008_day_and_undo.sql` | Undo a wrong Done/No-show for 15 minutes, close off days that already ended, and tell a customer when their ticket is from an old day |

`supabase/test_in_sql_editor.sql` is a scratch file for trying the functions by hand.

Two ideas hold the whole thing together:

- **Row Level Security.** The app talks to the database directly, so the database decides who sees what. Staff can only touch their own shop's rows; customers cannot read the queue table at all (it holds phone numbers).
- **Database functions.** Customers are never logged in. They call `join_queue`, `get_my_status` and `leave_queue`, which check everything and return only safe data. Joining gives the phone a secret token, and whoever holds that token owns the ticket.

While developing, turn off **Authentication → Sign In / Providers → Email → Confirm email** so sign-up does not wait on a confirmation email.

## Routes

| Path | Who | Purpose |
|---|---|---|
| `/` | Staff | Landing and login |
| `/s/[slug]` | Customer | Join the line (this is what the QR code opens) |
| `/s/[slug]/ticket` | Customer | Live position and wait |
| `/staff/login` | Staff | Sign in or create an account |
| `/staff/create-shop` | Owner | First-time shop setup |
| `/staff/dashboard` | Staff | The line, Next, Done, No-show, walk-ins, QR code |
| `/staff/settings` | Owner | Barbers, services, line mode (coming) |
| `/display/[slug]` | Shop TV | Now serving |

## Deploy the website to Vercel

1. In Vercel, **Add New → Project** and import `jasmeetsidhu02/qline`.
2. Framework preset: **Other**. The build command and output folder come from `vercel.json`, so leave them alone.
3. Add two environment variables, for all environments:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy. Every push to `main` redeploys automatically.
5. Put the live address into your local `.env` as `EXPO_PUBLIC_APP_URL`, so the QR code shown in Expo Go points at the live site instead of your laptop.

The site is a single-page app: `vercel.json` rewrites every path to `index.html` so links like `/s/sharma-hair-salon` work.

## Notifications

A waiting customer can close the page and still be told when their turn is near. That needs one piece of server code, because a push message must be signed with a private key that can never ship inside the app.

**One-time setup**

1. Make a key pair:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Put the **public** key in `.env` as `EXPO_PUBLIC_VAPID_PUBLIC_KEY`. It is safe to ship, and it also goes in your Vercel environment variables.
3. Give Supabase the **private** key, which never goes in `.env` or git:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
   npx supabase functions deploy notify
   ```

**How it works**

- The customer taps "Notify me", and their browser hands over a one-off address. `save_push_subscription` stores it against that ticket, with the language they were reading.
- When the barber taps Next, Done or No-show, the app pings the `notify` function. The function asks the database what is due with `claim_due_notifications`, which marks and returns rows in one step, so nothing is ever sent twice.
- Two moments are worth interrupting someone for: nobody is ahead of them any more, and the barber has called them. Both carry the same tag, so the second replaces the first on the lock screen.
- A dead subscription (HTTP 410) is deleted, so we stop trying.
- The subscription is tied to the queue entry and disappears with it. We never keep a way to message someone after their visit.

**What to expect on each phone**

| | |
|---|---|
| Android Chrome | Works in a normal tab. |
| iPhone | Only after "Add to Home Screen". The page says so, in both languages. |
| Page open | Vibration and a chime, no permission needed. |

The service worker (`public/sw.js`) deliberately caches nothing: a cached app would show a stale queue position, which is worse than a slow load.

## Home screen

`public/manifest.json` and `public/index.html` make the site installable, so the barber can add it to their home screen and have it open like an app.

## Milestones

| | |
|---|---|
| M0 | Project setup, deployed shell |
| M1 | Database, security rules, customer functions |
| M2 | Staff login, create shop, open/close |
| M3 | Live barber dashboard |
| M4 | Customer join and live ticket |
| M5 | Realistic wait times, Punjabi throughout, new design |
| M6 | Notifications: web push, in-page chime, home-screen install |
| **M7** | **Barbers, services, line mode, printable QR poster (next)** |
| M8 | Pilot hardening: undo, daily reset, stuck-customer nudge |
