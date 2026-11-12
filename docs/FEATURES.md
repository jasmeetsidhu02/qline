# What QLine does today

Live at https://qline-gray.vercel.app/ — one codebase (Expo + React Native)
running as a website, installable to a phone's home screen.

---

## For the customer

No app to download. They scan the QR code and everything happens in the browser.

- **Join by scanning.** The QR opens `/s/<shop>`. Name and phone number, done.
- **Pick what they need.** Haircut, shave, whatever the shop set up — with how
  long each takes. Only shown if the shop added services.
- **Pick a barber.** Only in shops that work that way, and "Anyone" is always
  an option.
- **A live place in the line.** How many people are ahead — not the total in
  the shop — and roughly how many minutes. The estimate counts the person
  currently in the chair, uses the length of the service they chose, and
  learns from how long cuts really take in that shop.
- **The ticket survives.** Close the tab, lock the phone, come back later:
  the ticket is stored on the phone and reopens where it was.
- **Notifications.** "You're next" and then "It's your turn", on the lock
  screen, in their language. Works on iPhone once the site is added to the
  home screen, which is Apple's rule.
- **A sound and a buzz** if the page happens to be open.
- **Leave the line** in two taps, so a stray thumb can't do it.
- **Honest about the shop.** Says when the shop is closed, when it closed
  while they were waiting, and when a ticket is left over from an earlier day.
- **Three languages.** English, Hindi, Punjabi — the whole app, not just
  labels, including the notifications.

## For the barber

- **One screen.** Who is in the chair, one big **Next** button, the line
  underneath.
- **Open / closed** as a card that says whether customers can join, with a
  switch. Closing stops new people joining; the line already there is kept.
- **Next** finishes the current customer and calls the following one in a
  single step, so two phones tapping it at once can never call the same
  person twice.
- **Who is free?** In shops where customers pick a barber, Next asks which
  barber is calling and then takes that barber's own customers first, falling
  back to whoever is happy with anyone.
- **Call someone out of order** by tapping their row.
- **Done / No-show**, and **Undo** for fifteen minutes after either. Someone
  who had been called goes back to the chair; someone who never was goes back
  to the line.
- **Add a walk-in** by hand for customers who don't use a phone.
- **Call a customer** straight from their row.
- **A nudge** when someone has been in the chair more than twice the usual
  time — usually it means Done was never tapped.
- **The line stays fresh three ways:** a live push from the database, a
  refresh whenever the screen comes back to the front, and a refetch every 20
  seconds — because any one of them can fail on a weak signal.
- **Right times on a wrong clock.** Durations come from the server's clock,
  not the phone's.
- **A day that ends.** Leftovers from earlier days are closed off when the
  dashboard opens and inside every Next, so the board starts clean each
  morning without anyone doing anything.
- **Today's count** of finished cuts and no-shows.

## Settings

- **Barbers** — add, rename, turn on and off, remove. The number of active
  barbers is the number of chairs the wait calculation assumes.
- **Services and times** — name in each of the three languages, and how many
  minutes it takes.
- **How the line works** — one shared line, or customers pick a barber.
  Needs at least two active barbers.
- **Printable QR poster** — an A4 sheet to print and stick on the wall, with
  a QR big enough to scan from across the room.
- **Language**, and the shop's own name and link.

## Underneath

- **Multi-tenant from day one.** Every shop is a row; nothing is hard-coded
  to one salon. A second shop costs nothing to add.
- **No backend server.** The app talks to Postgres directly. What each person
  may see or do is decided by row-level security in the database, so there is
  no server to run, pay for, or leave unpatched.
- **Checked, not assumed:** a stranger cannot read another shop's queue or
  call its customers; a customer with no account can join and watch their own
  ticket and nothing else.
- **The only server-side piece** is one small function that sends the push
  notifications, because they have to be signed with a private key that must
  never be in the app.
- **Every money-shaped action is free** at this size: Supabase's free tier
  and Vercel's hobby tier cover a shop like this with room to spare.

---

## Not built yet

- Paying for it — plans, billing, a limit on free shops.
- A second staff member per shop (the database supports it; there is no
  screen to invite anyone).
- History and takings: how many cuts last week, busiest hours.
- SMS as a fallback for customers who never allow notifications.
- Any kind of booking ahead. QLine is a line, not an appointment book — on
  purpose.
