/* =========================================================================
   CONFIGURATION — this is the only file you need to edit.
   ========================================================================= */

/**
 * The Google Apps Script Web App URL that writes orders into your Sheet.
 * Get it from: Apps Script editor -> Deploy -> New deployment -> Web app.
 * It must end in /exec  (NOT /dev).
 * See README.md, step 1.
 */
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwYKGtbt1klbw4xnj8T2DJfzO7wp3VMUYRx0cTYlR2I3K6Vza7T61Cw9A5cnpB0t7ZRDA/exec";

/**
 * Where "Continue and pay" sends the guest: any open-amount payment link.
 * Swapping payment provider is these two lines and a push — nothing else in
 * the site knows or cares which one you use. See README.md, step 2.
 *
 * Tikkie             14 days, max 30 payers per link, free.
 * Rabo Betaalverzoek 2 years, unlimited payers, €0.17 per received payment,
 *                    max €750 per payment on a reusable link.
 *
 * PAYMENT_PROVIDER is only the name shown to guests in error messages.
 */
export const PAYMENT_URL = "https://tikkie.me/pay/eq43980h46kbjguil304";
export const PAYMENT_PROVIDER = "Tikkie";

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
 * paragraphs  one entry per paragraph — add or remove as many as you like
 * signoff     the name(s) at the bottom; set to "" to leave it off
 *
 * PLACEHOLDER: the words below are a stand-in. Write your own.
 */
export const PERSONAL_NOTE = {
  eyebrow: "From us",
  title: "Why we're doing this",
  paragraphs: [
    "We had a hard time picking one reason to throw a party, so we stopped trying. " +
      "There is a bit of everything in this one: something to celebrate, someone to " +
      "thank, and a room we have wanted to fill for a long time.",
    "So come for whichever reason suits you. Stay for the band, stay longer for the DJ, " +
      "and let us worry about the rest. We would rather have you there than have it perfect.",
  ],
  signoff: "",
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
