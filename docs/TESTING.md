# Testing QLine

Two ways to test: on your phone against the real site, or on your laptop
against the real database. Do the phone one before you show the barber
anything — it is the only way to catch the things that break in real life.

Live site: https://qline-gray.vercel.app/
Database: Supabase project "Jasmeet Qline"

---

## 1. The ten-minute pass, on real phones

You need two phones (yours + any other, or a phone and a laptop). One is the
barber, the other is the customer. Use a different browser or a private
window for the customer, otherwise both sides share the same stored ticket.

**Barber phone**

1. Open the site, sign in, land on the dashboard.
2. Tap **Open shop**. The dot turns brass and it says Open.
3. Menu (☰) → **Settings** → **Barbers** → add two names.
4. **Services and times** → add *Haircut 20* and *Shave 10*.
5. **How the line works** → choose *Customers pick a barber*.
6. Back arrow (top left) on each screen — it should step back one level, and
   from Settings back to the dashboard.

**Customer phone**

7. Scan the QR card at the bottom of the dashboard (or open `/s/<your-slug>`).
8. You should see **What do you need?** and **Who do you want?**. Pick
   *Shave* and one barber, fill in name and number, join.
9. The ticket screen shows your number, how many are ahead, and the wait.

**Barber phone again**

10. The new customer appears within a second or two, with `Shave · for Gopi`
    under the name.
11. Pick who is free under **Who is free?** and tap **Next**.

### What to actually watch for

- **The wait estimate.** If someone is in the chair, a person who is next
  should never see "less than a minute". A 10-minute shave ahead of you
  should read about 10 minutes, not 20.
- **Turn off wifi on the customer phone** halfway through, wait, turn it back
  on. The screen should catch up on its own within 20 seconds.
- **Lock the customer phone** and have the barber tap Next. The notification
  should arrive on the lock screen (see below).
- **Two barbers calling at once.** Tap Next on two devices at the same time.
  Two different customers must be called — never the same one twice.
- **Walk-ins.** Add someone by hand; they should take the next number.

---

## 2. Notifications (the part most likely to fail quietly)

Notifications only work after the site is **installed to the home screen** on
iPhone. That is Apple's rule, not ours.

**iPhone**

1. Open the customer link in **Safari** (not Chrome, not in-app browsers).
2. Share → **Add to Home Screen**.
3. Open it from the home screen icon, join the line, tap **Tell me when it's
   my turn**, allow.
4. Lock the phone. The barber taps Next twice (once to make you next, once to
   call you). Two notifications: "You're next", then "It's your turn".

**Android**

Same, but Chrome will usually ask to install, and notifications also work
without installing.

If nothing arrives, check in this order:

| Check | Where |
|---|---|
| Was a subscription saved? | Supabase → Table editor → `push_subscriptions` |
| Did the sender run? | Supabase → Edge Functions → `notify` → Logs |
| Was anything due? | The log line shows `{due, sent, dropped, failures}` |

`due: 0` means the database thought nothing needed sending — usually because
that customer was already notified. `failures` with a 401 means the VAPID
keys don't match the ones the browser subscribed with.

---

## 3. Testing against the real database from your laptop

```bash
npm start            # then press w for the browser
```

This talks to the real Supabase project, so anything you add is really there.
Use a throwaway shop, not the barber's. To clear it out afterwards, in the
Supabase SQL editor:

```sql
delete from queue_entries where shop_id = '<your-test-shop-id>';
```

To see the queue as the database sees it:

```sql
select ticket_no, customer_name, status,
       (select name from services where id = service_id)        as service,
       (select name from barbers  where id = preferred_barber_id) as wants,
       (select name from barbers  where id = served_by_barber_id) as got
from queue_entries
where shop_id = '<your-test-shop-id>' and queue_date = current_date
order by ticket_no;
```

### Trying a rule without touching real data

Wrap it in a transaction and roll back. Nothing is kept:

```sql
begin;
-- ... inserts, calls to call_next, whatever you want to try ...
rollback;
```

That is how migration 007 was checked before it went live.

---

## 4. The things that break in a real shop

Test these deliberately — they are what will actually go wrong in Nangal.

| Failure | How to try it | What should happen |
|---|---|---|
| Barber forgets to tap Next | Leave someone in the chair 40 minutes | Waits grow but stay sane; nobody is shown "now" forever |
| Customer closes the tab | Close it, reopen the link | The ticket comes back — it is stored on the phone |
| Customer leaves the shop | Tap "Leave the line" | They disappear from the barber's list at once |
| No-show | Call someone who isn't there, tap No-show | They are gone and the next person can be called |
| Shop closes with people waiting | Tap Close shop | Nobody new can join; the people already in line keep their place |
| Same person joins twice | Join again with the same number | "You are already in the line, number N" |
| Slow network | Chrome DevTools → Network → Slow 4G | Screens still load; taps don't double-fire |

---

## 5. Before you show the barber

- Open the shop, add his real services and times, print the poster from
  **Settings → Printable QR poster**, and scan it with a phone that has never
  opened the site — from across the room, in shop lighting.
- Set the app language to Punjabi and walk the whole customer flow again. Any
  English left over is a bug.
- Check the estimate on a real cut: start one, note what the app says, see
  what it really takes.
