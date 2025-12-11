import { isLoggedIn, getToken } from "./auth.js";
import { getGuestCart } from "./cartStorage.js";
import { API_BASE } from "./config.js";

let lastCount = null; // 🔥 store last number to avoid blinking

async function refreshCartBadge() {
    const badge = document.getElementById("ct-cart-badge");
    if (!badge) return;

    // ----- Guest Cart -----
    if (!isLoggedIn()) {
        const guest = getGuestCart();
        const count = guest.length;

        if (count !== lastCount) {
            lastCount = count;

            if (count > 0) {
                badge.textContent = count;
                badge.style.display = "flex";
            } else {
                badge.style.display = "none";
            }
        }
        return;
    }

    // ----- Logged-in Cart -----
    try {
        const res = await fetch(`${API_BASE}/api/cart/summary`, {
            headers: { "Authorization": `Bearer ${getToken()}` }
        });

        if (!res.ok) return;

        const data = await res.json();
        const items = data.items || [];
        const count = items.length;

        if (count !== lastCount) {
            lastCount = count;

            if (count > 0) {
                badge.textContent = count;
                badge.style.display = "flex";
            } else {
                badge.style.display = "none";
            }
        }

    } catch (err) {
        console.error("Navbar cart load failed:", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    refreshCartBadge();
    setInterval(refreshCartBadge, 2000); // you can keep 2 seconds
});
