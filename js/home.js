const departInput = document.getElementById("depart");
const destinationInput = document.getElementById("destination");
const dateInput = document.getElementById("date");
const btnSearch = document.getElementById("btn-search");

// Éléments pour l'autocomplétion
const departSuggestions = document.getElementById("departSuggestions");
const destinationSuggestions = document.getElementById("destinationSuggestions");

// Variables pour gérer les timeouts de recherche
let searchTimeouts = {};

// Sélectionner le formulaire dans la page
const form = document.getElementById("searchcovoiturages");

btnSearch.addEventListener("click", searchCovoiturages);

// Configurer l'autocomplétion pour les champs de ville
setupCityAutocomplete("depart", "departSuggestions");
setupCityAutocomplete("destination", "destinationSuggestions");

// Configurer la date minimum pour empêcher la sélection de dates passées
setupDateRestriction();

/**
 * Configurer l'autocomplétion pour un champ de ville
 */
function setupCityAutocomplete(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);

    if (!input || !suggestionsContainer) {
        console.warn(`Éléments d'autocomplétion non trouvés: ${inputId}, ${suggestionsId}`);
        return;
    }

    // Événement de saisie avec délai
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Effacer les données stockées si l'utilisateur modifie le champ
        input.removeAttribute('data-city-name');
        input.removeAttribute('data-postcode');
        
        // Annuler la recherche précédente
        if (searchTimeouts[inputId]) {
            clearTimeout(searchTimeouts[inputId]);
        }

        if (query.length < 2) {
            hideSuggestions(suggestionsContainer);
            return;
        }

        // Délai de 300ms avant la recherche
        searchTimeouts[inputId] = setTimeout(() => {
            searchCities(query, suggestionsContainer, input);
        }, 300);
    });

    // Cacher les suggestions quand on clique ailleurs
    input.addEventListener('blur', (e) => {
        setTimeout(() => {
            hideSuggestions(suggestionsContainer);
        }, 200);
    });

    // Afficher les suggestions quand on focus le champ (si il y a déjà du texte)
    input.addEventListener('focus', (e) => {
        if (e.target.value.trim().length >= 2) {
            searchCities(e.target.value.trim(), suggestionsContainer, input);
        }
    });
}

/**
 * Rechercher des villes via l'API française d'adresses
 */
async function searchCities(query, suggestionsContainer, input) {
    try {
        // Utiliser l'API d'adresses française en filtrant sur les villes
        const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=8&type=municipality`);
        
        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }

        const data = await response.json();
        displayCitySuggestions(data.features, suggestionsContainer, input);
        
    } catch (error) {
        console.error('Erreur lors de la recherche de villes:', error);
        hideSuggestions(suggestionsContainer);
    }
}

/**
 * Afficher les suggestions de villes
 */
function displayCitySuggestions(features, suggestionsContainer, input) {
    if (!features || features.length === 0) {
        hideSuggestions(suggestionsContainer);
        return;
    }

    suggestionsContainer.innerHTML = '';
    suggestionsContainer.style.display = 'block';

    features.forEach(feature => {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion-item p-2 border-bottom address-suggestion';
        suggestion.style.cursor = 'pointer';
        
        const properties = feature.properties;
        const cityName = properties.city || properties.name;
        const postcode = properties.postcode;
        const context = properties.context ? ` (${properties.context})` : '';
        
        suggestion.innerHTML = `
            <div class="fw-bold">${cityName}</div>
            <small class="text-muted">${postcode}${context}</small>
        `;
        
        // Événement de clic sur la suggestion
        suggestion.addEventListener('click', () => {
            input.value = cityName;
            
            // Stocker les données complètes dans des attributs data
            input.setAttribute('data-city-name', cityName);
            input.setAttribute('data-postcode', postcode);
            
            hideSuggestions(suggestionsContainer);
            
            // Retirer la classe d'erreur si présente
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        });

        // Effet hover
        suggestion.addEventListener('mouseenter', () => {
            suggestion.style.backgroundColor = '#f8f9fa';
        });
        
        suggestion.addEventListener('mouseleave', () => {
            suggestion.style.backgroundColor = '';
        });
        
        suggestionsContainer.appendChild(suggestion);
    });
}

/**
 * Cacher les suggestions
 */
function hideSuggestions(suggestionsContainer) {
    suggestionsContainer.style.display = 'none';
    suggestionsContainer.innerHTML = '';
}

// Ajouter un écouteur d'événement pour la soumission du formulaire
function searchCovoiturages(event) {
    event.preventDefault(); // Empêche l'envoi par défaut du formulaire

    // Récupérer les valeurs des champs du formulaire
    const depart = document.getElementById('depart').value.trim();
    const destination = document.getElementById('destination').value.trim();
    const date = document.getElementById('date').value.trim();

    // Réinitialiser les classes de validation
    [departInput, destinationInput, dateInput].forEach(input => {
        input.classList.remove('is-invalid', 'is-valid');
    });

    let hasErrors = false;

    // Valider le champ départ
    if (!depart) {
        departInput.classList.add("is-invalid");
        hasErrors = true;
    } else {
        departInput.classList.add("is-valid");
    }

    // Valider le champ destination
    if (!destination) {
        destinationInput.classList.add("is-invalid");
        hasErrors = true;
    } else {
        destinationInput.classList.add("is-valid");
    }

    // Valider la date
    if (!date) {
        dateInput.classList.add("is-invalid");
        hasErrors = true;
    } else {
        // Vérifier que la date est supérieure ou égale à aujourd'hui
        const today = new Date();
        const selectedDate = new Date(date);
        
        if (selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
            dateInput.classList.add("is-invalid");
            hasErrors = true;
        } else {
            dateInput.classList.add("is-valid");
        }
    }

    // Si il y a des erreurs, ne pas continuer
    if (hasErrors) {
        return;
    }

    // Récupérer les codes postaux si disponibles
    const departPostcode = departInput.getAttribute('data-postcode') || '';
    const destinationPostcode = destinationInput.getAttribute('data-postcode') || '';

    // Construire l'URL avec les paramètres pour la page de recherche
    let url = `/searchcovoiturages?depart=${encodeURIComponent(depart)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}`;
    
    // Ajouter les codes postaux si disponibles
    if (departPostcode) {
        url += `&departPostcode=${encodeURIComponent(departPostcode)}`;
    }
    if (destinationPostcode) {
        url += `&destinationPostcode=${encodeURIComponent(destinationPostcode)}`;
    }

    // Rediriger vers la page de recherche
    window.location.href = url;
};

/**
 * Configurer la restriction de date pour empêcher la sélection de dates passées
 */
function setupDateRestriction() {
    if (!dateInput) {
        console.warn('Champ date non trouvé');
        return;
    }

    // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');

    // Définir la date minimum
    dateInput.setAttribute('min', todayString);
    
    // Ajouter un écouteur pour valider la date en temps réel
    dateInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        const today = new Date();
        
        // Réinitialiser l'heure pour comparer seulement les dates
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            this.classList.add('is-invalid');
            this.classList.remove('is-valid');
        } else {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        }
    });
}