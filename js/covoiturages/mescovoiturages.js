// Module pour gérer les covoiturages de l'utilisateur
import { apiUrl, url } from '../config.js';
import { getToken, sendFetchRequest, getUserInfo } from '../script.js';
import covoiturageModal from './covoiturage-modal.js'; // Import de la modale unifiée
import { 
    formatDateTime, 
    isDatePassed, 
    isToday,
    getStatusBadgeClass,
    getStatusLabel,
    calculateRemainingPlaces,
    getPassengerCount,
    renderPagination,
    showEmptyStateMessage,
    initializeButton,
    // Import des constantes
    STATES_LABELS,
    STATES_COLORS,
    STATES_TRANSITIONS,
    DEFAULT_STATE,
    STATES_ORDER
} from './mescovoiturages-utils.js'; // Import des fonctions utilitaires et des constantes pour alléger ce fichier


// Variables pour stocker les pages courantes
let currentPageDriver = 1;
let currentPagePassenger = 1;
let limitPerPage = 5;
let currentStatusDriver = DEFAULT_STATE; // Statut par défaut pour les covoiturages chauffeur
let currentStatusPassenger = DEFAULT_STATE;
let currentTab = 'driver'; // Onglet par défaut


// Initialisation
async function initialize() {
    // Récupérer les rôles utilisateur AVANT de charger les covoiturages
    const userInfo = await getUserInfo();
    const userRoles = {
        isDriver: userInfo?.isDriver,
        isPassenger: userInfo?.isPassenger
    };
    // Charger les covoiturages
    const covoiturages = await fetchCovoiturages();
    window.covoiturages = covoiturages;


    // Charger les covoiturages chauffeur par défaut
    if (userRoles.isDriver) {
        currentTab = 'driver';
    } else {
        currentTab = 'passenger';
    }

    initializeTabs(userRoles, currentTab);
    if (userRoles.isDriver) {
        initializeButton('proposerCovoiturageBtn');
    }
}


// Fonction pour récupérer les covoiturages depuis l'API
async function fetchCovoiturages(state = DEFAULT_STATE, page = 1) {
    try {
        let endpoint;
        
        if (state === 'all') {
            // Récupérer tous les covoiturages sans filtre de statut
            endpoint = apiUrl + 'ride/list/all?page=' + page + '&limit=' + limitPerPage;
        } else {
            endpoint = apiUrl + 'ride/list/' + state + '?page=' + page + '&limit=' + limitPerPage;
        }
        
        const data = await sendFetchRequest(endpoint, getToken(), 'GET', null, false, true);
        return data;
    } catch (error) {
        // Pour toutes les autres erreurs, les afficher et retourner un résultat vide
        console.error(`Erreur lors de la récupération des covoiturages ${type}:`, error);
        return { rides: [], pagination: {} };
    }
}


// Fonction pour récupérer les données d'un covoiturage
async function fetchCovoiturageData(covoiturageId) {
    try {
        const response = await sendFetchRequest(`${apiUrl}ride/show/${covoiturageId}`, getToken(), 'GET');
        return response;
    } catch (error) {
        console.error('Erreur lors de la récupération des données du covoiturage:', error);
        throw error;
    }
}



// Gestion des événements d'onglets
function initializeTabs(userRoles, currentTab = 'driver') {
    //Titre des onglets
    const driverTab = document.getElementById('driver-tab');
    const passengerTab = document.getElementById('passenger-tab');
    //Contenu des onglets
    const driverTabContent = document.getElementById('driver');
    const passengerTabContent = document.getElementById('passenger');

    let currentStatus = currentStatusDriver;

    if (driverTab && userRoles.isDriver) {
        driverTab.addEventListener('click', function() {
            currentTab = 'driver';
            driverTab.classList.add('active');
            passengerTab.classList.remove('active');
            driverTabContent.classList.add('show', 'active');
            passengerTabContent.classList.remove('show', 'active');
            displayCovoiturages('driver', 1, currentStatusDriver, userRoles, window.covoiturages);
        });
        currentStatus = currentStatusDriver;
    }
    
    if (passengerTab && userRoles.isPassenger) {
        passengerTab.addEventListener('click', function() {
            currentTab = 'passenger';
            passengerTab.classList.add('active');
            driverTab.classList.remove('active');
            passengerTabContent.classList.add('show', 'active');
            driverTabContent.classList.remove('show', 'active');
            displayCovoiturages('passenger', 1, currentStatusPassenger, userRoles, window.covoiturages);
        });
        currentStatus = currentStatusPassenger;
    }

    //L'onglet driver est actif par défaut, si l'utilisateur est passager uniquement,
    // on retire active de driverTab pour le mettre sur passengerTab
    if (userRoles.isPassenger && !userRoles.isDriver) {
        driverTab.classList.remove('active');
        passengerTab.classList.add('active');
        driverTabContent.classList.remove('active', 'show');
        passengerTabContent.classList.add('active', 'show');
        currentTab = 'passenger';
        currentStatus = currentStatusPassenger;
    }

    //Les onglets ne sont affichés que si l'utilisateur est chauffeur ET passager
    if (userRoles.isPassenger && userRoles.isDriver) {
        driverTab.style.display = 'block';
        passengerTab.style.display = 'block';
    }

    displayCovoiturages(currentTab, 1, currentStatus, userRoles, window.covoiturages);
}



// Fonction principale pour afficher les covoiturages
async function displayCovoiturages(type = 'driver', page = 1, status = null, userRoles = { isDriver: false, isPassenger: false }, resultRecupCovoiturages = null) {
    if (!resultRecupCovoiturages) {
        resultRecupCovoiturages = await fetchCovoiturages(status, page);
    }

    // Mettre à jour le statut courant pour le chauffeur si fourni
    if (status !== null) {
        if (type === 'driver') currentStatusDriver = status;
        else currentStatusPassenger = status;
    }

    // Mettre à jour la page courante selon le type
    if (type === 'driver') {
        currentPageDriver = page;
    } else {
        currentPagePassenger = page;
    }
    
    // Mettre à jour l'onglet courant et l'exposer globalement
    currentTab = type;
    window.currentTab = type;
    window.currentPageDriver = currentPageDriver;
    window.currentPagePassenger = currentPagePassenger;

    
    // Sélectionner le bon conteneur selon le type
    const containerClass = type === 'driver' ? '.allcovoiturages-driver' : '.allcovoiturages-passenger';
    const container = document.querySelector(containerClass);

    if (!container) {
        console.error(`Conteneur ${containerClass} non trouvé`);
        return;
    }
    
    try {
        // Récupérer les données avec le bon type et statut
        let actualStatus;
        if (status !== null) {
            actualStatus = status;
        } else if (type === 'driver') {
            actualStatus = currentStatusDriver;
        } else {
            actualStatus = DEFAULT_STATE;
        }
        
        let covoiturages = [];
        if (type === 'driver') {
            covoiturages = resultRecupCovoiturages.driverRides;
    
        } else {
            covoiturages = resultRecupCovoiturages.passengerRides;
        }

        // Vider le conteneur
        container.innerHTML = '';

        // Ajouter les boutons de filtrage pour l'onglet chauffeur ou passager
        createStatusFilterButtons(container, type, userRoles);

        // Si aucun covoiturage, afficher le message vide
        if (covoiturages.length === 0) {
            showEmptyStateMessage(container, type, actualStatus);
            return;
        }
        
        // Créer une liste pour les covoiturages
        const covoituragesList = document.createElement('div');
        covoituragesList.className = 'covoiturages-list';
        
        // Ajouter chaque covoiturage
        covoiturages.forEach(covoiturage => {
            const covoiturageItem = document.createElement('div');
            
            // Vérifier si la date est passée pour les covoituragesen statut COMING pour appliquer la classe CSS
            const isPassed = isDatePassed(covoiturage.startingAt);
            const isExpired = isPassed && covoiturage.status === 'COMING';
            const cardClasses = `card mb-3 shadow-sm ${isExpired ? 'covoiturage-expired' : ''}`;
            
            covoiturageItem.className = cardClasses;
            
            // Adapter l'affichage selon le type
            let driverInfo;
            let vehicleInfo;
            
            if (type === 'passenger') {
                // Pour un passager, afficher les infos du chauffeur
                driverInfo = `
                    <div class="driver-info d-flex align-items-center mb-2">
                        <img src="${url}/uploads/photos/${covoiturage.driver.photo}" alt="${covoiturage.driver.pseudo}" 
                             class="rounded-circle me-2" width="40" height="40">
                        <span>Chauffeur: ${covoiturage.driver.pseudo}</span>
                    </div>`;
                
                // Afficher les infos du véhicule du chauffeur
                vehicleInfo = `
                    <div class="mb-2">
                        <i class="fas fa-car me-2"></i>${covoiturage.vehicle.brand} ${covoiturage.vehicle.model}
                    </div>
                    <div>
                        <i class="fas fa-user me-1"></i> 
                        Places réservées: ${getPassengerCount(covoiturage)}
                    </div>`;
            } else {
                // Pour un chauffeur, indiquer son rôle
                driverInfo = `
                    <div class="driver-info mb-2">
                        <i class="fas fa-user-tie me-2"></i>
                        <span>Vous êtes le chauffeur</span>
                    </div>`;
                
                // Afficher les infos de son véhicule
                vehicleInfo = `
                    <div class="mb-2">
                        <i class="fas fa-car me-2"></i>${covoiturage.vehicle.brand} ${covoiturage.vehicle.model}
                    </div>
                    <div>
                        <i class="fas fa-user me-1"></i> 
                        ${calculateRemainingPlaces(covoiturage)} places restantes sur ${covoiturage.nbPlacesAvailable}
                    </div>`;
            }
            covoiturageItem.innerHTML = `
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            ${driverInfo}
                            <span class="badge ${getStatusBadgeClass(covoiturage.status)}">${getStatusLabel(covoiturage.status)}</span>
                        </div>
                        
                        <div class="col-md-5">
                            <div class="mb-2">
                                <i class="fas fa-map-marker-alt text-success me-2"></i>
                                <strong>Départ:</strong> ${covoiturage.startingCity}
                                <small class="text-muted ms-2">${formatDateTime(covoiturage.startingAt)}</small>
                            </div>
                            <div>
                                <i class="fas fa-flag-checkered text-danger me-2"></i>
                                <strong>Arrivée:</strong> ${covoiturage.arrivalCity}
                                <small class="text-muted ms-2">${formatDateTime(covoiturage.arrivalAt)}</small>
                            </div>
                        </div>
                        
                        <div class="col-md-2">
                            ${vehicleInfo}
                        </div>
                        
                        <div class="col-md-2 text-md-end">
                            <div class="mb-2">
                                <strong class="text-primary">
                                    ${type === 'passenger' ? (covoiturage.totalPrice || covoiturage.price) : covoiturage.price} 
                                    <img src="/images/logo_credit_light.png" alt="Crédit" class="img-fluid" style="width: 20px; height: 20px;">
                                </strong>
                            </div>
                            <div class="d-flex flex-column gap-1">
                                ${type === 'driver' && covoiturage.status === 'COMING' && isToday(covoiturage.startingAt) ? `
                                    <button class="btn btn-sm btn-outline-secondary start-covoiturage-btn" data-covoiturage-id="${covoiturage.id}">
                                        <i class="fas fa-play me-1"></i>Démarrer
                                    </button>
                                ` : ''}
                                ${covoiturage.status === 'PROGRESSING' ? `
                                    <button class="btn btn-sm btn-outline-danger stop-covoiturage-btn" data-covoiturage-id="${covoiturage.id}">
                                        <i class="fas fa-stop me-1"></i>Bien arrivé
                                    </button>
                                ` : ''}
                                ${type === 'driver' && covoiturage.status === 'COMING' ? `
                                    <button class="btn btn-sm btn-outline-warning modifier-covoiturage-btn" data-covoiturage-id="${covoiturage.id}">
                                        <i class="fas fa-edit me-1"></i>Modifier
                                    </button>
                                ` : ''}
                                ${type === 'passenger' ? `
                                    <button class="btn btn-sm btn-outline-primary view-covoiturage-btn" data-covoiturage-id="${covoiturage.id}">
                                        <i class="fas fa-eye me-1"></i>Voir détails
                                    </button>
                                ` : ''}
                                ${type === 'passenger' && covoiturage.status === 'VALIDATIONPROCESSING' ? `
                                    <button class="btn btn-sm btn-outline-success validate-covoiturage-btn" data-covoiturage-id="${covoiturage.id}">
                                        <i class="fas fa-check me-1"></i>Valider
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            covoituragesList.appendChild(covoiturageItem);
        });
        
        container.appendChild(covoituragesList);

        // Ajouter les événements pour les boutons de modification
        const modifierBtns = container.querySelectorAll('.modifier-covoiturage-btn');
        modifierBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const covoiturageId = btn.getAttribute('data-covoiturage-id');
                
                try {
                    const covoiturageData = await fetchCovoiturageData(covoiturageId);
                    covoiturageModal.show('edit', covoiturageData, {
                        onSuccess: () => {
                            // Recharger les covoiturages après modification/suppression
                            displayCovoiturages(type, type === 'driver' ? currentPageDriver : currentPagePassenger);
                        }
                    });
                } catch (error) {
                    console.error('Erreur lors de l\'ouverture de la modale de modification:', error);
                }
            });
        });

        // Ajouter les événements pour les boutons de validation
        const validationBtns = container.querySelectorAll('.validate-covoiturage-btn');
        validationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const rideId = btn.getAttribute('data-covoiturage-id');
                openValidationModal(rideId);
            });
        });

        // Ajouter les événements pour les boutons de détails
        const startCovoiturageBtns = container.querySelectorAll('.start-covoiturage-btn');
        startCovoiturageBtns.forEach(btn => handleCovoiturageAction(btn, 'start', type));

        const stopCovoiturageBtns = container.querySelectorAll('.stop-covoiturage-btn');
        stopCovoiturageBtns.forEach(btn => handleCovoiturageAction(btn, 'stop', type));

        const viewBtns = container.querySelectorAll('.view-covoiturage-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const covoiturageId = btn.getAttribute('data-covoiturage-id');
                
                try {
                    const covoiturageData = await fetchCovoiturageData(covoiturageId);
                    covoiturageModal.show('passenger-view', covoiturageData);
                } catch (error) {
                    console.error('Erreur lors de l\'ouverture de la modale de détails:', error);
                }
            });
        });

        // Ajouter la pagination si nécessaire
        if (resultRecupCovoiturages.pagination && resultRecupCovoiturages.pagination.pages_totales > 1) {
            renderPagination(container, resultRecupCovoiturages.pagination, type);
        }

    } catch (error) {
        console.error('Erreur lors de l\'affichage des covoiturages:', error);
        
        // Message d'erreur différent selon le type
        let errorMessage = 'Une erreur est survenue lors du chargement des covoiturages.';
        if (type === 'passenger') {
            errorMessage = 'Une erreur est survenue lors du chargement de vos réservations. Cette fonctionnalité n\'est peut-être pas encore disponible.';
        }
        
        container.innerHTML = `<div class="alert alert-danger mt-4">${errorMessage}</div>`;
    }
}



// Fonction utilitaire pour activer l'onglet/statut après une action
function activateTabAfterAction(action, type) {
    const transition = STATES_TRANSITIONS[action];
    if (!transition) return;

    // On force le filtre sur le statut
    if (type === 'driver') {
        currentStatusDriver = transition.become.toUpperCase();
        displayCovoiturages('driver', 1, currentStatusDriver);
    } else {
        currentStatusPassenger = transition.become.toUpperCase();
        displayCovoiturages('passenger', 1, currentStatusPassenger);
    }
}



// Fonction pour créer et afficher les boutons de filtrage par statut
function createStatusFilterButtons(container, type, userRoles) {
    const filterContainer = document.createElement('div');
    filterContainer.className = 'mb-3';

    // Statut sélectionné actuellement
    let statusToShow = (type === 'driver' ? currentStatusDriver : window.currentStatusPassenger) || DEFAULT_STATE;

    //Pour le type 'driver', s'il y a un covoiturage en cours, on affiche 'PROGRESSING'
    if (type === 'driver' && statusToShow === DEFAULT_STATE) {
        //Il faut boucler sur tout le contenu de covoiturages.driverRides et chercher un status == PROGRESSING
        const driverRides = window.covoiturages?.driverRides || [];
        if (driverRides.some(ride => ride.status === 'PROGRESSING')) {
            statusToShow = 'PROGRESSING';
            currentStatusDriver = statusToShow; // Mettre à jour le statut courant
        }
    }

    //Pour le type 'passager', s'il y a un covoiturage en attente de validation, on affiche 'VALIDATIONPROCESSING'
    if (type === 'passenger' && statusToShow === DEFAULT_STATE) {
        //Il faut boucler sur tout le contenu de covoiturages.driverRides et chercher un status == VALIDATIONPROCESSING
        const passengerRides = window.covoiturages?.passengerRides || [];
        if (passengerRides.some(ride => ride.status === 'VALIDATIONPROCESSING')) {
            statusToShow = 'VALIDATIONPROCESSING';
            currentStatusPassenger = statusToShow; // Mettre à jour le statut courant
        }
    }

    filterContainer.innerHTML = `
        <div class="btn-group flex-wrap" role="group" aria-label="Filtrer par statut">
            ${STATES_ORDER.map(status => `
                <button type="button"
                    class="btn ${statusToShow === status ? STATES_COLORS[status] : 'btn-outline-' + STATES_COLORS[status].replace('btn-', '')} status-filter-btn"
                    data-status="${status}">
                    ${STATES_LABELS[status] || status}
                </button>
            `).join('')}
        </div>
    `;

    // Insérer les boutons au début du conteneur
    container.insertBefore(filterContainer, container.firstChild);

    // Ajouter les événements de clic
    const filterButtons = filterContainer.querySelectorAll('.status-filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const status = this.getAttribute('data-status');
            if (type === 'driver') {
                displayCovoiturages('driver', 1, status);
            } else {
                // Pour le passager, stocker le statut courant si besoin
                window.currentStatusPassenger = status;
                displayCovoiturages('passenger', 1, status);
            }
        });
    });

    return filterContainer;
}



// Ajouter un écouteur d'événement pour le rafraîchissement
document.addEventListener('refreshCovoiturages', function(event) {
    // Utiliser les données de l'événement ou les valeurs par défaut
    const refreshType = event.detail?.type || currentTab || 'driver';
    const preservePagination = event.detail?.preservePagination || false;
    
    // Déterminer la page à afficher
    let pageToShow = 1;
    if (preservePagination) {
        pageToShow = refreshType === 'driver' ? currentPageDriver : currentPagePassenger;
    }
    
    // Rafraîchir l'onglet approprié
    displayCovoiturages(refreshType, pageToShow);
});


/**
 * Gère l'action sur un covoiturage avec confirmation, appel API et rafraîchissement d'onglet.
 * @param {HTMLElement} btn - Le bouton cliqué
 * @param {string} action - 'start' ou 'stop'
 * @param {string} type - 'driver' ou 'passenger'
 */
function handleCovoiturageAction(btn, action, type) {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();

        // Message de confirmation selon l'action
        const messages = {
            start: "Êtes-vous sûr de vouloir démarrer ce covoiturage ?",
            stop: "Êtes-vous sûr de vouloir terminer ce covoiturage ?"
        };
        const confirmed = window.confirm(messages[action] || "Confirmer l'action ?");
        if (!confirmed) return;

        const covoiturageId = btn.getAttribute('data-covoiturage-id');
        try {
            const response = await sendFetchRequest(`${apiUrl}ride/${covoiturageId}/${action}`, getToken(), 'PUT');
            if (response.success) {
                activateTabAfterAction(action, type);
            }
        } catch (error) {
            console.error(`Erreur lors de l'action ${action} sur le covoiturage:`, error);
        }
    });
}


//Pour les boutons de la modale de validation d'un covoiturage
window.openValidationModal = function(id) {
    let isAllOk = null;
    let rideId = id;

    // Réinitialiser le formulaire et l'affichage
    const form = document.getElementById('validationStep1');
    const problemeForm = document.getElementById('problemeForm');
    const btnEnvoyer = document.getElementById('btnEnvoyerValidation');
    const btnValider = document.getElementById('btnValiderTrajet');
    const btnProbleme = document.getElementById('btnProblemeTrajet');
    const noteStep = document.getElementById('noteStep');

    if (form) form.reset();
    if (problemeForm) problemeForm.style.display = 'none';
    if (btnEnvoyer) btnEnvoyer.style.display = 'none';
    if (noteStep) noteStep.style.display = 'none';

    if (btnProbleme) {
        btnProbleme.onclick = null;
        btnProbleme.addEventListener('click', function() {
            isAllOk = false;
            if (problemeForm) {
                problemeForm.style.display = 'block';
                document.getElementById('content').setAttribute('required', 'required');
            }
            if (btnEnvoyer) btnEnvoyer.style.display = 'inline-block';
        });
    }
    if (btnValider) {
        btnValider.onclick = null;
        btnValider.addEventListener('click', function() {
            isAllOk = true;
            if (problemeForm) {
                problemeForm.style.display = 'none';
                document.getElementById('content').removeAttribute('required');
            }
            if (btnEnvoyer) btnEnvoyer.style.display = 'inline-block';
        });
    }

    if (form) {
        form.onsubmit = null;
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (isAllOk === null) return;

            const data = { isAllOk };
            if (!isAllOk) {
                data.content = document.getElementById('content').value;
            }

            try {
                const response = await sendFetchRequest(
                    apiUrl + `validation/add/${rideId}`,
                    getToken(),
                    'POST',
                    JSON.stringify(data)
                );
                if (response.success) {
                    // Afficher l'étape note/avis
                    if (noteStep) noteStep.style.display = 'block';
                    form.style.display = 'none';
                }
            } catch (err) {
                alert('Erreur lors de la validation : ' + (err?.message || 'Une erreur inconnue est survenue.'));
            }
        });
    }

    // Gestion de l'envoi de la note/avis
    if (noteStep) {
        noteStep.onsubmit = null;
        noteStep.addEventListener('submit', async function(e) {
            e.preventDefault();
            // Récupération sécurisée des champs
            const gradeInput = document.getElementsByName('grade');
            const titleInput = document.getElementById('title');
            const avisContentInput = document.getElementById('avisContent');

            const grade = parseInt(gradeInput.value, 10);
            const title = titleInput.value;
            const content = avisContentInput.value;
            try {
                await sendFetchRequest(
                    apiUrl + `ride/${rideId}/addNotice`,
                    getToken(),
                    'POST',
                    JSON.stringify({ grade, title, content })
                );
                // Fermer la modale
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('validationCovoiturageModal'));
                if (modalInstance) modalInstance.hide();
                // Rafraîchir les onglets
                displayCovoiturages('passenger', 1, currentStatusPassenger);
                displayCovoiturages('driver', 1, currentStatusDriver);
            } catch (err) {
                alert('Erreur lors de l\'envoi de la note : ' + (err?.message || 'Une erreur inconnue est survenue.'));
            }
        });
    }

    // Rafraîchir aussi à la fermeture de la modale (si l'utilisateur ferme sans noter)
    const modalEl = document.getElementById('validationCovoiturageModal');
    modalEl.addEventListener('hidden.bs.modal', function onHide() {
        displayCovoiturages('passenger', 1, currentStatusPassenger);
        displayCovoiturages('driver', 1, currentStatusDriver);
        // Nettoyer l'event pour éviter les doublons
        modalEl.removeEventListener('hidden.bs.modal', onHide);
        // Réafficher le formulaire pour la prochaine ouverture
        if (form) form.style.display = 'block';
        if (noteStep) noteStep.style.display = 'none';
    });

    // Afficher la modale
    const modal = new bootstrap.Modal(document.getElementById('validationCovoiturageModal'));
    modal.show();
};


// Rendre les fonctions et variables globales pour permettre l'accès depuis la modale
window.fetchCovoiturages = fetchCovoiturages;
window.displayCovoiturages = displayCovoiturages;
window.currentTab = currentTab;
window.currentPageDriver = currentPageDriver;
window.currentPagePassenger = currentPagePassenger;


/**
 * Vérifie s'il y a une intention d'inscription à un covoiturage en attente
 * et propose à l'utilisateur de terminer l'action s'il est maintenant connecté
 */
function checkPendingRideJoin() {
    // Vérifier si l'utilisateur est connecté
    if (!getToken()) return;
    
    // Vérifier s'il y a une intention d'inscription en attente
    const pendingJoinStr = localStorage.getItem('pendingRideJoin');
    if (!pendingJoinStr) return;
    
    try {
        // Récupérer et supprimer l'intention d'inscription
        const pendingJoin = JSON.parse(pendingJoinStr);
        localStorage.removeItem('pendingRideJoin');
        
        // Vérifier si l'intention n'est pas trop ancienne (30 minutes max)
        const now = new Date().getTime();
        const thirtyMinutesInMs = 30 * 60 * 1000;
        if (now - pendingJoin.timestamp > thirtyMinutesInMs) return;
        
        // Afficher une boîte de dialogue pour proposer de terminer l'inscription
        if (confirm('Vous êtes maintenant connecté. Souhaitez-vous vous inscrire au covoiturage ?')) {
            if (pendingJoin.fromModal) {
                // Si l'intention venait de la modale, ouvrir la modale de détails
                covoiturageModal.show('passenger-view', { id: pendingJoin.rideId });
            } else {
                // Sinon, appeler directement la fonction d'inscription
                joinRide(pendingJoin.rideId);
            }
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'intention d\'inscription:', error);
        localStorage.removeItem('pendingRideJoin');
    }
}

// Ajouter la vérification à l'initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier s'il y a une intention d'inscription en attente
    checkPendingRideJoin();
});


// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}