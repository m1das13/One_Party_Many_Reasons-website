/* =========================================================================
   Step 1 — quantity and optional donation.
   ========================================================================= */

import { MAX_PER_ORDER, DONATION_PRESETS, GOOD_CAUSE, GOOD_CAUSE_URL } from "./config.js";
import { readOrder, writeOrder, formatEuro, renderReceipt, setGauge } from "./order.js";

const form = document.getElementById("tickets-form");
const minusButton = document.getElementById("qty-minus");
const plusButton = document.getElementById("qty-plus");
const quantityValue = document.getElementById("qty-value");
const quantityUnit = document.getElementById("qty-unit");
const chipsContainer = document.getElementById("donation-chips");
const donationInput = document.getElementById("donation-custom");

let order = readOrder();

/* ---------- One-off copy driven by config ---------- */
// The good cause is named in two places on this page. Both are real links in
// the markup already, so the page still reads correctly if this never runs.
for (const id of ["good-cause", "good-cause-link"]) {
  const link = document.getElementById(id);
  if (!link) continue;
  link.textContent = GOOD_CAUSE;
  link.href = GOOD_CAUSE_URL;
}

/* ---------- Donation chips ---------- */
for (const amount of DONATION_PRESETS) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.dataset.amount = String(amount);
  chip.textContent = amount === 0 ? "No thanks" : formatEuro(amount);
  chip.setAttribute("aria-pressed", "false");
  chip.addEventListener("click", () => {
    setDonation(amount);
    donationInput.value = amount === 0 ? "" : amount.toFixed(2);
  });
  chipsContainer.append(chip);
}

/* ---------- Handlers ---------- */
minusButton.addEventListener("click", () => setQuantity(order.quantity - 1));
plusButton.addEventListener("click", () => setQuantity(order.quantity + 1));

donationInput.addEventListener("input", () => {
  setDonation(parseAmount(donationInput.value));
});

// Tidy the typed amount to two decimals once the guest moves on.
donationInput.addEventListener("blur", () => {
  donationInput.value = order.donation > 0 ? order.donation.toFixed(2) : "";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  writeOrder({ quantity: order.quantity, donation: order.donation });
  window.location.href = "details.html";
});

/* ---------- State updates ---------- */

function setQuantity(next) {
  order = writeOrder({ quantity: clamp(next, 1, MAX_PER_ORDER) });
  render();
}

function setDonation(next) {
  // Round to whole cents so the total always matches what they type in Tikkie.
  order = writeOrder({ donation: Math.round(clamp(next, 0, 10000) * 100) / 100 });
  render();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Read a euro amount the way people actually type it: "3,75", "3.75", "€ 3,75".
 * Anything unparseable counts as no donation.
 */
function parseAmount(raw) {
  const cleaned = raw.replace(/[^0-9.,]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function render() {
  quantityValue.textContent = String(order.quantity);
  quantityUnit.textContent = order.quantity === 1 ? "ticket" : "tickets";
  minusButton.disabled = order.quantity <= 1;
  plusButton.disabled = order.quantity >= MAX_PER_ORDER;

  for (const chip of chipsContainer.children) {
    const isActive = Number(chip.dataset.amount) === order.donation;
    chip.setAttribute("aria-pressed", String(isActive));
  }

  renderReceipt(order);
}

/* ---------- Boot ---------- */
donationInput.value = order.donation > 0 ? order.donation.toFixed(2) : "";
setGauge(1);
render();
