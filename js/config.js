/* =========================================================================
   CONFIGURATION — this is the only file you need to edit.
   ========================================================================= */

/**
 * The Google Apps Script Web App URL that writes orders into your Sheet.
 * It must end in /exec  (NOT /dev).  See README.md, step 1.
 *
 * To change the backend, always use Deploy -> Manage deployments -> edit (pencil)
 * -> Version: New version. That keeps this URL working.
 *
 * "Deploy -> New deployment" mints a DIFFERENT URL and can retire the old one,
 * which makes this line point at nothing: the endpoint starts returning 404 and
 * every order fails. If that happens, copy the current Web app URL from Manage
 * deployments and paste it here.
 *
 * Health check: open this URL in a browser. A working deployment answers with
 * {"ok":true,"service":"..."}. Anything else — an error page, a 404 — means the
 * site cannot save orders.
 */
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwYKGtbt1klbw4xnj8T2DJfzO7wp3VMUYRx0cTYlR2I3K6Vza7T61Cw9A5cnpB0t7ZRDA/exec";

/* ---------------------------- Payment link ----------------------------- */
/**
 * Where "Continue and pay" sends the guest. All three candidates live here;
 * paste in the link for whichever you end up using and point ACTIVE_PAYMENT at
 * it. Nothing else in the site knows which provider you chose.
 *
 * Every one of them needs an OPEN AMOUNT link — the guest types the total.
 *
 *   tikkie    Valid 14 days. Max 30 payments per link. Free.
 *             ~4 link swaps before the party; the site cannot tell when a link
 *             has expired or filled up, so swap early.
 *
 *   rabobank  Valid 2 years. Unlimited payments. €0.17 per received payment,
 *             max €750 per payment. Needs a Rabobank account.
 *             In the Rabo App you MUST switch on "hetzelfde betaalverzoek
 *             meerdere keren betalen", or the link is single-use.
 *
 *   asn       Valid ~30 days. Max 30 payments per link, max €750 per payment,
 *             max €3.000 received per month. Free. Needs ASN/SNS/RegioBank.
 *             Check in the app that an open amount is actually supported.
 */
export const PAYMENT_OPTIONS = {
  tikkie:   { label: "Tikkie",    url: "https://tikkie.me/pay/eq43980h46kbjguil304" },
  rabobank: { label: "Rabobank",  url: "https://betaalverzoek.rabobank.nl/betaalverzoek/?id=I7bJieQORBy8uI7P3z0dTQ" },
  asn:      { label: "ASN Bank",  url: "" },
};

/** Pick one: "tikkie" | "rabobank" | "asn" */
export const ACTIVE_PAYMENT = "rabobank";

/* The three constants below are derived — there is nothing to edit here.
   Selecting by key rather than commenting blocks in and out is deliberate:
   two uncommented `export const PAYMENT_URL` lines would be a syntax error,
   which stops payment.js loading at all and leaves a silently dead button. */
const selectedPayment = PAYMENT_OPTIONS[ACTIVE_PAYMENT];

if (!selectedPayment) {
  console.error(
    `config.js: ACTIVE_PAYMENT is "${ACTIVE_PAYMENT}", which is not one of ` +
    `${Object.keys(PAYMENT_OPTIONS).join(", ")}. Payments are switched off until this is fixed.`,
  );
}

export const PAYMENT_PROVIDER = selectedPayment ? selectedPayment.label : "our payment provider";
export const PAYMENT_URL = selectedPayment ? selectedPayment.url.trim() : "";

/** False when the chosen option has no link yet, or the key is misspelled. */
export const IS_PAYMENT_CONFIGURED = PAYMENT_URL.length > 0;

/** Price of a single ticket, in euro. */
export const TICKET_PRICE = 12;

/** Most tickets one person can buy in a single order. */
export const MAX_PER_ORDER = 10;

/**
 * Preset donation amounts (euro) offered as quick-pick chips.
 * Guests can always type their own amount instead.
 */
export const DONATION_PRESETS = [0, 5, 10, 15];

/** Name of the good cause, shown on the tickets page. */
export const GOOD_CAUSE = "War Child";

/** Where guests can read more about the good cause. */
export const GOOD_CAUSE_URL = "https://www.warchild.nl/";

/**
 * Your personal note on the home page. This is the only place it lives.
 *
 * paragraphs  one entry per paragraph - add or remove as many as you like
 * signoff     the line at the bottom; set to "" to leave it off
 */
export const PERSONAL_NOTE = {
  eyebrow: "From us",
  title: "Huh?! A ticket website?",
  paragraphs: [
    "Let’s start with the obvious question: why are there tickets?",
    "We’re so happy to host this party for all of you, and we’d really like to donate the " +
      "profits from the night to War Child. Not only because our very cool friend Tamo works " +
      "there, but also because of the crazy times we’re living in. We wanted to find a way to " +
      "combine having a party with supporting a good cause and tickets seemed like the easiest " +
      "way to do that.",
    "Then there’s another question: why are you looking at such a cool and innovative website?",
    "Well… that’s because Midas and Jayanti (mainly Midas) are nerds who spent too much " +
      "time making this website.",
    "Once you’ve paid for your ticket, you’ll automatically be added to the guest list. But " +
      "if you don’t want to, or can’t, pay for a ticket, please let us know! We really " +
      "don’t want money to be a reason for anyone not to come to our party.",
  ],
  signoff: "See you on the 26th of september",
};

/**
 * The running order shown on the home page. This is the only place it lives —
 * edit, reorder, add or remove entries here and the page follows.
 *
 * name   what it is, in big letters
 * note   the small line underneath
 * time   shown on the right; any text works, it does not have to be a clock time
 * accent "doors" | "band" | "dj" — picks the colour of the time readout
 *        (pink, amber, violet respectively)
 */
export const LINEUP = [
  { name: "Doors",    note: "Unleaded — come in, say hi",         time: "20:00", accent: "doors" },
  { name: "The band", note: "Super plus — live under the canopy", time: "21:30", accent: "band" },
  { name: "The DJ",   note: "Full throttle — until close",        time: "23:00", accent: "dj" },
];

/** Small print under the running order. Set to "" to hide the line entirely. */
export const LINEUP_NOTE = "Times still provisional";

/* Note: the hard limit of 100 tickets is NOT set here. It lives in
   apps-script/Code.gs, where it can actually be enforced — anything in this
   file is visible and editable by anyone visiting the site. */
