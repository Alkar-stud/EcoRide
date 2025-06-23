// Module pour la recherche de covoiturages
import { apiUrl, url } from '../config.js';
import { getToken, sendFetchRequest, setGradeStyle } from '../script.js';
import covoiturageModal from './covoiturage-modal.js'; // Import de la modale unifiée

// Variables globales
let currentPage = 1;
let limitPerPage = 5;
let lastSearchParams = {};
let searchTimeouts = {};

// Éléments du DOM
const searchForm = document.getElementById('searchForm');
const searchResults = document.getElementById('searchResults');
const paginationContainer = document.getElementById('paginationContainer');
const initialMessage = document.getElementById('initialMessage');

// Champs du formulaire
const searchDepartInput = document.getElementById('searchDepart');
const searchDestinationInput = document.getElementById('searchDestination');
const searchDateInput = document.getElementById('searchDate');

// Conteneurs de suggestions
const searchDepartSuggestions = document.getElementById('searchDepartSuggestions');
const searchDestinationSuggestions = document.getElementById('searchDestinationSuggestions');

/**
 * Initialisation de la page
 */
async function initialize() {
    // Initialiser la modale de covoiturage
    await covoiturageModal.initialize();
    
    // Configurer le formulaire de recherche
    setupSearchForm();
    
    // Configurer l'autocomplétion
    setupCityAutocomplete('searchDepart', 'searchDepartSuggestions');
    setupCityAutocomplete('searchDestination', 'searchDestinationSuggestions');
    
    // Configurer la restriction de date
    setupDateRestriction();
    
    // Configurer les filtres avancés
    setupAdvancedFilters();
    
    // Lire les paramètres URL et effectuer une recherche si nécessaire
    checkUrlParameters();
}

/**
 * Configurer le formulaire de recherche
 */
function setupSearchForm() {
    if (!searchForm) return;
    
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Récupérer les données du formulaire
        const formData = new FormData(searchForm);
        const urlParams = new URLSearchParams();
        
        // Ajouter les paramètres de base
        const depart = formData.get('depart');
        const destination = formData.get('destination');
        const date = formData.get('date');
        const places = formData.get('places');
        
        if (depart) {
            urlParams.set('depart', depart);
            // Récupérer le code postal du départ si disponible
            const departPostCode = document.getElementById('searchDepartPostCode')?.value;
            if (departPostCode) {
                urlParams.set('departPostCode', departPostCode);
            }
        }
        
        if (destination) {
            urlParams.set('destination', destination);
            // Récupérer le code postal de destination si disponible
            const destinationPostCode = document.getElementById('searchDestinationPostCode')?.value;
            if (destinationPostCode) {
                urlParams.set('destinationPostCode', destinationPostCode);
            }
        }
        
        if (date) urlParams.set('date', date);
        if (places) urlParams.set('places', places);
        
        // Ajouter les filtres avancés s'ils sont activés
        const maxPrice = document.getElementById('maxPrice')?.value;
        const smokingAllowed = document.getElementById('smokingAllowed')?.checked;
        const petsAllowed = document.getElementById('petsAllowed')?.checked;
        const sortBy = document.getElementById('sortBy')?.value;
        
        if (maxPrice) urlParams.set('maxPrice', maxPrice);
        if (smokingAllowed) urlParams.set('smokingAllowed', 'true');
        if (petsAllowed) urlParams.set('petsAllowed', 'true');
        if (sortBy && sortBy !== 'date') urlParams.set('sortBy', sortBy);
        
        // Rediriger vers la même page avec les nouveaux paramètres
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.location.href = newUrl;
    });
}

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
        
        // Nettoyer les champs cachés selon le champ d'input
        if (input.id === 'searchDepart') {
            const hiddenField = document.getElementById('searchDepartPostCode');
            if (hiddenField) hiddenField.value = '';
        } else if (input.id === 'searchDestination') {
            const hiddenField = document.getElementById('searchDestinationPostCode');
            if (hiddenField) hiddenField.value = '';
        }
        
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

    // Afficher les suggestions quand on focus le champ
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
            
            // Mettre à jour les champs cachés selon le champ d'input
            if (input.id === 'searchDepart') {
                const hiddenField = document.getElementById('searchDepartPostCode');
                if (hiddenField) hiddenField.value = postcode;
            } else if (input.id === 'searchDestination') {
                const hiddenField = document.getElementById('searchDestinationPostCode');
                if (hiddenField) hiddenField.value = postcode;
            }
            
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

/**
 * Configurer la restriction de date
 */
function setupDateRestriction() {
    if (!searchDateInput) return;

    // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');

    // Définir la date minimum
    searchDateInput.setAttribute('min', todayString);
}

/**
 * Configurer les filtres avancés
 */
function setupAdvancedFilters() {
    const resetFiltersBtn = document.getElementById('resetFilters');
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Réinitialiser les filtres avancés
            document.getElementById('maxPrice').value = '';
            document.getElementById('smokingAllowed').checked = false;
            document.getElementById('petsAllowed').checked = false;
            document.getElementById('sortBy').value = 'date';
            document.getElementById('searchPlaces').value = '';
            
            // Relancer la recherche si on a des critères de base
            if (lastSearchParams.depart && lastSearchParams.destination && lastSearchParams.date) {
                performSearch(1);
            }
        });
    }
}

/**
 * Vérifier les paramètres URL et effectuer une recherche automatique
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const depart = urlParams.get('depart');
    const destination = urlParams.get('destination');
    const date = urlParams.get('date');
    const departPostcode = urlParams.get('departPostcode');
    const destinationPostcode = urlParams.get('destinationPostcode');

    if (depart && destination && date) {
        // Pré-remplir le formulaire
        searchDepartInput.value = depart;
        searchDestinationInput.value = destination;
        searchDateInput.value = date;
        
        // Stocker les codes postaux s'ils sont fournis
        if (departPostcode) {
            searchDepartInput.setAttribute('data-city-name', depart);
            searchDepartInput.setAttribute('data-postcode', departPostcode);
        }
        if (destinationPostcode) {
            searchDestinationInput.setAttribute('data-city-name', destination);
            searchDestinationInput.setAttribute('data-postcode', destinationPostcode);
        }
        
        // Effectuer la recherche automatiquement
        performSearch(1);
    }
}

/**
 * Effectuer une recherche de covoiturages
 */
async function performSearch(page = 1) {
    currentPage = page;
    
    // Récupérer les données de ville avec leurs codes postaux
    const departCityName = searchDepartInput.getAttribute('data-city-name') || searchDepartInput.value;
    const departPostcode = searchDepartInput.getAttribute('data-postcode') || '';
    const destinationCityName = searchDestinationInput.getAttribute('data-city-name') || searchDestinationInput.value;
    const destinationPostcode = searchDestinationInput.getAttribute('data-postcode') || '';
    
    // Collecter les données du formulaire
    const formData = new FormData(searchForm);
    const searchParams = {
        depart: departCityName,
        departPostcode: departPostcode,
        destination: destinationCityName,
        destinationPostcode: destinationPostcode,
        date: formData.get('date'),
        places: formData.get('places') || undefined,
        maxPrice: formData.get('maxPrice') || undefined,
        smokingAllowed: formData.get('smokingAllowed') === 'on' || undefined,
        petsAllowed: formData.get('petsAllowed') === 'on' || undefined,
//        sortBy: formData.get('sortBy') || 'date',
//        page: page,
//        limit: limitPerPage
    };

    // Valider les champs obligatoires
    if (!searchParams.depart || !searchParams.destination || !searchParams.date) {
        showValidationErrors(searchParams);
        return;
    }

    // Sauvegarder les paramètres pour pagination
    lastSearchParams = searchParams;

    // Afficher le loader
    showLoadingState();

    try {
        // Préparer les données pour la requête POST selon la structure attendue par l'API
        const requestBody = {
            startingAddress: {
                city: searchParams.depart,
                postcode: searchParams.departPostcode || ''
            },
            arrivalAddress: {
                city: searchParams.destination,
                postcode: searchParams.destinationPostcode || ''
            },
            startingAt: searchParams.date
        };

        // Ajouter les paramètres de pagination
        // Note: pagination non implémentée côté API pour le moment

        // Ajouter les paramètres optionnels s'ils sont définis
        if (searchParams.places) {
            requestBody.nbPlacesAvailable = parseInt(searchParams.places);
        }
        if (searchParams.maxPrice) {
            requestBody.maxPrice = parseFloat(searchParams.maxPrice);
        }
        if (searchParams.smokingAllowed) {
            requestBody.smokingAllowed = true;
        }
        if (searchParams.petsAllowed) {
            requestBody.petsAllowed = true;
        }
        // Note: tri non implémenté côté API pour le moment

        const response = await sendFetchRequest(
            `${apiUrl}ride/search`,
            getToken(),
            'POST',
            JSON.stringify(requestBody)
        );

        displaySearchResults(response);

    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        showErrorState(error);
    }
}

/**
 * Afficher les erreurs de validation
 */
function showValidationErrors(searchParams) {
    [searchDepartInput, searchDestinationInput, searchDateInput].forEach(input => {
        input.classList.remove('is-invalid', 'is-valid');
    });

    if (!searchParams.depart) {
        searchDepartInput.classList.add('is-invalid');
    }
    if (!searchParams.destination) {
        searchDestinationInput.classList.add('is-invalid');
    }
    if (!searchParams.date) {
        searchDateInput.classList.add('is-invalid');
    }
}

/**
 * Afficher l'état de chargement
 */
function showLoadingState() {
    if (initialMessage) {
        initialMessage.style.display = 'none';
    }
    
    searchResults.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Recherche en cours...</span>
            </div>
            <p class="mt-3">Recherche de covoiturages en cours...</p>
        </div>
    `;
    
    paginationContainer.innerHTML = '';
}

/**
 * Afficher les résultats de recherche
 */
function displaySearchResults(response) {
    
    // Vérifier la structure de la réponse avec message et rides
    if (!response?.message) {
        showErrorState('Réponse invalide de l\'API');
        return;
    }

    // Extraire les trajets depuis la propriété rides
    let rides = [];
    
    if (response.rides && Array.isArray(response.rides)) {
        // Nouvelle structure : response.rides contient directement les trajets
        rides = response.rides.map(item => ({
            ...item.ride,
            remainingSeats: item.remainingSeats
        }));
    }

    // Vérifier le message de l'API
    if (response.message !== "ok") {
        // Vérifier si c'est le message "aucun covoiturage trouvé" avec des suggestions
        if (response.message.includes("Aucun covoiturage trouvé à la date demandée")) {
            if (rides.length > 0) {
                // Il y a des trajets alternatifs à afficher avec un avertissement
                showResultsWithDateWarning(rides, response.message);
            } else {
                // Aucun trajet trouvé du tout
                showEmptyResultsWithDateWarning();
            }
        } else if (response.message.includes("Aucun covoiturage trouvé")) {
            showEmptyResults();
        } else {
            // Autre message d'erreur
            showErrorState(response.message);
        }
        return;
    }
    

    // Message "ok" - affichage normal des résultats
    if (rides.length === 0) {
        showEmptyResults();
        return;
    }

    // Construire le HTML des résultats
    displayRidesList(rides, null);
}

/**
 * Afficher les résultats avec un avertissement de date
 */
function showResultsWithDateWarning(rides, warningMessage) {
    const searchDate = document.getElementById('searchDate')?.value;
    const formattedDate = searchDate ? new Date(searchDate).toLocaleDateString('fr-FR') : 'la date sélectionnée';
    
    // Avertissement en haut
    let resultsHtml = `
        <div class="alert alert-warning mb-4">
            <div class="d-flex align-items-start">
                <i class="fas fa-exclamation-triangle me-3 mt-1"></i>
                <div>
                    <h6 class="alert-heading mb-2">Aucun covoiturage pour le ${formattedDate}</h6>
                    <p class="mb-2">Il n'y a pas de covoiturages disponibles pour cette date exacte.</p>
                    <small class="text-muted">Voici les covoiturages disponibles aux dates les plus proches :</small>
                </div>
            </div>
        </div>
    `;
    
    // Ajouter les résultats suggérés
    resultsHtml += `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>
                <i class="fas fa-lightbulb text-warning me-2"></i>
                ${rides.length} suggestion(s) aux dates proches
            </h5>
        </div>
        <div class="covoiturages-list">
    `;

    rides.forEach(ride => {
        resultsHtml += generateRideCard(ride);
    });

    resultsHtml += '</div>';
    
    searchResults.innerHTML = resultsHtml;

    // Ajouter les étoiles de notation pour chaque chauffeur
    rides.forEach(ride => {
        const gradeContainer = document.getElementById(`grade-${ride.id}`);
        if (gradeContainer && ride.driver.grade !== undefined) {
            // Utiliser la fonction existante du script.js
            setGradeStyle(ride.driver.grade, gradeContainer);
        }
    });

    // Ajouter les événements pour les boutons
    addRideCardEvents();

    paginationContainer.innerHTML = '';
}

/**
 * Afficher la liste des trajets (fonction commune)
 */
function displayRidesList(rides, headerMessage = null) {
    // Construire le HTML des résultats
    let resultsHtml = '';
    
    if (headerMessage) {
        resultsHtml += headerMessage;
    }
    
    resultsHtml += `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5>${rides.length} covoiturage(s) trouvé(s)</h5>
        </div>
        <div class="covoiturages-list">
    `;

    rides.forEach(ride => {
        resultsHtml += generateRideCard(ride);
    });

    resultsHtml += '</div>';
    
    searchResults.innerHTML = resultsHtml;

    // Ajouter les étoiles de notation pour chaque chauffeur
    rides.forEach(ride => {
        const gradeContainer = document.getElementById(`grade-${ride.id}`);
        if (gradeContainer && ride.driver.grade !== undefined) {
            // Utiliser la fonction existante du script.js
            setGradeStyle(ride.driver.grade, gradeContainer);
        }
    });

    // Ajouter les événements pour les boutons
    addRideCardEvents();

    // Pour l'instant, pas de pagination car l'API ne semble pas la retourner
    paginationContainer.innerHTML = '';
}

/**
 * Générer le HTML d'une carte de covoiturage
 */
function generateRideCard(ride) {
    const remainingPlaces = calculateRemainingPlaces(ride);
    const isExpired = isRideExpired(ride);
    const cardClasses = `card mb-3 shadow-sm ${isExpired ? 'covoiturage-expired' : ''}`;

    return `
        <div class="${cardClasses}">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <div class="driver-info d-flex align-items-center mb-2">
                            <img src="${url}uploads/photos/${ride.driver.photo}" alt="${ride.driver.pseudo}" 
                                 class="rounded-circle me-2" width="40" height="40">
                            <div>
                                <div>Chauffeur: ${ride.driver.pseudo}</div>
                                <div class="driver-grade" id="grade-${ride.id}"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-5">
                        <div class="mb-2">
                            <i class="fas fa-map-marker-alt text-success me-2"></i>
                            <strong>Départ:</strong> ${ride.startingCity}
                            <small class="text-muted ms-2">${formatDateTime(ride.startingAt)}</small>
                        </div>
                        <div>
                            <i class="fas fa-flag-checkered text-danger me-2"></i>
                            <strong>Arrivée:</strong> ${ride.arrivalCity}
                            <small class="text-muted ms-2">${formatDateTime(ride.arrivalAt)}</small>
                        </div>
                    </div>
                    
                    <div class="col-md-2">
                        <div class="mb-2">
                            <i class="fas fa-car me-2"></i>${ride.vehicle.brand} ${ride.vehicle.model}
                        </div>
                        <div>
                            <i class="fas fa-user me-1"></i> 
                            ${remainingPlaces} place(s) disponible(s)
                        </div>
                    </div>
                    
                    <div class="col-md-2 text-md-end">
                        <div class="mb-2">
                            <strong class="text-primary">
                                ${ride.price} 
                                <img src="/images/logo_credit_light.png" alt="Crédit" class="img-fluid" style="width: 20px; height: 20px;">
                            </strong>
                        </div>
                        <div class="d-flex flex-column gap-1">
                            <button type="button" class="btn btn-sm btn-outline-primary view-ride-btn" data-ride-id="${ride.id}">
                                <i class="fas fa-eye me-1"></i>Voir détails
                            </button>
                            ${!isExpired && remainingPlaces > 0 ? `
                                <button type="button" class="btn btn-sm btn-primary join-ride-btn" data-ride-id="${ride.id}">
                                    <i class="fas fa-plus me-1"></i>Je m'inscris
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Ajouter les événements pour les cartes de covoiturage
 */
function addRideCardEvents() {
    // Boutons "Voir détails"
    document.querySelectorAll('.view-ride-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const rideId = btn.getAttribute('data-ride-id');
            
            try {
                const response = await sendFetchRequest(`${apiUrl}ride/show/${rideId}`, getToken(), 'GET');
                covoiturageModal.show('passenger-view', response);
            } catch (error) {
                console.error('Erreur lors de la récupération des détails:', error);
            }
        });
    });

    // Boutons "Je m'inscris"
    document.querySelectorAll('.join-ride-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const rideId = btn.getAttribute('data-ride-id');
            
            // Confirmer l'inscription
            if (!confirm('Êtes-vous sûr de vouloir vous inscrire à ce covoiturage ?')) {
                return;
            }
            
            // Désactiver le bouton pendant le traitement
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Inscription...';
            
            try {
                await sendFetchRequest(
                    `${apiUrl}ride/${rideId}/addUser`,
                    getToken(),
                    'POST'
                );
                
                // Afficher un message de succès
                alert('Inscription réussie ! Vous êtes maintenant inscrit à ce covoiturage.');
                
                // Relancer la recherche pour actualiser les résultats
                performSearch(currentPage);
                
            } catch (error) {
                console.error('Erreur lors de l\'inscription:', error);
                
                // Réactiver le bouton
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-plus me-1"></i>Je m\'inscris';
                
                // Afficher l'erreur
                const errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription.';
                alert(`Erreur: ${errorMessage}`);
            }
        });
    });
}

/**
 * Afficher l'état de résultats vides
 */
function showEmptyResults() {
    searchResults.innerHTML = `
        <div class="text-center py-5">
            <div class="mb-4">
                <i class="fas fa-search text-muted" style="font-size: 4rem;"></i>
            </div>
            <h4 class="text-muted mb-3">Aucun covoiturage trouvé</h4>
            <p class="text-muted mb-4">
                Aucun covoiturage ne correspond à vos critères de recherche.
                <br>
                Essayez de modifier vos critères ou vos dates.
            </p>
        </div>
    `;
    
    paginationContainer.innerHTML = '';
}

/**
 * Afficher l'avertissement pour aucun covoiturage à la date demandée (sans suggestions)
 */
function showEmptyResultsWithDateWarning() {
    const searchDate = document.getElementById('searchDate')?.value;
    const formattedDate = searchDate ? new Date(searchDate).toLocaleDateString('fr-FR') : 'la date sélectionnée';
    
    searchResults.innerHTML = `
        <div class="text-center py-5">
            <div class="mb-4">
                <i class="fas fa-calendar-times text-warning" style="font-size: 4rem;"></i>
            </div>
            <h4 class="text-warning mb-3">Aucun covoiturage disponible</h4>
            <div class="alert alert-warning mx-auto" style="max-width: 500px;">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Aucun covoiturage trouvé pour le ${formattedDate}</strong>
            </div>
            <p class="text-muted mb-4">
                Il n'y a pas de covoiturages disponibles pour cette date sur ce trajet,<br>
                et aucune alternative n'a été trouvée aux dates proches.
                <br><br>
                Essayez de sélectionner une autre date ou modifiez vos critères de recherche.
            </p>
            <div class="d-flex justify-content-center gap-2">
                <button class="btn btn-outline-primary" onclick="document.getElementById('searchDate').showPicker()">
                    <i class="fas fa-calendar-alt me-2"></i>Choisir une autre date
                </button>
                <button class="btn btn-outline-secondary" onclick="location.reload()">
                    <i class="fas fa-redo me-2"></i>Nouvelle recherche
                </button>
            </div>
        </div>
    `;
    
    paginationContainer.innerHTML = '';
}

/**
 * Afficher l'état d'erreur
 */
function showErrorState(error) {
    searchResults.innerHTML = `
        <div class="text-center py-5">
            <div class="mb-4">
                <i class="fas fa-exclamation-triangle text-danger" style="font-size: 4rem;"></i>
            </div>
            <h4 class="text-danger mb-3">Erreur lors de la recherche</h4>
            <p class="text-muted">
                Une erreur est survenue lors de la recherche de covoiturages.
                <br>
                Veuillez réessayer plus tard.
            </p>
        </div>
    `;
    
    paginationContainer.innerHTML = '';
}

/**
 * Afficher la pagination
 */
function displayPagination(pagination) {
    const currentPage = parseInt(pagination.page_courante);
    const totalPages = parseInt(pagination.pages_totales);
    
    let paginationHtml = `
        <nav aria-label="Navigation des résultats de recherche" class="mt-4">
            <ul class="pagination justify-content-center">
    `;
    
    // Bouton précédent
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    paginationHtml += `
        <li class="page-item ${prevDisabled}">
            <button class="page-link" onclick="performSearch(${currentPage - 1})" ${prevDisabled ? 'disabled' : ''}>
                Précédent
            </button>
        </li>
    `;
    
    // Pages numérotées
    for (let i = 1; i <= totalPages; i++) {
        const active = i === currentPage ? 'active' : '';
        paginationHtml += `
            <li class="page-item ${active}">
                <button class="page-link" onclick="performSearch(${i})" ${active ? 'disabled' : ''}>
                    ${i}
                </button>
            </li>
        `;
    }
    
    // Bouton suivant
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    paginationHtml += `
        <li class="page-item ${nextDisabled}">
            <button class="page-link" onclick="performSearch(${currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>
                Suivant
            </button>
        </li>
    `;
    
    paginationHtml += `
            </ul>
        </nav>
    `;
    
    paginationContainer.innerHTML = paginationHtml;
}

// Fonctions utilitaires (reprises des autres modules)

function calculateRemainingPlaces(ride) {
    // Si on a la propriété remainingSeats directement depuis l'API, l'utiliser
    if (ride.remainingSeats !== undefined) {
        return ride.remainingSeats;
    }
    
    // Sinon, calculer comme avant
    const totalAvailable = ride.nbPlacesAvailable || 0;
    const passengerCount = getPassengerCount(ride);
    return Math.max(0, totalAvailable - passengerCount);
}

function getPassengerCount(ride) {
    const passagers = ride.passenger;
    if (passagers && Array.isArray(passagers)) {
        return passagers.length;
    }
    return ride.bookedPlaces || 0;
}

function isRideExpired(ride) {
    const rideDate = new Date(ride.startingAt);
    const today = new Date();
    const rideDateOnly = new Date(rideDate.getFullYear(), rideDate.getMonth(), rideDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return rideDateOnly < todayOnly || ride.status === 'FINISHED' || ride.status === 'CANCELED';
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} à ${hours}:${minutes}`;
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'COMING':
            return 'bg-primary';
        case 'FINISHED':
            return 'bg-success';
        case 'CANCELED':
            return 'bg-danger';
        case 'AWAITINGVALIDATION':
            return 'bg-warning';
        case 'BADEXP':
            return 'bg-info';
        default:
            return 'bg-secondary';
    }
}

function getStatusLabel(status) {
    switch (status) {
        case 'COMING':
            return 'À venir';
        case 'FINISHED':
            return 'Terminé';
        case 'CANCELED':
            return 'Annulé';
        case 'AWAITINGVALIDATION':
            return 'En attente de validation';
        case 'BADEXP':
            return 'En cours d\'examen';
        default:
            return status;
    }
}

// Rendre les fonctions globales pour les boutons de pagination
window.performSearch = performSearch;

// Initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialize());
} else {
    initialize();
}
