//On récupère la recherche dans l'url
const urlParams = new URLSearchParams(window.location.search);
const depart = urlParams.get("depart");
const destination = urlParams.get("destination");
const date = urlParams.get("date");

const departInput = document.getElementById("depart");
const destinationInput = document.getElementById("destination");
const dateInput = document.getElementById("date");

departInput.value = depart;
destinationInput.value = destination;
// Validate the date format (e.g., YYYY-MM-DD)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (dateRegex.test(date)) {
	dateInput.value = date;
} else {
    dateInput.classList.add("is-invalid");
}


function toggleSearchFilter() {
    const searchFilter = document.getElementById('search-filter');
    const toggleLink = document.getElementById('toggle-search');
    if (searchFilter.style.display === 'none') {
        searchFilter.style.display = 'block';
        toggleLink.textContent = 'Masquer la recherche avancée';
    } else {
        searchFilter.style.display = 'none';
        toggleLink.textContent = 'Affiner la recherche';
    }
}