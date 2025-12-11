import { API_BASE } from "./config.js";
import { getGuestCart, updateGuestQty, removeGuestItem } from "./cartStorage.js";
import { getDelivery } from "./delivery.js";

document.addEventListener("DOMContentLoaded", async () => {
  const deliverEl    = document.getElementById("deliver-to");
  const tableBody    = document.getElementById("cart-contents");
  const totalSpan    = document.getElementById("cart-total");
  const emptyMessage = document.getElementById("empty-cart");

  const token     = () => localStorage.getItem("authToken");
  const isLoggedIn = () => !!token();

  /**
   * Render cart rows so they match the 5 columns:
   * Item | Customization | Quantity | Price | Remove
   */
  function renderCart(items, total, isGuest) {
    tableBody.innerHTML = "";

    if (!items.length) {
      emptyMessage.style.display = "block";
      totalSpan.textContent = "0.00";
      return;
    }
    emptyMessage.style.display = "none";

    items.forEach((item) => {
      const name = item.name;
      const qty  = item.quantity;
      const unit = Number(item.unitPrice);
      const sum  = Number(item.totalPrice);

      const c = item.customizations || {
        size: null,
        milk: null,
        sugar: null,
        heat: null,
      };

      // e.g. "Small • Whole • No Sugar"
      const customText =
        [c.size, c.milk, c.sugar, c.heat].filter(Boolean).join(" • ") || "—";

      const rowId = isGuest ? item.key : item._id;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${name}</td>

        <td class="muted">${customText}</td>

        <td class="qty-cell">
          <button class="qty-btn decrease" data-id="${rowId}" data-guest="${isGuest}">−</button>
          <span class="qty-value">${qty}</span>
          <button class="qty-btn increase" data-id="${rowId}" data-guest="${isGuest}">+</button>
        </td>

        <td class="right">$${sum.toFixed(2)}</td>

        <td class="center">
          <button class="remove-btn remove" data-id="${rowId}" data-guest="${isGuest}">Remove</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    totalSpan.textContent = Number(total).toFixed(2);
  }

  async function loadCart() {
    if (isLoggedIn()) {
      const res = await fetch(`${API_BASE}/api/cart/summary`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) {
        const guest = getGuestCart();
        const total = guest.reduce((s, it) => s + it.totalPrice, 0);
        renderCart(guest, total, true);
        return;
      }
      const data = await res.json();
      renderCart(data.items || [], Number(data.total || 0), false);
    } else {
      const guest = getGuestCart();
      const total = guest.reduce((s, it) => s + it.totalPrice, 0);
      renderCart(guest, total, true);
    }
  }

  // ✅ Address box
  function renderAddressBox() {
    if (!deliverEl) return;
    const addr = getDelivery();

    if (!isLoggedIn()) {
      deliverEl.innerHTML = addr?.displayAddress
        ? `Deliver to: <strong>${addr.displayAddress}</strong> <button id="change-addr" class="btn cafe-btn" style="margin-left:8px;">Change</button>`
        : `No delivery address set. <a href="address_form.html">Set address</a>`;
    } else {
      deliverEl.innerHTML = addr?.displayAddress
        ? `Deliver to: <strong>${addr.displayAddress}</strong> <button id="change-addr" class="btn cafe-btn" style="margin-left:8px;">Change</button>`
        : `Deliver to: <em>(set during checkout)</em>`;
    }

    const btn = document.getElementById("change-addr");
    if (btn)
      btn.addEventListener("click", () => {
        sessionStorage.setItem("postAddressRedirect", "cart.html");
        window.location.href = "address_form.html";
      });
  }

  // Initial render
  renderAddressBox();
  await loadCart();

  // Handlers for +, -, Remove (classes are unchanged)
  document.body.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    const isGuest = e.target.dataset.guest === "true";

    try {
      // Remove
      if (e.target.classList.contains("remove")) {
        if (isGuest) {
          const after = removeGuestItem(id);
          const total = after.reduce((s, it) => s + it.totalPrice, 0);
          renderCart(after, total, true);
        } else {
          const res = await fetch(`${API_BASE}/api/cart/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token()}` },
          });
          if (res.status === 401) {
            window.location.href = "signin.html";
            return;
          }
          await loadCart();
        }
        return;
      }

      // Increase / Decrease
      if (
        e.target.classList.contains("increase") ||
        e.target.classList.contains("decrease")
      ) {
        const action = e.target.classList.contains("increase")
          ? "increase"
          : "decrease";

        if (isGuest) {
          const after = updateGuestQty(id, action);
          const total = after.reduce((s, it) => s + it.totalPrice, 0);
          renderCart(after, total, true);
        } else {
          const res = await fetch(`${API_BASE}/api/cart/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token()}`,
            },
            body: JSON.stringify({ action }),
          });
          if (res.status === 401) {
            window.location.href = "signin.html";
            return;
          }
          await loadCart();
        }
      }
    } catch (err) {
      console.error("Failed to update cart:", err);
      alert("Failed to update cart.");
    }
  });
});
