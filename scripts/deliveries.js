(async function () {
  const listEl = document.getElementById("delivery-list");
  const emptyEl = document.getElementById("empty");
  const errorEl = document.getElementById("error");
  const lastUpdated = document.getElementById("lastUpdated");
  const btnRefresh = document.getElementById("btnRefresh");

  const API = (path) => `${(window.API_BASE || "")}${path}`;

  async function loadDeliveries() {
    errorEl.style.display = "none";

    try {
      //  Fetch from /api/orders
      const res = await fetch(API("/api/orders"), {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const deliveries = data.orders || [];

      renderList(deliveries);
      lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    } catch (err) {
      errorEl.textContent = `Failed to load deliveries: ${err.message}`;
      errorEl.style.display = "block";
    }
  }

  function renderList(items) {
    if (!items || items.length === 0) {
      listEl.innerHTML = "";
      emptyEl.style.display = "block";
      return;
    }

    emptyEl.style.display = "none";

    listEl.innerHTML = items
      .map((d) => {
        const status = d.status || "Unknown";
        return `
          <div class="card">
            <div class="meta">
              <div class="order">Order ${d.orderNumber}</div>
              <div class="sub">${status}</div>
            </div>
            <a class="go" href="delivery-tracker.html?id=${encodeURIComponent(
              d.orderNumber
            )}">View Progress</a>
          </div>
        `;
      })
      .join("");
  }

  btnRefresh.addEventListener("click", loadDeliveries);

  // reload every 10s
  loadDeliveries();
  setInterval(loadDeliveries, 10000);
})();


// Back button navigation
const backBtn = document.getElementById("backBtn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "profile_dashBoard.html";
  });
}
