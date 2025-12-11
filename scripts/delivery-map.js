import { API_BASE } from "./config.js";
import { fetchWithAuth, requireAuth } from "./auth.js";



(async function () {
  //  Make sure user is logged in before anything else runs
await requireAuth();

  const qp = new URLSearchParams(window.location.search);
  const orderId = qp.get("id");
  const API = (path) => `${(window.API_BASE || "")}${path}`;

  const orderIdEl = document.getElementById("orderId");
  const statusEl = document.getElementById("status");
  const etaEl = document.getElementById("eta");
  const updatedEl = document.getElementById("updated");
  const errEl = document.getElementById("err");
  const statusSteps = document.querySelectorAll(".status-steps .step");

  if (!orderId) {
    errEl.textContent = "Missing ?id=ORDER_ID in URL.";
    errEl.style.display = "block";
    throw new Error("No orderId");
  }
  orderIdEl.textContent = orderId;
  

  //  Map setup
  const map = L.map("map", { zoomControl: true }).setView([43.65, -79.38], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

  const carIcon = L.icon({
    iconUrl: "/images/car3D.png",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
  const car = L.marker([43.65, -79.38], { icon: carIcon }).addTo(map);

  let firstFix = true;
  let routeDrawn = false;
  let pollTimer = null;
  

  async function fetchState() {
    try {
      const res = await fetch(API(`/api/delivery/${encodeURIComponent(orderId)}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderState(data);
      errEl.style.display = "none";
    } catch (err) {
      errEl.textContent = `Failed to fetch delivery: ${err.message}`;
      errEl.style.display = "block";
    }
  }

  function renderState(data) {
    const { position, status, etaText, start, destination } = data || {};
    if (!position) return;

    //  Draw route line once
    if (!routeDrawn && start && destination) {
      const router = L.Routing.osrmv1({ serviceUrl: "https://router.project-osrm.org/route/v1" });
     
      const cafeIcon = L.icon({
        iconUrl: "/images/cafeTimeWithBorder.png",
        iconSize: [48, 48],
        iconAnchor: [24, 48],
      });
      const destIcon = L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      router.route(
        [{ latLng: L.latLng(start.lat, start.lng) }, { latLng: L.latLng(destination.lat, destination.lng) }],
        (err, routes) => {
          if (!err && routes?.length > 0) {
            const line = L.polyline(routes[0].coordinates, { color: "#2563eb", weight: 5, opacity: 0.8 }).addTo(map);
            L.marker([start.lat, start.lng], { icon: cafeIcon }).addTo(map);
            L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
            map.fitBounds(line.getBounds());
          }
        }
      );
      routeDrawn = true;
    }

    //  Move car
    car.setLatLng([position.lat, position.lng]);
    if (firstFix) {
      map.setView([position.lat, position.lng], 15);
      firstFix = false;
    }

    // Textual status
    statusEl.textContent = status || "—";
    const s = (status || "").toLowerCase();
    statusEl.style.background = s === "delivered" ? "#dcfce7" : "#eef2ff";
    statusEl.style.color = s === "delivered" ? "#166534" : "#3730a3";
    etaEl.textContent = s === "on the way" ? etaText || "—" : "—";
    updatedEl.textContent = new Date().toLocaleTimeString();

    //  Update floating modal
    const modal = document.getElementById("arrival-modal");
    const arrivalText = document.getElementById("arrival-time");

    if (s === "on the way" && etaText) {
      modal.style.display = "block";
      arrivalText.textContent = `Arriving in ${etaText.replace("m", " min")}`;
      modal.querySelector("p").textContent = "Your order is on its way!";
    } else if (s === "delivered") {
      modal.style.display = "block";
      arrivalText.textContent = "Delivered ";
      modal.querySelector("p").textContent = "Your order has arrived!";
    } else {
      modal.style.display = "none";
    }


    //  Update step UI dynamically
    updateStatusSteps(s);

    // Stop polling once delivered
    if (s === "delivered") {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    //  Handle "Delivered" confirmation modal
    const deliveredModal = document.getElementById("deliveredModal");
    const continueBtn = document.getElementById("continueBtn");

    if (s === "delivered") {
      deliveredModal.style.display = "flex";
      if (continueBtn) {
        continueBtn.onclick = () => {
          window.location.href = "delivery-summary.html?id=" + orderId; // redirect
        };
      }
    }

  }

  function updateStatusSteps(current) {
    const order = ["preparing", "on the way", "delivered"];
    statusSteps.forEach((step) => {
      const key = step.dataset.step;
      const index = order.indexOf(current);
      const stepIndex = order.indexOf(key);

      step.classList.remove("completed", "active");

      if (index > stepIndex) step.classList.add("completed");
      else if (index === stepIndex) step.classList.add("active");
    });
  }

  //  Poll every 5s
  fetchState();
  pollTimer = setInterval(fetchState, 5000);
})();


async function loadOrderAndAddress() {
  try {
    const orderRes = await fetchWithAuth(`${API_BASE}/api/orders`);
    const addrRes = await fetchWithAuth(`${API_BASE}/api/account/address`);

    const orderData = await orderRes.json();
    const addrData = await addrRes.json();

    console.log(" orderData:", orderData);
    console.log(" addrData:", addrData);

    // --- Find the order that matches the ?id= in URL ---
    const qp = new URLSearchParams(window.location.search);
    const orderNumberParam = qp.get("id");

    let order = null;
    if (orderData.success && Array.isArray(orderData.orders)) {
      order = orderData.orders.find((o) => o.orderNumber === orderNumberParam);
    }

    // --- Update Order Summary (items + time placed only) ---
    if (order) {
      // Show the order number
      document.getElementById("orderId").textContent = order.orderNumber;

      // Time placed (from createdAt)
      document.getElementById("orderTime").textContent = new Date(order.createdAt)
        .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // List of purchased items (no prices)
      const list = document.getElementById("orderItems");
      list.innerHTML = "";

      if (Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach((item) => {
          // Support both item.qty and item.quantity just in case
          const qty = item.qty ?? item.quantity ?? 1;

          const li = document.createElement("li");
          li.textContent = `${qty}× ${item.name}`;
          list.appendChild(li);
        });
      } else {
        list.innerHTML = `<li><span class="name muted">No items found</span></li>`;
      }
    }

    // --- Update Delivery Address (unchanged) ---
    if (addrData.success && addrData.deliveryAddress) {
      const a = addrData.deliveryAddress;
      document.getElementById("addressText").innerHTML = `
        ${a.displayAddress || ""}
        ${a.extraNotes ? `<br><small>${a.extraNotes}</small>` : ""}
      `;
    }
  } catch (err) {
    console.error("Failed to load order/address:", err);
  }
}



// Run only after DOM and auth are ready
window.addEventListener("DOMContentLoaded", () => {
  loadOrderAndAddress();
});


// Back button navigation
const backBtn = document.getElementById("backBtn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "deliveries.html";
  });
}
