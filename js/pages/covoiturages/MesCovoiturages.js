import { getUserInfo } from '../../script.js';
import { DEFAULT_STATE } from '../../utils/constants/CovoituragesConstants.js'; // Import des constantes
import { apiService } from '../../core/ApiService.js';
import { CovoiturageTabs } from '../../components/covoiturage/CovoiturageTabs.js';
import { CovoiturageModal } from '../../components/covoiturage/CovoiturageModal.js';

export class MesCovoiturages {
    constructor() {
        // Variables pour stocker les pages courantes
        this.currentPageDriver = 1;
        this.currentPagePassenger = 1;
        this.limitPerPage = 5;
        this.currentStatusDriver = DEFAULT_STATE;    // Statut par défaut pour les covoiturages chauffeur
        this.currentStatusPassenger = DEFAULT_STATE; // Statut par défaut pour les covoiturages passager
        this.currentTab = 'driver'; // Onglet par défaut
        this.userInfo = null;
        this.mesCovoituragesData = null;
        
        // Créer une instance de CovoiturageTabs
        this.covoiturageTabs = new CovoiturageTabs();
	}

	/*
	 * 
	 * Initialisation
	 * 
	 */
	async initialize() {
		// Récupérer les rôles utilisateur AVANT de charger les covoiturages
		this.userInfo = await getUserInfo();
console.log ('userInfo : ', this.userInfo);
		
		// Définir la fonction de rappel AVANT d'initialiser les onglets
		CovoiturageTabs.setGetCovoituragesCallback(
			async (state, page) => {
				const result = await this.getCovoituragesStates(state, page);
				return result; // Renvoyer le résultat complet, pas seulement data
			}
		);

		// Charger les covoiturages
		const covoituragesData = await this.getCovoituragesStates();
		
		this.mesCovoituragesData = covoituragesData.data;
		
        // Récupérer les rôles de l'utilisateur
        const userRoles = this.getUserRoles();

		// Charger les covoiturages chauffeur par défaut
		if (!userRoles.isDriver) {
			this.currentTab = 'passenger';
		}

		this.initializeTabs(userRoles, this.currentTab);
		if (userRoles.isDriver) {
			this.initializeButton('proposerCovoiturageBtn');
		}		
		
	}

    /*
     * Méthode getter pour accéder à userInfo
     */
    getUserInfo() {
        return this.userInfo;
    }
    
    /*
     * Méthode pour récupérer si le user est driver et/ou passenger
     */
    getUserRoles() {
		return {  // Ne pas écraser this.userInfo
			isDriver: this.userInfo?.isDriver,
			isPassenger: this.userInfo?.isPassenger
		};
	}


	/*
	 * Méthode pour récupérer tous les covoiturages selon l'état
	 */
	async getCovoituragesStates(state = DEFAULT_STATE, page = 1) {
		try {
			// Construire l'URL avec l'état
			let endpoint;
			if (state === 'all') {
				endpoint = `ride/list/all?page=${page}&limit=${this.limitPerPage}`;
			} else {
				endpoint = `ride/list/${state}?page=${page}&limit=${this.limitPerPage}`;
			}
			
			const response = await apiService.get(endpoint, this.userInfo.apiToken);
			const data = await response.json();

			return data;
		} catch (error) {
			console.error(`Erreur lors de la récupération des covoiturages (état: ${state}):`, error);
			return { data: { driverRides: [], passengerRides: [] } };
		}
	}

	/*
	 * Gestion des événements d'onglets
	 */
	initializeTabs(userRoles, currentTab = 'driver') {
		//Titre des onglets
		const driverTab = document.getElementById('driver-tab');
		const passengerTab = document.getElementById('passenger-tab');
		//Contenu des onglets
		const driverTabContent = document.getElementById('driver');
		const passengerTabContent = document.getElementById('passenger');

		//currentStatus par défaut est celui du driver
		let currentStatus = this.currentStatusDriver;
		
		// Stocker une référence à this pour l'utiliser dans les callbacks
		const self = this;
		
		if (driverTab && userRoles.isDriver) {
			driverTab.addEventListener('click', function() {
				currentTab = 'driver';
				driverTab.classList.add('active');
				passengerTab.classList.remove('active');
				driverTabContent.classList.add('show', 'active');
				passengerTabContent.classList.remove('show', 'active');
				CovoiturageTabs.displayCovoiturages('driver', 1, self.currentStatusDriver, userRoles, self.mesCovoituragesData);
			});
			currentStatus = this.currentStatusDriver;
		}
		
		if (passengerTab && userRoles.isPassenger) {
			passengerTab.addEventListener('click', function() {
				currentTab = 'passenger';
				passengerTab.classList.add('active');
				driverTab.classList.remove('active');
				passengerTabContent.classList.add('show', 'active');
				driverTabContent.classList.remove('show', 'active');
				CovoiturageTabs.displayCovoiturages('passenger', 1, self.currentStatusPassenger, userRoles, self.mesCovoituragesData);
			});
			currentStatus = this.currentStatusPassenger;
		}
		
		//L'onglet driver est actif par défaut, si l'utilisateur est passager uniquement,
		// on retire active de driverTab pour le mettre sur passengerTab
		if (userRoles.isPassenger && !userRoles.isDriver) {
			driverTab.classList.remove('active');
			passengerTab.classList.add('active');
			driverTabContent.classList.remove('active', 'show');
			passengerTabContent.classList.add('active', 'show');
			currentTab = 'passenger';
			currentStatus = this.currentStatusPassenger;
		}
		
		
		//Les onglets ne sont affichés que si l'utilisateur est chauffeur ET passager
		if (userRoles.isPassenger && userRoles.isDriver) {
			driverTab.style.display = 'block';
			passengerTab.style.display = 'block';
		}
		
		
		CovoiturageTabs.displayCovoiturages(currentTab, 1, currentStatus, userRoles, this.mesCovoituragesData);

		
	}

	/*
	 * Initialiser le bouton de création principal
	 */
	initializeButton(NomBouton) {
		const createBtns = document.querySelectorAll(`#${NomBouton}`);
		createBtns.forEach(createBtn => {
			createBtn.style.display = 'block';
			createBtn.addEventListener('click', (e) => {
				e.preventDefault();
				CovoiturageModal.show('create', null, {
					onSuccess: () => {
						CovoiturageTabs.displayCovoiturages(
							this.currentTab,
							this.currentTab === 'driver' ? this.currentPageDriver : this.currentPagePassenger,
							this.currentTab === 'driver' ? this.currentStatusDriver : this.currentStatusPassenger,
							this.getUserRoles(),
							this.mesCovoituragesData
						);
					}
				});
			});
		});
	}




}




// Initialiser la page
let mesCovoiturages = new MesCovoiturages();
await mesCovoiturages.initialize();

// Accéder à userInfo en dehors de la classe
const userInfo = mesCovoiturages.getUserInfo();

console.log('MesCovoiturages instance created:', mesCovoiturages);

/* OU si besoin d'exporter une instance unique 
// Créer et exporter une instance unique
const mesCovoituragesInstance = new MesCovoiturages();
export default mesCovoituragesInstance;
*/
