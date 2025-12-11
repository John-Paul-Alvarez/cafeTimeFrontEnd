import { API_BASE } from "./config.js";

/* ========= tiny utils ========= */
const $ = (s) => document.querySelector(s);
const grid = $("#rec-grid");
const msg  = $("#rec-msg");
const money = (n) => "$" + Number(n || 0).toFixed(2);
function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/* ========= safety checks ========= */
if (!grid || !msg) {
  console.warn("[recs] Missing #rec-grid or #rec-msg on this page.");
}

/* ========= in-memory cache (for delegation) ========= */
const REC_MAP = new Map();
window.__REC_MAP = REC_MAP; // (debuggable from console)

/* ========= render one card ========= */
function recCard(item) {
  const el = document.createElement("div");
  el.className = "rec-card";
  el.dataset.id = item._id;
  el.innerHTML = `
    <img src="${item.image}" alt="${item.name}" />
    <div class="rec-info">
      <div class="rec-name">${item.name}</div>
      <div class="rec-meta">
        <span class="rec-price">${money(item.price)}</span>
        <span class="rec-cat">${item.category || ""}</span>
      </div>
      <div class="rec-actions">
        <button type="button" class="rec-btn rec-customize" data-id="${item._id}">Customize</button>
        <button type="button" class="rec-btn rec-quick"      data-id="${item._id}">Quick add</button>
      </div>
    </div>
  `;
  return el;
}

/* ========= mount all cards ========= */
function mountCards(items) {
  REC_MAP.clear();
  grid.innerHTML = "";
  items.forEach((it) => {
    REC_MAP.set(it._id, it);
    grid.appendChild(recCard(it));
  });
}

/* ========= robust event delegation (capture phase) ========= */
if (grid) {
  grid.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest(".rec-btn");
      if (!btn) return;

      // stop any bubbling overlays
      e.stopPropagation();
      e.preventDefault();

      const id = btn.getAttribute("data-id");
      const item = REC_MAP.get(id);
      if (!item) return console.warn("[recs] item not found for id", id);

      if (btn.classList.contains("rec-customize")) {
        openCustomize(item);
      } else if (btn.classList.contains("rec-quick")) {
        quickAdd(item);
      }
    },
    true // capture = beats weird overlays
  );
}

/* ========= data load ========= */
async function loadRecs() {
  if (!grid || !msg) return;
  try {
    msg.textContent = "Loading...";
    const res = await fetch(`${API_BASE}/api/recommendations`);
    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data?.error || "Failed to load recommendations.";
      console.error("[recs] server error", data);
      return;
    }

    const items = Array.isArray(data) ? data : (data.items || []);
    mountCards(items);
    msg.textContent = items.length ? "" : "No recommendations yet.";
  } catch (e) {
    console.error("[recs] network error", e);
    msg.textContent = "Failed to load recommendations.";
  }
}

/* ========= cart actions ========= */
async function quickAdd(item) {
  try {
    const res = await fetch(`${API_BASE}/api/cart/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        itemId: item._id,
        size: "md",
        milk: "whole",
        sugar: 1,
        heat: "hot",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.message || "Failed to add");
      console.warn("[recs] add failed", data);
      return;
    }
    alert("Added to cart!");
  } catch (e) {
    console.error("[recs] quickAdd error", e);
    alert("Network error");
  }
}

/* ========= modal ========= */
function openCustomize(item) {
  // prevent duplicate modals
  const existing = document.getElementById("recs-modal");
  if (existing) existing.remove();

  const m = document.createElement("div");
  m.id = "recs-modal";
  m.className = "rec-modal";
  m.innerHTML = `
    <div class="rec-modal-card">
      <h3>${item.name}</h3>
      <label>Size *
        <select id="rm-size">
          <option value="sm">Small</option>
          <option value="md" selected>Medium</option>
          <option value="lg">Large</option>
        </select>
      </label>
      <label>Milk
        <select id="rm-milk">
          <option value="">(none)</option>
          <option value="whole" selected>Whole</option>
          <option value="oat">Oat</option>
          <option value="almond">Almond</option>
        </select>
      </label>
      <label>Sugar (0–5)
        <input id="rm-sugar" type="number" min="0" max="5" value="1"/>
      </label>
      <label>Heat
        <select id="rm-heat">
          <option value="hot" selected>Hot</option>
          <option value="iced">Iced</option>
        </select>
      </label>
      <div class="rec-modal-actions">
        <button id="rm-cancel" type="button">Cancel</button>
        <button id="rm-add"    type="button">Add to Cart</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);

  const close = () => m.remove();
  m.addEventListener("click", (e) => { if (e.target === m) close(); });
  m.querySelector("#rm-cancel").onclick = close;

  m.querySelector("#rm-add").onclick = async () => {
    const body = {
      itemId: item._id,
      size:  m.querySelector("#rm-size").value,
      milk:  m.querySelector("#rm-milk").value || null,
      sugar: Number(m.querySelector("#rm-sugar").value || 0),
      heat:  m.querySelector("#rm-heat").value || null,
    };
    try {
      const res = await fetch(`${API_BASE}/api/cart/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.details?.join("\n") || data?.message || "Failed to add");
        console.warn("[recs] add failed", data);
        return;
      }
      alert("Added to cart!");
      close();
    } catch (e) {
      console.error("[recs] customize add error", e);
      alert("Network error");
    }
  };
}

/* ========= bootstrap ========= */
document.addEventListener("DOMContentLoaded", () => {
  console.log("[recs] script loaded, starting fetch…");
  loadRecs();
});
