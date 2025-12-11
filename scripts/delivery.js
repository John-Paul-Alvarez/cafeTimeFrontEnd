const KEY = "guestDeliveryAddress";

export function getDelivery() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setDelivery({ displayAddress, extraNotes = "", lat = null, lng = null }) {
  const payload = {
    displayAddress: (displayAddress || "").trim(),
    extraNotes: (extraNotes || "").trim(),
    lat, lng,
    updatedAt: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  return payload;
}

export function clearDelivery() {
  localStorage.removeItem(KEY);
}
