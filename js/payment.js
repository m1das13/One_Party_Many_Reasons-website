/* =========================================================================
   Step 3 — show the total, write the order, hand off to Tikkie.

   The row is written here rather than on the details page, so the Sheet only
   ever fills up with people who actually went through to pay.
   ========================================================================= */

import { TIKKIE_URL, APPS_SCRIPT_URL } from "./config.js";
import {
  readOrder, writeOrder, renderReceipt,
  setGauge, setText, setNotice, guardStep, submitOrder,
} from "./order.js";

if (guardStep("payment")) {
  const order = readOrder();

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
  };

  /* ---------- Render ---------- */

  setText("guest-name", order.name.split(" ")[0]);
  setText("summary-name", order.name);
  setText("summary-email", order.email);

  /* ---------- Pay ---------- */

  payButton.addEventListener("click", async () => {
    if (APPS_SCRIPT_URL.startsWith("PASTE_")) {
      setNotice(payError, "This site is not connected to its order list yet — see the README.");
      return;
    }

    setBusy(true);
    setNotice(payError, "");

    try {
      const result = await submitOrder({
        quantity: order.quantity,
        donation: order.donation,
        name: order.name,
        email: order.email,
        honeypot: order.honeypot,
        orderId: order.orderId,
      });

      if (!result.ok) {
        setNotice(payError, ERROR_MESSAGES[result.reason] ?? ERROR_MESSAGES.invalid);
        setBusy(false);
        return;
      }

      // Normally the same id we sent. Keep whatever the Sheet actually used.
      writeOrder({ orderId: result.orderId });

      // Same tab on purpose: opening a new one after an await gets caught by
      // pop-up blockers, and there is nothing left to do on this page.
      window.location.href = TIKKIE_URL;
    } catch {
      setNotice(
        payError,
        "We could not save your order just now, so we have not sent you to Tikkie. " +
        "Check your connection and tap again.",
      );
      setBusy(false);
    }
  });

  function setBusy(isBusy) {
    payButton.disabled = isBusy;
    payLabel.textContent = isBusy ? "Saving…" : "Continue and pay";
    document.body.classList.toggle("is-busy", isBusy);
  }

  setGauge(3);
  renderReceipt(order);
}
