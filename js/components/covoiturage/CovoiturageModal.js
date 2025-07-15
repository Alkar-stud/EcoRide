import { photoUrl } from '../../config.js';
import { ENERGIES } from '../../utils/constants/CovoituragesConstants.js';
import { apiService } from '../../core/ApiService.js';
import { setGradeStyle } from '../../utils/RatingUtils.js';

/**
 * Classe gérant la modale de détails d'un covoiturage
 */
export class CovoiturageModal {
    constructor() {
        this.modal = null;
        this.currentCovoiturage = null;
        this.currentMode = 'view'; // Modes possibles: 'view', 'edit', 'passenger-view'
        this.callbacks = {};
        this.isInitialized = false;
    }

    /**
     * Initialise la modale
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Charger le HTML de la modale
            await this.loadModalIfNeeded();
            
            // Créer l'instance Bootstrap Modal après que le HTML est chargé
            this.modal = new bootstrap.Modal(document.getElementById('covoiturageModal'));
            
            // Attacher les événements
            this.attachEvents();
            
            this.isInitialized = true;
        } catch (error) {
            console.error("Erreur lors de l'initialisation de la modale:", error);
            throw error;
        }
    }

    /**
     * Charge le HTML de la modale depuis un fichier externe
     */
    async loadModalIfNeeded() {
        // Vérifier si la modale existe déjà dans le DOM
        const existingModal = document.getElementById('covoiturageModal');
        if (existingModal) {
            return;
        }

        try {
            // Charger le contenu de la modale depuis le fichier HTML
            const response = await fetch('/pages/covoiturages/covoiturage-modal.html');
            if (!response.ok) {
                throw new Error(`Erreur lors du chargement de la modale: ${response.status}`);
            }
            
            const html = await response.text();
            
            // Ajouter la modale au body
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (error) {
            console.error("Erreur lors du chargement de la modale:", error);
            throw error;
        }
    }

    /**
     * Attache les événements à la modale
     */
    attachEvents() {
        const modal = document.getElementById('covoiturageModal');
        if (!modal) {
            console.error("Élément modal introuvable pour attacher les événements");
            return;
        }
        
        // Événements pour les boutons d'action selon le mode
        modal.addEventListener('click', (e) => {
            // Gestion des clics sur les boutons d'action
            if (e.target.matches('#reserveButton')) {
                this.handleReservation();
            } else if (e.target.matches('#cancelReservationButton')) {
                this.handleCancelReservation();
            } else if (e.target.matches('#editButton')) {
                this.switchToEditMode();
            } else if (e.target.matches('#cancelRideButton')) {
                this.handleCancelRide();
            }
        });
        
        // Événement de fermeture de la modale
        modal.addEventListener('hidden.bs.modal', () => {
            // Réinitialiser l'état de la modale
            this.resetModal();
        });
        
    }

    /**
     * Affiche la modale avec les détails du covoiturage
     * @param {string} mode - Mode d'affichage ('view', 'edit', 'passenger-view')
     * @param {Object} covoiturageData - Données du covoiturage
     * @param {Object} callbacks - Fonctions de rappel (onSuccess, onError, etc.)
     */
    async show(mode, covoiturageData, callbacks = {}) {
        try {
            console.log(`Affichage de la modale en mode ${mode}`);
            
            // Initialiser la modale si ce n'est pas déjà fait
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            // Stocker les données et le mode
            this.currentCovoiturage = covoiturageData;
            this.currentMode = mode || 'view';
            this.callbacks = callbacks;
            
            // Préparer la modale selon le mode
            this.prepareModal();
            
            // Afficher la modale
            if (this.modal) {
                this.modal.show();
            } else {
                console.error("L'instance de modale n'est pas disponible");
                // Fallback si l'instance n'est pas disponible
                const modalElement = document.getElementById('covoiturageModal');
                if (modalElement && typeof bootstrap !== 'undefined') {
                    this.modal = new bootstrap.Modal(modalElement);
                    this.modal.show();
                } else {
                    console.error("Impossible d'afficher la modale, Bootstrap ou l'élément modal n'est pas disponible");
                    throw new Error("Impossible d'afficher la modale");
                }
            }
        } catch (error) {
            console.error("Erreur lors de l'affichage de la modale:", error);
            if (callbacks.onError) {
                callbacks.onError(error);
            } else {
                alert("Une erreur est survenue lors de l'affichage des détails du covoiturage.");
            }
        }
    }

/**
 * Prépare la modale selon le mode d'affichage et les données du covoiturage
 */
prepareModal() {
    const modalElement = document.getElementById('covoiturageModal');
    if (!modalElement || !this.currentCovoiturage) {
        console.error("Impossible de préparer la modale : éléments manquants");
        return;
    }
    
    const covoiturage = this.currentCovoiturage;
    const ride = covoiturage.ride || covoiturage; // Gérer les différentes structures de données
    
    // Éléments communs à tous les modes
    const modalTitle = modalElement.querySelector('.modal-title');
    const modalBody = modalElement.querySelector('.modal-body');
    const modalFooter = modalElement.querySelector('.modal-footer');
    const modalHeader = modalElement.querySelector('.modal-header');
    
    if (!modalTitle || !modalBody || !modalFooter || !modalHeader) {
        console.error("Éléments de la modale introuvables");
        return;
    }
    
    // Réinitialiser le contenu
    modalBody.innerHTML = '';
    modalFooter.innerHTML = '';
    
    // Définir le titre et la couleur de l'en-tête selon le mode
    if (this.currentMode === 'edit') {
        modalTitle.textContent = 'Gérer votre covoiturage';
        modalHeader.className = 'modal-header bg-primary text-white';
    } else if (this.currentMode === 'passenger-view') {
        modalTitle.textContent = 'Détails de votre réservation';
        modalHeader.className = 'modal-header bg-info text-white';
    } else {
        modalTitle.textContent = 'Détails du covoiturage';
        modalHeader.className = 'modal-header bg-secondary text-white';
    }
    
    // Déterminer les données à utiliser (gérer les différents formats)
    const dataToRender = ride.data || ride;
    
    // Contenu principal - informations du covoiturage
    modalBody.innerHTML = this.generateCovoiturageDetailsHTML(dataToRender);
    
    // Ajouter les boutons selon le mode
    this.addButtonsBasedOnMode(modalFooter);
    
    // Initialiser les étoiles APRÈS que le HTML soit inséré dans le DOM
    setTimeout(() => {
        const gradeContainer = document.getElementById(`grade-modal-${dataToRender.id}`);

        if (gradeContainer && dataToRender.driver && dataToRender.driver.grade !== undefined) {
            
            try {
                // Vider le conteneur d'abord
                gradeContainer.innerHTML = '';
                
                // Appliquer le style des étoiles (suppression du "ale")
                setGradeStyle(dataToRender.driver.grade, gradeContainer);
            } catch (error) {
                console.error("Erreur lors de l'initialisation des étoiles:", error);
            }
        } else {
            console.warn("Impossible d'initialiser les étoiles:", {
                containerExists: !!gradeContainer,
                driverExists: !!dataToRender.driver,
                gradeExists: dataToRender.driver ? dataToRender.driver.grade : undefined
            });
        }
    }, 100);

}

    /**
     * Génère le HTML pour les détails du covoiturage
     * @param {Object} ride - Données du covoiturage
     * @returns {string} HTML des détails
     */
    generateCovoiturageDetailsHTML(ride) {
        const departureDate = new Date(ride.startingAt);
        const arrivalDate = new Date(ride.arrivalAt);
        const formattedDepartureDate = departureDate.toLocaleDateString();
        const formattedDepartureTime = departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const formattedArrivalDate = arrivalDate.toLocaleDateString();
        const formattedArrivalTime = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const durationMinutes = Math.round((arrivalDate - departureDate) / 60000);
        const isEco = ride.vehicle?.energy === 'ECO';
        const remainingSeats = ride.availableSeats || 0;
        const totalSeats = ride.vehicle?.seats || 0;
        const reservedSeats = totalSeats - remainingSeats;
console.log('Détails du covoiturage:', ride);

        const html = `
            <div class="container-fluid p-0">
                <!-- En-tête avec trajet -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h4 class="card-title mb-0">
                                    ${isEco ? '<span class="badge bg-success"><i class="fas fa-leaf me-1"></i>Véhicule écologique</span>' : ''}
                                    <i class="fas fa-route text-primary me-2"></i>
                                        <span class="text-primary">${ride.startingCity}</span>
                                        <span class="mx-2 fw-bold" style="font-size: 1.2em;">→</span> <!-- Caractère Unicode flèche -->
                                        <span class="text-success">${ride.arrivalCity}</span>
                                    </h4>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <h5><i class="fas fa-map-marker-alt text-danger me-2"></i>Départ</h5>
                                            <p class="ms-4 mb-1">
                                                <i class="fas fa-calendar-alt text-primary me-2"></i>${formattedDepartureDate}
                                                <i class="fas fa-clock text-primary ms-3 me-2"></i>${formattedDepartureTime}
                                            </p>
                                            <p class="ms-4 mb-0">
                                                <i class="fas fa-location-dot text-primary me-2"></i>${ride.startingAddress || ride.startingCity}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <h5><i class="fas fa-map-marker-alt text-success me-2"></i>Arrivée</h5>
                                            <p class="ms-4 mb-1">
                                                <i class="fas fa-calendar-alt text-success me-2"></i>${formattedArrivalDate}
                                                <i class="fas fa-clock text-success ms-3 me-2"></i>${formattedArrivalTime}
                                            </p>
                                            <p class="ms-4 mb-0">
                                                <i class="fas fa-location-dot text-success me-2"></i>${ride.arrivalAddress || ride.arrivalCity}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="text-center mt-2">
                                    <span class="badge bg-secondary p-2">
                                        <i class="fas fa-hourglass-half me-1"></i>
                                        Durée du trajet: <strong>${durationMinutes}</strong> minutes
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Infos conducteur et véhicule -->
                <div class="row mb-4">
                    <div class="col-md-6 mb-3 mb-md-0">
                        <div class="card h-100">
                            <div class="card-header bg-info text-white">
                                <i class="fas fa-user-circle me-2"></i>Conducteur
                            </div>
                            <div class="card-body">
                                <div class="d-flex align-items-center mb-3">
                                    <img src="${photoUrl}${ride.driver.photo}" 
                                        alt="${ride.driver.pseudo}" 
                                        class="rounded-circle me-3" 
                                        style="width: 64px; height: 64px; object-fit: cover;">
                                    <div>
                                        <h5 class="mb-1">${ride.driver.pseudo}</h5>
                                        <div class="d-flex align-items-center">
                                            <div id="grade-modal-${ride.id}" class="me-2">
                                                <span>${(ride.driver.grade / 2).toFixed(1)}/5</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card h-100">
                            <div class="card-header bg-secondary text-white">
                                <i class="fas fa-car me-2"></i>Véhicule
                            </div>
                            <div class="card-body">
                                <h5 class="mb-3">${ride.vehicle.brand} ${ride.vehicle.model} - ${ride.vehicle.color}</h5>
                                <div class="row mb-3">
                                    <div class="col-6">
                                        <p class="mb-1"><i class="fas fa-gas-pump me-2"></i>${ENERGIES[ride.vehicle.energy]}</p>
                                        <p class="mb-1"><i class="fas fa-chair me-2 text-success"></i>${ride.nbPlacesAvailable} place${ride.nbPlacesAvailable > 1 ? 's' : ''} disponible${ride.nbPlacesAvailable > 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                <div class="alert ${isEco ? 'alert-success' : 'alert-secondary'} mb-0">
                                    ${isEco 
                                        ? '<i class="fas fa-leaf me-2"></i>Véhicule écologique - Émissions de CO2 réduites!' 
                                        : '<i class="fas fa-info-circle me-2"></i>Véhicule standard'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Prix et préférences -->
                <div class="row">
                    <div class="col-md-6 mb-3 mb-md-0">
                        <div class="card h-100">
                            <div class="card-header bg-primary text-white">
                                <i class="fas fa-money-bill-wave me-2"></i>Tarif
                            </div>
                            <div class="card-body text-center">
                                <h3 class="display-4 text-primary mb-3">
                                    ${ride.price} <img src="/images/logo_credit_light.png" alt="Crédit" style="width: 32px; height: 32px;">
                                </h3>
                                <p class="mb-0">Prix par personne pour ce trajet</p>
                            </div>
                        </div>
                    </div>
					<div class="col-md-6">
						<div class="card h-100">
							<div class="card-header bg-info text-white">
								<i class="fas fa-sliders-h me-2"></i>Préférences
							</div>
							<div class="card-body">
								<div class="d-flex flex-wrap">
									${this.generatePreferencesHTML(ride.driver.userPreferences)}
								</div>
							</div>
						</div>
					</div>
                </div>
            </div>
        `;
        
        return html;
    }


    /**
     * Génère le HTML pour les préférences utilisateur
     * @param {Array} preferences - Tableau des préférences utilisateur
     * @returns {string} HTML des préférences
     */
    generatePreferencesHTML(preferences = []) {
        if (!preferences || preferences.length === 0) {
            return '<div class="text-muted">Aucune préférence spécifiée</div>';
        }
        
        let prefsHTML = '';
        
        // Parcourir toutes les préférences
        preferences.forEach(pref => {
            // Gestion spéciale pour les préférences standard
            if (pref.libelle === 'smokingAllowed') {
                const isAllowed = pref.description.toLowerCase() === 'yes';
                prefsHTML += `
                    <div class="badge bg-light text-dark p-2 m-1">
                        <img src="/images/${isAllowed ? 'fumeur-ok.png' : 'fumeur-non.png'}" 
                            alt="${isAllowed ? 'Fumeurs acceptés' : 'Non-fumeurs uniquement'}" 
                            class="preference-icon me-1" style="height: 20px; width: 20px;">
                        ${isAllowed ? 'Fumeurs acceptés' : 'Non-fumeurs uniquement'}
                    </div>
                `;
            } 
            else if (pref.libelle === 'petsAllowed') {
                const isAllowed = pref.description.toLowerCase() === 'yes';
                prefsHTML += `
                    <div class="badge bg-light text-dark p-2 m-1">
                        <img src="/images/${isAllowed ? 'animaux-ok.png' : 'animaux-non.png'}" 
                            alt="${isAllowed ? 'Animaux acceptés' : 'Pas d\'animaux'}" 
                            class="preference-icon me-1" style="height: 20px; width: 20px;">
                        ${isAllowed ? 'Animaux acceptés' : 'Pas d\'animaux'}
                    </div>
                `;
            }
            // Préférences personnalisées
            else {
                prefsHTML += `
                    <div class="badge bg-light text-dark p-2 m-1">
                        <strong>${pref.libelle}:</strong> ${pref.description}
                    </div>
                `;
            }
        });
        
        return prefsHTML;
    }

    /**
     * Ajoute les boutons d'action selon le mode d'affichage
     * @param {HTMLElement} modalFooter - Élément footer de la modale
     */
    addButtonsBasedOnMode(modalFooter) {
        // Bouton de fermeture commun à tous les modes
        const closeButton = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>`;
        
        let actionButtons = '';
        
        if (this.currentMode === 'edit') {
            // Mode édition (conducteur)
            actionButtons = `
                <button type="button" id="editButton" class="btn btn-warning">
                    <i class="fas fa-edit me-1"></i>Modifier
                </button>
                <button type="button" id="cancelRideButton" class="btn btn-danger">
                    <i class="fas fa-times-circle me-1"></i>Annuler ce covoiturage
                </button>
            `;
        } else if (this.currentMode === 'passenger-view') {
            // Mode passager inscrit
            actionButtons = `
                <button type="button" id="cancelReservationButton" class="btn btn-danger">
                    <i class="fas fa-times-circle me-1"></i>Annuler ma réservation
                </button>
            `;
        } else {
            // Mode visualisation standard (utilisateur connecté non inscrit ou visiteur)
            const isLoggedIn = !!localStorage.getItem('token');
            if (isLoggedIn && this.currentCovoiturage.availableSeats > 0) {
                actionButtons = `
                    <button type="button" id="reserveButton" class="btn btn-success">
                        <i class="fas fa-check-circle me-1"></i>Réserver ma place
                    </button>
                `;
            } else if (!isLoggedIn) {
                actionButtons = `
                    <a href="/login" class="btn btn-primary">
                        <i class="fas fa-sign-in-alt me-1"></i>Se connecter pour réserver
                    </a>
                `;
            }
        }
        
        modalFooter.innerHTML = closeButton + actionButtons;
    }

    /**
     * Gère la réservation d'une place
     */
    async handleReservation() {
        if (!this.currentCovoiturage || !this.currentCovoiturage.id) return;
        
        try {
            const response = await apiService.post(`ride/${this.currentCovoiturage.id}/reserve`, {});
            
            if (response.success) {
                this.showToast("Votre place a été réservée avec succès !", "success");
                this.modal.hide();
                
                if (this.callbacks.onSuccess) {
                    this.callbacks.onSuccess();
                }
            } else {
                this.showToast(response.message || "Erreur lors de la réservation", "error");
            }
        } catch (error) {
            console.error("Erreur lors de la réservation:", error);
            this.showToast("Erreur lors de la réservation", "error");
        }
    }

    /**
     * Gère l'annulation d'une réservation
     */
    async handleCancelReservation() {
        if (!this.currentCovoiturage || !this.currentCovoiturage.id) return;
        
        if (!confirm("Êtes-vous sûr de vouloir annuler votre réservation ?")) {
            return;
        }
        
        try {
            const response = await apiService.post(`ride/${this.currentCovoiturage.id}/cancel-reservation`, {});
            
            if (response.success) {
                this.showToast("Votre réservation a été annulée", "success");
                this.modal.hide();
                
                if (this.callbacks.onSuccess) {
                    this.callbacks.onSuccess();
                }
            } else {
                this.showToast(response.message || "Erreur lors de l'annulation", "error");
            }
        } catch (error) {
            console.error("Erreur lors de l'annulation de la réservation:", error);
            this.showToast("Erreur lors de l'annulation de la réservation", "error");
        }
    }

    /**
     * Passe en mode édition du covoiturage
     */
    switchToEditMode() {
        // Rediriger vers la page d'édition du covoiturage
        window.location.href = `/covoiturages/edit/${this.currentCovoiturage.id}`;
    }

    /**
     * Gère l'annulation d'un covoiturage par le conducteur
     */
    async handleCancelRide() {
        if (!this.currentCovoiturage || !this.currentCovoiturage.id) return;
        
        if (!confirm("Êtes-vous sûr de vouloir annuler ce covoiturage ? Cette action est irréversible et tous les passagers seront notifiés.")) {
            return;
        }
        
        try {
            const response = await apiService.post(`ride/${this.currentCovoiturage.id}/cancel`, {});
            
            if (response.success) {
                this.showToast("Le covoiturage a été annulé", "success");
                this.modal.hide();
                
                if (this.callbacks.onSuccess) {
                    this.callbacks.onSuccess();
                }
            } else {
                this.showToast(response.message || "Erreur lors de l'annulation", "error");
            }
        } catch (error) {
            console.error("Erreur lors de l'annulation du covoiturage:", error);
            this.showToast("Erreur lors de l'annulation du covoiturage", "error");
        }
    }

    /**
     * Réinitialise l'état de la modale
     */
    resetModal() {
        this.currentCovoiturage = null;
        this.currentMode = 'view';
        this.callbacks = {};
        
        const modalHeader = document.querySelector('#covoiturageModal .modal-header');
        if (modalHeader) {
            // Retirer les classes d'arrière-plan
            modalHeader.className = 'modal-header'; // Reset to default
        }
    }

    /**
     * Affiche un toast de notification
     * @param {string} message - Message à afficher
     * @param {string} type - Type de toast ('success', 'error', 'info', 'warning')
     */
    showToast(message, type = 'info') {
        // Vérifier si Bootstrap est disponible
        if (typeof bootstrap === 'undefined') {
            console.warn("Bootstrap n'est pas disponible pour afficher le toast");
            alert(message); // Fallback sur alert basique
            return;
        }
        
        // Créer ou récupérer le conteneur de toasts
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        // Définir la couleur selon le type
        const bgClass = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'info': 'bg-info',
            'warning': 'bg-warning'
        }[type] || 'bg-info';
        
        // Créer le toast
        const toastId = `toast-${Date.now()}`;
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header ${bgClass} text-white">
                    <strong class="me-auto">EcoRide</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Fermer"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        // Ajouter le toast au conteneur
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        // Récupérer l'élément toast
        const toastElement = document.getElementById(toastId);
        
        // Créer une instance Bootstrap Toast
        const toast = new bootstrap.Toast(toastElement, {
            animation: true,
            autohide: true,
            delay: 5000
        });
        
        // Afficher le toast
        toast.show();
        
        // Supprimer le toast du DOM après sa fermeture
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
}

// Créer une instance globale pour une utilisation facile
export const covoiturageModal = new CovoiturageModal();

// Exporter par défaut
export default covoiturageModal;
