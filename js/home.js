const departInput = document.getElementById("depart");
const destinationInput = document.getElementById("destination");
const dateInput = document.getElementById("date");
const btnSearch = document.getElementById("btn-search");


// Sélectionner le formulaire dans la page
const form = document.getElementById("searchcovoiturages");

btnSearch.addEventListener("click", searchCovoiturages);

// Ajouter un écouteur d'événement pour la soumission du formulaire
function searchCovoiturages(event) {
    event.preventDefault(); // Empêche l'envoi par défaut du formulaire

    // Récupérer les valeurs des champs du formulaire
    const depart = document.getElementById('depart').value.trim();
    const destination = document.getElementById('destination').value.trim();
    const date = document.getElementById('date').value.trim();

    // Vérifier que la date est supérieure ou égale à aujourd'hui
    const today = new Date();
    const selectedDate = new Date(date);

    if (selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        dateInput.classList.add("is-invalid");
        return;
    }

    // Valider les champs
    if (!depart || !destination || !date) {
        if (!depart) {
            departInput.classList.add("is-invalid");
        } else {
            departInput.classList.remove("is-invalid");
            departInput.classList.add("is-valid");
        }
        if (!destination) {
            destinationInput.classList.add("is-invalid");
        } else {
            destinationInput.classList.remove("is-invalid");
            destinationInput.classList.add("is-valid");
        }
        return;
    }

    // Construire l'URL avec les paramètres
    const url = `/searchcovoiturages?depart=${encodeURIComponent(depart)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}`;

    // Rediriger vers l'URL
    window.location.href = url;
};