/* =========================================================================
   Step 2 — name and email.

   Nothing is written to the Sheet here. This page only validates the details
   and hands them to the payment page, which does the writing at the moment
   the guest actually goes off to pay.
   ========================================================================= */

import { readOrder, writeOrder, renderReceipt, setGauge, guardStep, generateOrderId } from "./order.js";

if (guardStep("details")) {
  const form = document.getElementById("details-form");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const honeypotInput = document.getElementById("company");

  const order = readOrder();

  /* ---------- Validation ---------- */

  function validateName() {
    const value = nameInput.value.trim();
    const message = value.length < 2 ? "Please tell us your name." : "";
    showFieldError(nameInput, "name-error", message);
    return !message;
  }

  function validateEmail() {
    const value = emailInput.value.trim();
    let message = "";
    if (!value) {
      message = "We need an email to reach you.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      message = "That does not look like an email address.";
    }
    showFieldError(emailInput, "email-error", message);
    return !message;
  }

  function showFieldError(input, errorId, message) {
    document.getElementById(errorId).textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  /* ---------- Submit ---------- */

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const nameOk = validateName();
    const emailOk = validateEmail();
    if (!nameOk || !emailOk) {
      (nameOk ? emailInput : nameInput).focus();
      return;
    }

    writeOrder({
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      honeypot: honeypotInput.value,
      // Reuse the reference if they have already been here, so going back and
      // forth never turns into two rows in the Sheet.
      orderId: order.orderId ?? generateOrderId(),
    });

    window.location.href = "payment.html";
  });

  /* ---------- Boot ---------- */
  nameInput.value = order.name;
  emailInput.value = order.email;
  nameInput.addEventListener("blur", validateName);
  emailInput.addEventListener("blur", validateEmail);

  setGauge(2);
  renderReceipt(order);
}
