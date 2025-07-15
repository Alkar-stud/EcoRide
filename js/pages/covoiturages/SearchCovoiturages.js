import { photoUrl } from '../../config.js';
import { CovoiturageSearch } from '../../components/covoiturage/CovoiturageSearch.js';
import { apiService } from '../../core/ApiService.js';
import { DateUtils } from '../../utils/helpers/DateHelper.js'; // Ajouter cette importation
import { covoiturageModal } from '../../components/covoiturage/CovoiturageModal.js';
import { setGradeStyle } from '../../utils/RatingUtils.js';

export class SearchCovoiturages {
    constructor() {
        
        // Éléments DOM spécifiques à cette page
        this.resultsContainer = document.getElementById('searchResults');
        this.initialMessage = document.getElementById('initialMessage');
        this.paginationContainer = document.getElementById('paginationContainer');
        this.resetFiltersBtn = document.getElementById('resetFilters');
        
        // Filtres avancés
        this.maxPriceInput = document.getElementById('maxPrice');
        this.smokingAllowedCheck = document.getElementById('smokingAllowed');
        this.petsAllowedCheck = document.getElementById('petsAllowed');
        this.ecoFilterSelect = document.getElementById('ecoFilter');
        this.minDriverRatingSelect = document.getElementById('minDriverRating');
        this.maxDurationInput = document.getElementById('maxDuration');
        
        // Initialiser le composant de recherche avec callback personnalisé
        this.covoiturageSearch = new CovoiturageSearch({
            selectors: {
                departInputId: 'depart',
                departSuggestionsId: 'departSuggestions',
                destinationInputId: 'destination',
                destinationSuggestionsId: 'destinationSuggestions',
                dateInputId: 'searchDate',
                formId: 'searchForm',
                searchButtonId: 'searchButton'
            },
            onSearch: this.performSearch.bind(this)
        });
        
        this.covoiturageSearch.initialize();
        
        // Initialiser les fonctionnalités spécifiques à la page de recherche
        this.initializePageSpecificFeatures();
    }
    
    initializePageSpecificFeatures() {
        // Initialiser le bouton de réinitialisation des filtres
        if (this.resetFiltersBtn) {
            this.resetFiltersBtn.addEventListener('click', this.resetFilters.bind(this));
        }
        
        // Si nous avons des paramètres d'URL, effectuer la recherche initiale
        if (window.location.search) {
            this.performSearch();
        }
    }
    
	/**
	 * Effectue la recherche avec les filtres avancés
	 */
	async performSearch(searchData = null) {
		try {
			// Si searchData n'est pas fourni, le récupérer depuis l'URL
			if (!searchData) {
				const urlParams = new URLSearchParams(window.location.search);
				searchData = {
					depart: urlParams.get('depart') || '',
					destination: urlParams.get('destination') || '',
					date: urlParams.get('date') || '',
					departPostcode: urlParams.get('departPostcode') || '',
					destinationPostcode: urlParams.get('destinationPostcode') || ''
				};
			}
			
			// Ajouter les filtres avancés
			const filters = this.collectAdvancedFilters();
			
			// Formater les données pour l'API
			const apiRequestData = {
				startingAddress: {
					postcode: searchData.departPostcode || '00000',
					city: searchData.depart
				},
				arrivalAddress: {
					postcode: searchData.destinationPostcode || '00000',
					city: searchData.destination
				},
				startingAt: DateUtils.formatDateTimeForApi(searchData.date)
			};
			
			// Ajouter les filtres facultatifs uniquement s'ils sont renseignés
			if (filters.maxDuration) {
				apiRequestData.maxDuration = parseInt(filters.maxDuration);
			}
			
			if (filters.maxPrice) {
				apiRequestData.maxPrice = parseFloat(filters.maxPrice);
			}
			
			if (filters.minDriverRating) {
				apiRequestData.MinDriverGrade = parseFloat(filters.minDriverRating);
			}
			
			if (filters.ecoFilter === 'eco') {
				apiRequestData.isEco = true;
			}
			
			// Afficher un indicateur de chargement
			this.showLoading(true);
			
			// Effectuer la recherche via l'API
			const response = await apiService.post('ride/search', apiRequestData);
			
			// Vérifier si la réponse est OK
			if (!response.ok) {
				// Extraire le message d'erreur si possible
				let errorMsg = "Erreur serveur";
				try {
					const errorData = await response.json();
					errorMsg = errorData.message || `Erreur ${response.status}`;
				} catch (e) {
					errorMsg = `Erreur ${response.status}: ${response.statusText}`;
				}
				
				throw new Error(errorMsg);
			}
			
			// Extraire les données JSON de la réponse
			const responseData = await response.json();
			
			// Mettre à jour l'URL avec les paramètres de recherche sans recharger la page
			//l'opérateur spread (symbole composé de trois points) "..." permet de scinder un objet itérable, donc aussi les tableaux, en ses valeurs individuelles.
			this.updateUrlWithParams({...searchData, ...filters});
			
			// Afficher les résultats
			this.displayResults(responseData);
		} catch (error) {
			console.error('Erreur détaillée lors de la recherche:', error);
			this.showError(error.message || "Une erreur est survenue lors de la recherche");
		} finally {
			this.showLoading(false);
		}
	}

   
    /**
     * Collecte les valeurs des filtres avancés
     */
    collectAdvancedFilters() {
        return {
            maxPrice: this.maxPriceInput?.value || null,
            smokingAllowed: this.smokingAllowedCheck?.checked || null,
            petsAllowed: this.petsAllowedCheck?.checked || null,
            isEco: this.ecoFilterSelect?.value || null,
            minDriverRating: this.minDriverRatingSelect?.value || null,
            maxDuration: this.maxDurationInput?.value || null
        };
    }
    
    /**
     * Met à jour l'URL avec les paramètres de recherche
     */
    updateUrlWithParams(params) {
        const urlParams = new URLSearchParams();
        
        // Ajouter uniquement les paramètres non vides
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== '') {
                urlParams.set(key, value);
            }
        });
        
        // Mettre à jour l'URL sans recharger la page
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.pushState({}, '', newUrl);
    }
    
    /**
     * Réinitialise tous les filtres
     */
    resetFilters() {
        // Réinitialiser les filtres avancés
        if (this.maxPriceInput) this.maxPriceInput.value = '';
        if (this.smokingAllowedCheck) this.smokingAllowedCheck.checked = false;
        if (this.petsAllowedCheck) this.petsAllowedCheck.checked = false;
        if (this.ecoFilterSelect) this.ecoFilterSelect.value = '';
        if (this.minDriverRatingSelect) this.minDriverRatingSelect.value = '';
        if (this.maxDurationInput) this.maxDurationInput.value = '';
        
        // Relancer la recherche
        this.performSearch();
    }
    
    /**
     * Affiche ou masque l'indicateur de chargement
     */
    showLoading(show) {
        if (this.initialMessage) {
            this.initialMessage.style.display = show ? 'block' : 'none';
        }
        
        // Autres éléments d'UI pour indiquer le chargement...
    }
    
    /**
     * Affiche un message d'erreur
     */
    showError() {
        if (this.resultsContainer) {
            this.resultsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h4 class="alert-heading">Erreur de recherche</h4>
                    <p>Impossible de récupérer les résultats. Veuillez réessayer ultérieurement.</p>
                </div>
            `;
        }
    }

    
	/**
	 * Affiche les résultats de recherche
	 * @param {Object} response - Réponse de l'API
	 */
	displayResults(response) {
		if (!this.resultsContainer) {
			console.error("Conteneur de résultats introuvable");
			return;
		}
		
		try {
			// Cacher le message initial s'il existe
			if (this.initialMessage) {
				this.initialMessage.style.display = 'none';
			}
			
			// Effacer les résultats précédents
			this.resultsContainer.innerHTML = '';
			
			// Vérifier si la requête a réussi
			if (!response || !response.success) {
				this.resultsContainer.innerHTML = `
					<div class="alert alert-danger">
						<h4 class="alert-heading">Erreur</h4>
						<p>${response?.message || 'Une erreur est survenue lors de la recherche.'}</p>
					</div>
				`;
				return;
			}
			
			// Vérifier s'il y a des covoiturages
			if (!response.rides || response.rides.length === 0) {
				this.resultsContainer.innerHTML = `
					<div class="alert alert-info">
						<h4 class="alert-heading">Aucun résultat</h4>
						<p>Aucun covoiturage ne correspond à votre recherche. Essayez de modifier vos critères.</p>
					</div>
				`;
				return;
			}
			
			// Construction du HTML pour l'affichage des résultats
			let html = '';
			
			// Message d'information si présent
			if (response.message && response.message !== "ok") {
				html += `
					<div class="alert alert-info mb-4">
						<p class="mb-0">${response.message}</p>
					</div>
				`;
			}
			
			// Conteneur pour les vues mobile et desktop
			html += '<div id="results-wrapper">';
			
			// Version mobile (cartes)
			html += '<div class="mobile-results d-md-none"><div class="row">';
			
			response.rides.forEach(item => {
				const covoiturage = item.ride;
				const remainingSeats = item.remainingSeats;
				
				const departureDate = new Date(covoiturage.startingAt);
				const departureFormattedDate = departureDate.toLocaleDateString();
				const departureFormattedTime = departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
				const arrivalDate = new Date(covoiturage.arrivalAt);
				const arrivalFormattedDate = arrivalDate.toLocaleDateString();
				const arrivalFormattedTime = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
				
				const isEco = covoiturage.vehicle?.energy === 'ECO';
				
                html += `
                    <div class="col-12 mb-4">
                        <div class="card h-100 ${isEco ? 'border-success' : ''}">
                            ${isEco ? '<div class="card-header bg-success text-white py-2"><i class="fas fa-leaf me-2"></i>Véhicule écologique</div>' : ''}
                            <div class="card-body p-0"> <!-- Suppression du padding par défaut -->
                                <!-- En-tête de la carte avec les villes -->
                                <div class="p-3 bg-light border-bottom">
                                    <h5 class="card-title mb-0 d-flex align-items-center">
                                        <i class="fas fa-map-marker-alt text-danger me-2"></i>
                                        <span class="text-truncate">${covoiturage.startingCity}</span>
                                        <i class="fas fa-arrow-right mx-2"></i>
                                        <span class="text-truncate">${covoiturage.arrivalCity}</span>
                                    </h5>
                                </div>
                                
                                <!-- Section des dates et heures -->
                                <div class="p-3 border-bottom">
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="small text-muted mb-1">Départ</div>
                                            <div><i class="fas fa-calendar-alt text-primary me-1"></i>${departureFormattedDate}</div>
                                            <div><i class="fas fa-clock text-primary me-1"></i>${departureFormattedTime}</div>
                                        </div>
                                        <div class="col-6">
                                            <div class="small text-muted mb-1">Arrivée</div>
                                            <div><i class="fas fa-calendar-alt text-success me-1"></i>${arrivalFormattedDate}</div>
                                            <div><i class="fas fa-clock text-success me-1"></i>${arrivalFormattedTime}</div>
                                        </div>
                                    </div>
                                    <div class="mt-2 text-center">
                                        <span class="badge bg-secondary py-2 px-3">
                                            <i class="fas fa-hourglass-half me-1"></i>
                                            <strong>${Math.round((arrivalDate - departureDate) / 60000)}</strong> minutes
                                        </span>
                                    </div>
                                </div>
                                
                                <!-- Section conducteur -->
                                <div class="p-3 border-bottom">
                                    <div class="d-flex align-items-center">
                                        <div class="me-3">
                                            <img src="${photoUrl}${covoiturage.driver.photo}" 
                                                alt="${covoiturage.driver.pseudo}" 
                                                class="rounded-circle" 
                                                style="width: 50px; height: 50px; object-fit: cover;">
                                        </div>
                                        <div>
                                            <div class="fw-bold">${covoiturage.driver.pseudo}</div>
                                            <div class="d-flex align-items-center">
                                                <div class="text-warning me-1">
                                                    ${Array(Math.round(covoiturage.driver.grade / 2)).fill('<i class="fas fa-star"></i>').join('')}
                                                    ${(covoiturage.driver.grade / 2) % 1 >= 0.5 ? '<i class="fas fa-star-half-alt"></i>' : ''}
                                                </div>
                                                <div class="ms-1">${(covoiturage.driver.grade / 2).toFixed(1)}/5</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Section véhicule et places -->
                                <div class="p-3 border-bottom">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <i class="fas fa-car text-secondary me-2"></i>
                                            <span>${covoiturage.vehicle.brand} ${covoiturage.vehicle.model}</span>
                                            <span class="ms-2 badge bg-secondary">${covoiturage.vehicle.color}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <i class="fas fa-users text-info me-2"></i>
                                        <span class="fw-bold">${remainingSeats}</span> place${remainingSeats > 1 ? 's' : ''} disponible${remainingSeats > 1 ? 's' : ''}
                                    </div>
                                </div>
                                
                                <!-- Section prix et action -->
                                <div class="d-flex justify-content-between align-items-center p-3">
                                    <div class="fs-4 fw-bold text-primary">
                                        ${covoiturage.price} <img src="/images/logo_credit_light.png" alt="Crédit" style="width: 18px; height: 18px;">
                                    </div>
                                    <button class="btn btn-primary view-covoiturage" data-id="${covoiturage.id}">
                                        <i class="fas fa-info-circle me-1"></i>Détails
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>`;
			});
			
			html += '</div></div>'; // Fermeture de la vue mobile
			
			// Version desktop (lignes)
			html += '<div class="desktop-results d-none d-md-block"><div class="list-group">';
			
			response.rides.forEach((item, index) => {
				const covoiturage = item.ride;
				const remainingSeats = item.remainingSeats;
				
				const departureDate = new Date(covoiturage.startingAt);
				const departureFormattedDate = departureDate.toLocaleDateString();
				const departureFormattedTime = departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
				const arrivalDate = new Date(covoiturage.arrivalAt);
				const arrivalFormattedDate = arrivalDate.toLocaleDateString();
				const arrivalFormattedTime = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
				
				const isEco = covoiturage.vehicle?.energy === 'ECO';

				html += `
					<div class="list-group-item list-group-item-action p-3 ${isEco ? 'border-success' : ''} mb-2">
						<div class="row align-items-center">
							<div class="col-md-3">
								<h5 class="mb-1">${covoiturage.startingCity} → ${covoiturage.arrivalCity}</h5>
								<p class="mb-1 text-muted">
									<i class="fas fa-calendar-alt me-1"></i>${departureFormattedDate} 
									<i class="fas fa-clock ms-2 me-1"></i>${departureFormattedTime}
								</p>
								<p class="mb-1 text-muted">
									<i class="fas fa-calendar-alt me-1"></i>${arrivalFormattedDate} 
									<i class="fas fa-clock ms-2 me-1"></i>${arrivalFormattedTime}
								</p>
								<p class="mb-1 text-muted">
									<i class="fas fa-hourglass-half me-1"></i>${Math.round((arrivalDate - departureDate) / 60000)} minutes
								</p>
							</div>
							<div class="col-md-3">
								<div class="d-flex align-items-center">
									<div class="me-2">
										<img src="${photoUrl}${covoiturage.driver.photo}" 
											alt="${covoiturage.driver.pseudo}" 
											class="rounded-circle" 
											style="width: 40px; height: 40px; object-fit: cover;">
									</div>
									<div>
										<strong>${covoiturage.driver.pseudo}</strong>
                                        <div class="d-flex align-items-center">
                                            <div id="grade-${covoiturage.id}" class="me-2">
                                                <span>${(covoiturage.driver.grade / 2).toFixed(1)}/5</span>
                                            </div>
                                        </div>
									</div>
								</div>
							</div>
							<div class="col-md-3">
								<p class="mb-1">
									<i class="fas fa-car me-1"></i>${covoiturage.vehicle.brand} ${covoiturage.vehicle.model}
									<span class="ms-1 badge bg-secondary">${covoiturage.vehicle.color}</span>
									<img src="/images/logo-voiture-${covoiturage.vehicle.energy.toLowerCase()}.png" alt="${covoiturage.vehicle.brand} ${covoiturage.vehicle.model}" class="rounded-circle">
								</p>
								<p class="mb-0">
									<i class="fas fa-users me-1"></i>${remainingSeats} place${remainingSeats > 1 ? 's' : ''} disponible${remainingSeats > 1 ? 's' : ''}
								</p>
							</div>
							<div class="col-md-3 text-end">
								<span class="fs-5 fw-bold me-3">${covoiturage.price} <img src="/images/logo_credit_light.png" alt="Crédit" style="width: 16px; height: 16px;"></span>
								<button class="btn btn-primary view-covoiturage" data-id="${covoiturage.id}">
									Voir détails
								</button>
							</div>
						</div>
					</div>`;
            });
			
			html += '</div></div>'; // Fermeture de la vue desktop
			
			html += '</div>'; // Fermeture du conteneur principal

			// Afficher le HTML dans le conteneur
			this.resultsContainer.innerHTML = html;
			
            // Ajouter les étoiles de notation pour chaque chauffeur
            response.rides.forEach(ride => {
                const gradeContainer = document.getElementById(`grade-${ride.ride.id}`);
                if (gradeContainer && ride.ride.driver.grade !== undefined) {
                    setGradeStyle(ride.ride.driver.grade, gradeContainer);
                }
            });

			// Attacher les écouteurs d'événements aux boutons "Voir détails"
			document.querySelectorAll('.view-covoiturage').forEach(button => {
				button.addEventListener('click', (e) => {
					const covoiturageId = e.currentTarget.dataset.id;
					this.viewCovoiturageDetails(covoiturageId);
				});
			});
			
			// Ajouter un écouteur pour gérer le redimensionnement de la fenêtre
			this.setupResponsiveListeners();
			
		} catch (error) {
			console.error("Erreur lors de l'affichage des résultats:", error);
			this.resultsContainer.innerHTML = `
				<div class="alert alert-danger">
					<h4 class="alert-heading">Erreur d'affichage</h4>
					<p>Une erreur est survenue lors de l'affichage des résultats: ${error.message}</p>
					<p>Veuillez vérifier la console pour plus de détails.</p>
				</div>
			`;
		}
	}

	/**
	 * Configure les écouteurs pour la gestion responsive
	 */
	setupResponsiveListeners() {
		// Supprimer l'écouteur existant s'il y en a un pour éviter les doublons
		if (this.resizeListener) {
			window.removeEventListener('resize', this.resizeListener);
		}
		
		// Créer un nouvel écouteur
		this.resizeListener = () => {
			this.updateResponsiveDisplay();
		};
		
		// Ajouter l'écouteur
		window.addEventListener('resize', this.resizeListener);
		
		// Appliquer immédiatement
		this.updateResponsiveDisplay();
	}

	/**
	 * Met à jour l'affichage en fonction de la taille de l'écran
	 */
	updateResponsiveDisplay() {
		const isMobile = window.innerWidth < 768; // 768px est le breakpoint md de Bootstrap
		
		const mobileResults = document.querySelector('.mobile-results');
		const desktopResults = document.querySelector('.desktop-results');
		
		if (!mobileResults || !desktopResults) return;
		
		if (isMobile) {
			// Mode mobile
			mobileResults.classList.remove('d-none');
			desktopResults.classList.add('d-none');
		} else {
			// Mode desktop
			mobileResults.classList.add('d-none');
			desktopResults.classList.remove('d-none');
			desktopResults.classList.add('d-block');
		}
	}

    /**
     * Affiche les détails d'un covoiturage
     * @param {number} covoiturageId - ID du covoiturage
     */
    async viewCovoiturageDetails(covoiturageId) {
        if (!covoiturageId) {
            console.error("ID de covoiturage manquant");
            return;
        }
        
        try {
            // Afficher un indicateur de chargement
            this.showLoading(true);
            
            // Récupérer les données du covoiturage depuis l'API
            const response = await apiService.get(`ride/show/${covoiturageId}`);

            if (!response.ok) {
                throw new Error(`Erreur lors de la récupération des détails du covoiturage: ${response.status}`);
            }
            
            const data = await response.json();
            // Déterminer le mode d'affichage en fonction du rôle de l'utilisateur
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const userId = userInfo.id;
console.log('userInfo : ', userInfo);
            let mode = 'view'; // Mode par défaut (visiteur ou utilisateur non inscrit)
            
            if (userId) {
                if (data.ride.driver && data.ride.driver.id === userId) {
                    mode = 'edit'; // L'utilisateur est le conducteur
                } else if (data.passenger && Array.isArray(data.passenger)) {
                    // Vérifier si l'utilisateur est un passager
                    const isPassenger = data.passenger.some(p => p.id === userId);
                    if (isPassenger) {
                        mode = 'passenger-view'; // L'utilisateur est un passager
                    }
                }
            }
            
            // Afficher la modale avec les données du covoiturage
            covoiturageModal.show(mode, data, {
                onSuccess: () => {
                    // Rafraîchir les résultats après une action
                    this.performSearch();
                }
            });
            
        } catch (error) {
            console.error("Erreur lors de l'affichage des détails:", error);
            this.resultsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h4 class="alert-heading">Erreur</h4>
                    <p>Impossible de charger les détails du covoiturage.</p>
                </div>
            `;
        } finally {
            this.showLoading(false);
        }
    }
    
}

// Initialiser la page
new SearchCovoiturages();
