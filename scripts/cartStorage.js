// Simple key for matching "same line item" (same product + same customizations)
function guestKey({ itemId, size, milk, sugar, heat }) {
  return [itemId, size || "", milk || "", sugar || "", heat || ""].join("|");
}

export function getGuestCart() {
  return JSON.parse(localStorage.getItem("guestCart") || "[]");
}

export function saveGuestCart(cart) {
  localStorage.setItem("guestCart", JSON.stringify(cart));
}

// Add or increase
export function addToGuestCart({ itemId, name, unitPrice, size=null, milk=null, sugar=null, heat=null }) {
  const cart = getGuestCart();
  const key = guestKey({ itemId, size, milk, sugar, heat });

  const existing = cart.find(c => c.key === key);
  if (existing) {
    existing.quantity += 1;
    existing.totalPrice = existing.quantity * existing.unitPrice;
  } else {
    cart.push({
      key,               // synthetic id for guest
      itemId, name,
      unitPrice: Number(unitPrice),
      quantity: 1,
      totalPrice: Number(unitPrice),
      customizations: { size, milk, sugar, heat }
    });
  }
  saveGuestCart(cart);
}

export function updateGuestQty(key, action) {
  const cart = getGuestCart();
  const idx = cart.findIndex(c => c.key === key);
  if (idx === -1) return getGuestCart();

  if (action === "increase") cart[idx].quantity += 1;
  if (action === "decrease") cart[idx].quantity -= 1;

  if (cart[idx].quantity <= 0) {
    cart.splice(idx, 1);
  } else {
    cart[idx].totalPrice = cart[idx].quantity * cart[idx].unitPrice;
  }

  saveGuestCart(cart);
  return cart;
}

export function removeGuestItem(key) {
  const cart = getGuestCart().filter(c => c.key !== key);
  saveGuestCart(cart);
  return cart;
}

export function clearGuestCart() {
  localStorage.removeItem("guestCart");
}
