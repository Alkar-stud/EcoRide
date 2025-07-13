//Module pour les fonctions utilitaires et les constantes des covoiturages
import { apiUrl } from '../config.js'; // Import direct depuis config.js
import { getToken, sendFetchRequest } from '../script.js'; // Import des fonctions utilitaires
import covoiturageModal from './covoiturage-modal.js'; // Import de la modale unifiée
import { displayCovoiturages } from './mescovoiturages.js';
import { DEFAULT_STATE, STATES_LABELS, STATES_COLORS } from './mescovoiturages-const.js';




// Fonction pour formater la date et l'heure
function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} à ${hours}:${minutes}`;
}


// Fonction pour vérifier si une date est passée
function isDatePassed(dateTimeString) {
    const rideDate = new Date(dateTimeString);
    const today = new Date();
    
    // Réinitialiser l'heure à 00:00:00 pour ne comparer que les dates
    const rideDateOnly = new Date(rideDate.getFullYear(), rideDate.getMonth(), rideDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return rideDateOnly < todayOnly;
}



//Pour vérifier si une date est aujourd'hui sans tenir compte de l'heure
function isToday(dateTimeString) {
    const date = new Date(dateTimeString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}



// Fonction pour obtenir la classe de badge selon le statut
function getStatusBadgeClass(status) {
    // On récupère la couleur du bouton et on la transforme en badge Bootstrap
    const colorClass = STATES_COLORS[status];
    if (!colorClass) return 'bg-secondary';
    // On remplace 'btn-' par 'bg-' pour correspondre aux classes badge Bootstrap
    return colorClass.replace('btn-', 'bg-');
}


// Fonction pour obtenir le libellé du statut
function getStatusLabel(status) {
    return STATES_LABELS[status] || status;
}


// Fonction pour calculer le nombre de places restantes
function calculateRemainingPlaces(covoiturage) {
    // Calcul: places disponibles - nombre de passagers inscrits
    const totalAvailable = covoiturage.nbPlacesAvailable || 0;
    const passengerCount = getPassengerCount(covoiturage);
    const remaining = totalAvailable - passengerCount;
    
    return Math.max(0, remaining); // S'assurer que ce n'est jamais négatif
}


// Fonction pour compter les passagers
function getPassengerCount(covoiturage) {
    const passagers = covoiturage.passenger;
    
    if (passagers && Array.isArray(passagers)) {
        return passagers.length;
    }
    
    // Fallback sur bookedPlaces si disponible
    return covoiturage.bookedPlaces || 0;
}


// Fonction pour générer la pagination
function renderPagination(container, pagination, type) {
    // Convertir en nombres pour éviter les comparaisons de chaînes
    const currentPage = parseInt(pagination.page_courante);
    const totalPages = parseInt(pagination.pages_totales);
    
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container mt-4';
    
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', `Navigation des covoiturages ${type}`);
    
    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';
    
    // Bouton précédent
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    
    const prevLink = document.createElement('button');
    prevLink.className = 'page-link';
    prevLink.textContent = 'Précédent';
    prevLink.type = 'button';
    
    if (currentPage > 1) {
        prevLink.onclick = function() {
            displayCovoiturages(type, currentPage - 1);
            return false;
        };
    } else {
        prevLink.disabled = true;
    }
    
    prevLi.appendChild(prevLink);
    ul.appendChild(prevLi);
    
    // Pages numérotées
    for (let i = 1; i <= totalPages; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        
        const pageLink = document.createElement('button');
        pageLink.className = 'page-link';
        pageLink.textContent = i;
        pageLink.type = 'button';
        
        if (i !== currentPage) {
            pageLink.onclick = function() {
                displayCovoiturages(type, i);
                return false;
            };
        } else {
            pageLink.disabled = true;
        }
        
        pageLi.appendChild(pageLink);
        ul.appendChild(pageLi);
    }
    
    // Bouton suivant
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    
    const nextLink = document.createElement('button');
    nextLink.className = 'page-link';
    nextLink.textContent = 'Suivant';
    nextLink.type = 'button';
    
    if (currentPage < totalPages) {
        nextLink.onclick = function() {
            displayCovoiturages(type, currentPage + 1);
            return false;
        };
    } else {
        nextLink.disabled = true;
    }
    
    nextLi.appendChild(nextLink);
    ul.appendChild(nextLi);
    
    nav.appendChild(ul);
    paginationContainer.appendChild(nav);
    container.appendChild(paginationContainer);
}


// Fonction pour afficher un message d'encouragement quand il n'y a pas de covoiturages
function showEmptyStateMessage(container, type, state) {
    // Créer le message vide dans un div séparé pour ne pas écraser les boutons de filtrage
    const emptyStateDiv = document.createElement('div');
    
    if (type === 'driver') {
    emptyStateDiv.innerHTML = `
            <div class="text-center py-5">
                <div class="mb-4">
                    <i class="fas fa-car text-muted" style="font-size: 4rem;"></i>
                </div>
                <h4 class="text-muted mb-3">Aucun covoiturage trouvé pour ce filtre</h4>
                <p class="text-muted mb-4">
                    Essayez un autre filtre ou proposez un nouveau covoiturage !
                </p>
                ${state === DEFAULT_STATE ? `
                    <button class="btn btn-primary btn-lg mx-auto d-block" id="proposerCovoiturageBtn">
                        <i class="fas fa-plus me-2"></i>Proposer un covoiturage
                    </button>
                ` : ''}
            </div>
        `;
     
        container.appendChild(emptyStateDiv);


        // Ajouter l'événement pour ouvrir la modale seulement si le bouton existe (filtre 'coming')
        if (state === 'coming') {
            document.getElementById('creerPremierCovoiturage').addEventListener('click', () => {
                covoiturageModal.show('create', null, {
                    showEncouragement: true,
                    onSuccess: () => {
                        // Recharger les covoiturages chauffeur après création
                        displayCovoiturages('driver', 1);
                    }
                });
            });
        }
    } else {
        emptyStateDiv.innerHTML = `
            <div class="text-center py-5">
                <div class="mb-4">
                    <i class="fas fa-users text-muted" style="font-size: 4rem;"></i>
                </div>
                <h4 class="text-muted mb-3">Vous n'avez pas encore réservé de covoiturage</h4>
                <p class="text-muted mb-4">
                    Recherchez des trajets disponibles et rejoignez la communauté EcoRide !
                </p>
                <a href="/searchcovoiturages" class="btn btn-primary btn-lg">
                    <i class="fas fa-search me-2"></i>Rechercher un covoiturage
                </a>
            </div>
        `;
        
        container.appendChild(emptyStateDiv);
    }
}


/**
 * Fonction pour rejoindre un covoiturage
 * Utilisée à la fois par le bouton "Je m'inscris" des cartes et "Rejoindre ce covoiturage" de la modale
 */
async function joinRide(rideId, button = null, fromModal = false) {
    // Vérifier si l'utilisateur est connecté
    if (!getToken()) {
        // Afficher la modale de connexion au lieu de l'alerte
        showLoginRequiredModal(rideId, fromModal);
        return false;
    }

    // Confirmer l'inscription
    if (!confirm('Êtes-vous sûr de vouloir vous inscrire à ce covoiturage ?')) {
        return false;
    }
    
    // État de chargement sur le bouton si fourni
    let originalButtonHtml = '';
    if (button) {
        originalButtonHtml = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Inscription...';
    }

    try {
        const response = await sendFetchRequest(
            `${apiUrl}ride/${rideId}/addUser`,
            getToken(),
            'PUT'
        );
        
        if (!response || response.error) {
            alert(response?.message || 'Une erreur est survenue lors de l\'inscription.');
            return false;
        }
        
        // Afficher un message de succès
        alert('Inscription réussie ! Vous êtes maintenant inscrit à ce covoiturage.');
        
        // Optionnellement relancer la recherche pour actualiser les résultats
        if (typeof performSearch === 'function') {
            // Vérifier si currentPage est définie avant de l'utiliser
            const page = typeof currentPage !== 'undefined' ? currentPage : 1;
            performSearch(page);
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        
        // Afficher l'erreur
        const errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription.';
        alert(`Erreur: ${errorMessage}`);
        return false;
    } finally {
        // Restaurer l'état du bouton si fourni
        if (button && originalButtonHtml) {
            button.disabled = false;
            button.innerHTML = originalButtonHtml;
        }
    }
}

// Rendre la fonction disponible globalement pour la modale
window.joinRide = joinRide;

/**
 * Affiche une modale de connexion lorsque l'utilisateur tente de s'inscrire à un covoiturage sans être connecté
 * @param {string} rideId - L'identifiant du covoiturage
 * @param {boolean} fromModal - Indique si l'appel vient de la modale de détails de covoiturage
 */
function showLoginRequiredModal(rideId, fromModal = false) {
    // Sauvegarder l'intention de l'utilisateur dans le localStorage
    localStorage.setItem('pendingRideJoin', JSON.stringify({
        rideId: rideId,
        fromModal: fromModal,
        timestamp: new Date().getTime()
    }));
    
    // Vérifier si une modale existante est déjà présente
    let existingModal = document.getElementById('loginRequiredModal');
    if (existingModal) {
        // Si la modale existe déjà, on la supprime pour éviter les doublons
        existingModal.remove();
    }
    
    // Créer la modale de connexion
    const modalHTML = `
    <div class="modal fade" id="loginRequiredModal" tabindex="-1" aria-labelledby="loginRequiredModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title" id="loginRequiredModalLabel">Connexion requise</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fermer"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center mb-4">
                        <i class="fas fa-user-lock fa-3x text-primary mb-3"></i>
                        <p class="lead">Vous devez être connecté pour vous inscrire à ce covoiturage.</p>
                    </div>
                    <div class="d-grid gap-2">
                        <a href="/signin?returnTo=${encodeURIComponent(window.location.href)}" class="btn btn-primary">
                            <i class="fas fa-sign-in-alt me-2"></i>Se connecter
                        </a>
                        <a href="/signup?returnTo=${encodeURIComponent(window.location.href)}" class="btn btn-outline-primary">
                            <i class="fas fa-user-plus me-2"></i>Créer un compte
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Ajouter la modale au DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Récupérer la référence à la modale
    const loginModal = document.getElementById('loginRequiredModal');
    
    // Initialiser la modale Bootstrap
    const modal = new bootstrap.Modal(loginModal);
    
    // Afficher la modale
    modal.show();
    
    // Supprimer la modale du DOM lorsqu'elle est fermée
    loginModal.addEventListener('hidden.bs.modal', function() {
        loginModal.remove();
    });
}

// Ajouter la fonction à l'export
export { 
    // ...autres exports
    showLoginRequiredModal,
};

// Initialiser le bouton de création principal
function initializeButton(NomBouton) {
    const createBtns = document.querySelectorAll(`#${NomBouton}`);
    createBtns.forEach(createBtn => {
        createBtn.style.display = 'block';
        createBtn.addEventListener('click', (e) => {
            e.preventDefault();
            covoiturageModal.show('create', null, {
                onSuccess: () => {
                    displayCovoiturages(currentTab, currentTab === 'driver' ? currentPageDriver : currentPagePassenger);
                }
            });
        });
    });
}


/**
 * Configurer la restriction de date pour empêcher la sélection de dates passées
 */
async function setupDateRestriction(dateInput) {
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

    //Définir la date par défaut à aujourd'hui
    dateInput.value = todayString;
    
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


// Export des fonctions utilitaires
export { 
    formatDateTime,
    isDatePassed,
    isToday,
    getStatusBadgeClass,
    getStatusLabel,
    calculateRemainingPlaces,
    getPassengerCount,
    renderPagination,
    showEmptyStateMessage,
    joinRide,
    initializeButton,
    setupDateRestriction
};
