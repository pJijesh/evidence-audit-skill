// Fictional booking page script. INTENTIONALLY VULNERABLE.
async function showGuestNote(id) {
  const res = await fetch(`/bookings/${id}`);
  const data = await res.json();
  document.getElementById("note").innerHTML = data.guest_note;
}

document.getElementById("search").addEventListener("input", (e) => {
  const q = e.target.value;
  document.getElementById("results").innerHTML = "Results for " + q;
});
