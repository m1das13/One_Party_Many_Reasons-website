/* =========================================================================
   Home page — renders the running order from LINEUP in js/config.js, so the
   times and act names live in exactly one place.
   ========================================================================= */

import { LINEUP, LINEUP_NOTE, PERSONAL_NOTE, TICKET_PRICE } from "./config.js";

/* ---------- Ticket price ---------- */
// Driven from config so the home page can never advertise a different price
// from the one the checkout actually charges.
const priceLabel = Number.isInteger(TICKET_PRICE)
  ? `€${TICKET_PRICE}`
  : `€${TICKET_PRICE.toFixed(2)}`;

setText("fact-price", `${priceLabel} each`);
setText("closer-price", priceLabel);

/* ---------- Personal note ---------- */
setText("note-eyebrow", PERSONAL_NOTE.eyebrow);
setText("note-title", PERSONAL_NOTE.title);

const noteBody = document.getElementById("note-body");
if (noteBody) {
  noteBody.replaceChildren(...PERSONAL_NOTE.paragraphs.map((text) => element("p", "lede", text)));
}

const signoff = document.getElementById("note-signoff");
if (signoff) {
  signoff.textContent = PERSONAL_NOTE.signoff;
  signoff.hidden = !PERSONAL_NOTE.signoff;
}

/* ---------- Running order ---------- */
const rows = document.getElementById("lineup-rows");
if (rows) {
  rows.replaceChildren(...LINEUP.map(buildSlot));
}

const lineupNote = document.getElementById("lineup-note");
if (lineupNote) {
  lineupNote.textContent = LINEUP_NOTE;
  lineupNote.hidden = !LINEUP_NOTE;
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

/**
 * One row of the board: name and note on the left, time on the right.
 * @param {{name: string, note: string, time: string, accent: string}} entry
 */
function buildSlot(entry) {
  const slot = document.createElement("li");
  slot.className = `slot slot--${entry.accent}`;

  slot.append(
    element("span", "slot__name", entry.name),
    element("span", "slot__sub", entry.note),
    element("span", "slot__time", entry.time),
  );
  return slot;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
