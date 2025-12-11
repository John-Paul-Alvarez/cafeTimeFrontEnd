// ------------------------------
// BASIC DOM REFERENCES
// ------------------------------
const popupOverlay = document.getElementById("popupOverlay");
const closePopup = document.getElementById("closePopup");

const myReviewsList = document.getElementById("myReviewsList");
const myReviewsEmpty = document.getElementById("myReviewsEmpty");
const recentReviewsList = document.getElementById("recentReviewsList");

// ------------------------------
// HELPER: CREATE REVIEW CARD
// ------------------------------
function createReviewCard(review) {
  const div = document.createElement("div");
  div.classList.add("review-card");

  // Handle rating: it might already include "Stars"
  const ratingText = review.rating?.toString().includes("Star")
    ? review.rating
    : `${review.rating} Stars`;

  div.innerHTML = `
    <h4>${review.username || "Anonymous"}</h4>
    <p class="review-rating">${ratingText}</p>
    <p>${review.message}</p>
  `;
  return div;
}

// ------------------------------
// LOAD REVIEWS FROM SERVER
// ------------------------------
async function loadMyReviews() {
  try {
    const res = await fetch("/api/reviews/my");
    if (!res.ok) throw new Error("Failed to load my reviews");

    const data = await res.json();

    myReviewsList.innerHTML = "";

    if (!data || data.length === 0) {
      myReviewsEmpty.style.display = "block";
      return;
    }

    myReviewsEmpty.style.display = "none";
    data.forEach(review => {
      myReviewsList.appendChild(createReviewCard(review));
    });
  } catch (err) {
    console.error("Error loading my reviews:", err);
  }
}

async function loadRecentReviews() {
  try {
    const res = await fetch("/api/reviews/all");
    if (!res.ok) throw new Error("Failed to load recent reviews");

    const data = await res.json();
    recentReviewsList.innerHTML = "";

    if (data && data.length > 0) {
      data.forEach(review => {
        recentReviewsList.appendChild(createReviewCard(review));
      });
    }
  } catch (err) {
    console.error("Error loading recent reviews:", err);
  }
}

// ------------------------------
// SUBMIT REVIEW TO DATABASE
// ------------------------------
function setupFormHandler() {
  const form = document.querySelector(".review-section form");
  if (!form) return;

  form.addEventListener("submit", async (evt) => {
    evt.preventDefault();

    const nameInput = form.querySelector('input[type="text"]');
    const ratingSelect = form.querySelector("select");
    const messageTextarea = form.querySelector("textarea");

    const name = nameInput.value.trim();
    const rating = ratingSelect.value;
    const message = messageTextarea.value.trim();

    if (!name || !rating || !message) {
      alert("Please fill in all fields before submitting your review.");
      return;
    }

    // Optional category based on the section
    const category = form.closest(".review-section")?.id || "general";

    try {
      const res = await fetch("/api/reviews/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          username: name,
          rating,
          message
        })
      });

      if (!res.ok) {
        console.error("Error response while creating review:", await res.text());
        alert("Something went wrong while submitting your review.");
        return;
      }

      // Show thank-you popup
      popupOverlay.style.display = "flex";

      // Clear form
      form.reset();

      // Refresh the lists after saving to DB
      loadMyReviews();
      loadRecentReviews();
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Could not submit review. Please try again later.");
    }
  });
}

// ------------------------------
// POPUP LOGIC
// ------------------------------
if (closePopup) {
  closePopup.addEventListener("click", () => {
    popupOverlay.style.display = "none";
  });
}

if (popupOverlay) {
  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) popupOverlay.style.display = "none";
  });
}

// ------------------------------
// INITIAL PAGE LOAD
// ------------------------------
window.addEventListener("DOMContentLoaded", () => {
  setupFormHandler();
  loadMyReviews();
  loadRecentReviews();
});
