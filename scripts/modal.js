// modal.js
import { API_BASE } from "./config.js";
import { addToGuestCart } from "./cartStorage.js";

export function openModal(item) {
  const modal = document.getElementById("customizationModal");
  const modalImage = document.getElementById("modalImage");
  const modalName = document.getElementById("modalName");
  const modalPrice = document.getElementById("modalPrice");
  const customizationOptions = document.getElementById("customizationOptions");

  modal.style.display = "flex";
  modalImage.src = item.image;
  modalName.textContent = item.name;
  modalPrice.textContent = `$${item.price.toFixed(2)}`;

  customizationOptions.innerHTML = "";

  // Drinks
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

  // Pastries
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

  // Add to Cart
  document.getElementById("confirmAddToCart").onclick = async () => {
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
          itemId: item._id,
          sugar,
          milk,
          size,
          heat
        })
      });
    } else {
      addToGuestCart({
        itemId: item._id,
        name: item.name,
        unitPrice: item.price,
        sugar,
        milk,
        size,
        heat
      });
    }

    alert("Added to cart!");
    modal.style.display = "none";
  };
}

// Close modal on background click
window.addEventListener("click", e => {
  if (e.target.id === "customizationModal") {
    e.target.style.display = "none";
  }
});
