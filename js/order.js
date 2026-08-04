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
  orderId: null,
  // Filled in by the hidden spam trap on the details page, carried through to
  // the payment page because that is where the order is now submitted.
  honeypot: "",
};

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
  const hasIdentity = Boolean(order.name && order.email && order.orderId);

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

/* ---------- Order reference ---------- */

/**
 * A short reference like RT-K7Q4X9, generated here in the browser rather than
 * by the backend. That is what lets the payment page show the guest their
 * reference *before* anything is written to the Sheet.
 *
 * The alphabet leaves out characters people mistype (0/O, 1/I). Six of them
 * gives about a billion combinations, so two guests colliding over a hundred
 * orders is somewhere around a one-in-a-million event. Sending the same id
 * twice is harmless: the backend updates that row rather than adding another.
 */
export function generateOrderId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  let code = "";
  // 256 is an exact multiple of 32, so the modulo introduces no bias.
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return `RT-${code}`;
}

/* ---------- Backend ---------- */

/**
 * Send the order to the Apps Script Web App.
 *
 * Posted as text/plain on purpose: that makes it a CORS "simple request", so
 * the browser skips the preflight OPTIONS call that Apps Script cannot answer.
 * The body is still JSON and is parsed as JSON on the other side.
 *
 * @returns {Promise<{ok: boolean, orderId?: string, reason?: string}>}
 */
export async function submitOrder({ quantity, donation, name, email, honeypot, orderId }) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    // orderId is only present on a re-submit; it tells the backend to update
    // that row instead of appending a second one.
    body: JSON.stringify({ quantity, donation, name, email, honeypot, orderId }),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Backend responded with ${response.status}`);
  }
  return response.json();
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
