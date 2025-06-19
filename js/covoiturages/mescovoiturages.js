// Module pour gérer les covoiturages de l'utilisateur
import { apiUrl, url } from '../config.js';
import { getToken, sendFetchRequest } from '../script.js';
import nouveauCovoiturageModal from './nouveau-covoiturage-modal.js'; // Import de l'instance

// Variables pour stocker les pages courantes
let currentPageDriver = 1;
let currentPagePassenger = 1;
let limitPerPage = 5;
let currentTab = 'driver'; // Onglet par défaut 'driver'

// Fonction pour récupérer les covoiturages depuis l'API
async function fetchCovoiturages(type = 'driver', state = 'coming', page = 1) {
    try {
        let endpoint;
        
        // Différencier l'endpoint selon le type
        if (type === 'driver') {
            // Endpoint pour les covoiturages où l'utilisateur est chauffeur
            endpoint = apiUrl + 'ride/list/' + state + '?page=' + page + '&limit=' + limitPerPage;
        } else {
            // Endpoint pour les covoiturages où l'utilisateur est passager
            endpoint = apiUrl + 'ride/list/passenger/' + state + '?page=' + page + '&limit=' + limitPerPage;
        }
        
        const data = await sendFetchRequest(endpoint, getToken(), 'GET');
        return data;
    } catch (error) {
        console.error(`Erreur lors de la récupération des covoiturages ${type}:`, error);
        return { rides: [], pagination: {} };
    }
}

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
    return rideDate < today;
}

// Fonction pour calculer le nombre de places restantes
function calculateRemainingPlaces(covoiturage) {
    // Calcul: places disponibles - places réservées
    const totalAvailable = covoiturage.nbPlacesAvailable || 0;
    const booked = covoiturage.bookedPlaces || 0;
    const remaining = totalAvailable - booked;
    
    return Math.max(0, remaining); // S'assurer que ce n'est jamais négatif
}

// Fonction pour afficher un indicateur de chargement
function showLoadingIndicator(container, type) {
    const typeLabel = type === 'driver' ? 'chauffeur' : 'passager';
    container.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
            <p>Chargement des covoiturages ${typeLabel}...</p>
        </div>
    `;
}

// Fonction pour afficher un message d'encouragement quand il n'y a pas de covoiturages
function showEmptyStateMessage(container, type) {
    if (type === 'driver') {
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="mb-4">
                    <i class="fas fa-car text-muted" style="font-size: 4rem;"></i>
                </div>
                <h4 class="text-muted mb-3">Vous n'avez pas encore proposé de covoiturage</h4>
                <p class="text-muted mb-4">
                    Commencez dès maintenant à partager vos trajets et contribuer à la mobilité durable !
                </p>
                <button class="btn btn-primary btn-lg" id="creerPremierCovoiturage">
                    <i class="fas fa-plus me-2"></i>Proposer mon premier covoiturage
                </button>
            </div>
        `;
        
        // Ajouter l'événement pour ouvrir la modale
        document.getElementById('creerPremierCovoiturage').addEventListener('click', () => {
            nouveauCovoiturageModal.show({
                showEncouragement: true,
                onSuccess: () => {
                    // Recharger les covoiturages chauffeur après création
                    displayCovoiturages('driver', 1);
                }
            });
        });
    } else {
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="mb-4">
                    <i class="fas fa-users text-muted" style="font-size: 4rem;"></i>
                </div>
                <h4 class="text-muted mb-3">Vous n'avez pas encore réservé de covoiturage</h4>
                <p class="text-muted mb-4">
                    Recherchez des trajets disponibles et rejoignez la communauté EcoRide !
                </p>
                <a href="/covoiturages/recherche" class="btn btn-primary btn-lg">
                    <i class="fas fa-search me-2"></i>Rechercher un covoiturage
                </a>
            </div>
        `;
    }
}

// Fonction principale pour afficher les covoiturages
async function displayCovoiturages(type = 'driver', page = 1) {
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
    
    // Afficher l'indicateur de chargement
    showLoadingIndicator(container, type);
    
    try {
        // Récupérer les données avec le bon type
        const result = await fetchCovoiturages(type, 'coming', page);
        if (!result) {
            throw new Error("Aucun résultat retourné par l'API");
        }
        
        const covoiturages = result.rides || [];

        // Vider le conteneur
        container.innerHTML = '';
        
        if (covoiturages.length === 0) {
            showEmptyStateMessage(container, type);
            return;
        }
        
        // Créer une liste pour les covoiturages
        const covoituragesList = document.createElement('div');
        covoituragesList.className = 'covoiturages-list';
        
        // Ajouter chaque covoiturage
        covoiturages.forEach(covoiturage => {
            const covoiturageItem = document.createElement('div');
            
            // Vérifier si la date est passée pour appliquer la classe CSS
            const isPassed = isDatePassed(covoiturage.startingAt);
            const cardClasses = `card mb-3 shadow-sm ${isPassed ? 'covoiturage-expired' : ''}`;
            
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
                        Places réservées: ${covoiturage.bookedPlaces || 1}
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
                        ${calculateRemainingPlaces(covoiturage)} places restantes sur ${covoiturage.vehicle.maxNbPlacesAvailable}
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
                            <a href="/covoiturages?id=${covoiturage.id}" class="btn btn-sm btn-outline-primary">Détails</a>
                        </div>
                    </div>
                </div>
            `;
            
            covoituragesList.appendChild(covoiturageItem);
        });
        
        container.appendChild(covoituragesList);

        // Ajouter la pagination si nécessaire
        if (result.pagination && result.pagination.pages_totales > 1) {
            renderPagination(container, result.pagination, type);
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

// Fonction pour obtenir la classe de badge selon le statut
function getStatusBadgeClass(status) {
    switch (status) {
        case 'COMING':
            return 'bg-primary';
        case 'FINISHED':
            return 'bg-success';
        case 'CANCELLED':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Fonction pour obtenir le libellé du statut
function getStatusLabel(status) {
    switch (status) {
        case 'COMING':
            return 'À venir';
        case 'FINISHED':
            return 'Terminé';
        case 'CANCELLED':
            return 'Annulé';
        default:
            return status;
    }
}

// Gestion des événements d'onglets
function initializeTabs() {
    const driverTab = document.getElementById('driver-tab');
    const passengerTab = document.getElementById('passenger-tab');
    
    if (driverTab) {
        driverTab.addEventListener('click', function() {
            displayCovoiturages('driver', currentPageDriver);
        });
    }
    
    if (passengerTab) {
        passengerTab.addEventListener('click', function() {
            displayCovoiturages('passenger', currentPagePassenger);
        });
    }
}

// Initialiser le bouton de création principal
function initializeCreateButton() {
    
    // Chercher le bouton avec l'ID correct
    const createBtn = document.getElementById('proposerCovoiturageBtn');
    
    if (createBtn) {
        createBtn.addEventListener('click', (e) => {
            e.preventDefault();
            nouveauCovoiturageModal.show({
                onSuccess: () => {
                    displayCovoiturages(currentTab, currentTab === 'driver' ? currentPageDriver : currentPagePassenger);
                }
            });
        });
    } else {
        console.error('Bouton #proposerCovoiturageBtn non trouvé');
    }
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

// Rendre les fonctions et variables globales pour permettre l'accès depuis la modale
window.fetchCovoiturages = fetchCovoiturages;
window.displayCovoiturages = displayCovoiturages;
window.currentTab = currentTab;
window.currentPageDriver = currentPageDriver;
window.currentPagePassenger = currentPagePassenger;
window.loadDriverRides = () => displayCovoiturages('driver', 1);
window.loadPassengerRides = () => displayCovoiturages('passenger', 1);

// Initialisation
function initialize() {
    initializeTabs();
    initializeCreateButton();
    // Charger les covoiturages chauffeur par défaut
    displayCovoiturages('driver', 1);
}

// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}