/**
 * One Party. Many Reasons. — order intake.
 *
 * Paste this into the Apps Script editor of the Google Sheet that holds your
 * guest list (Extensions -> Apps Script), then deploy it as a Web App.
 * Full instructions are in README.md.
 *
 * This is the only place the 100-ticket limit is enforced. Anything in the
 * website's own JavaScript can be edited by whoever is visiting the page.
 */

/* ============================ Settings ============================ */

/** Tab in the spreadsheet that holds the orders. */
const SHEET_NAME = 'Orders';

/** Hard capacity of the party. Nothing gets written past this. */
const MAX_TICKETS = 100;

/**
 * Price per ticket, in euro. Must match TICKET_PRICE in js/config.js.
 * If the two ever drift apart, the Total column here silently disagrees with
 * what guests actually paid — so a mismatch is written into the Notes column
 * of the affected row rather than being left to discover during reconciliation.
 */
const TICKET_PRICE = 12;

/** Most tickets allowed in a single order. Must match MAX_PER_ORDER in js/config.js. */
const MAX_PER_ORDER = 10;

/** Column layout of the Orders sheet, 1-indexed. */
const COLUMN = {
  TIMESTAMP: 1,
  ORDER_ID: 2,
  NAME: 3,
  EMAIL: 4,
  TICKETS: 5,
  DONATION: 6,
  TOTAL: 7,
  STATUS: 8,
  NOTES: 9,
};

const HEADERS = [
  'Timestamp', 'Order ID', 'Name', 'Email',
  'Tickets', 'Donation (EUR)', 'Total (EUR)', 'Status', 'Notes',
];

/** Status a new row starts life with. */
const STATUS_RESERVED = 'reserved';

/**
 * Statuses that do NOT count against capacity — your way of voiding a row
 * without deleting it. Everything else counts, including anything you type by
 * hand, so a typo can never accidentally free up seats and oversell the party.
 */
const VOID_STATUSES = ['cancelled', 'duplicate'];

/* ============================ Entry points ============================ */

/**
 * Handles an order from the website.
 *
 * Request body is JSON (sent as text/plain so the browser skips the CORS
 * preflight that Apps Script cannot answer):
 *   { quantity, donation, name, email, honeypot }
 *
 * APPEND-ONLY. Every accepted submission adds a row and nothing is ever
 * overwritten, so a guest who pays twice, or comes back days later, leaves two
 * rows to reconcile against two bank deposits. Voiding is done by hand via the
 * Status column, never by this script.
 *
 * Responds with { ok: true, orderId } or { ok: false, reason }, where reason is
 * one of: 'invalid', 'sold_out', 'not_enough', 'busy'.
 */
function doPost(request) {
  if (!request || !request.postData || !request.postData.contents) {
    return jsonResponse({ ok: false, reason: 'invalid' });
  }

  var payload;
  try {
    payload = JSON.parse(request.postData.contents);
  } catch (error) {
    return jsonResponse({ ok: false, reason: 'invalid' });
  }

  // Bots fill in the hidden field; humans never see it.
  if (payload.honeypot) {
    return jsonResponse({ ok: false, reason: 'invalid' });
  }

  var order = validateOrder_(payload);
  if (!order) {
    return jsonResponse({ ok: false, reason: 'invalid' });
  }

  // Serialise everything below, so two people cannot both claim the last seats.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return jsonResponse({ ok: false, reason: 'busy' });
  }

  try {
    return jsonResponse(saveOrder_(order));
  } catch (error) {
    // Never let an exception escape as an HTML error page: the site would show
    // a confusing "could not reach" message. Report it as a clean failure so
    // the guest is told to try again and is NOT sent on to Tikkie.
    return jsonResponse({ ok: false, reason: 'error', detail: String(error).slice(0, 200) });
  } finally {
    lock.releaseLock();
  }
}

/** Lets you check in a browser that the deployment is live. */
function doGet() {
  return jsonResponse({ ok: true, service: 'One Party. Many Reasons. — order intake' });
}

/**
 * Run this once from the editor to create the Orders tab with its header row.
 * Safe to run again later; it will not touch existing rows.
 */
function setup() {
  var sheet = getOrdersSheet_();
  sheet.getRange(1, COLUMN.TIMESTAMP, sheet.getMaxRows()).setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.autoResizeColumns(1, HEADERS.length);
}

/* ============================ Internals ============================ */

/**
 * Checks and normalises an incoming order.
 * @return {?Object} the clean order, or null if anything is off.
 */
function validateOrder_(payload) {
  var quantity = Number(payload.quantity);
  if (!isFinite(quantity) || quantity !== Math.floor(quantity)) return null;
  if (quantity < 1 || quantity > MAX_PER_ORDER) return null;

  var donation = Number(payload.donation);
  if (!isFinite(donation) || donation < 0 || donation > 10000) return null;
  donation = Math.round(donation * 100) / 100;

  var name = String(payload.name || '').trim();
  if (name.length < 2 || name.length > 100) return null;

  var email = String(payload.email || '').trim();
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;

  // The site tells us what it charged. We still bill from our own constant, but
  // a disagreement means js/config.js and this file have drifted apart, which
  // would otherwise quietly corrupt every Total in the sheet.
  var sitePrice = Number(payload.ticketPrice);
  var note = '';
  if (isFinite(sitePrice) && sitePrice > 0 && sitePrice !== TICKET_PRICE) {
    note = 'PRICE MISMATCH: site charged EUR ' + sitePrice + ' per ticket, this script assumes EUR '
         + TICKET_PRICE + '. Update TICKET_PRICE in Code.gs and redeploy.';
  }

  return {
    quantity: quantity,
    donation: donation,
    name: name,
    email: email,
    total: Math.round((quantity * TICKET_PRICE + donation) * 100) / 100,
    note: note,
  };
}

/**
 * Appends the order as a new row. Never updates, never overwrites.
 * Assumes the caller holds the script lock.
 *
 * Append-only is the whole safety story here: the only write this script ever
 * performs is "add one row at the bottom". There is no code path that can edit
 * or lose an existing row, whatever the guest clicks.
 */
function saveOrder_(order) {
  var sheet = getOrdersSheet_();
  var rows = readRows_(sheet);
  var sold = countLiveTickets_(rows);

  if (sold >= MAX_TICKETS) {
    return { ok: false, reason: 'sold_out' };
  }
  if (sold + order.quantity > MAX_TICKETS) {
    return { ok: false, reason: 'not_enough' };
  }

  var orderId = generateOrderId_(rows);
  sheet.appendRow(buildRow_(order, orderId, new Date()));

  // Read back what actually landed, so a silent write failure cannot be
  // reported to the guest as success.
  var lastRow = sheet.getLastRow();
  var written = String(sheet.getRange(lastRow, COLUMN.ORDER_ID).getValue());
  if (written !== orderId) {
    return { ok: false, reason: 'error', detail: 'row not confirmed' };
  }

  return { ok: true, orderId: orderId };
}

/** Tickets that count against capacity: every row not explicitly voided. */
function countLiveTickets_(rows) {
  var total = 0;
  for (var i = 0; i < rows.length; i++) {
    var status = String(rows[i][COLUMN.STATUS - 1]).trim().toLowerCase();
    if (VOID_STATUSES.indexOf(status) !== -1) continue;
    total += Number(rows[i][COLUMN.TICKETS - 1]) || 0;
  }
  return total;
}

function buildRow_(order, orderId, timestamp) {
  return [
    timestamp,
    orderId,
    order.name,
    order.email,
    order.quantity,
    order.donation,
    order.total,
    STATUS_RESERVED,
    order.note || '',
  ];
}

/**
 * The Orders tab, created on demand with its header row.
 *
 * Previously this threw if the tab was missing, which would have turned a
 * renamed or accidentally deleted tab into a total checkout outage. Creating it
 * instead means the worst case is a fresh empty tab that still records orders.
 */
function getOrdersSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** All data rows, header excluded. */
function readRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
}

function findRowIndex_(rows, orderId) {
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][COLUMN.ORDER_ID - 1]) === orderId) return i;
  }
  return -1;
}

/**
 * A short reference for the row, e.g. RT-7Q4KX9. Internal only — guests never
 * see it. Checked against the rows already present, so it is always unique.
 * The alphabet leaves out characters people mistype (0/O, 1/I).
 */
function generateOrderId_(rows) {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (var attempt = 0; attempt < 50; attempt++) {
    var code = '';
    for (var i = 0; i < 6; i++) {
      code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    var candidate = 'RT-' + code;
    if (findRowIndex_(rows, candidate) === -1) return candidate;
  }
  throw new Error('Could not generate a unique order id.');
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
