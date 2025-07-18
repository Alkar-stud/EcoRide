import { DEFAULT_STATE } from '../../utils/constants/CovoituragesConstants.js'; // Import des constantes
import { photoUrl } from '../../config.js';
import { getToken } from '../../script.js';
import { ENERGIES } from '../../utils/constants/CovoituragesConstants.js';
import { apiService } from '../../core/ApiService.js';
import { setGradeStyle } from '../../utils/RatingUtils.js';
import { AddressAutocomplete } from '../common/AddressAutocomplete.js';
import { DateUtils } from '../../utils/helpers/DateHelper.js';
import { CovoiturageTabs } from './CovoiturageTabs.js';

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
    static async initialize() {
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
    static async loadModalIfNeeded() {
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
    static attachEvents() {
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
                this.handleUpdateRide();
            } else if (e.target.matches('#cancelRideButton')) {
                this.handleCancelRide();
            } else if (e.target.matches('#deleteRideButton')) {
                this.handleDeleteRide();
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
    static async show(mode, covoiturageData, callbacks = {}) {
        try {
            // Initialiser la modale si ce n'est pas déjà fait
            if (!CovoiturageModal.isInitialized) {
                await CovoiturageModal.initialize();
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
	static prepareModal() {
		const modalElement = document.getElementById('covoiturageModal');
		if (!modalElement) {
			console.error("Impossible de préparer la modale : éléments manquants");
			return;
		}

		// En mode création, on ne vérifie pas currentCovoiturage
		if (this.currentMode !== 'create' && !this.currentCovoiturage) {
			console.error("Impossible de préparer la modale : éléments manquants");
			return;
		}
		
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

        let dataToRender = null; // Pas de données à afficher en mode création
        // === MODE CREATION ===
        if (this.currentMode === 'create') {
            // Titre et couleur
            modalTitle.textContent = 'Création de votre covoiturage';
            modalHeader.className = 'modal-header bg-success text-white';

			// Générer le contenu de la modale
            modalBody.innerHTML = this.generateCovoiturageDetailsHTMLForCreate();
            
			// Charger la liste des véhicules pour le select
			this.loadUserVehicles(null, 'create');

            // Gestion du bouton Annuler (reset)
			const form = document.getElementById('covoiturageCreateForm');
			const cancelBtn = document.getElementById('cancelCreateBtn');
			if (cancelBtn && form) {
				cancelBtn.onclick = () => {
					form.reset();
					if (this.modal) this.modal.hide();
				};
			}

            // Gestion du bouton Créer (submit)
            if (form) {
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    await this.handleCreateCovoiturage();
                };
            }

			// Initialiser l'autocomplétion pour les adresses
			const autocomplete = new AddressAutocomplete();
			autocomplete.setupSingleAddressAutocomplete(
				'departAdresse', 'departAdresseSuggestions', 'starting'
			);
			autocomplete.setupSingleAddressAutocomplete(
				'arriveeAdresse', 'arriveeAdresseSuggestions', 'arrival'
			);
			
			// Appliquer la restriction de date sur les champs date
			DateUtils.setupDateRestriction(document.getElementById('dateDepart'));
			DateUtils.setupDateRestriction(document.getElementById('dateArrivee'));

            return; // Sortir de la fonction pour éviter les erreurs
        }

        const covoiturage = this.currentCovoiturage;
        const ride = covoiturage.ride || covoiturage; // Gérer les différentes structures de données

        // Déterminer les données à utiliser (gérer les différents formats)
        dataToRender = ride.data || ride;

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
		
		
		// Contenu principal - informations du covoiturage
		modalBody.innerHTML = this.generateCovoiturageDetailsHTML(dataToRender);

        // Si en mode édition charger les véhicules et gérer l'édition dynamique
        if (this.currentMode === 'edit') {
            this.loadUserVehicles(dataToRender.vehicle?.id);
        }
		
		// Ajouter les boutons selon le mode
		this.addButtonsBasedOnMode(modalFooter, dataToRender);
		
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
    static generateCovoiturageDetailsHTML(ride) {
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

        // Pour le mode édition véhicule
        let vehicleEditHTML = '';

        if (this.currentMode === 'edit' && reservedSeats === 0) {
            vehicleEditHTML = `
                <div class="mb-3">
                    <label for="vehicleSelect" class="form-label">Sélectionner un véhicule</label>
                    <select class="form-select" id="vehicleSelect"></select>
                </div>
                <div class="mb-3">
                    <label for="seatsInput" class="form-label">Nombre de places disponibles</label>
                    <input type="number" class="form-control" id="seatsInput" min="1" max="${ride.vehicle.seats}" value="${ride.nbPlacesAvailable}">
                    <div class="form-text" id="seatsHelp">Maximum: ${ride.vehicle.seats} places</div>
                </div>
                <div id="vehicleTypeAlert" class="alert ${isEco ? 'alert-success' : 'alert-secondary'} mb-0">
                    ${isEco 
                        ? '<i class="fas fa-leaf me-2"></i>Véhicule écologique - Émissions de CO2 réduites!' 
                        : '<i class="fas fa-info-circle me-2"></i>Véhicule standard'}
                </div>
            `;
        }

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
                                        <i class="bi bi-arrow-right"></i>
                                        <span class="text-success">${ride.arrivalCity}</span>
                                    </h4>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <h5><i class="fas fa-map-marker-alt text-danger me-2"></i>Départ</h5>
                                            <p class="ms-4 mb-1">
                                                ${formattedDepartureDate} à ${formattedDepartureTime}
                                            </p>
                                            <p class="ms-4 mb-0">
                                                <i class="fas fa-location-dot text-primary me-2"></i>${ride.startingStreet} - ${ride.startingPostCode} ${ride.startingCity}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <h5><i class="fas fa-map-marker-alt text-success me-2"></i>Arrivée</h5>
                                            <p class="ms-4 mb-1">
                                                ${formattedArrivalDate} vers ${formattedArrivalTime}
                                            </p>
                                            <p class="ms-4 mb-0">
                                                <i class="fas fa-location-dot text-success me-2"></i>${ride.arrivalStreet} - ${ride.arrivalPostCode} ${ride.arrivalCity}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                ${this.currentMode === 'edit' ? '':`
                                <div class="text-center mt-2">
                                    <span class="badge bg-secondary p-2">
                                        <i class="fas fa-hourglass-half me-1"></i>
                                        Durée du trajet: <strong>${durationMinutes}</strong> minutes
                                    </span>
                                </div>
                                `}
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
                            <div class="card-header ${isEco ? 'bg-primary' : 'bg-secondary'} text-white">
                                <i class="fas fa-car me-2"></i>Véhicule
                            </div>
                            <div class="card-body">
                                ${this.currentMode === 'edit' && reservedSeats === 0 ? vehicleEditHTML : `
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
                                `}
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
								${this.currentMode === 'edit' && reservedSeats === 0 ? 
									`<div class="input-group mb-3 justify-content-center">
										<div class="form-floating">
											<input type="number" class="form-control" id="price" min="0" value="${ride.price}" style="max-width: 150px;">
											<label for="price">Prix</label>
										</div>
										<span class="input-group-text">
											<img src="/images/logo_credit_light.png" alt="Crédit" style="width: 24px; height: 24px;">
										</span>
									 </div>
									 <p class="mb-0">Prix par personne pour ce trajet</p>`
									: 
									`<h4 class="display-5 text-primary mb-3">
										${ride.price} <img src="/images/logo_credit_light.png" alt="Crédit" style="width: 32px; height: 32px;">
									 </h4>
									 <p class="mb-0">Prix par personne pour ce trajet</p>`
								}
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
        
        // Si on est en mode édition, on entoure d'un formulaire
        if (this.currentMode === 'edit') {
            return `<form id="covoiturageEditForm">${html}</form>`;
        }
        return html;
    }


    /**
     * Génère le HTML pour les détails du covoiturage en mode create
     * @returns {string} HTML des détails
     */
	static generateCovoiturageDetailsHTMLForCreate() {
		return `
			<form id="covoiturageCreateForm">
				<div class="container-fluid p-0">
					<!-- Trajet -->
					<div class="row mb-2">
						<div class="col-12">
							<div class="card">
								<div class="card-header bg-success text-white py-2">
									<i class="fas fa-route me-2"></i>Trajet
								</div>
								<div class="card-body py-2">
									<div class="row">
										<div class="col-md-6 mb-2">
											<label for="departAdresse" class="form-label">
												<i class="fas fa-map-marker-alt text-success me-1"></i>Adresse de départ *
											</label>
											<div class="position-relative">
												<input type="text" class="form-control" id="departAdresse" name="departAdresse" required placeholder="Ex: 123 Rue de la République, 69001 Lyon" autocomplete="off">
												<div id="departAdresseSuggestions" class="suggestions-container position-absolute w-100 bg-white border rounded-bottom shadow-sm" style="display: none; z-index: 1050;"></div>
											</div>
											<input type="hidden" id="startingStreet" name="startingStreet">
											<input type="hidden" id="startingPostCode" name="startingPostCode">
											<input type="hidden" id="startingCity" name="startingCity">
										</div>
										<div class="col-md-6 mb-2">
											<label for="arriveeAdresse" class="form-label">
												<i class="fas fa-map-marker-alt text-danger me-1"></i>Adresse d'arrivée *
											</label>
											<div class="position-relative">
												<input type="text" class="form-control" id="arriveeAdresse" name="arriveeAdresse" required placeholder="Ex: 123 Rue de la République, 69001 Lyon" autocomplete="off">
												<div id="arriveeAdresseSuggestions" class="suggestions-container position-absolute w-100 bg-white border rounded-bottom shadow-sm" style="display: none; z-index: 1050;"></div>
											</div>
											<input type="hidden" id="arrivalStreet" name="arrivalStreet">
											<input type="hidden" id="arrivalPostCode" name="arrivalPostCode">
											<input type="hidden" id="arrivalCity" name="arrivalCity">
										</div>
									</div>
									<div class="row">
										<div class="col-6 mb-2">
											<label for="dateDepart" class="form-label">
												<i class="fas fa-calendar-alt text-primary me-1"></i>Date de départ *
											</label>
											<input type="date" class="form-control" id="dateDepart" name="dateDepart" required style="max-width: 200px;">
										</div>
										<div class="col-6 mb-2">
											<label for="heureDepart" class="form-label">
												<i class="fas fa-clock text-primary me-1"></i>Heure de départ *
											</label>
											<input type="time" class="form-control" id="heureDepart" name="heureDepart" required style="max-width: 150px;">
										</div>
									</div>
									<div class="row">
										<div class="col-6 mb-2">
											<label for="dateArrivee" class="form-label">
												<i class="fas fa-calendar-alt text-success me-1"></i>Date d'arrivée *
											</label>
											<input type="date" class="form-control" id="dateArrivee" name="dateArrivee" required style="max-width: 200px;">
										</div>
										<div class="col-6 mb-2">
											<label for="heureArrivee" class="form-label">
												<i class="fas fa-clock text-success me-1"></i>Heure d'arrivée *
											</label>
											<input type="time" class="form-control" id="heureArrivee" name="heureArrivee" required style="max-width: 150px;">
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<!-- Véhicule -->
					<div class="row mb-2">
						<div class="col-12">
							<div class="card h-100">
								<div class="card-header bg-info text-white py-2">
									<i class="fas fa-car me-2"></i>Véhicule
								</div>
								<div class="card-body row py-2">
									<div class="col-md-6 mb-2">
										<label for="vehicleSelect" class="form-label">Véhicule *</label>
										<select class="form-select" id="vehicleSelect" name="vehicle" required>
											<option value="">Sélectionnez votre véhicule</option>
										</select>
									</div>
									<div class="col-md-6 mb-2">
										<label for="seatsInput" class="form-label">Nombre de places disponibles</label>
										<input type="number" class="form-control" id="seatsInput" min="1" value="1" style="max-width: 120px;">
										<div class="form-text" id="seatsHelp">Minimum: 1 place</div>
										<div id="vehicleTypeAlert" class="alert alert-secondary mb-0 mt-2 py-1 px-2">
											<i class="fas fa-info-circle me-2"></i>Véhicule standard
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<!-- Prix -->
					<div class="row mb-2">
						<div class="col-12">
							<div class="card h-100">
								<div class="card-header bg-primary text-white py-2">
									<i class="fas fa-money-bill-wave me-2"></i>Tarif
								</div>
								<div class="card-body py-2">
									<div class="mb-2">
										<label for="price" class="form-label">
											<i class="fas fa-euro-sign text-warning me-1"></i>Prix par place (en crédits) *
										</label>
										<input type="number" class="form-control" id="price" name="price" required min="1" step="1" pattern="[0-9]+" placeholder="Ex: 15" style="max-width: 120px;">
										<div class="form-text">Le prix doit être équitable et couvrir les frais d'essence tout en prenant en compte la commission de EcoRide.</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<!-- Boutons -->
					<div class="d-flex justify-content-end mt-3">
						<button type="button" class="btn btn-secondary me-2" id="cancelCreateBtn">
							<i class="fas fa-undo me-1"></i>Annuler
						</button>
						<button type="submit" class="btn btn-success" id="submitCreateBtn">
							<i class="fas fa-plus me-1"></i>Créer le covoiturage
						</button>
					</div>
				</div>
			</form>
		`;
	}


    /**
     * Génère le HTML pour les préférences utilisateur
     * @param {Array} preferences - Tableau des préférences utilisateur
     * @returns {string} HTML des préférences
     */
    static generatePreferencesHTML(preferences = []) {
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
    static addButtonsBasedOnMode(modalFooter,rideData) {
        // Bouton de fermeture commun à tous les modes
        const closeButton = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>`;
        
        let actionButtons = '';

        if (this.currentMode === 'create') {
            // Mode création
            actionButtons = `
                <button type="button" id="createBtn" class="btn btn-success">
                    <i class="fas fa-plus-circle me-1"></i>Créer le covoiturage
                </button>
            `;
            // Masquer les autres boutons
            document.getElementById('updateBtn').style.display = 'none';
            document.getElementById('editModeButtons').style.display = 'none';
            document.getElementById('passengersSection').style.display = 'none';
            document.getElementById('encouragementMessage').style.display = ''; 
        } else if (this.currentMode === 'edit') {
            // Mode édition (conducteur)
            actionButtons = `
                <button type="button" id="editButton" class="btn btn-warning">
                    <i class="fas fa-edit me-1"></i>Modifier
                </button>
            `;
            //Si il y a des passagers, on ne peut que annuler, si personne on supprime
			const NbPassagers = rideData.passenger.length;
			if (NbPassagers == 0) {
				actionButtons += `
					<button type="button" id="deleteRideButton" class="btn btn-danger">
						<i class="fas fa-times-circle me-1"></i>Supprimer ce covoiturage
					</button>
				`;
			} else {
				actionButtons += `
					<button type="button" id="cancelRideButton" class="btn btn-danger">
						<i class="fas fa-times-circle me-1"></i>Annuler ce covoiturage
					</button>
				`;
			}
        } else if (this.currentMode === 'passenger-view') {
            // Mode passager inscrit
            //Seulement si le covoiturage n'a pas démarrée
            if (rideData.status === DEFAULT_STATE) {
                actionButtons = `
                    <button type="button" id="cancelReservationButton" class="btn btn-danger">
                        <i class="fas fa-times-circle me-1"></i>Annuler ma réservation
                    </button>
                `;
            }
        } else {
            // Mode visualisation standard (utilisateur connecté non inscrit ou visiteur)
            const isLoggedIn = !!getToken();
            if (isLoggedIn && this.currentCovoiturage.data.nbPlacesAvailable > 0) {
                actionButtons = `
                    <button type="button" id="reserveButton" class="btn btn-success">
                        <i class="fas fa-check-circle me-1"></i>Réserver ma place
                    </button>
                `;
            } else if (!isLoggedIn) {
                // Stocker l'ID du covoiturage actuel dans localStorage pour y revenir après connexion
                const currentRideId = this.currentCovoiturage.data.id;
                const returnUrl = window.location.pathname + window.location.search;
                
                actionButtons = `
                    <a href="/signin?returnTo=${encodeURIComponent(returnUrl)}&rideId=${currentRideId}" 
                    class="btn btn-primary" id="loginToReserveBtn">
                        <i class="fas fa-sign-in-alt me-1"></i>Se connecter pour réserver
                    </a>
                `;
                
                // Ajouter un événement pour stocker les infos dans localStorage au clic
                setTimeout(() => {
                    const loginBtn = document.getElementById('loginToReserveBtn');
                    if (loginBtn) {
                        loginBtn.addEventListener('click', () => {
                            localStorage.setItem('returnToRideId', currentRideId);
                            localStorage.setItem('returnToUrl', returnUrl);
                        });
                    }
                }, 100);
            }
        }
        
        modalFooter.innerHTML = closeButton + actionButtons;
    }


    /**
     * Gère la création d'un covoiturage
     */
    static async handleCreateCovoiturage() {
        const form = document.getElementById('covoiturageCreateForm');
        if (!form) return;

        const data = {
            startingAddress: {
                street: form.startingStreet?.value || '',
                postcode: form.startingPostCode?.value || '',
                city: form.startingCity?.value || ''
            },
            arrivalAddress: {
                street: form.arrivalStreet?.value || '',
                postcode: form.arrivalPostCode?.value || '',
                city: form.arrivalCity?.value || ''
            },
            startingAt: form.dateDepart.value + ' ' + form.heureDepart.value + ':00',
            arrivalAt: form.dateArrivee.value + ' ' + form.heureArrivee.value + ':00',
            price: Number(form.price.value),
            nbPlacesAvailable: Number(form.seatsInput.value),
            vehicle: Number(form.vehicleSelect.value)
        };
try {
    const response = await apiService.post('ride/add', data, getToken());
    const result = await response.json();
    if (result.success) {
        this.showToast("Covoiturage créé avec succès !", "success");
        if (this.modal && typeof this.modal.hide === 'function') {
            this.modal.hide();
        }
        if (this.callbacks.onSuccess) {
            this.callbacks.onSuccess();
        }
        return;
    } else {
        this.showToast(result.message || "Erreur lors de la création", "error");
    }
} catch (error) {
    console.warn('Toast erreur catch', error);
    this.showToast("Erreur lors de la création du covoiturage", "error");
    return;
}
    }

    /**
     * Gère la réservation d'une place
     */
    static async handleReservation() {
        if (!this.currentCovoiturage || !this.currentCovoiturage.data.id) return;
        try {
            const response = await apiService.put(`ride/${this.currentCovoiturage.data.id}/addUser`, {}, getToken());
            
            if (response.ok) {
                let messageRetour = await response.json();
                if (messageRetour.success) {
                    this.showToast("Votre place a été réservée avec succès !", "success");
                    this.modal.hide();
                    
                    if (this.callbacks.onSuccess) {
                        this.callbacks.onSuccess();
                    }
                } else {
                    this.showToast(messageRetour.message || "Erreur lors de la réservation", "error");
                }
            } else if (response.status === 401) {
                this.showToast(response.error || "Il faut être identifié !", "error");
            } else if (response.status === 402) {
                this.showToast(response.error || "Vous n'avez pas assez de crédits", "error");
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
    static async handleCancelReservation() {
        if (!this.currentCovoiturage || !this.currentCovoiturage.id) return;
        
        if (!confirm("Êtes-vous sûr de vouloir annuler votre réservation ?")) {
            return;
        }
        
        try {
            const response = await apiService.put(`ride/${this.currentCovoiturage.id}/removeUser`, {}, getToken());
            const dataResponse = await response.json();

            if (dataResponse.success) {
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
    static async handleUpdateRide() {
        const form = document.getElementById('covoiturageEditForm');
        if (!form) return;

        const data = {
//            startingAt: form.dateDepart.value + ' ' + form.heureDepart.value + ':00',
//            arrivalAt: form.dateArrivee.value + ' ' + form.heureArrivee.value + ':00',
            price: Number(form.price.value),
            nbPlacesAvailable: Number(form.seatsInput.value),
            vehicle: Number(form.vehicleSelect.value)
        };

        try {
            const response = await apiService.put(`ride/update/${this.currentCovoiturage.id}`, data, getToken());
            const dataResponse = await response.json();

            if (dataResponse.success) {
                this.showToast("Le covoiturage a été modifié", "success");
                this.modal.hide();
                
                if (this.callbacks.onSuccess) {
                    this.callbacks.onSuccess();
                }
            } else {
                this.showToast(response.message || "Erreur lors de la modification", "error");
            }
        } catch (error) {
            console.error("Erreur lors de la modification du covoiturage:", error);
            this.showToast("Erreur lors de la modification du covoiturage", "error");
        }

    }

    /**
     * Gère l'annulation d'un covoiturage par le conducteur
     */
    static async handleCancelRide() {
        if (!this.currentCovoiturage || !this.currentCovoiturage.id) return;
        
        if (!confirm("Êtes-vous sûr de vouloir annuler ce covoiturage ? Cette action est irréversible et tous les passagers seront notifiés.")) {
            return;
        }
        
        try {
            const response = await apiService.put(`ride/${this.currentCovoiturage.id}/cancel`, {}, getToken());
            const dataResponse = await response.json();

            if (dataResponse.success) {
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
 * Gère la suppression d'un covoiturage par le conducteur
 */
static async handleDeleteRide() {
    if (!this.currentCovoiturage || !this.currentCovoiturage.id) return;

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce covoiturage ? Cette action est irréversible.")) {
        return;
    }

    try {
        const response = await apiService.delete(`ride/${this.currentCovoiturage.id}`, getToken());
        if (response.status === 204) {
            this.showToast("Le covoiturage a été supprimé", "success");
            this.modal.hide();

            if (this.callbacks.onSuccess) {
                this.callbacks.onSuccess();
            }
        } else {
            this.showToast(dataResponse.message || "Erreur lors de la suppression", "error");
        }
    } catch (error) {
        console.error("Erreur lors de la suppression du covoiturage:", error);
        this.showToast("Erreur lors de la suppression du covoiturage", "error");
    }
}



    /**
     * Réinitialise l'état de la modale
     */
    static resetModal() {
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
    static showToast(message, type = 'info') {
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

    /**
     * Charge la liste des véhicules de l'utilisateur et initialise le select
     */
	static async loadUserVehicles(currentVehicleId = null, modalMode = 'edit') {
		try {
			const response = await apiService.get('vehicle/list', getToken());
			const data = await response.json();
			const vehicles = data.data;
			if (!data.success || !Array.isArray(vehicles)) return;
			const vehicleSelect = document.getElementById('vehicleSelect');
			if (!vehicleSelect) return;
			vehicleSelect.innerHTML = '';
			
			// Ajoute l'option "Choisissez votre véhicule" en premier
			const defaultOption = document.createElement('option');
			defaultOption.value = '';
			defaultOption.textContent = 'Choisissez votre véhicule';
			defaultOption.selected = true;
			defaultOption.disabled = true;
			vehicleSelect.appendChild(defaultOption);
			
			// Calcul du nombre de passagers déjà inscrits
			let nbPassagersInscrits = 0;
			if (modalMode === 'edit') {
				const ride = this.currentCovoiturage?.ride || this.currentCovoiturage;
				nbPassagersInscrits = ride?.passenger?.length || 0;
			}
			vehicles.forEach(vehicle => {
				const option = document.createElement('option');
				option.value = vehicle.id;
				option.textContent = `${vehicle.brand} ${vehicle.model} - ${vehicle.color}`;
				option.selected = vehicle.id === currentVehicleId;
				option.dataset.seats = vehicle.maxNbPlacesAvailable;
				option.dataset.energy = vehicle.energy;
				option.dataset.isEco = vehicle.energy.toLowerCase().includes('électrique') ? 'true' : 'false';
				// Désactiver si le véhicule ne permet pas d'accueillir tous les passagers déjà inscrits
				if (vehicle.maxNbPlacesAvailable < nbPassagersInscrits) {
					option.disabled = true;
					option.textContent += ` (places insuffisantes)`;
				}
				vehicleSelect.appendChild(option);
			});
			// Initialiser l'affichage dynamique
			this.updateVehicleInfo();
			vehicleSelect.addEventListener('change', () => this.updateVehicleInfo());
		} catch (error) {
			console.error("Erreur lors du chargement des véhicules :", error);
		}
	}

    /**
     * Met à jour dynamiquement les infos véhicule lors du changement de select
     */
    static updateVehicleInfo() {
        const vehicleSelect = document.getElementById('vehicleSelect');
        const seatsInput = document.getElementById('seatsInput');
        const seatsHelp = document.getElementById('seatsHelp');
        const vehicleTypeAlert = document.getElementById('vehicleTypeAlert');
        if (!vehicleSelect || !seatsInput || !vehicleTypeAlert) return;
        const selectedOption = vehicleSelect.options[vehicleSelect.selectedIndex];
        const maxSeats = parseInt(selectedOption.dataset.seats) || 1;
        seatsInput.max = maxSeats;

        // Ne change seatsInput.value QUE si l'utilisateur a changé de véhicule
        if (event && event.type === 'change') {
            seatsInput.value = maxSeats;
        }

        if (seatsHelp) seatsHelp.textContent = `Maximum: ${maxSeats} places`;
        const isEco = selectedOption.dataset.isEco === 'true';
        vehicleTypeAlert.className = `alert ${isEco ? 'alert-success' : 'alert-secondary'} mb-0`;
        vehicleTypeAlert.innerHTML = isEco 
            ? '<i class="fas fa-leaf me-2"></i>Véhicule écologique - Émissions de CO2 réduites!' 
            : '<i class="fas fa-info-circle me-2"></i>Véhicule standard';
        // Mettre à jour l'en-tête de la carte
        const cardHeader = vehicleTypeAlert.closest('.card').querySelector('.card-header');
        if (cardHeader) {
            cardHeader.className = `card-header ${isEco ? 'bg-primary' : 'bg-secondary'} text-white`;
        }
    }
    
    
    static openValidationModal(rideId) {
        let isAllOk = null;

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
                    const response = await apiService.post(
                        `validation/add/${rideId}`,
                        data,
                        getToken()
                    );
                    const result = await response.json();
                    if (result.success) {
                        // Afficher l'étape note/avis
                        if (noteStep) noteStep.style.display = 'block';
                        form.style.display = 'none';
                    } else {
                        CovoiturageModal.showToast(result.message || "Erreur lors de la validation", "error");
                    }
                } catch (err) {
                    CovoiturageModal.showToast('Erreur lors de la validation : ' + (err?.message || 'Une erreur inconnue est survenue.'), "error");
                }
            });
        }

        // Gestion de l'envoi de la note/avis
        if (noteStep) {
            noteStep.onsubmit = null;
            noteStep.addEventListener('submit', async function(e) {
                e.preventDefault();
                const gradeInput = document.querySelector('input[name="grade"]:checked');
                const titleInput = document.getElementById('title');
                const avisContentInput = document.getElementById('avisContent');

                const grade = gradeInput ? parseInt(gradeInput.value, 10) : null;
                const title = titleInput ? titleInput.value : '';
                const content = avisContentInput ? avisContentInput.value : '';
                try {
                    const response = await apiService.post(
                        `ride/${rideId}/addNotice`,
                        { grade, title, content },
                        getToken()
                    );
                    const result = await response.json();
                    if (result.success) {
                        // Fermer la modale
                        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('validationCovoiturageModal'));
                        if (modalInstance) modalInstance.hide();
                        // Rafraîchir les onglets
                        CovoiturageTabs.displayCovoiturages('passenger', 1, CovoiturageTabs.currentStatusPassenger);
                        CovoiturageTabs.displayCovoiturages('driver', 1, CovoiturageTabs.currentStatusDriver);
                    } else {
                        CovoiturageModal.showToast(result.message || "Erreur lors de l'envoi de la note", "error");
                    }
                } catch (err) {
                    CovoiturageModal.showToast('Erreur lors de l\'envoi de la note : ' + (err?.message || 'Une erreur inconnue est survenue.'), "error");
                }
            });
        }

        // Rafraîchir aussi à la fermeture de la modale (si l'utilisateur ferme sans noter)
        const modalEl = document.getElementById('validationCovoiturageModal');
        const onHide = function() {
            CovoiturageTabs.displayCovoiturages('passenger', 1, CovoiturageTabs.currentStatusPassenger);
            CovoiturageTabs.displayCovoiturages('driver', 1, CovoiturageTabs.currentStatusDriver);
            modalEl.removeEventListener('hidden.bs.modal', onHide);
            if (form) form.style.display = 'block';
            if (noteStep) noteStep.style.display = 'none';
        };
        modalEl.addEventListener('hidden.bs.modal', onHide);

        // Afficher la modale
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}



// Créer une instance globale pour une utilisation facile
export const covoiturageModal = new CovoiturageModal();

// Exporter par défaut
export default covoiturageModal;
