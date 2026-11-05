# Product requirements

Working name: **BuiltByLiv**. Liv publishes training programs. Members subscribe, watch demos, and log what they did.

## Users

**Member.** Signs up, starts a trial, follows a program, watches exercise demos, and logs body weight and workout results.

**Liv (admin).** Creates programs, uploads or attaches exercise videos, sets the prescribed sets and reps (or duration), and can see that content is published. Liv does not need a developer to add or edit a workout.

## Platforms

- Marketing site and logged-in web app (desktop and phone browser).
- iOS app, distributed through the App Store.
- Android app, distributed through Google Play.

A member has one account. Progress logged on the web shows up in the app, and the reverse. Which store they paid through does not change the programs they can open.

## Accounts

- Sign up with email and password.
- Sign in with Apple on iOS. Required by Apple if any other social login is offered, so offer it on every platform.
- Sign in with Google on web and Android.
- Email verification before the trial starts.
- Password reset by email.
- The member can delete their account from inside the product. Apple requires this for apps with accounts.
- Profile holds display name, email, and unit preference (pounds or kilograms). The unit applies to body weight and to loads logged on exercises.

## Trial and subscription

The paid product is a single recurring membership (monthly, with an annual option once the monthly plan is live). There is no free tier and no content access before a payment method is on file.

**Trial**

- 7 days, starting when the payment method is successfully saved.
- One trial per person. Match on verified email, and on web also on the Stripe customer, so the same card cannot start a second trial under a new email without a manual review path later.
- Before the member confirms, the screen states the price charged when the trial ends, the billing interval, and how to cancel.
- Canceling during the trial keeps access until the trial end and prevents the first charge.
- When the trial ends, the saved payment method is charged and the membership continues.
- If that charge fails, the member keeps a short grace period (3 days), then video and logging lock. Their history stays on the account. Updating the payment method restores access.

**Where they can pay**

| Surface | How they pay |
| --- | --- |
| Website | Card, via Stripe. Trial is configured on the Stripe subscription. |
| iOS app | Apple In-App Purchase. The free trial is an introductory offer on the subscription. Apple already has a payment method on the Apple ID. |
| Android app | Google Play Billing. The free trial is an offer on the Play subscription. |

Someone who subscribes on the website can sign in on iOS or Android and use the membership. The iOS app sells its own subscription through Apple for people who start there. The app does not send those people to a website checkout to avoid Apple's commission. Same rule for Google Play.

The member can restore an App Store or Play purchase onto the same account (new phone, reinstall).

Access is an entitlement, not "which screen they last saw":

- `trialing` — inside the 7 days, full access.
- `active` — paid and current.
- `grace` — payment failed, still inside the grace window, full access.
- `expired` — trial ended without conversion, or subscription lapsed. History remains readable. Videos and new logs are blocked, with a path to resubscribe.

## Programs and exercises

Liv organizes training as programs made of workouts. A workout is an ordered list of exercises.

Each exercise has:

- Name and short coaching notes (how to perform it).
- A demo video.
- A tracking type, chosen per exercise:
  - **Weight and reps** — for example back squat, 3 sets of 8 at a logged load.
  - **Reps** — for example push-ups, 3 sets of a logged count, no load.
  - **Duration** — for example plank or a conditioning piece, logged as time.
- The prescription Liv wrote: number of sets, and either target reps or target duration, plus optional rest between sets.
- Optional notes that apply only inside one workout ("slow eccentric", "use a dumbbell if the bar is busy").

A program has a name, a short description, and an ordered list of workouts (Day 1, Day 2, or named days such as Lower / Upper). v1 is a library of workouts the member can start, not an auto-advancing calendar that locks future days.

Video requirements:

- The member can play, pause, scrub, and replay.
- Playback adapts to the connection. Gyms often have weak wifi.
- Video URLs are not permanent public links. Only a member with a current entitlement can get a playback token.
- Liv can replace a video without breaking past workout logs. Logs point at the exercise, not at a file name.

## Tracking

**Body weight.** A member logs a weigh-in with a date and a weight in their chosen unit. They can edit or delete their own entries. The history is a simple list, newest first, with the latest weigh-in visible on the home screen.

**Workout log.** Starting a workout creates a session. For each prescribed set the member records the actual result:

- Weight and reps: load plus rep count. Load is stored in the unit they used that day.
- Reps: rep count only.
- Duration: elapsed time, with a timer they can start and stop, and the option to type a duration instead.

They can add an extra set, skip a set, mark the session complete, or leave and resume the same session later that day. Completed sessions stay in a history with the date, the workout name, and the sets logged.

Logging is the record of what they did. It does not overwrite Liv's prescription.

v1 does not compute one-rep max, volume charts, or streaks. The history is enough to see progress. Charts can come later from the same logs.

## What Liv does in the admin

- Sign in to an admin area on the website.
- Create and edit programs, workouts, and exercises.
- Set tracking type, sets, target reps or duration, and rest.
- Upload a demo video and publish or unpublish the exercise.
- Preview the member view.
- She cannot see a member's body weight or workout logs. That data stays private to the member.

## Out of scope for v1

- Multiple coaches or a marketplace.
- Nutrition, messaging, or comments.
- Community or social feed.
- Wearable or Apple Health / Health Connect sync.
- Offline logging. The gym logger assumes a connection. Queue-and-sync is a later improvement.
- Family plans, promo codes, and pausing a subscription.
- Custom one-off programs per member. Everyone on the membership sees the published library.

## Non-negotiables

- Payment card data never touches BuiltByLiv servers. Web checkout is Stripe's hosted fields or Checkout.
- Subscription terms (price after trial, interval, cancellation) are visible before the member commits a payment method.
- Exercise video is unavailable without a current entitlement.
- A member can export nothing in v1, but they can delete the account, which deletes profile, body-weight entries, and workout logs.
- The product is fitness coaching, not medical advice. The signup and footer include a short disclaimer that members should get medical clearance for exercise and that the program is not a substitute for professional medical care.

## Acceptance checks

1. A new user can create an account, add a card on the website, and open a workout during the trial without being charged.
2. Canceling before day 7 does not create a charge, and access ends when the trial ends.
3. Leaving the trial to run out creates a charge and leaves the account active.
4. A failed renewal locks new videos and new logs after the grace period, and a successful card update unlocks them again.
5. The same user can sign in on the website and in the app and see the same programs and the same logs.
6. A workout with mixed tracking types can be completed: one weight-and-reps exercise, one reps-only exercise, one duration exercise.
7. Body-weight history shows every entry the member saved, in the unit they selected.
8. An unpublished exercise is hidden from members and still does not delete logs that already reference it.
9. A member can delete their account, and signing in again does not restore the deleted logs.
