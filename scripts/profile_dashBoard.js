import { API_BASE } from "./config.js";
import { fetchWithAuth } from "./auth.js";

function formatMoney(n){ return `$${(Number(n)||0).toFixed(2)}`; }
function monthYear(d){ const x=new Date(d); return (!d || isNaN(x)) ? "—" : x.toLocaleString(undefined,{month:"short",year:"numeric"}); }
const maskLast4 = (last4="0000") => `**** **** **** ${last4}`;

/* ---------- Navbar helpers ---------- */
async function updateCartBadge(){
  const badge = document.getElementById("ct-cart-badge");
  if (!badge) return;

  // Try API → fallback to localStorage
  try{
    const token = localStorage.getItem("authToken");
    if (token){
      const r = await fetch(`${API_BASE}/api/cart`, { headers: { Authorization:`Bearer ${token}` } });
      if (r.ok){
        const data = await r.json();
        const count = Array.isArray(data.items) ? data.items.reduce((s,i)=>s+(i.qty||1),0) : (data.count || 0);
        badge.textContent = count;
        return;
      }
    }
  }catch(_e){ /* ignore */ }

  const local = Number(localStorage.getItem("cartCount")||0);
  badge.textContent = local;
}

function wireSearch(){
  const input = document.getElementById("ct-search-input");
  if (!input) return;
  input.addEventListener("keydown", e=>{
    if (e.key === "Enter"){
      const q = input.value.trim();
      const url = q ? `menu.html?search=${encodeURIComponent(q)}` : "menu.html";
      window.location.href = url;
    }
  });
}

/* ---------- Header / user ---------- */
async function loadUser(){
  const res = await fetchWithAuth(`${API_BASE}/api/auth/me`);
  if (!res.ok) return;
  const { user } = await res.json();
  const name = user?.username || user?.email?.split("@")[0] || "Friend";
  document.getElementById("welcome-title").textContent = `Welcome Back, ${name}!`;
  document.getElementById("user-email").textContent = user?.email || "—";
  document.getElementById("member-since").textContent = monthYear(user?.createdAt);
}

/* ---------- Payment info ---------- */
async function loadPayment(){
  const box = document.getElementById("payment-slot");
  const updatedEl = document.getElementById("payment-updated");
  try{
    const res = await fetchWithAuth(`${API_BASE}/api/payment/saved`);
    if (!res.ok) throw 0;
    const { paymentCard } = await res.json();

    if (!paymentCard || Object.keys(paymentCard).length === 0){
      box.textContent = "No card on file";
      document.getElementById("edit-card").style.display = "none";
      updatedEl.textContent = "";
      return;
    }

    const brand = (paymentCard.brand || "Card").toString().replace(/^\w/, c=>c.toUpperCase());
    const last4 = paymentCard.last4 || "0000";
    const exp = (paymentCard.expMonth && paymentCard.expYear)
      ? `${paymentCard.expMonth}/${String(paymentCard.expYear).slice(-2)}`
      : "";

    box.textContent = `Saved Card: ${maskLast4(last4)}  ${exp ? `• Expires ${exp}` : ""}`;
    updatedEl.textContent = paymentCard.updatedAt ? `Updated ${new Date(paymentCard.updatedAt).toLocaleDateString()}` : "";
    document.getElementById("edit-card").style.display = "inline";
  }catch{
    box.textContent = "No card on file";
    updatedEl.textContent = "";
  }
}

/* ---------- Address ---------- */
async function loadAddress(){
  const box = document.getElementById("address-slot");
  try{
    const res = await fetchWithAuth(`${API_BASE}/api/account/address`);
    if (!res.ok) throw 0;
    const { deliveryAddress } = await res.json();
    if (!deliveryAddress || !deliveryAddress.displayAddress){
      box.textContent = "No address on file";
    } else {
      const a = deliveryAddress;
      const line2 = (a.extraNotes) ? `<div class="muted tiny">${a.extraNotes}</div>` : "";
      box.innerHTML = `<div>${a.displayAddress}</div>${line2}`;
    }
  }catch{ box.textContent = "No address on file"; }
}

/* ---------- Menu preview ---------- */
async function loadMenuPreview(){
  const grid = document.getElementById("menu-grid");
  grid.innerHTML = "";
  const res = await fetch(`${API_BASE}/api/menu/preview`);
  const items = await res.json().catch(()=>[]);
  (items || []).forEach(item=>{
    const el = document.createElement("div");
    el.className = "menu-card";
    el.innerHTML = `
      <div class="menu-card-imgwrap">
        <img src="${item.image}" alt="${item.name}">
        <button class="menu-add" title="Add ${item.name}" data-id="${item._id}">+</button>
      </div>
      <div class="title">${item.name}</div>
      <div class="price">${formatMoney(item.price)}</div>
    `;
    grid.appendChild(el);
  });

  grid.addEventListener("click", async (e)=>{
    if (e.target.classList.contains("menu-add")){
      const btn = e.target;
      const itemId = btn.dataset.id;
      try{
        const token = localStorage.getItem("authToken");
        if (!token) return alert("Please log in.");
        const resp = await fetch(`${API_BASE}/api/cart/add`, {
          method:"POST",
          headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
          body: JSON.stringify({ itemId })
        });
        if (!resp.ok) throw 0;
        btn.textContent = "✓";
        // naive local badge update fallback
        const c = Number(localStorage.getItem("cartCount")||0) + 1;
        localStorage.setItem("cartCount", String(c));
        updateCartBadge();
        setTimeout(()=> btn.textContent = "+", 1200);
      }catch{ alert("Failed to add to cart"); }
    }
  });
}

/* ---------- Orders (table) ---------- */
let ordersTableListenerBound = false;

function renderOrdersTable(orders){
  const table = document.getElementById("orders-table");
  if (!table) return;

  if (!Array.isArray(orders) || orders.length === 0){
    table.innerHTML = `<tr><td class="muted" style="padding:16px">No orders yet</td></tr>`;
    return;
  }

  const money = n => "$" + (Number(n) || 0).toFixed(2);
  const ymd = d => {
    try { return new Date(d).toISOString().slice(0,10); }
    catch { return "—"; }
  };

  let rows = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Order # / ID</th>
        <th>Items</th>
        <th>Total</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
  `;

  for (const o of orders){
    const items = Array.isArray(o.items) ? o.items : [];
    const namesFull = items.map(i => `${(i.qty||1)}× ${i.name || "Item"}`).join(", ");
    const namesShort = namesFull.length > 90 ? (namesFull.slice(0,87) + "…") : namesFull;

    rows += `
      <tr>
        <td>${ymd(o.createdAt)}</td>
        <td>
          <div>${o.orderNumber ? String(o.orderNumber) : "-"}</div>
          <div class="muted small">ID: ${o._id || "-"}</div>
        </td>
        <td title="${namesFull.replace(/"/g,'&quot;')}">${namesShort || "-"}</td>
        <td>${money(o.total)}</td>
        <td><a href="#" class="order-again" data-order="${o._id || ""}">Order Again</a></td>
      </tr>
    `;
  }

  rows += `</tbody>`;
  table.innerHTML = rows;

  if (!ordersTableListenerBound){
    table.addEventListener("click", async (e)=>{
      const link = e.target.closest("a.order-again");
      if (!link) return;
      e.preventDefault();
      const orderId = link.dataset.order;
      if (!orderId) return;

      try{
        const resp = await fetchWithAuth(`${API_BASE}/api/orders/${orderId}/reorder`, { method: "POST" });
        if (!resp.ok) throw new Error("reorder failed");
        const { items } = await resp.json();

        const token = localStorage.getItem("authToken");
        for (const it of (items || [])) {
          const r = await fetch(`${API_BASE}/api/cart/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ itemId: it.itemId })
          });
          if (!r.ok) console.warn("Order Again failed for item", it.itemId);
        }

        const c = Number(localStorage.getItem("cartCount")||0) + ((items && items.length) || 0);
        localStorage.setItem("cartCount", String(c));
        updateCartBadge();
        link.textContent = "Added ✓";
        setTimeout(()=> (link.textContent = "Order Again"), 1400);
      }catch(err){
        console.error(err);
        alert("Could not reorder. Please try again.");
      }
    });
    ordersTableListenerBound = true;
  }
}

async function loadOrders(){
  const table = document.getElementById("orders-table");
  if (!table) return;
  try{
    const res = await fetchWithAuth(`${API_BASE}/api/orders`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(()=>({ orders: [] }));
    renderOrdersTable(data && Array.isArray(data.orders) ? data.orders : []);
  }catch(err){
    console.error("[orders] load error:", err);
    table.innerHTML = `<tr><td class="muted" style="padding:16px">No orders yet</td></tr>`;
  }
}

/* ---------- Init ---------- */
(async function init(){
  wireSearch();
  updateCartBadge();

  await loadUser();
  await loadPayment();
  await loadAddress();
  await loadMenuPreview();
  await loadOrders();
})();
