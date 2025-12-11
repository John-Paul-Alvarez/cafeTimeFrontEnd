import { API_BASE } from "./config.js";
import { addToGuestCart } from "./cartStorage.js";
import { getDelivery } from "./delivery.js";

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById("menu-grid");
  const recGrid = document.getElementById("rec-grid");
  const categoryTitle = document.getElementById("selected-category");
  const subcategoryList = document.getElementById("subcategory-list");

  const modal = document.getElementById("customizationModal");
  const closeModal = document.getElementById("closeModal");
  const modalImage = document.getElementById("modalImage");
  const modalName = document.getElementById("modalName");
  const modalPrice = document.getElementById("modalPrice");
  const customizationOptions = document.getElementById("customizationOptions");
  const confirmAddToCart = document.getElementById("confirmAddToCart");

  const successModal = document.getElementById("success-modal");
const successClose = document.getElementById("success-close");
const successOk = document.getElementById("success-ok");

// Close on X
successClose.addEventListener("click", () => successModal.style.display = "none");

// Close on OK
successOk.addEventListener("click", () => successModal.style.display = "none");

// Close when clicking outside of modal
window.addEventListener("click", e => {
    if (e.target === successModal) successModal.style.display = "none";
});


  let selectedItem = null;
  let allItems = [];
  let currentMain = "All";
  let currentSub = null;

  try {
    const res = await fetch(`${API_BASE}/api/Menu`);
    allItems = await res.json();

    renderMenu(allItems);
    renderSubcategories(allItems);
    renderRecommendations(allItems.slice(0, 4)); // Show first few as popular

    // Main category filters
    document.getElementById("filter-all").addEventListener("click", () => setMainFilter("All"));
    document.getElementById("filter-drinks").addEventListener("click", () => setMainFilter("Drinks"));
    document.getElementById("filter-pastries").addEventListener("click", () => setMainFilter("Pastries"));

    function setMainFilter(main) {
      currentMain = main;
      currentSub = null;
      document.querySelectorAll(".filter-group button").forEach(b => b.classList.remove("active"));
      document.getElementById(`filter-${main.toLowerCase()}`).classList.add("active");

      renderSubcategories(allItems.filter(i => main === "All" ? true : i.category === main));
      filterMenu();
    }

    function renderSubcategories(list) {
      subcategoryList.innerHTML = "";
      const subs = [...new Set(list.map(i => i.subcategory).filter(Boolean))];
      subs.forEach(sub => {
        const btn = document.createElement("button");
        btn.textContent = sub;
        btn.addEventListener("click", () => {
          currentSub = sub;
          document.querySelectorAll("#subcategory-list button").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          filterMenu();
        });
        subcategoryList.appendChild(btn);
      });
    }

    function filterMenu() {
      let filtered = allItems;
      if (currentMain !== "All") {
        filtered = filtered.filter(i => i.category === currentMain);
      }
      if (currentSub) {
        filtered = filtered.filter(i => i.subcategory === currentSub);
      }
      renderMenu(filtered);

      categoryTitle.textContent = currentSub || (currentMain === "All" ? "All Menu Items" : currentMain);
    }

    function renderMenu(list) {
      grid.innerHTML = "";
      list.forEach(item => {
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
    }

    function renderRecommendations(items) {
      recGrid.innerHTML = "";
      items.forEach(item => {
        const recCard = document.createElement("div");
        recCard.className = "rec-card";
        recCard.innerHTML = `
          <img src="${item.image}" alt="${item.name}">
          <h4>${item.name}</h4>
          <p>$${item.price.toFixed(2)}</p>
        `;
        recCard.addEventListener("click", () => openModal(item));
        recGrid.appendChild(recCard);
      });
    }

    // Modal
    function openModal(item) {
      selectedItem = item;
      modal.style.display = "flex";
      modalImage.src = item.image;
      modalName.textContent = item.name;
      modalPrice.textContent = `$${item.price.toFixed(2)}`;
      customizationOptions.innerHTML = "";

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
      } else if (item.category === "Pastries") {
        customizationOptions.innerHTML = `
          <label>Heat:
            <select id="heat">
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>
        `;
      }
    }

    window.openModal = openModal;

    closeModal.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });

    confirmAddToCart.addEventListener("click", async () => {
      if (!selectedItem) return;
      const sugar = document.getElementById("sugar")?.value || null;
      const milk = document.getElementById("milk")?.value || null;
      const size = document.getElementById("size")?.value || null;
      const heat = document.getElementById("heat")?.value || null;

      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          await fetch(`${API_BASE}/api/cart/add`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ itemId: selectedItem._id, sugar, milk, size, heat })
          });
        } else {
          addToGuestCart({ itemId: selectedItem._id, name: selectedItem.name, unitPrice: selectedItem.price, sugar, milk, size, heat });
        }

        modal.style.display = "none";               // Close customization modal
document.getElementById("success-modal").style.display = "flex";  // Open success modal

        modal.style.display = "none";
      } catch (err) {
        console.error(err);
        alert("Failed to add to cart.");
      }
    });

  } catch (err) {
    console.error("Error loading menu:", err);
  }
});



