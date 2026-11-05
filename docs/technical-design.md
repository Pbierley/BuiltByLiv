# Technical design

This is the stack to build and deploy BuiltByLiv. It is aimed at one developer shipping a website first and native apps second, with Liv editing content herself.

## Recommendation

| Layer | Choice | Role |
| --- | --- | --- |
| Language | TypeScript | Web, mobile, and shared types |
| Web | Next.js (App Router) | Marketing site, member app, Liv's admin |
| Web hosting | Vercel | Deploys the Next.js app |
| Mobile | Expo (React Native) | iOS and Android from one project |
| Mobile builds | EAS Build and EAS Submit | Store binaries and submission |
| Database | Supabase Postgres | Accounts, programs, logs, entitlements |
| Auth | Supabase Auth | Email, Sign in with Apple, Sign in with Google |
| Authorization | Postgres Row Level Security | Members read their own logs; only admins write programs |
| Web billing | Stripe Billing | Card on file, 7-day trial, renewal |
| Store billing | RevenueCat | Apple and Google subscriptions, one entitlement |
| Video | Cloudflare Stream | Upload, transcode, signed playback |
| Web UI | React, Tailwind CSS, shadcn/ui | Pages, forms, admin, member screens |
| Mobile UI | React Native, NativeWind | Same Tailwind tokens, native screens |
| Monorepo | pnpm workspaces | `apps/web`, `apps/mobile`, `packages/shared` |

Use this combination because the hard part of the product is not the workout UI. It is one user identity with three payment providers, private video, and logs that have to match across web and mobile. Supabase holds the data. Stripe and RevenueCat collect money. The app only asks "is this user entitled right now?"

### Why not the nearby alternatives

- **A responsive website inside a WebView shell** gets into the stores faster and then fights App Store review and in-app purchase. Workout logging and store billing are the native app's job. Expo is the smaller long-term cost.
- **A separate Node API** is unnecessary at this size. Next.js server actions and route handlers, plus Supabase, cover the website. Mobile talks to Supabase directly and to a few route handlers for Stripe, RevenueCat webhooks, and video tokens.
- **Firebase** fits mobile auth, and it is a poor fit for workout logs that are relational (program → workout → exercise → set). Postgres matches that shape.
- **Hosting video files in Supabase Storage** works for a demo and gets expensive and awkward as soon as members scrub long videos on a phone. Cloudflare Stream transcodes, adapts quality, and supports signed tokens.

Mux is the video alternative if playback analytics matter more than the Cloudflare bill. The rest of the design does not change: the exercise row stores a provider video id, and the app requests a short-lived playback token from our server.

## System shape

```text
Member (browser)                         Member (iOS / Android)
        |                                        |
        | Next.js on Vercel                      | Expo app
        |                                        |
        +------------------+---------------------+
                           |
                     Supabase
                  Auth + Postgres
                           |
         +-----------------+------------------+
         |                 |                  |
      Stripe           RevenueCat      Cloudflare Stream
   (web trial,         (Apple +         (exercise video,
    renewals)           Google)          signed playback)
         |                 |
         +--------+--------+
                  |
           webhook updates
           entitlement row
```

The website never talks to Apple or Google. The mobile app never creates a Stripe subscription. Both write, indirectly, to the same `entitlements` row, and both read that row before showing a video or saving a log.

## Repo layout

```text
apps/web          Next.js — marketing, auth, billing, member app, admin
apps/mobile       Expo — the same member flows, store billing
packages/shared   Zod schemas and TypeScript types for exercises, logs, entitlements
supabase/         SQL migrations and Row Level Security policies
```

Share types, validation, and design tokens, not UI components. Web and native screens will diverge, and a shared component kit usually costs more than it saves on a two-app product.

## Front-end UI

The UI framework is React on both clients.

**Website.** Next.js renders React. Style it with Tailwind CSS. Build screens out of [shadcn/ui](https://ui.shadcn.com/), which copies components into `apps/web` (buttons, inputs, dialogs, sheets, tables) on top of Radix. That covers signup, billing, the workout logger, and Liv's admin without adopting a heavy design system. Workout layout — video, set list, timer — is custom markup using those primitives.

**iOS and Android.** Expo renders React Native. Style it with NativeWind so class names and the Tailwind theme match the website. Use React Native components (`View`, `Pressable`, `FlatList`, `TextInput`) rather than a second component library. shadcn components stay on the web; they are DOM components and do not run in React Native.

**Shared look.** Put the Tailwind theme (colors, type scale, spacing, radius) in `packages/shared` and consume it from both apps. A member should recognize the same palette and type in the browser and on the phone. Buttons, lists, and the set logger are implemented twice, once per platform, because press behavior, safe areas, and the video player differ.

Use a system font stack on the web and the platform font on the phone (`System` on iOS, Roboto on Android). Add a custom font only if Liv has a brand face; it is not required for v1.

## Identity

Supabase Auth issues the session for web and mobile.

- Email and password, with confirmation required before checkout.
- Sign in with Apple, configured for the native app and the website.
- Sign in with Google.
- `profiles` table: `id` (auth user id), display name, unit system (`lb` or `kg`), `created_at`.
- `profiles.role` is `member` or `admin`. Liv's user is seeded as `admin`. There is no public admin signup.

Row Level Security:

- A member can read published programs, workouts, and exercises.
- A member can insert, update, and delete only their own body-weight rows and workout logs.
- A member can read their own entitlement.
- An admin can write programs, workouts, and exercises.
- An admin cannot select member logs. Do not add a "support view" until there is a real support process; it would widen access to health-adjacent data.

Service-role keys stay on the server (Vercel env and Supabase Edge Functions or Next.js route handlers). The Expo app uses the anon key and the user's session.

## Entitlements and billing

### Data

`entitlements` — one row per user:

| Column | Notes |
| --- | --- |
| `user_id` | Primary key, references `profiles` |
| `status` | `trialing`, `active`, `grace`, `expired` |
| `provider` | `stripe`, `apple`, `google`, or null before checkout |
| `current_period_end` | When access should be re-checked |
| `trial_end` | Null if this subscription did not include a trial |
| `provider_customer_id` | Stripe customer id, or the store app-user id |
| `updated_at` | Last webhook |

The client treats this row as a cache of what the provider last told us. Webhooks are the source of truth. The client does not decide that a trial is over by itself except as a UX hint; the server rejects video tokens and log writes when `status` is `expired`.

If a person pays on the web and later also buys the App Store subscription, keep a single active entitlement and do not stack them silently. v1 rule: the most recently activated provider wins, and the admin docs tell Liv that members should subscribe in one place. Detecting double payment and refunding it is a manual support task, not an automated one.

### Stripe (website)

- One Product, two Prices later (monthly first).
- Checkout or Billing with `trial_period_days: 7` and payment method collection required. No trial without a card.
- `subscription_data.trial_settings.end_behavior.missing_payment_method` is irrelevant if the card is required up front; still set the subscription to cancel if payment is missing, so a detached card cannot renew into a free account.
- On the Stripe customer, set metadata `supabase_user_id`.
- Webhook endpoint in the Next.js app, signature verified, handling at least:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Map Stripe status onto our status: `trialing` → `trialing`, `active` → `active`, `past_due` → `grace` until `current_period_end + 3 days`, then `expired`, `canceled` / `unpaid` / `incomplete_expired` → `expired`.
- Customer portal session so the member can update the card and cancel without us building those forms.
- Trial abuse: before creating Checkout, if this user already has an entitlement row with a non-null `trial_end`, start the next checkout with no trial. Stripe's customer id stays attached to the Supabase user so a second account is a different problem (email verification plus one trial flag on the profile).

Show price, interval, trial length, and the cancellation path on the page that launches Checkout. Stripe Checkout also shows the trial terms; the page before it should still state them in plain language.

### Apple and Google (apps)

RevenueCat sits between the Expo app and the two stores.

- Create the subscription and the 7-day introductory offer in App Store Connect and in Play Console. RevenueCat does not invent the trial; the stores do.
- RevenueCat App User ID is the Supabase user id, set after login and before purchase. That is what makes "restore purchases" attach to this account and not to the device.
- Entitlement identifier, for example `membership`. The app checks that entitlement.
- RevenueCat webhook hits a route handler that updates the same `entitlements` row, with `provider` of `apple` or `google`.
- The website reads that row, so a person who subscribed on an iPhone is entitled on the website too.

Store listing copy has to include subscription length, price, and trial terms. Budget time for App Review: account deletion, a demo account, and a review notes section that explains the trial.

### What the client checks

A small server function, `assertEntitled(userId)`, used by:

- the route that mints a Cloudflare Stream playback token
- workout-log and body-weight inserts (a Postgres policy or a trigger that joins `entitlements`)

Reading old logs stays allowed when `expired`, so a lapsed member can see history and is pushed to resubscribe to log something new. That split matches the product requirement.

## Content model

```text
programs
  id, title, description, published, position

workouts
  id, program_id, title, position

workout_exercises          -- prescription inside one workout
  id, workout_id, exercise_id, position
  sets
  tracking_type            -- weight_reps | reps | duration
  target_reps              -- null when duration
  target_duration_seconds  -- null when reps
  rest_seconds
  note

exercises                  -- reusable movement
  id, name, coaching_notes
  video_uid                -- Cloudflare Stream video id
  published
```

`tracking_type` lives on the prescription (`workout_exercises`), not only on the movement. The same exercise can be prescribed as reps in one workout and as duration in another. The log copies the tracking type onto each set at save time so a later edit to the program does not rewrite history.

Liv uploads video from the admin UI to a Next.js route that creates a Cloudflare direct-upload URL. The browser uploads the file to Cloudflare, then the route saves `video_uid` on the exercise. Members never receive the Cloudflare API token.

Playback: the app asks `POST /api/video-token` with the exercise id. The handler checks the session, checks `published`, checks `assertEntitled`, and returns a signed token with a short TTL (a few hours). The player uses that token. When the token expires mid-session, the client requests a new one.

## Progress model

```text
body_weight_entries
  id, user_id, weighed_on (date), weight_kg, created_at

workout_sessions
  id, user_id, workout_id, started_at, completed_at
  -- snapshot of the workout title so history still reads well if Liv renames it

session_sets
  id, session_id, workout_exercise_id, set_index
  tracking_type
  reps
  weight_kg          -- null for reps-only and duration
  duration_seconds   -- null unless duration
  skipped
```

Store weight in kilograms with the unit they entered captured only for display if needed. Converting at the boundary (`lb` ↔ `kg`) keeps charts and exports honest if the member switches unit preference later. Keep full precision in the database (numeric) and round in the UI.

A session in progress has `completed_at` null. Resuming loads that session. Completing it sets `completed_at`. Extra sets are more `session_sets` rows past the prescribed count.

Indexes: `(user_id, weighed_on desc)` on weigh-ins, `(user_id, started_at desc)` on sessions.

## Web application

Routes to plan for:

| Path | Who |
| --- | --- |
| `/` | Public marketing page: what the program is, trial terms, price |
| `/login`, `/signup` | Auth |
| `/checkout` | Starts Stripe Checkout for the signed-in user |
| `/app` | Member home: entitlement state, latest weigh-in, programs |
| `/app/programs/[id]` | Workouts in a program |
| `/app/workouts/[id]` | Player, prescription, set logger |
| `/app/weight` | Body-weight history |
| `/app/history` | Completed sessions |
| `/app/account` | Unit preference, manage billing, delete account |
| `/admin` | Liv's content editor |

Marketing pages are static. Member and admin pages are authenticated. Middleware refreshes the Supabase session.

Delete account calls a server route that deletes the auth user (cascade to profile, entitlements, logs) and cancels a live Stripe subscription. Store subscriptions must be canceled by the member in Apple or Google settings; the account screen says that plainly, because our server cannot cancel a StoreKit subscription for them.

## Mobile application

Expo app, same information architecture as `/app`: home, program, workout logger, weigh-in, history, account.

- `react-native-purchases` (RevenueCat) for purchase, restore, and customer info.
- Sign in with Apple via Expo's Apple authentication, Google via the Expo auth session helpers, then Supabase `signInWithIdToken`.
- Video player that can take a signed HLS URL. `expo-video` is the current Expo player.
- A simple count-up timer for duration sets. Typing a duration remains available when they already finished the set and forgot to start the timer.
- Deep link / universal link back from the website is optional in v1. Store subscriptions start inside the app, not via a browser handoff.

Configure EAS for development, preview, and production. Production submits to App Store Connect and Play Console. Use a physical device for in-app purchase testing; simulators are a weak check for StoreKit.

## Environments

| Name | Use |
| --- | --- |
| Local | Supabase CLI, Stripe CLI webhook forwarding, Stripe test mode, Cloudflare Stream in a dev subdomain or token |
| Preview | Vercel preview, Supabase branch or a shared staging project, Stripe test mode |
| Production | Vercel production, production Supabase, Stripe live, RevenueCat production, Cloudflare production |

Secrets: Supabase service role, Stripe secret and webhook secret, RevenueCat webhook auth, Cloudflare API token. The Expo app gets only the Supabase URL, anon key, and RevenueCat public SDK keys.

## Build order

The order is the one that lets Liv put real videos in before the native apps exist, and that avoids building logging twice.

1. **Monorepo, Supabase, auth.** Email signup, Apple and Google providers configured, profiles, admin role, account deletion.
2. **Content and admin.** Programs, workouts, exercises, Cloudflare direct upload, publish flag. Liv can load the first program on staging.
3. **Stripe trial on the web.** Checkout, webhooks, entitlement row, customer portal, gated member shell. No video token without entitlement.
4. **Member web app.** Signed video playback, workout logger for all three tracking types, body-weight log, history.
5. **Expo app against the same Supabase project.** Sign-in, read programs, play video, log sets and weigh-ins. Purchases still stubbed to a debug entitlement in staging.
6. **Store billing.** App Store Connect and Play products, RevenueCat, webhook into `entitlements`, restore purchases, trial introductory offers. Submit for review with a demo account.
7. **Production launch.** Live Stripe, privacy policy and terms URLs, health disclaimer, store listings, Liv's published program.

Steps 1–4 are a usable website. Step 5 is the app members can install through TestFlight and an internal Play track before payments are approved.

## Compliance and store rules to design for now

- **Negative-option trial (US).** Disclose the amount that will be charged, when it will be charged, and how to cancel, before collecting the payment method. Keep that copy on the website and in the store listings.
- **Apple digital goods.** Membership sold inside the iOS app uses In-App Purchase. Web subscribers may sign in on iOS and use content they already paid for.
- **Account deletion.** In-app, and it actually deletes the user and their logs.
- **Privacy policy and terms.** Public URLs, linked from the website footer, the signup screen, and both store listings. Name Supabase, Stripe, RevenueCat, Apple, Google, and Cloudflare as processors in the privacy policy once a lawyer or a template is filled in with the real business entity.
- **Health disclaimer.** Visible at signup. Do not describe the product as medical treatment.
- **Card data.** Stripe.js or Checkout only. No card fields that post to our server.

## Operational notes

- Stripe and RevenueCat webhooks need idempotency. Store processed event ids and ignore duplicates.
- Log webhook failures with enough id to replay (Stripe event id, RevenueCat event id). Do not log card numbers or video tokens.
- Cloudflare Stream billing is minutes stored plus minutes delivered. Long idle "hero" videos on the marketing page should be a normal hosted file or a short clip, not a Stream video left on autoplay for every visitor.
- Backups are Supabase's. Confirm point-in-time recovery is on before launch, because workout history is the data members will be angry to lose.
- Liv needs a written one-page admin guide: how to upload, how to unpublish, and the fact that she cannot cancel a member's Apple subscription from the admin.

## Launch checklist

- [ ] Stripe live webhook registered and a test trial card run in live mode for a real internal account, then refunded or canceled.
- [ ] Trial terms visible before checkout and again in the receipt email.
- [ ] Expired user cannot fetch a video token (verified with a curl or a test against the route).
- [ ] Member A cannot read member B's logs (verified with two test users and the anon key).
- [ ] Account deletion removes logs and cancels Stripe.
- [ ] RevenueCat sandbox purchase on a real iPhone and a real Android device updates `entitlements`.
- [ ] Restore purchases attaches to the Supabase user, not only the device.
- [ ] Privacy policy, terms, and support contact are live URLs.
- [ ] App Review demo account has an active entitlement so the reviewer can open a video and a logger.
