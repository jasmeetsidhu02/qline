# QLine

Simple digital queue for small salons and barber shops.

- **Customers:** scan the shop's QR code, which opens `/s/<shop-slug>` in the phone browser. No app download.
- **Staff:** install the app (Android) or use the web version to run the queue.
- **Display:** open `/display/<shop-slug>` on a TV or tablet.

## Stack
Expo (React Native) + Expo Router + TypeScript. One codebase for Android, iOS and web. Backend: Supabase (Postgres, Realtime, Auth).

## Run locally
```bash
npm install
cp .env.example .env   # fill in Supabase URL + anon key (milestone M1)
npm run web            # browser
npm run android        # Expo Go on your phone (scan the QR)
```

## Routes
| Path | Who | Purpose |
|---|---|---|
| `/` | Staff | Landing, staff login |
| `/s/[slug]` | Customer | Join the queue |
| `/s/[slug]/ticket` | Customer | Live position and wait |
| `/staff/login` | Staff | Login |
| `/staff/dashboard` | Staff | Next / Done / No-show / Add walk-in |
| `/staff/settings` | Owner | Barbers, line mode, services, QR poster |
| `/display/[slug]` | Shop TV | Now serving |

## Deploy web to Vercel
Import the repo in Vercel. `vercel.json` already sets the build command and output folder. Then add the two `EXPO_PUBLIC_SUPABASE_*` environment variables.
