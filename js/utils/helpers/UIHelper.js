import { DEFAULT_STATE, STATES_COLORS, STATES_LABELS } from '../../utils/constants/CovoituragesConstants.js'; // Import des constantes
/**
 * Utilitaires
 */
export class UIHelper {
	
	/*
	 * Fonction pour afficher un message d'encouragement quand il n'y a pas de covoiturages
	 */
	static showEmptyStateMessage(container, type, state) {
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
						<button class="btn btn-primary btn-lg mx-auto d-block" id="proposerCovoiturageBtnFilter">
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
	
	
	/*
	 * Fonction pour générer la pagination
	 */
	static renderPagination(container, pagination, type) {
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
	
	/*
	 * Fonction pour calculer le nombre de places restantes
	 */
	static calculateRemainingPlaces(covoiturage) {
		// Calcul: places disponibles - nombre de passagers inscrits
		const totalAvailable = covoiturage.nbPlacesAvailable || 0;
		const passengerCount = UIHelper.getPassengerCount(covoiturage);
		const remaining = totalAvailable - passengerCount;
		
		return Math.max(0, remaining); // S'assurer que ce n'est jamais négatif
	}
	
	/*
	 * Fonction pour compter les passagers
	 */
	static getPassengerCount(covoiturage) {
		const passagers = covoiturage.passenger;
		
		if (passagers && Array.isArray(passagers)) {
			return passagers.length;
		}
		
		// Fallback sur bookedPlaces si disponible
		return covoiturage.bookedPlaces || 0;
	}

	/*
	 * Fonction pour obtenir la classe de badge selon le statut
	 */
	static getStatusBadgeClass(status) {
		// On récupère la couleur du bouton et on la transforme en badge Bootstrap
		const colorClass = STATES_COLORS[status];
		if (!colorClass) return 'bg-secondary';
		// On remplace 'btn-' par 'bg-' pour correspondre aux classes badge Bootstrap
		return colorClass.replace('btn-', 'bg-');
	}

	/*
	 * Fonction pour obtenir le libellé du statut
	 */
	static getStatusLabel(status) {
		return STATES_LABELS[status] || status;
	}


	/*
	* Fonction pour neutraliser le code HTML potentiellement malveillant
	*/
	static sanitizeHtml(text){
		// Créez un élément HTML temporaire de type "div"
		const tempHtml = document.createElement('div');
		
		// Affectez le texte reçu en tant que contenu texte de l'élément "tempHtml"
		tempHtml.textContent = text;
		
		// Utilisez .innerHTML pour récupérer le contenu de "tempHtml"
		// Cela va "neutraliser" ou "échapper" tout code HTML potentiellement malveillant
		return tempHtml.innerHTML;
	}
	
}
