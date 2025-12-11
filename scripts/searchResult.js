import { API_BASE } from "./config.js";

const successModal = document.getElementById("success-modal");
const successClose = document.getElementById("success-close");
const successOk = document.getElementById("success-ok");

// Local guest storage
function addToGuestCart(item) {
    const cart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    cart.push(item);
    localStorage.setItem("guestCart", JSON.stringify(cart));
}

document.addEventListener("DOMContentLoaded", async () => {

    // DOM references
    const grid = document.getElementById("search-grid");
    const title = document.getElementById("search-title");
    const subtitle = document.getElementById("search-subtitle");

    // Modal refs
    const modal = document.getElementById("sr-modal");
    const modalImg = document.getElementById("sr-img");
    const modalName = document.getElementById("sr-name");
    const modalPrice = document.getElementById("sr-price");
    const modalOptions = document.getElementById("sr-options");
    const closeModalBtn = document.getElementById("sr-close");
    const addBtn = document.getElementById("sr-add-btn");

    let selectedItem = null;

    // Read query
    const params = new URLSearchParams(window.location.search);
    const rawQuery = params.get("q") || "";
    const query = rawQuery.trim().toLowerCase();

    if (!query) {
        title.style.display = "none";
        subtitle.style.display = "none";
        return;
    }

    // Fetch all items
    const res = await fetch(`${API_BASE}/api/menu`);
    const items = await res.json();

    const results = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.subcategory || "").toLowerCase().includes(query)
    );

    // ------------------------------------
    //  NO RESULTS → Hide title/subtitle
    // ------------------------------------
    if (results.length === 0) {

        title.style.display = "none";
        subtitle.style.display = "none";

        grid.innerHTML = `
            <div class="no-results-box">
                <div class="no-results-icon"></div>

                <h2>No results found</h2>

                <p style="color:#666; margin-top: 6px;">
                    Try searching for pastries, coffee, muffins, or croissants.
                </p>

                <button class="no-results-btn" onclick="window.location.href='newMenuPage.html'">
                    Back to Menu
                </button>
            </div>
        `;
        return;
    }

    // ------------------------------------
    //  HAS RESULTS → Show title + subtitle
    // ------------------------------------
    title.textContent = `🔍 Results for “${rawQuery}”`;
    subtitle.textContent = "Click an item to customize your order.";

    // Render result cards
    grid.innerHTML = "";
    results.forEach(item => {
        const card = document.createElement("div");
        card.className = "menu-card";
        card.innerHTML = `
          <img src="${item.image}" alt="${item.name}">
          <h4>${item.name}</h4>
          <p>$${item.price.toFixed(2)}</p>
        `;
        card.addEventListener("click", () => openModal(item));
        grid.appendChild(card);
    });

    // Open modal
    function openModal(item) {
        selectedItem = item;

        modalImg.src = item.image;
        modalName.textContent = item.name;
        modalPrice.textContent = `$${item.price.toFixed(2)}`;
        modalOptions.innerHTML = "";

        // Drinks options
        if (item.category === "Drinks") {
            modalOptions.innerHTML = `
                <label>Sugar:
                    <select id="opt-sugar">
                        <option value="No Sugar">No Sugar</option>
                        <option value="Less Sugar">Less Sugar</option>
                        <option value="Normal">Normal</option>
                        <option value="Extra Sugar">Extra Sugar</option>
                    </select>
                </label>

                <label>Milk:
                    <select id="opt-milk">
                        <option value="Whole">Whole</option>
                        <option value="Skim">Skim</option>
                        <option value="Almond">Almond</option>
                        <option value="Oat">Oat</option>
                    </select>
                </label>

                <label>Size:
                    <select id="opt-size">
                        <option value="Small">Small</option>
                        <option value="Medium">Medium</option>
                        <option value="Large">Large</option>
                    </select>
                </label>
            `;
        }

        // Pastries options
        if (item.category === "Pastries") {
            modalOptions.innerHTML = `
                <label>Heat:
                    <select id="opt-heat">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </label>
            `;
        }

        modal.style.display = "flex";
    }

    closeModalBtn.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", e => {
        if (e.target === modal) modal.style.display = "none";
    });

    // Add to cart button
    addBtn.addEventListener("click", async () => {
        if (!selectedItem) return;

        const sugar = document.getElementById("opt-sugar")?.value || null;
        const milk = document.getElementById("opt-milk")?.value || null;
        const size = document.getElementById("opt-size")?.value || null;
        const heat = document.getElementById("opt-heat")?.value || null;

        const token = localStorage.getItem("authToken");

        // Save to backend or guest cart
        if (token) {
            await fetch(`${API_BASE}/api/cart/add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    itemId: selectedItem._id,
                    sugar,
                    milk,
                    size,
                    heat
                })
            });
        } else {
            addToGuestCart({
                itemId: selectedItem._id,
                name: selectedItem.name,
                unitPrice: selectedItem.price,
                sugar,
                milk,
                size,
                heat
            });
        }

        modal.style.display = "none";
        successModal.style.display = "flex";
    });
});

// Close success modal
successClose.addEventListener("click", () => successModal.style.display = "none");
successOk.addEventListener("click", () => successModal.style.display = "none");
window.addEventListener("click", e => {
    if (e.target === successModal) successModal.style.display = "none";
});
