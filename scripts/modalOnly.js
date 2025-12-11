// modalOnly.js — provides openModal for searchResult page WITHOUT menu.js UI

document.addEventListener("DOMContentLoaded", () => {
    // Make sure modal exists (it does on search page)
    const modal = document.getElementById("customizationModal");
    if (!modal) return;

    const modalImage = document.getElementById("modalImage");
    const modalName = document.getElementById("modalName");
    const modalPrice = document.getElementById("modalPrice");
    const customizationOptions = document.getElementById("customizationOptions");
    const confirmAddToCart = document.getElementById("confirmAddToCart");
    const closeModal = document.getElementById("closeModal");

    let selectedItem = null;

    // This is the SAME modal logic as menu.js but fully independent
    window.openModal = function (item) {
        selectedItem = item;
        modal.style.display = "flex";
        modalImage.src = item.image;
        modalName.textContent = item.name;
        modalPrice.textContent = `$${item.price.toFixed(2)}`;
        customizationOptions.innerHTML = "";

        // DRINK CUSTOMIZATION
        if (item.category === "Drinks") {
            customizationOptions.innerHTML = `
                <label>Sugar:
                    <select id="sugar">
                        <option value="No Sugar">No Sugar</option>
                        <option value="Less Sugar">Less Sugar</option>
                        <option value="Normal">Normal</option>
                        <option value="Extra Sugar">Extra Sugar</option>
                    </select>
                </label>

                <label>Milk:
                    <select id="milk">
                        <option value="Whole">Whole</option>
                        <option value="Skim">Skim</option>
                        <option value="Almond">Almond</option>
                        <option value="Oat">Oat</option>
                    </select>
                </label>

                <label>Size:
                    <select id="size">
                        <option value="Small">Small</option>
                        <option value="Medium">Medium</option>
                        <option value="Large">Large</option>
                    </select>
                </label>
            `;
        }

        // PASTRY CUSTOMIZATION
        if (item.category === "Pastries") {
            customizationOptions.innerHTML = `
                <label>Heat:
                    <select id="heat">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </label>
            `;
        }
    };

    // Close modal
    closeModal.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", e => {
        if (e.target === modal) modal.style.display = "none";
    });

    // Add to cart — use SAME logic as menu.js
    confirmAddToCart.addEventListener("click", async () => {
        if (!selectedItem) return;
        const sugar = document.getElementById("sugar")?.value || null;
        const milk = document.getElementById("milk")?.value || null;
        const size = document.getElementById("size")?.value || null;
        const heat = document.getElementById("heat")?.value || null;

        const token = localStorage.getItem("authToken");

        if (token) {
            await fetch(`${API_BASE}/api/cart/add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    itemId: selectedItem._id,
                    sugar, milk, size, heat
                })
            });
        } else {
            // Guest cart
            addToGuestCart({
                itemId: selectedItem._id,
                name: selectedItem.name,
                unitPrice: selectedItem.price,
                sugar, milk, size, heat,
            });
        }

        alert("Added to cart!");
        modal.style.display = "none";
    });

});
