// auth.js
import { API_BASE } from "./config.js";

// Simple auth helpers
export function getToken() {
  return localStorage.getItem("authToken");
}

export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("guestDeliveryAddress");
  localStorage.removeItem("guestMode");
  window.location.href = "signin.html";
}

export async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}), "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

// Enforce login for private pages
export async function requireAuth() {
  const token = getToken();
  if (!token) {
    logout();
    return;
  }

  try {
    const resp = await fetchWithAuth(`${API_BASE}/api/auth/me`);
    if (!resp.ok) {
      logout();
    }
  } catch (e) {
    console.error("Auth check failed:", e);
    logout();
  }
}
