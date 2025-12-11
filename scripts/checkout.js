// Front-end/scripts/checkout.js
import { API_BASE } from "./config.js";
import { getGuestCart } from "./cartStorage.js";
import { getDelivery } from "./delivery.js";

/** Config */
const TAX_RATE = 0.13;

/** Helpers */
const $ = (id) => document.getElementById(id);
const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
const token = () => localStorage.getItem("authToken");
const isLoggedIn = () => !!token();

/** DOM refs */
const errorEl      = $("checkout-error");
const emptyEl      = $("checkout-empty");
const rowsEl       = $("checkout-rows");
const tableEl      = $("checkout-table");
const notesInput   = $("delivery-notes");
const subtotalEl   = $("checkout-subtotal");
const taxEl        = $("checkout-tax");
const grandEl      = $("checkout-grand");
const refreshBtn   = $("checkout-refresh");
const clearBtn     = $("checkout-clear");

const payForm      = $("payment-form");
const payBtn       = $("pay-button");
const paymentMsg   = $("payment-message");

// Discount elements
const discountInput    = $("discount-code");
const discountBtn      = $("apply-discount-btn");
const discountRowEl    = $("discount-row");
const discountValueEl  = $("checkout-discount");

/** Cart state */
let currentItems = [];
let currentTotals = { subtotal: 0, tax: 0, grand: 0, discountAmount: 0 };
let appliedDiscount = null;

/* ================= DELIVERY NOTES ================= */

function renderNotes() {
  if (!notesInput) return;
  const d = getDelivery();
  const saved =
    d?.extraNotes?.trim() ||
    localStorage.getItem("checkoutDeliveryNotes") ||
    "";
  notesInput.value = saved;
}

if (notesInput) {
  notesInput.addEventListener("input", () => {
    localStorage.setItem("checkoutDeliveryNotes", notesInput.value);
  });
}

/* ================= RENDER HELPERS ================= */

function buildRow(it) {
  const c = it.customizations || {};
  const custom =
    [c.size, c.milk, c.sugar, c.heat, c.notes].filter(Boolean).join(" • ") ||
    "—";

  const itemId = it._id || it.id || it.itemId;

  const tr = document.createElement("tr");
  tr.dataset.itemId = itemId || "";

  tr.innerHTML = `
    <td>${it.name}</td>
    <td class="muted">${custom}</td>
    <td class="qty-cell">
      <button class="qty-btn" data-action="dec">−</button>
      <span class="qty-value">${it.quantity}</span>
      <button class="qty-btn" data-action="inc">+</button>
    </td>
    <td class="right price-cell">${fmt(it.totalPrice)}</td>
    <td class="center">
      <button class="remove-btn">✕</button>
    </td>
  `;
  return tr;
}

function computeTotals(items) {
  const rawSubtotal = items.reduce(
    (s, it) => s + Number(it.totalPrice || 0),
    0
  );

  let discountAmount = 0;

  if (appliedDiscount && rawSubtotal > 0) {
    if (appliedDiscount.type === "percent") {
      discountAmount = +(rawSubtotal * (appliedDiscount.value / 100)).toFixed(2);
    } else if (appliedDiscount.type === "fixed") {
      discountAmount = Number(appliedDiscount.value || 0);
    }
  }

  discountAmount = Math.min(discountAmount, rawSubtotal);

  const subtotal = Math.max(0, rawSubtotal - discountAmount);
  const tax = +(subtotal * TAX_RATE).toFixed(2);
  const grand = +(subtotal + tax).toFixed(2);

  return { rawSubtotal, subtotal, tax, grand, discountAmount };
}

function render(items) {
  currentItems = items.slice();
  rowsEl.innerHTML = "";

  if (!items.length) {
    emptyEl.style.display = "block";
    tableEl.querySelector("thead").style.display = "none";
  } else {
    emptyEl.style.display = "none";
    tableEl.querySelector("thead").style.display = "table-header-group";
    items.forEach((it) => rowsEl.appendChild(buildRow(it)));
  }

  const t = computeTotals(items);
  currentTotals = t;

  subtotalEl.textContent = fmt(t.subtotal);
  taxEl.textContent = fmt(t.tax);
  grandEl.textContent = fmt(t.grand);

  if (t.discountAmount > 0 && appliedDiscount) {
    discountRowEl.style.display = "flex";
    discountValueEl.textContent = `-${fmt(t.discountAmount)}`;
  } else {
    discountRowEl.style.display = "none";
  }

  payBtn.textContent = items.length ? `Pay ${fmt(t.grand)}` : "Pay";
  payBtn.disabled = !items.length;
}

/* ================= LOAD CART ================= */

async function fetchCart() {
  errorEl.style.display = "none";

  try {
    if (isLoggedIn()) {
      const res = await fetch(`${API_BASE}/api/cart/summary`, {
        headers: { Authorization: `Bearer ${token()}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          render(getGuestCart());
          return;
        }
        throw new Error("Failed to load cart");
      }

      const data = await res.json();
      render(data.items || []);
    } else {
      render(getGuestCart());
    }
  } catch (e) {
    console.error(e);
    errorEl.textContent = "We couldn't load your cart.";
    errorEl.style.display = "block";
    render([]);
  }

  renderNotes();
}

/* ================= CART MUTATIONS ================= */

async function updateQuantity(itemId, direction, rowIndex) {
  const delta = direction === "inc" ? 1 : -1;

  if (isLoggedIn() && itemId) {
    try {
      const res = await fetch(`${API_BASE}/api/cart/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ delta }),
      });

      if (!res.ok) throw new Error();

      await fetchCart();
      return;
    } catch (e) {
      console.error(e);
    }
  }

  const item = currentItems[rowIndex];
  if (item) {
    const newQty = item.quantity + delta;
    if (newQty <= 0) currentItems.splice(rowIndex, 1);
    else {
      item.quantity = newQty;
      item.totalPrice = Number(item.unitPrice || 0) * newQty;
    }
    localStorage.setItem("guestCart", JSON.stringify(currentItems));
    render(currentItems);
  }
}

async function removeItem(itemId, rowIndex) {
  if (isLoggedIn() && itemId) {
    try {
      await fetch(`${API_BASE}/api/cart/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      return fetchCart();
    } catch {}
  }

  currentItems.splice(rowIndex, 1);
  localStorage.setItem("guestCart", JSON.stringify(currentItems));
  render(currentItems);
}

async function clearCart() {
  if (isLoggedIn()) {
    try {
      await fetch(`${API_BASE}/api/cart/clear`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
    } catch {}
  }

  currentItems = [];
  appliedDiscount = null;
  localStorage.setItem("guestCart", "[]");
  render([]);
}

/* ================= DISCOUNT APPLY (SAFE JSON) ================= */

if (discountBtn) {
  discountBtn.addEventListener("click", async () => {
    const code = discountInput?.value.trim();

    if (!code) return alert("Please enter a discount code.");

    try {
      const totals = computeTotals(currentItems);
      if (totals.rawSubtotal <= 0) throw new Error("Your cart is empty.");

      const response = await fetch(
        `${API_BASE}/api/discount/${encodeURIComponent(code)}`
      );

      let data;
      try {
        data = await response.json();
      } catch {
        const fallback = await response.text();
        console.error("Non-JSON server response:", fallback);
        throw new Error("Server returned an invalid response.");
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Invalid discount code.");
      }

      if (
        typeof data.minCartTotal === "number" &&
        totals.rawSubtotal < data.minCartTotal
      ) {
        throw new Error(
          `Minimum subtotal required: $${data.minCartTotal.toFixed(2)}`
        );
      }

      appliedDiscount = data;
      render(currentItems);
      alert("Discount applied!");
    } catch (err) {
      appliedDiscount = null;
      render(currentItems);
      alert(err.message);
    }
  });
}

/* ================= STRIPE PAYMENT ================= */

let stripe, elements, cardEl;

function initStripe() {
  const pubKey = payForm?.dataset.publishableKey;
  if (!pubKey) return;

  stripe = Stripe(pubKey);
  elements = stripe.elements();
  cardEl = elements.create("card");
  cardEl.mount("#card-element");
}

if (payForm) {
  payForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!isLoggedIn()) {
      paymentMsg.textContent = "You must be logged in to complete payment.";
      paymentMsg.className = "warning";
      return;
    }

    paymentMsg.textContent = "";
    payBtn.disabled = true;

    try {
      const { token: stripeToken, error } = await stripe.createToken(cardEl);
      if (error) throw new Error(error.message);

      const deliveryNotes = notesInput?.value || "";

      const orderItems = currentItems.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice || it.price || 0),
        totalPrice: Number(it.totalPrice || 0),
      }));

      const res = await fetch(`${API_BASE}/api/payment/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          amount: Number(currentTotals.grand),
          currency: "cad",
          token: stripeToken.id,
          deliveryNotes,

          orderItems,
          subtotal: currentTotals.subtotal,
          discount: currentTotals.discountAmount,
          tax: currentTotals.tax,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Payment failed.");
      }

      paymentMsg.textContent = `Payment successful! Order #${data.orderId}`;
      paymentMsg.className = "success";

      appliedDiscount = null;
      currentItems = [];
      localStorage.setItem("guestCart", "[]");
      render([]);

    } catch (err) {
      paymentMsg.textContent = err.message;
      paymentMsg.className = "warning";
    } finally {
      payBtn.disabled = false;
    }
  });
}

/* ================= BOOTSTRAP ================= */
initStripe();
fetchCart();
