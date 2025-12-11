// scripts/navbarSearch.js

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("ct-search-input");
  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    const query = input.value.trim();

    // If empty → go to full menu
    if (!query) {
      window.top.location.href = "newMenuPage.html";
      return;
    }

    // Go to searchResult page (NO pages/ prefix)
    window.top.location.href = `searchResult.html?q=${encodeURIComponent(query)}`;
  });
});
