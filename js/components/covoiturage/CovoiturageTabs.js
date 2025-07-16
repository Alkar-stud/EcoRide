import { DEFAULT_STATE, STATES_ORDER, STATES_COLORS, STATES_LABELS } from '../../utils/constants/CovoituragesConstants.js'; // Import des constantes
import { CovoiturageModal } from '../../components/covoiturage/CovoiturageModal.js'; // Import des constantes
import{ UIHelper } from '../../utils/helpers/UIHelper.js';
import{ DateUtils } from '../../utils/helpers/DateHelper.js';
import { apiService } from '../../core/ApiService.js';
import { getToken } from '../../script.js';

export class CovoiturageTabs {
    // Ajout d'une propriété statique pour stocker la fonction de récupération des données
    static getCovoituragesCallback = null;
    
    // Propriétés statiques pour le statut
    static currentStatusDriver = DEFAULT_STATE;
    static currentStatusPassenger = DEFAULT_STATE;
    
    constructor() {
        // Constructeur vide car nous utilisons des méthodes statiques
    }
	
	
    // Méthode pour définir la fonction de récupération des covoiturages
    static setGetCovoituragesCallback(callback) {
        CovoiturageTabs.getCovoituragesCallback = callback;
    }
    
    /**
     * Affiche les covoiturages pour l'onglet demandé
     * @param {string} type - Type d'onglet ('driver' ou 'passenger')
     * @param {number} page - Numéro de page
     * @param {string|null} status - Statut de filtrage
     * @param {Object} userRoles - Rôles de l'utilisateur
     * @param {Object|null} resultRecupCovoiturages - Données déjà récupérées
     */
	static async displayCovoiturages(type = 'driver', page = 1, status = null, userRoles = { isDriver: false, isPassenger: false }, resultRecupCovoiturages = null) {
        let covoituragesData = resultRecupCovoiturages;
        
        // Si des données sont déjà fournies et valides, on évite l'appel API
        if (!covoituragesData || (!covoituragesData.driverRides && !covoituragesData.passengerRides)) {
            // Sinon, on fait l'appel API
            if (CovoiturageTabs.getCovoituragesCallback) {
                try {
                    const result = await CovoiturageTabs.getCovoituragesCallback(status, page);
                    covoituragesData = result.data;
                } catch (error) {
                    console.error('Erreur lors de la récupération des données:', error);
                }
            } else {
                console.warn("Aucune fonction de rappel n'a été définie pour récupérer les données");
            }
        }
        
		this.covoiturages = covoituragesData;
console.log('covoituragesData au début de display : ', covoituragesData);


		// Mettre à jour le statut courant si fourni
        let actualStatus;
        if (status !== null) {
            actualStatus = status;
        } else if (type === 'driver') {
            actualStatus = this.currentStatusDriver;
        } else if (type === 'passenger') {
            actualStatus = this.currentStatusPassenger;
        } else {
            actualStatus = DEFAULT_STATE;
        }

		// Mettre à jour l'onglet courant et l'exposer globalement car undefined à l'init
		this.currentTab = type;
		// Mettre à jour la page courante selon le type
		if (type === 'driver') {
			this.currentPageDriver = page;
		} else {
			this.currentPagePassenger = page;
		}
		
		// Sélectionner le bon conteneur selon le type
		const containerClass = type === 'driver' ? '.allcovoiturages-driver' : '.allcovoiturages-passenger';
		const container = document.querySelector(containerClass);

		if (!container) {
			console.error(`Conteneur ${containerClass} non trouvé`);
			return;
		}
    
    
		try {
			//Covoiturages de l'onglet actif
			let covoiturages = [];
			if (type === 'driver') {
				covoiturages = covoituragesData.driverRides;
			} else {
				covoiturages = covoituragesData.passengerRides;
			}

			// Vider le conteneur
			container.innerHTML = '';
			
			// Ajouter les boutons de filtrage pour l'onglet chauffeur ou passager
			this.createStatusFilterButtons(container, type, userRoles, actualStatus);
			
			// Si aucun covoiturage, afficher le message vide
			if (covoiturages.length === 0) {
				UIHelper.showEmptyStateMessage(container, type, actualStatus);
				return;
			}
			
			// Créer une liste div pour les covoiturages
			const covoituragesList = document.createElement('div');
			covoituragesList.className = 'covoiturages-list';
			
			// Ajouter chaque covoiturage
			covoiturages.forEach(covoiturage => {
				const covoiturageItem = document.createElement('div');

				// Vérifier si la date est passée pour les covoiturages en statut COMING pour appliquer la classe CSS
				const isPassed = DateUtils.isDatePassed(covoiturage.startingAt);
				const isExpired = DateUtils.isPassed && covoiturage.status === 'COMING';
				const cardClasses = `card mb-3 shadow-sm ${isExpired ? 'covoiturage-expired' : ''}`;
				
				covoiturageItem.className = cardClasses;
				
				// Adapter l'affichage selon le type
				let driverInfo;
				let vehicleInfo;
				
				if (type === 'passenger') {
					// Pour un passager, afficher les infos du chauffeur
					driverInfo = `
						<div class="driver-info d-flex align-items-center mb-2">
							<img src="${photoUrl}${covoiturage.driver.photo}" alt="${covoiturage.driver.pseudo}" 
								 class="rounded-circle me-2" width="40" height="40">
							<span>Chauffeur: ${covoiturage.driver.pseudo}</span>
						</div>`;
					
					// Afficher les infos du véhicule du chauffeur
					vehicleInfo = `
						<div class="mb-2">
							<i class="fas fa-car me-2"></i>${covoiturage.vehicle.brand} ${covoiturage.vehicle.model}
							<img src="/images/logo-voiture-${covoiturage.vehicle.energy.toLowerCase()}.png" alt="${covoiturage.vehicle.energy}">
						</div>
						<div>
							<i class="fas fa-user me-1"></i> 
							Places réservées: ${UIHelper.getPassengerCount(covoiturage)}
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
							${UIHelper.calculateRemainingPlaces(covoiturage)} place(s) restante(s) sur ${covoiturage.nbPlacesAvailable}
						</div>`;
				}
				
				covoiturageItem.innerHTML = `
					<div class="card-body">
						<div class="row align-items-center">
							<div class="col-md-3">
								${driverInfo}
								<span class="badge ${UIHelper.getStatusBadgeClass(covoiturage.status)}">${UIHelper.getStatusLabel(covoiturage.status)}</span>
							</div>
							
							<div class="col-md-5">
								<div class="mb-2">
									<i class="fas fa-map-marker-alt text-success me-2"></i>
									<strong>Départ:</strong> ${covoiturage.startingCity}
									<small class="text-muted ms-2">${DateUtils.formatDateTime(covoiturage.startingAt)}</small>
								</div>
								<div>
									<i class="fas fa-flag-checkered text-danger me-2"></i>
									<strong>Arrivée:</strong> ${covoiturage.arrivalCity}
									<small class="text-muted ms-2">${DateUtils.formatDateTime(covoiturage.arrivalAt)}</small>
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
									${type === 'driver' && covoiturage.status === 'COMING' && DateUtils.isToday(covoiturage.startingAt) ? `
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
						const covoiturageData = await CovoiturageTabs.getCovoiturageData(covoiturageId);
						const covoiturage = covoiturageData.data;
						CovoiturageModal.show('edit', covoiturage, {
							onSuccess: (forceStatus) => {
								// Utiliser le statut forcé ou le statut actuel
								const statusToUse = forceStatus || (type === 'driver' ? currentStatusDriver : currentStatusPassenger);
								
								// Recharger les covoiturages avec le bon statut
								displayCovoiturages(type, 1, statusToUse, null, null);
							}
						});
					} catch (error) {
						console.error('Erreur lors de l\'ouverture de la modale de modification:', error);
					}
				});
			});			
			
			
			
			
		} catch (error) {
			console.error('Erreur lors de l\'affichage des covoiturages:', error);

			// Message d'erreur différent selon le type
			let errorMessage = 'Une erreur est survenue lors du chargement des covoiturages.';
			if (type === 'passenger') {
				errorMessage = 'Une erreur est survenue lors du chargement de vos réservations.';
			}

			container.innerHTML = `<div class="alert alert-danger mt-4">${errorMessage}</div>`;
		}
    
	
	}


	/*
	 * Fonction pour créer et afficher les boutons de filtrage par statut
	 */
	static createStatusFilterButtons(container, type, userRoles, statusToShow) {
		const filterContainer = document.createElement('div');
		filterContainer.className = 'mb-3';
		
		//Création du HTML pour afficher les boutons de filtre par statut
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
					CovoiturageTabs.displayCovoiturages('driver', 1, status, userRoles);
				} else {
					// Pour le passager, stocker le statut courant si besoin
					CovoiturageTabs.currentStatusPassenger = status;
					CovoiturageTabs.displayCovoiturages('passenger', 1, status, userRoles);
				}
			});
		});

		return filterContainer;
	}



	/*
	 * Fonction pour récupérer les données d'un covoiturage
	 */
	static async getCovoiturageData(covoiturageId) {
		let endpoint = `ride/show/${covoiturageId}`;
		try {
			const response = await apiService.get(endpoint, getToken());
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Erreur lors de la récupération des données du covoiturage:', error);
			throw error;
		}
	}

	
}
