// Module pour gérer les covoiturages de l'utilisateur
import { apiUrl, url } from '../config.js';
import { getToken, sendFetchRequest } from '../script.js';

// Variable pour stocker la page courante
let currentPage = 1;
const itemsPerPage = 4;

// Fonction pour récupérer les covoiturages depuis l'API
async function fetchCovoiturages(state = 'coming', page = 1) {
    try {
        // Utilisation de sendFetchRequest avec apiUrl et getToken
        const data = await sendFetchRequest(
            apiUrl + 'ride/list/' + state + '?page_courante=' + page + '&elements_par_page=' + itemsPerPage, 
            getToken(), 
            'GET'
        );
console.log(data);
        return data;
    } catch (error) {
        console.error('Erreur lors de la récupération des covoiturages:', error);
        return { data: [], pagination: {} };
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

// Fonction pour formater le prix (en centimes à euros)
function formatPrice(priceInCents) {
    return (priceInCents / 100).toFixed(2).replace('.', ',');
}

// Fonction principale pour afficher les covoiturages
async function displayCovoiturages() {

    // Mettre à jour le titre
    document.getElementById('title-h1').textContent = 'Mes covoiturages';
    
    // Récupérer les données
    const result = await fetchCovoiturages();
    const covoiturages = result.rides || [];
console.log(covoiturages);
    // Sélectionner le conteneur
    const container = document.querySelector('.allcovoiturages');
    
    // Vider le conteneur
    container.innerHTML = '';

    // Limiter à 4 covoiturages maximum
    const displayedCovoiturages = covoiturages.slice(0, 4);
    
    if (displayedCovoiturages.length === 0) {
        container.innerHTML = '<div class="alert alert-info mt-4">Vous n\'avez pas encore de covoiturages.</div>';
        return;
    }
    
    // Créer une rangée pour les cartes
    const row = document.createElement('div');
    row.className = 'row';
    
    // Ajouter chaque covoiturage
    displayedCovoiturages.forEach(covoiturage => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-xl-3 mb-4';
        
        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                    <div class="driver-info d-flex align-items-center">
                        <img src="${url}/uploads/photos/${covoiturage.driver.photo}" alt="${covoiturage.driver.pseudo}" 
                             class="rounded-circle me-2" width="40" height="40">
                        <span>${covoiturage.driver.pseudo}</span>
                    </div>
                    <span class="badge ${getStatusBadgeClass(covoiturage.status)}">${getStatusLabel(covoiturage.status)}</span>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <div class="mb-2">
                            <i class="fas fa-map-marker-alt text-success me-2"></i>
                            <strong>Départ:</strong> ${covoiturage.startingCity}
                            <div class="ms-4 small text-muted">${formatDateTime(covoiturage.startingAt)}</div>
                        </div>
                        <div>
                            <i class="fas fa-flag-checkered text-danger me-2"></i>
                            <strong>Arrivée:</strong> ${covoiturage.arrivalCity}
                            <div class="ms-4 small text-muted">${formatDateTime(covoiturage.arrivalAt)}</div>
                        </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div><i class="fas fa-car me-2"></i>${covoiturage.vehicle.brand} ${covoiturage.vehicle.model}</div>
                        <div><i class="fas fa-user me-1"></i> ${covoiturage.nbPlacesAvailable}/${covoiturage.vehicle.maxNbPlacesAvailable}</div>
                    </div>
                </div>
                <div class="card-footer d-flex justify-content-between align-items-center">
                    <strong class="text-primary">${formatPrice(covoiturage.price)} <img src="/images/logo_credit_light.png" alt="Crédit" class="img-fluid" style="width: 20px; height: 20px;"></strong>
                    <a href="/covoiturages?id=${covoiturage.id}" class="btn btn-sm btn-outline-primary">Détails</a>
                </div>
            </div>
        `;
        
        row.appendChild(col);
    });
    
    container.appendChild(row);

    // Ajouter la pagination si nécessaire
    if (result.pagination && result.pagination.pages_totales > 1) {
        renderPagination(container, result.pagination);
    }

    // Ajouter un bouton pour voir tous les covoiturages si nécessaire
    if (result.pagination && result.pagination.elements_totaux > 4) {
        const viewAllLink = document.createElement('div');
        viewAllLink.className = 'text-center mt-4';
        viewAllLink.innerHTML = '<a href="/covoiturages/all" class="btn btn-outline-primary">Voir tous mes covoiturages</a>';
        container.appendChild(viewAllLink);
    }
}

// Fonction pour générer la pagination
function renderPagination(container, pagination) {
    const totalPages = pagination.pages_totales;
    const currentPage = pagination.page_courante;
    
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container mt-4';
    
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Navigation des covoiturages');
    
    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';
    
    // Bouton précédent
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.textContent = 'Précédent';
    if (currentPage > 1) {
        prevLink.addEventListener('click', (e) => {
            e.preventDefault();
            displayCovoiturages(currentPage - 1);
        });
    }
    prevLi.appendChild(prevLink);
    ul.appendChild(prevLi);
    
    // Pages numérotées
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Première page et ellipsis
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        const firstLink = document.createElement('a');
        firstLink.className = 'page-link';
        firstLink.href = '#';
        firstLink.textContent = '1';
        firstLink.addEventListener('click', (e) => {
            e.preventDefault();
            displayCovoiturages(1);
        });
        firstLi.appendChild(firstLink);
        ul.appendChild(firstLi);
        
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            const ellipsisSpan = document.createElement('span');
            ellipsisSpan.className = 'page-link';
            ellipsisSpan.textContent = '...';
            ellipsisLi.appendChild(ellipsisSpan);
            ul.appendChild(ellipsisLi);
        }
    }
    
    // Pages numérotées
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        if (i !== currentPage) {
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                displayCovoiturages(i);
            });
        }
        pageLi.appendChild(pageLink);
        ul.appendChild(pageLi);
    }
    
    // Dernière page et ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            const ellipsisSpan = document.createElement('span');
            ellipsisSpan.className = 'page-link';
            ellipsisSpan.textContent = '...';
            ellipsisLi.appendChild(ellipsisSpan);
            ul.appendChild(ellipsisLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        const lastLink = document.createElement('a');
        lastLink.className = 'page-link';
        lastLink.href = '#';
        lastLink.textContent = totalPages;
        lastLink.addEventListener('click', (e) => {
            e.preventDefault();
            displayCovoiturages(totalPages);
        });
        lastLi.appendChild(lastLink);
        ul.appendChild(lastLi);
    }
    
    // Bouton suivant
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.textContent = 'Suivant';
    if (currentPage < totalPages) {
        nextLink.addEventListener('click', (e) => {
            e.preventDefault();
            displayCovoiturages(currentPage + 1);
        });
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

// Exécuter la fonction principale quand le DOM est chargé
document.addEventListener('DOMContentLoaded', displayCovoiturages);

displayCovoiturages('coming', 1);