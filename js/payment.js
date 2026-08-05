/* =========================================================================
   Step 3 — show the total, write the order, hand off to the payment provider.

   The row is written here rather than on the details page, so the Sheet only
   ever fills up with people who actually went through to pay.
   ========================================================================= */

import {
  PAYMENT_URL, PAYMENT_PROVIDER, IS_PAYMENT_CONFIGURED, APPS_SCRIPT_URL,
} from "./config.js";
import {
  readOrder, renderReceipt,
  setGauge, setText, setNotice, guardStep, submitOrder,
} from "./order.js";

if (guardStep("payment")) {
  const order = readOrder();
  let inFlight = false;

  const payButton = document.getElementById("pay-btn");
  const payLabel = document.getElementById("pay-label");
  const payError = document.getElementById("pay-error");

  const ERROR_MESSAGES = {
    sold_out:
      "Sorry — the party is full and the last tickets have gone. Nothing has been charged. " +
      "Send us a message and we will put you on the waiting list.",
    not_enough:
      "Sorry, we cannot fit that many any more. Nothing has been charged — go back and try " +
      "a smaller number.",
    busy:
      "Someone else was ordering at the same moment. Give it a few seconds and tap again.",
    invalid:
      "Something in your order did not look right to us. Go back a step and check your details.",
    error:
      `Something went wrong saving your order, so we have not sent you to ${PAYMENT_PROVIDER}. ` +
      "Nothing has been charged — please try again in a moment.",
  };

  /* ---------- Render ---------- */

  setText("guest-name", order.name.split(" ")[0]);
  setText("summary-name", order.name);
  setText("summary-email", order.email);

  /* ---------- Pay ---------- */

  payButton.addEventListener("click", async () => {
    // Belt and braces alongside the disabled attribute: a double tap on a
    // sluggish phone must never produce two rows for one payment.
    if (inFlight) return;

    // Also guarded on load, but never write an order we cannot collect on.
    if (!IS_PAYMENT_CONFIGURED) return;

    if (APPS_SCRIPT_URL.trim().startsWith("PASTE_")) {
      setNotice(payError, "This site is not connected to its order list yet — see the README.");
      return;
    }

    inFlight = true;
    setBusy(true);
    setNotice(payError, "");

    try {
      const result = await submitOrder({
        quantity: order.quantity,
        donation: order.donation,
        name: order.name,
        email: order.email,
        honeypot: order.honeypot,
      });

      if (!result.ok) {
        setNotice(payError, ERROR_MESSAGES[result.reason] ?? ERROR_MESSAGES.error);
        inFlight = false;
        setBusy(false);
        return;
      }

      // Saved. Same tab on purpose: opening a new one after an await gets
      // caught by pop-up blockers, and there is nothing left to do here.
      window.location.href = PAYMENT_URL;
    } catch {
      setNotice(
        payError,
        `We could not save your order just now, so we have not sent you to ${PAYMENT_PROVIDER}. ` +
        "Nothing has been charged — check your connection and tap again.",
      );
      inFlight = false;
      setBusy(false);
    }
  });

  /**
   * Coming back from Tikkie with the browser's Back button restores this page
   * from the back/forward cache exactly as it was left — button disabled and
   * still reading "Saving…". Without this the guest returns to a dead button
   * and cannot pay again. `persisted` is true only for a bfcache restore.
   */
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      inFlight = false;
      setBusy(false);
      setNotice(payError, "");
    }
  });

  function setBusy(isBusy) {
    // Never re-enable a button that has nowhere to send the guest — this also
    // covers the bfcache restore path, which calls setBusy(false).
    payButton.disabled = isBusy || !IS_PAYMENT_CONFIGURED;
    payLabel.textContent = isBusy ? "Saving…" : "Continue and pay";
    document.body.classList.toggle("is-busy", isBusy);
  }

  // No usable payment link: say so on arrival rather than letting the guest tap
  // a button that cannot work. Their details are already safe in this browser,
  // and no order is written, so nothing is half-finished.
  if (!IS_PAYMENT_CONFIGURED) {
    setNotice(
      payError,
      "We cannot take payments at this moment — our payment link is being renewed. " +
      "Nothing has been charged. Please send us a message and we will sort it out.",
    );
    payButton.disabled = true;
  }

  setGauge(3);
  renderReceipt(order);
}
