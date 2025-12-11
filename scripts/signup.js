// signup.js
// import { API_BASE } from "./config.js";  // if you use a config file

document.getElementById("signup-form").addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(/* `${API_BASE}` */ "http://localhost:5000" + "/api/auth/signup", {
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
      // safety: if no token returned, bail
      alert("Signup succeeded but no token was returned.");
      return;
    }

    // ---- Same behavior as signin ----

    // 1) Merge guest cart -> server
    const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    if (guestCart.length) {
      await Promise.all(
        guestCart.map((item) =>
          fetch(/* `${API_BASE}` */ "http://localhost:5000" + "/api/cart/add", {
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

    // 2) They are no longer a guest
    localStorage.removeItem("guestMode");

    // 3) If a LOCAL guest address exists, save it to the SERVER once (promote it)
    try {
      const localAddr = JSON.parse(localStorage.getItem("guestDeliveryAddress") || "null");
      if (localAddr?.displayAddress) {
        await fetch(/* `${API_BASE}` */ "http://localhost:5000" + "/api/account/address", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${result.token}`,
          },
          body: JSON.stringify(localAddr),
        });
        // Optional: if you prefer server-only after login:
        // localStorage.removeItem("guestDeliveryAddress");
      }
    } catch (e) {
      console.warn("Address promotion failed (continuing):", e);
    }

    // 4) If the SERVER still has no address, ask once on the logged-in address page
    try {
      const resAddr = await fetch(/* `${API_BASE}` */ "http://localhost:5000" + "/api/account/address", {
        headers: { "Authorization": `Bearer ${result.token}` }
      });
      if (resAddr.ok) {
        const { deliveryAddress } = await resAddr.json();
        if (!deliveryAddress || !deliveryAddress.displayAddress) {
          sessionStorage.setItem("postAddressRedirect", "profile_dashBoard.html");
          window.location.href = "address_form.html"; // logged-in capture page (do NOT set guestMode here)
          return;
        }
      }
    } catch (e) {
      console.warn("Address presence check failed (continuing):", e);
    }

    // 5) Otherwise go to dashboard
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Signup network error:", error);
    alert("Network error. Please try again.");
  }
});
