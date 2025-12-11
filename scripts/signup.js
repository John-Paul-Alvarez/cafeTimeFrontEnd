// signup.js
import { API_BASE } from "./config.js";

document.getElementById("signup-form").addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    let result;
    try {
      result = await response.json();
    } catch {
      result = { message: "Unexpected response from server." };
    }

    if (!response.ok) {
      alert("Signup failed: " + (result.message || response.statusText));
      return;
    }

    // Store token
    if (result.token) {
      localStorage.setItem("authToken", result.token);
    } else {
      alert("Signup succeeded but no token was returned.");
      return;
    }

    // ---- Merge guest cart → server ----
    const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    if (guestCart.length) {
      await Promise.all(
        guestCart.map((item) =>
          fetch(`${API_BASE}/api/cart/add`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${result.token}`,
            },
            body: JSON.stringify({
              itemId: item.itemId,
              size: item.customizations?.size ?? null,
              milk: item.customizations?.milk ?? null,
              sugar: item.customizations?.sugar ?? null,
              heat: item.customizations?.heat ?? null,
            }),
          })
        )
      );
      localStorage.removeItem("guestCart");
    }

    // No longer a guest
    localStorage.removeItem("guestMode");

    // Promote local guest delivery address → server address (ONLY once)
    try {
      const localAddr = JSON.parse(localStorage.getItem("guestDeliveryAddress") || "null");
      if (localAddr?.displayAddress) {
        await fetch(`${API_BASE}/api/account/address`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${result.token}`,
          },
          body: JSON.stringify(localAddr),
        });
      }
    } catch (e) {
      console.warn("Address promotion failed:", e);
    }

    // Check if user has server address; if not → ask them to add one
    try {
      const resAddr = await fetch(`${API_BASE}/api/account/address`, {
        headers: { "Authorization": `Bearer ${result.token}` }
      });

      if (resAddr.ok) {
        const { deliveryAddress } = await resAddr.json();
        if (!deliveryAddress || !deliveryAddress.displayAddress) {
          sessionStorage.setItem("postAddressRedirect", "profile_dashBoard.html");
          window.location.href = "address_form.html";
          return;
        }
      }
    } catch (e) {
      console.warn("Address check failed:", e);
    }

    // SUCCESS → go to dashboard
    window.location.href = "profile_dashBoard.html";

  } catch (error) {
    console.error("Signup network error:", error);
    alert("Network error. Please try again.");
  }
});
