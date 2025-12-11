// signin.js
import { API_BASE } from "./config.js";

document.getElementById("signin-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    // LOGIN REQUEST
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    // Attempt to parse JSON for errors or success
    let result;
    try {
      result = await response.json();
    } catch {
      result = { message: "Unexpected response from server." };
    }

    if (!response.ok) {
      alert("Login failed: " + (result.message || response.statusText));
      return;
    }

    // SAVE TOKEN
    if (result.token) {
      localStorage.setItem("authToken", result.token);
    } else {
      alert("Login succeeded but no token was returned.");
      return;
    }

    // ---- MERGE GUEST CART TO SERVER ----
    const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    if (guestCart.length && result.token) {
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

    // NOT A GUEST ANYMORE
    localStorage.removeItem("guestMode");

    // ---- PROMOTE LOCAL ADDRESS → SERVER ----
    try {
      const localAddr = JSON.parse(localStorage.getItem("guestDeliveryAddress") || "null");
      if (localAddr?.displayAddress && result.token) {
        await fetch(`${API_BASE}/api/account/address`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${result.token}`,
          },
          body: JSON.stringify(localAddr),
        });
      }
    } catch (err) {
      console.warn("Address promotion failed (continuing):", err);
    }

    // ---- CHECK IF SERVER HAS ADDRESS ----
    try {
      if (result.token) {
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
      }
    } catch (err) {
      console.warn("Address check failed (continuing):", err);
    }

    // FINAL REDIRECT — SUCCESS
    window.location.href = "profile_dashBoard.html";

  } catch (error) {
    console.error("Login network error:", error);
    alert("Network error. Please try again.");
  }
});
