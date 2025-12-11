import { API_BASE } from "./config.js";

export async function fetchServerAddress() {
  const token = localStorage.getItem("authToken");
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/account/address`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.deliveryAddress || null;
}

export async function saveAddressToServer(addr) {
  const token = localStorage.getItem("authToken");
  if (!token) return false;
  const res = await fetch(`${API_BASE}/api/account/address`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(addr),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && data.success;
}
