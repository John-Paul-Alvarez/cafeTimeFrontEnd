import { isLoggedIn } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const guestNav = document.getElementById("ct-guest-nav");
    const userNav = document.getElementById("ct-user-nav");

    if (isLoggedIn()) {
        guestNav.style.display = "none";
        userNav.style.display = "flex";
    } else {
        guestNav.style.display = "flex";
        userNav.style.display = "none";
    }
});
