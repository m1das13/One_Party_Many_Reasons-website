/* =========================================================================
   Order state — a single sessionStorage record shared by the checkout pages.
   sessionStorage (not localStorage) so a closed tab starts a fresh order.
   ========================================================================= */

import { TICKET_PRICE, APPS_SCRIPT_URL } from "./config.js";

const STORAGE_KEY = "rozetanker.order";

const EMPTY_ORDER = {
  quantity: 1,
  donation: 0,
  name: "",
  email: "",
  // Filled in by the hidden spam trap on the details page, carried through to
  // the payment page because that is where the order is now submitted.
  honeypot: "",
};

/**
 * Can we store anything at all? Safari's private mode and some strict privacy
 * settings make sessionStorage throw on write. Without this check the guest
 * would fill in the whole form and get silently bounced back a step forever.
 */
export function isStorageAvailable() {
  try {
    sessionStorage.setItem("__probe", "1");
    sessionStorage.removeItem("__probe");
    return true;
  } catch {
    return false;
  }
}

/** Read the current order. Always returns a complete object. */
export function readOrder() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_ORDER, ...JSON.parse(raw) } : { ...EMPTY_ORDER };
  } catch {
    // Corrupt JSON or storage blocked (private mode) — start clean.
    return { ...EMPTY_ORDER };
  }
}

/** Merge a patch into the stored order and return the new state. */
export function writeOrder(patch) {
  const next = { ...readOrder(), ...patch };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the page still works for this render, and the
    // guards below will send the guest back a step if it truly did not save.
  }
  return next;
}

/**
 * Has the guest actually been through the tickets page?
 * readOrder() defaults to one ticket so the counter has something to show, so
 * the presence of the record — not its contents — is what tells us the guest
 * picked an order rather than deep-linking into the middle of the checkout.
 */
function hasStartedOrder() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/* ---------- Money ---------- */

const euroFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

export function formatEuro(amount) {
  return euroFormatter.format(amount);
}

export function ticketsSubtotal(order) {
  return order.quantity * TICKET_PRICE;
}

export function orderTotal(order) {
  return ticketsSubtotal(order) + order.donation;
}

/* ---------- Navigation guards ---------- */

/**
 * Send the guest back a step if they landed here without the data that step
 * produces (deep link, refreshed after the tab was reopened, etc.).
 *
 * @param {"details"|"payment"} step
 * @returns {boolean} true if the page may render
 */
export function guardStep(step) {
  const order = readOrder();
  const hasTickets = hasStartedOrder() && Number.isInteger(order.quantity) && order.quantity >= 1;
  const hasIdentity = Boolean(order.name && order.email);

  if (!hasTickets) {
    window.location.replace("tickets.html");
    return false;
  }
  if (step === "payment" && !hasIdentity) {
    window.location.replace("details.html");
    return false;
  }
  return true;
}

/* ---------- Backend ---------- */

/**
 * Send the order to the Apps Script Web App.
 *
 * Posted as text/plain on purpose: that makes it a CORS "simple request", so
 * the browser skips the preflight OPTIONS call that Apps Script cannot answer.
 * The body is still JSON and is parsed as JSON on the other side.
 *
 * No order id is sent: the backend mints one and appends a row every time, so
 * repeat submissions become separate rows to reconcile rather than silently
 * overwriting each other.
 *
 * @returns {Promise<{ok: boolean, orderId?: string, reason?: string}>}
 */
export async function submitOrder({ quantity, donation, name, email, honeypot }) {
  // .trim() because a stray space pasted into config.js would otherwise be a
  // very confusing outage right in the middle of the payment step.
  const response = await fetch(APPS_SCRIPT_URL.trim(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    // ticketPrice is sent so the backend can flag it in the sheet if the two
    // copies of the price have drifted apart. It does not set what is charged.
    body: JSON.stringify({
      quantity, donation, name, email, honeypot, ticketPrice: TICKET_PRICE,
    }),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Backend responded with ${response.status}`);
  }

  const result = await response.json();
  // Treat anything that is not an explicit success as a failure, so a
  // malformed response can never be mistaken for "your order is saved".
  if (!result || typeof result.ok !== "boolean") {
    throw new Error("Backend returned an unrecognised response");
  }
  return result;
}

/* ---------- Shared UI bits ---------- */

/** Point the fuel-gauge needle at the current step (1, 2 or 3). */
export function setGauge(step) {
  const needle = document.querySelector(".gauge__needle");
  const fill = document.querySelector(".gauge__fill");
  if (!needle || !fill) return;

  const fraction = step / 3;
  const arcLength = fill.getTotalLength();

  // The needle sweeps from empty (-60deg) to full (+60deg).
  needle.style.rotate = `${-60 + fraction * 120}deg`;
  fill.style.strokeDasharray = String(arcLength);
  fill.style.strokeDashoffset = String(arcLength * (1 - fraction));
}

/** Set an element's text by id, ignoring ids that are absent on this page. */
export function setText(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

/**
 * Fill in the order summary. Every checkout page uses the same element ids,
 * and missing ones are simply skipped.
 */
export function renderReceipt(order) {
  const ticketWord = order.quantity === 1 ? "ticket" : "tickets";

  setText("receipt-tickets-label", `${order.quantity} ${ticketWord} × ${formatEuro(TICKET_PRICE)}`);
  setText("receipt-tickets", formatEuro(ticketsSubtotal(order)));
  setText("receipt-donation", formatEuro(order.donation));
  setText("receipt-total", formatEuro(orderTotal(order)));
  setText("bar-total", formatEuro(orderTotal(order)));
}

/** Show or hide one of the .notice boxes, optionally replacing its text. */
export function setNotice(element, message) {
  if (!element) return;
  if (message) {
    element.textContent = message;
    element.classList.add("is-visible");
  } else {
    element.classList.remove("is-visible");
  }
}
