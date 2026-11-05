# BuiltByLiv

Online training program for Liv: a website and iOS/Android apps where members follow exercise videos, log workouts, and track body weight. Access is a paid subscription with a one-week free trial that requires a payment method up front.

## Docs

- [Product requirements](docs/product-requirements.md) — who it's for, what members and Liv can do, billing rules, and what is out of scope for v1.
- [Technical design](docs/technical-design.md) — recommended stack, architecture, data model, third-party services, and a build order.

## Recommended stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript |
| Web | Next.js (App Router) on Vercel |
| Web UI | React, Tailwind CSS, shadcn/ui |
| iOS and Android | Expo (React Native), built and submitted with EAS |
| Mobile UI | React Native, NativeWind (shared Tailwind theme) |
| Database, auth, file metadata | Supabase (Postgres, Auth, Row Level Security) |
| Web payments and the free trial | Stripe Billing |
| App Store and Google Play payments | RevenueCat (StoreKit and Play Billing) |
| Exercise video | Cloudflare Stream, signed playback |
| Shared code | pnpm workspaces |

One account works on the website and in both apps. Stripe, Apple, and Google are three ways to pay for the same entitlement. The app checks that entitlement before it plays a video or accepts a workout log.

Ship the website first. The data model and entitlement check are the same ones the native apps will use, so App Store and Play Billing can be added without redesigning accounts or progress.

## Website UI

The website lives in `apps/web`. Accounts, programs, logs, and messages save to Supabase. Passwords are hashed by Supabase Auth and are never written to the application tables. Copy `apps/web/.env.example` to `apps/web/.env.local`, then run `supabase/migrations/20261105233000_init.sql` in the Supabase SQL editor. In Authentication settings, set the minimum password length to 12. After Liv creates her account, promote it in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'liv@example.com';
```

```bash
cd apps/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The member app is at `/app`, and Liv's content editor is at `/admin`. The sample price is $29 a month.
