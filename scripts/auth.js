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
  localStorage.removeItem("guestMode"); // optional choice
  window.location.href = "signin.html";
}

export async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}), "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

// New helper: enforce auth on private pages
export async function requireAuth() {
  const token = getToken();
  if (!token) {
    logout(); // no token at all
    return;
  }

  try {
    const resp = await fetchWithAuth("http://localhost:5000/api/auth/me");
    if (!resp.ok) {
      logout(); // invalid/expired token
    }
  } catch (e) {
    console.error("Auth check failed:", e);
    logout();
  }
}