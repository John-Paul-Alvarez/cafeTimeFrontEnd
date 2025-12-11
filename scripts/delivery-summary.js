import { API_BASE } from "./config.js";
import { fetchWithAuth, requireAuth } from "./auth.js";

(async function init() {
  await requireAuth();

  const qp = new URLSearchParams(window.location.search);
  const orderNumber = qp.get("id");

  if (!orderNumber) {
    alert("Missing order ID in URL");
    return;
  }

  const orderIdEl = document.getElementById("orderId");
  const statusEl = document.getElementById("status");
  const deliveredAtEl = document.getElementById("deliveredAt");
  const totalEl = document.getElementById("orderTotal");
  const timeEl = document.getElementById("orderTime");
  const itemsList = document.getElementById("orderItems");
  const addressEl = document.getElementById("addressText");
  const statusSteps = document.querySelectorAll(".status-steps .step");

  let order = null;

  //  Fetch orders and address
  try {
    const [orderRes, addrRes] = await Promise.all([
      fetchWithAuth(`${API_BASE}/api/orders`),
      fetchWithAuth(`${API_BASE}/api/account/address`)
    ]);

    const orderData = await orderRes.json();
    const addrData = await addrRes.json();

    // Find the matching order
    order = orderData.orders?.find(o => o.orderNumber === orderNumber);
    if (!order) {
      orderIdEl.textContent = "Not found";
      return;
    }

    // === Fill order info ===
    orderIdEl.textContent = order.orderNumber;
    statusEl.textContent = order.status || "—";
    deliveredAtEl.textContent = order.deliveredAt
      ? new Date(order.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—";
    // totalEl.textContent = `$${(order.total || 0).toFixed(2)}`;
    timeEl.textContent = new Date(order.createdAt)
      .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // === Fill items list ===
    itemsList.innerHTML = "";
    if (Array.isArray(order.items) && order.items.length > 0) {
      order.items.forEach(item => {
        const qty = item.qty ?? item.quantity ?? 1;
        const li = document.createElement("li");

        li.textContent = `${qty}× ${item.name}`;

        itemsList.appendChild(li);
      });
    } else {
      itemsList.innerHTML = `<li><span class="muted">No items listed</span></li>`;
    }


    // === Fill address ===
    if (addrData.deliveryAddress) {
      const a = addrData.deliveryAddress;
      addressEl.innerHTML = `
        ${a.displayAddress}
        ${a.extraNotes ? `<br><small>${a.extraNotes}</small>` : ""}
      `;
    }

    // === Update step indicator ===
    const current = (order.status || "").toLowerCase();
    const steps = ["preparing", "on the way", "delivered"];
    statusSteps.forEach(step => {
      const key = step.dataset.step;
      const index = steps.indexOf(current);
      const stepIndex = steps.indexOf(key);
      step.classList.remove("completed", "active");
      if (index > stepIndex) step.classList.add("completed");
      else if (index === stepIndex) step.classList.add("active");
    });

  } catch (err) {
    console.error(" Failed to load summary:", err);
  }

  //  Mark order as delivered in backend if not already
  if (order && order.status !== "Delivered") {
    try {
      await fetchWithAuth(`${API_BASE}/api/orders/${order.orderNumber}/delivered`, {
        method: "PATCH"
      });
      console.log(" Order marked as delivered in backend");

      // Update UI instantly
      order.status = "Delivered";
      order.deliveredAt = new Date().toISOString();
      statusEl.textContent = "Delivered";
      statusEl.classList.add("pill-delivered");
      deliveredAtEl.textContent = new Date(order.deliveredAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      console.warn(" Could not update order status:", e);
    }
  }

  // 🔙 Back button
  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "deliveries.html";
  });
})();
