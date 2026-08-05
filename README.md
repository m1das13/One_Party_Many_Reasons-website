# One Party. Many Reasons. — party ticket site

A four-page ticket site for the party at **De Roze Tanker, Amsterdam** on **26 September 2026**.
Plain HTML, CSS and JavaScript — no build step, no dependencies. Orders land in a Google Sheet;
payment is handed off to an open-amount Tikkie link.

```
index.html    Home — hero, venue info, timetable, "Buy tickets"
tickets.html  Step 1 — number of tickets + optional donation
details.html  Step 2 — name + email
payment.html  Step 3 — total + "Continue and pay" → writes the row, then Tikkie
```

---

## Setup

Three things to do once, in this order.

### 1. The Google Sheet and its backend

1. Create a new Google Sheet. Name it whatever you like.
2. **Extensions → Apps Script.** Delete whatever is in `Code.gs` and paste in the contents of
   [`apps-script/Code.gs`](apps-script/Code.gs). Save.
3. In the function dropdown at the top, pick **`setup`** and press **Run**. Grant the permissions it
   asks for. (Google will warn that the app is unverified — it is your own script. Click
   *Advanced → Go to (project name)*.) This creates the `Orders` tab with its header row.
4. **Deploy → New deployment.** Choose type **Web app** and set:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
5. Copy the deployment URL. It ends in **`/exec`** — not `/dev`.
6. Paste it into `APPS_SCRIPT_URL` in [`js/config.js`](js/config.js).

> Whenever you change `Code.gs` later, you must **Deploy → Manage deployments → edit → New version**
> for the change to take effect. Editing the code alone does nothing to the live URL.

### 2. Your payment link

Create an **open-amount** payment link and paste it into `PAYMENT_URL` in
[`js/config.js`](js/config.js), setting `PAYMENT_PROVIDER` to its name. Two options:

| | Tikkie (ABN AMRO) | Rabo Betaalverzoek |
| --- | --- | --- |
| Link stays valid | 14 days | **2 years** |
| Payments per link | max 30 | **unlimited** |
| Open amount | yes ("bedrag openlaten") | yes ("vrije bedragkeuze") |
| Max per payment | €2,500 per request | €750 on a reusable link |
| Cost | free | €0.17 per received payment |
| Needs | any Dutch bank account | a Rabobank account |

**Rabo Betaalverzoek is the safer choice for this party.** One link covers all hundred guests for
the whole run-up, so there is nothing to rotate and nothing to forget. Tikkie is free but its
14-day / 30-payer ceiling means roughly four link swaps before the party — and the site cannot
detect an expired or full link, so a guest would get their row written and then land on a dead
payment page.

For Rabo Betaalverzoek: Rabo App → Betaalverzoek → leave the amount open, and enable **"hetzelfde
betaalverzoek meerdere keren betalen"**. Without that setting the link is single-use.

### 3. Put it online with GitHub Pages

> **Windows PowerShell 5.1 does not support `&&`** — it is a parser error, not a git problem. Run
> the commands one per line, as below. (Git Bash and PowerShell 7+ do support `&&`.)

```powershell
git init
git add -A
git commit -m "One Party Many Reasons Website"
git branch -M main
```

Create a new **public** repository on github.com (Pages is free only for public repos). **Leave
"Add a README file" unticked** — this project already has one, and a README on the remote creates a
second, unrelated root commit that git will refuse to merge with yours.

```powershell
git remote add origin https://github.com/m1das13/One_Party_Many_Reasons-website.git
git push -u origin main
```

> Already ticked the README box and got `! [rejected] main -> main (fetch first)`? Replay your work
> on top of GitHub's commit, keeping your own README:
>
> ```powershell
> git fetch origin
> git rebase origin/main
> git checkout main -- README.md
> git add README.md
> git rebase --continue
> git push -u origin main
> ```



On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)` → Save.**
About a minute later the site is live at `https://m1das13.github.io/One_Party_Many_Reasons-website/`.

Every later change is just:

```powershell
git add -A
git commit -m "Update times"
git push
```

Pages redeploys itself. A custom domain can be added any time under Settings → Pages without
touching the code.

> GitHub Pages tells browsers to cache files for ten minutes. After a push, someone who visited
> recently may still see the old version for a little while. Their own hard refresh
> (<kbd>Ctrl</kbd>+<kbd>F5</kbd>) fixes it immediately. Same applies while testing locally.

---

## Editing the content

Everything you are likely to change is marked with `<!-- PLACEHOLDER: ... -->` in the HTML.

| What | Where |
| --- | --- |
| Party name | `index.html`, the `<h1 class="hero__title">` block |
| Date | `index.html` (hero eyebrow, the "When" fact, the board header) |
| Street address | `index.html`, the "Where" fact |
| Timetable times and act names | `LINEUP` in `js/config.js` |
| Small print under the timetable | `LINEUP_NOTE` in `js/config.js` |
| Ticket price | `TICKET_PRICE` in `js/config.js` **and** `Code.gs` — keep them equal |
| Max tickets per order | `MAX_PER_ORDER` in `js/config.js` **and** `Code.gs` — keep them equal |
| Donation preset amounts | `DONATION_PRESETS` in `js/config.js` |
| Good cause name and link | `GOOD_CAUSE` / `GOOD_CAUSE_URL` in `js/config.js` |
| Total capacity (100) | `MAX_TICKETS` in `apps-script/Code.gs` only |
| Colours and fonts | the `:root` block at the top of `css/theme.css` |

---

## Running the Sheet during ticket sales

The `Orders` tab looks like this:

| Timestamp | Order ID | Name | Email | Tickets | Donation | Total | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

**The script is append-only.** Every tap of "Continue and pay" adds one row and nothing is ever
edited or overwritten. So a guest who pays, goes back and pays again leaves *two* rows for *two*
bank deposits, and someone returning a week later gets a fresh row. Nothing is ever silently merged.

Every new row arrives as `reserved`. The `Status` column is yours to drive:

- **`paid`** — the Tikkie came in. Purely for your own bookkeeping; still counts against the 100.
- **`cancelled`** — frees those seats immediately; the next order can take them.
- **`duplicate`** — same as cancelled. Use it for the second row when someone submitted twice but
  only paid once, so you keep the record without double-counting the seats.
- Anything else (including `reserved`, and any typo) counts against the 100 — deliberately, so a
  mistyped status can never quietly oversell the party.

The **Order ID** (e.g. `RT-7Q4KX9`) is internal — it is no longer shown to guests, so match a Tikkie
payment to a row by the payer's **name**, falling back to the amount. Tikkie shows you the name on
the paying bank account, which is usually enough.

To see how many seats are left, put this in an empty cell:

```
=100-SUMIFS(E2:E,H2:H,"<>cancelled",H2:H,"<>duplicate")
```

### Swapping the payment link

Edit `PAYMENT_URL` and `PAYMENT_PROVIDER` in `js/config.js`, then:

```powershell
git add -A
git commit -m "New payment link"
git push
```

Live within a minute. Anyone who loaded the page in the previous ten minutes may still get the old
link from cache, so swap *before* the old one dies rather than after.

**If you stay on Tikkie** you must do this roughly every two weeks, and sooner if the link nears 30
payers — set a calendar reminder, because the site cannot tell that a link has expired or filled up.
On Rabo Betaalverzoek one link lasts two years and this is a one-off.

---

## Things worth knowing

- **Payment is not verified.** Consumer Tikkie has no callback, so the site cannot know whether
  someone actually paid. Reconciling `reserved` → `paid` is manual.
- **The row is written when the guest taps "Continue and pay"**, immediately before they are sent
  to Tikkie — not when they fill in their name. So the Sheet only collects people who got as far
  as paying. The trade-off: someone who fills in their details and then closes the tab leaves no
  trace at all, and capacity is only checked at that final tap.
- **The order reference is generated in the browser** and kept out of sight. Its job now is
  idempotency: submitting the same reference twice updates that row instead of adding a second one,
  so a double tap cannot produce a duplicate.
- **The 100 cap counts reservations, not payments.** Someone who reserves and never pays holds a
  seat until you set their status to `cancelled`.
- **No sold-out counter is shown anywhere**, by design. Capacity is only checked at the moment the
  guest taps "Continue and pay"; if it no longer fits they stay on the payment page with a message
  and are never sent to Tikkie.
- **The Apps Script URL is public** — it sits in `js/config.js`, which anyone can read. That is
  inherent to a site with no server. Defences in place: server-side validation of every field, a
  hidden honeypot field, and the per-order limit. Worst case, someone appends junk rows that you
  delete by hand.
- **No cookies, no analytics, no third-party trackers.** Guest data lives only in your Sheet. The
  browser keeps the in-progress order in `sessionStorage`, which is cleared when the tab closes.

---

## Testing locally

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. A server is required — the pages use ES modules, which browsers
refuse to load from `file://`.

To test the cap without inviting a hundred people: temporarily set `MAX_TICKETS = 2` in `Code.gs`,
redeploy a new version, and place orders until it refuses.
