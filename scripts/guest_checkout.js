// scripts/guest_checkout.js
// Guest-only checkout (no backend). Uses localStorage.guestCart for items.
// On Pay, creates a one-time session order and redirects to guest_confirmation.html.

const TAX_RATE = 0.13;
const GUEST_CART_KEY = "guestCart";
const SESSION_ORDER_KEY = "latestGuestOrder";

const $ = (id) => document.getElementById(id);

/* DOM refs */
const rowsEl = $("guest-rows");
const subtotalEl = $("guest-subtotal");
const taxEl = $("guest-tax");
const grandEl = $("guest-grand");
const notesEl = $("guest-delivery-notes");
const refreshBtn = $("guest-refresh");
const messageEl = $("guest-message");

const nameEl = $("guest-name");
const emailEl = $("guest-email");
const phoneEl = $("guest-phone");
const addressEl = $("guest-address");
const cityEl = $("guest-city");
const postalEl = $("guest-postal");

const cardNameEl = $("guest-card-name");
const cardNumberEl = $("guest-card-number");
const cardExpEl = $("guest-card-exp");
const cardCvcEl = $("guest-card-cvc");
const payBtn = $("guest-pay");
const paymentMsg = $("guest-payment-message");

/* in-memory items */
let items = [];

/* utils */
const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

function loadGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (parsed || []).map((it, i) => {
      if (!it.quantity) it.quantity = 1;
      if (it.unitPrice == null) it.unitPrice = Number(it.price || it.unit_price || 0);
      if (!it._clientId) it._clientId = `g-${i}-${Math.random().toString(36).slice(2,8)}`;
      if (!it.totalPrice) it.totalPrice = Number(it.unitPrice || 0) * it.quantity;
      return it;
    });
  } catch (e) {
    console.error("Failed to parse guestCart:", e);
    return [];
  }
}

function saveGuestCartLocal() {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function computeTotals(itms) {
  const subtotal = itms.reduce((s, it) => s + Number(it.totalPrice || 0), 0);
  const tax = +(subtotal * TAX_RATE).toFixed(2);
  const grand = +(subtotal + tax).toFixed(2);
  return { subtotal, tax, grand };
}

function buildRow(it) {
  const tr = document.createElement("tr");
  tr.dataset.clientId = it._clientId;
  tr.innerHTML = `
    <td>${it.name || "Item"}</td>
    <td class="muted">${(it.customizations && (it.customizations.size || it.customizations.milk)) || "—"}</td>
    <td class="qty-cell">
      <button class="qty-btn" type="button" data-action="dec">−</button>
      <span class="qty-value">${it.quantity}</span>
      <button class="qty-btn" type="button" data-action="inc">+</button>
    </td>
    <td class="right price-cell">${fmt(it.totalPrice)}</td>
  `;
  return tr;
}

function render() {
  rowsEl.innerHTML = "";
  if (!items || items.length === 0) {
    const table = rowsEl.closest("table");
    if (table) table.querySelector("thead").style.display = "none";
  } else {
    const table = rowsEl.closest("table");
    if (table) table.querySelector("thead").style.display = "table-header-group";
    items.forEach(it => rowsEl.appendChild(buildRow(it)));
  }

  const t = computeTotals(items);
  subtotalEl.textContent = fmt(t.subtotal);
  taxEl.textContent = fmt(t.tax);
  grandEl.textContent = fmt(t.grand);

  // keep message hidden
  if (messageEl) messageEl.style.display = "none";
  if (paymentMsg) paymentMsg.textContent = "";
}

/* events: quantity */
rowsEl.addEventListener("click", (e) => {
  const btn = e.target;
  const row = btn.closest("tr");
  if (!row) return;
  const cid = row.dataset.clientId;
  if (btn.classList.contains("qty-btn")) {
    const action = btn.dataset.action;
    changeQty(cid, action === "inc" ? 1 : -1);
  }
});

/* changeQty (persist to localStorage so refresh keeps quantities) */
function changeQty(cid, delta) {
  const idx = items.findIndex(it => it._clientId === cid);
  if (idx === -1) return;
  const it = items[idx];
  const newQty = it.quantity + delta;
  if (newQty <= 0) {
    items.splice(idx, 1);
  } else {
    it.quantity = newQty;
    it.totalPrice = Number(it.unitPrice || 0) * it.quantity;
  }
  saveGuestCartLocal();
  render();
}

/* refresh: reload page (user asked to keep this behaviour) */
if (refreshBtn) {
  refreshBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.reload();
  });
}

/* Pay as Guest (client-side simulation) */
if (payBtn) {
  payBtn.addEventListener("click", (e) => {
    e.preventDefault();
    // minimal validation
    if (!items || items.length === 0) {
      showMessage("Your cart is empty. Add items before paying.");
      return;
    }
    if (!nameEl.value.trim() || !emailEl.value.trim() || !addressEl.value.trim()) {
      showMessage("Please fill Full name, Email and Delivery address.");
      return;
    }

    // build order object (personal info NOT saved to localStorage)
    const totals = computeTotals(items);
    const order = {
      id: `GUEST-${Date.now().toString().slice(-8)}`,
      items,
      totals,
      deliveryNotes: notesEl ? notesEl.value : "",
      personal: {
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        phone: phoneEl.value.trim(),
        address: addressEl.value.trim(),
        city: cityEl.value.trim(),
        postal: postalEl.value.trim(),
      },
      payment: {
        method: document.querySelector('input[name="guest-pay-method"]:checked')?.value || 'card',
        card: {
          name: cardNameEl.value.trim(),
          numberMasked: maskCardNumber(cardNumberEl.value),
        }
      },
      createdAt: new Date().toISOString()
    };

    // store one-time session payload for confirmation page
    try {
      sessionStorage.setItem(SESSION_ORDER_KEY, JSON.stringify(order));
    } catch (err) {
      console.warn("sessionStorage set failed", err);
    }

    // clear guest cart only (we must not save personal info)
    localStorage.removeItem(GUEST_CART_KEY);

    // redirect to confirmation page
    window.location.href = "guest_confirmation.html";
  });
}

/* helper: mask card number for display only */
function maskCardNumber(num) {
  const s = (num || "").replace(/\s+/g, '');
  if (s.length <= 4) return s;
  return "**** **** **** " + s.slice(-4);
}

/* small non-blocking message */
function showMessage(text, ms = 3000) {
  if (!messageEl) return;
  messageEl.style.display = "block";
  messageEl.textContent = text;
  setTimeout(() => {
    messageEl.style.display = "none";
  }, ms);
}

/* init */
function init() {
  items = loadGuestCart();
  // don't pre-fill any personal fields (acceptance criteria)
  if (notesEl) {
    // restore notes temporarily so they don't get lost on refresh if typed
    const stored = localStorage.getItem("checkoutDeliveryNotes");
    if (stored) notesEl.value = stored;
    notesEl.addEventListener("input", () => localStorage.setItem("checkoutDeliveryNotes", notesEl.value));
  }
  render();
}
init();