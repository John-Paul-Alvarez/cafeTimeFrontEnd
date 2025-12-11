// signin.js
// import { API_BASE } from "./config.js";  // if you use a config file

document.getElementById("signin-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(/* `${API_BASE}` */ "http://localhost:5000" + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    // Try to parse JSON even on errors so we can show a message
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

    // OK: store token
    if (result.token) {
      localStorage.setItem("authToken", result.token);

      // Merge guest cart -> server
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
    }

    // They are no longer a guest
    localStorage.removeItem("guestMode");

    // 1) If a LOCAL guest address exists, save it to the SERVER once
    try {
      const localAddr = JSON.parse(localStorage.getItem("guestDeliveryAddress") || "null");
      if (localAddr?.displayAddress && result?.token) {
        await fetch(/* `${API_BASE}` */ "http://localhost:5000" + "/api/account/address", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${result.token}`,
          },
          body: JSON.stringify(localAddr),
        });
        // Optional: keep localAddr for UI or clear it; your call.
        // localStorage.removeItem("guestDeliveryAddress");
      }
    } catch (e) {
      console.warn("Address save to server failed (will continue):", e);
    }

    // 2) If the SERVER still has no address, ask once
    try {
      if (result?.token) {
        const resAddr = await fetch(/* `${API_BASE}` */ "http://localhost:5000" + "/api/account/address", {
          headers: { "Authorization": `Bearer ${result.token}` }
        });
        if (resAddr.ok) {
          const { deliveryAddress } = await resAddr.json();
          if (!deliveryAddress || !deliveryAddress.displayAddress) {
            sessionStorage.setItem("postAddressRedirect", "dashboard.html");
            window.location.href = "address_form.html"; // (logged-in page; DO NOT set guestMode here)
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Address fetch check failed (will continue):", e);
    }

    // redirect after success
    window.location.href = "profile_dashBoard.html";
  } catch (error) {
    console.error("Login network error:", error);
    alert("Network error. Please try again.");
  }
});
