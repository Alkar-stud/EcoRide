import { STATES_TRANSITIONS } from '../../utils/constants/CovoituragesConstants.js'; // Import des constantes
import { apiService } from '../../core/ApiService.js';
import { Pagination } from '../common/Pagination.js';
import { getToken } from '../../script.js';
import { UIHelper } from '../../utils/helpers/UIHelper.js';
import { DateUtils } from '../../utils/helpers/DateHelper.js';

export class ValidationsTickets {
    constructor() {
        this.currentSubTab = 'todo'; // todo | closed
        this.lastData = null;
        this.ticketsList = document.getElementById('tickets-list');
        this.ticketModal = document.getElementById('ticket-modal');
        this.modalDetails = document.getElementById('modal-ticket-details');
        this.supportContent = document.getElementById('support-content');
        this.closeModalBtn = document.getElementById('close-ticket-modal');
        this.saveBtn = document.getElementById('save-support');
        this.closeBtn = document.getElementById('close-ticket');
        this.historyDiv = document.getElementById('support-history');
        this.currentTicket = null;
        
        // Listeners sur les sous-onglets
        document.getElementById('tab-validations-todo').addEventListener('click', () => {
            this.switchSubTab('todo');
        });
        document.getElementById('tab-validations-closed').addEventListener('click', () => {
            this.switchSubTab('closed');
        });

        this.closeModalBtn.addEventListener('click', () => {
            this.ticketModal.classList.add('d-none');
        });


		/*
		 * Action du bouton Enregistrer
		 */
		if (this.saveBtn) {
			this.saveBtn.addEventListener('click', async () => {
				if (!this.currentTicket) return;
				const content = this.supportContent.value.trim();
				if (!content) {
					alert('Le commentaire est obligatoire pour enregistrer.');
					this.supportContent.focus();
					return;
				}
				const validationId = this.currentTicket.validation.id;
				const now = new Date();
				const dateStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

				let closeContent = this.currentTicket.validation.closeContent ? this.currentTicket.validation.closeContent.trim() : '';
				if (content) {
					// Ajoute la date/heure devant chaque nouvelle ligne ajoutée
					const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
					const newLines = lines.map(line => `[${dateStr}] ${line}`);
					closeContent = closeContent ? closeContent + '\n' + newLines.join('\n') : newLines.join('\n');
				}
				try {
					await this.sendTicketAction(validationId, { closeContent });
				} catch (e) {
					alert('Erreur lors de l\'enregistrement : ' + (e.message || e));
				}
			});
		}

		/*
		 * Action du bouton Clôturer
		 */
		if (this.closeBtn) {
			this.closeBtn.addEventListener('click', async () => {
				if (!this.currentTicket) return;
				if (!confirm('Voulez-vous vraiment clôturer ce ticket ?')) return;
				const validationId = this.currentTicket.validation.id;
				const now = new Date();
				const dateStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
				let content = this.supportContent.value.trim();
				let closeContent = this.currentTicket.validation.closeContent ? this.currentTicket.validation.closeContent.trim() : '';
				if (content) {
					// Ajoute la date/heure devant chaque nouvelle ligne ajoutée
					const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
					const newLines = lines.map(line => `[${dateStr}] ${line}`);
					closeContent = closeContent ? closeContent + '\n' + newLines.join('\n') : newLines.join('\n');
				}
				try {
					await this.sendTicketAction(validationId, { closeContent, isClosed: true });
				} catch (e) {
					alert('Erreur lors de la clôture : ' + (e.message || e));
				}
			});
		}



    }

    switchSubTab(subTab) {
        if (this.currentSubTab === subTab) return;
        this.currentSubTab = subTab;
        document.getElementById('tab-validations-todo').classList.toggle('active', subTab === 'todo');
        document.getElementById('tab-validations-closed').classList.toggle('active', subTab === 'closed');
        this.load();
    }


    async load(page = 1) {
        this.ticketModal.classList.add('d-none');
        const isClosed = this.currentSubTab === 'closed';
        try {
            const endpoint = `ecoride/employee/showValidations?page=${page}&isClosed=${isClosed}`;
            const response = await apiService.get(endpoint, getToken());
            const data = await response.json();
            this.lastData = data;
            this.renderList(data, isClosed);
            this.initPagination(data, isClosed);
        } catch (e) {
            this.ticketsList.innerHTML = '<div class="col-12 text-danger">Erreur lors du chargement des validations.</div>';
            console.error('Erreur lors du chargement des validations :', e);
        }
    }

	renderList(data, isClosed) {
		const tickets = data.data || [];
		if (!tickets.length) {
			this.ticketsList.innerHTML = `<div class="col-12 text-center text-muted">Aucune validation ${isClosed ? 'close' : 'à valider, tout se passe bien'}.</div>`;
			return;
		}

		// TABLEAU DESKTOP
		let tableRows = tickets.map(ticket =>
			ticket.validations.map(validation => {
				let status, badgeClass;
				if (validation.isClosed) {
					status = 'Clos';
					badgeClass = 'bg-secondary';
				} else if (validation.supportBy) {
					status = 'Pris en charge';
					badgeClass = 'bg-secondary';
				} else {
					status = 'À examiner';
					badgeClass = 'bg-danger';
				}
				const btnLabel = validation.isClosed ? 'Voir' : (validation.supportBy ? 'Reprendre' : 'Prendre en charge');
				let btnClass = validation.isClosed ? 'btn-outline-primary' : (validation.supportBy ? 'btn-outline-secondary' : 'btn-outline-primary');
				return `
					<tr>
						<td>${UIHelper.sanitizeHtml(ticket.startingCity)}</td>
						<td>${UIHelper.sanitizeHtml(ticket.arrivalCity)}</td>
						<td>${DateUtils.formatDateTime(ticket.startingAt)}</td>
						<td>${UIHelper.sanitizeHtml(ticket.driver.pseudo)}</td>
						<td>${UIHelper.sanitizeHtml(validation.passenger.pseudo)}</td>
						<td>${UIHelper.sanitizeHtml(validation.content)}</td>
						<td><span class="badge ${badgeClass}">${status}</span></td>
						<td>
							<button class="btn ${btnClass} btn-sm btn-take"
								data-ticket-id="${ticket.id}"
								data-validation-id="${validation.id}">
								${btnLabel}
							</button>
						</td>
					</tr>
				`;
			}).join('')
		).join('');

		let tableHtml = `
			<div class="d-none d-md-block">
				<table class="table table-hover align-middle">
					<thead>
						<tr>
							<th>Départ</th>
							<th>Arrivée</th>
							<th>Date</th>
							<th>Conducteur</th>
							<th>Passager</th>
							<th>Problème</th>
							<th>Statut</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						${tableRows}
					</tbody>
				</table>
			</div>
		`;

		// CARTES MOBILE
		let cardsHtml = `
			<div class="d-md-none">
				${tickets.map(ticket =>
					ticket.validations.map(validation => {
						let status, badgeClass;
						if (validation.isClosed) {
							status = 'Clos';
							badgeClass = 'bg-secondary';
						} else if (validation.supportBy) {
							status = 'Pris en charge';
							badgeClass = 'bg-success';
						} else {
							status = 'À examiner';
							badgeClass = 'bg-danger';
						}
						const btnLabel = validation.isClosed ? 'Voir' : 'Prendre en charge';
						let btnClass = validation.isClosed ? 'btn-outline-primary' : 'btn-outline-primary';
						return `
							<div class="ticket-card ticket-card-mobile mb-3">
								<div class="ticket-header mb-2">${UIHelper.sanitizeHtml(ticket.startingCity)} → ${UIHelper.sanitizeHtml(ticket.arrivalCity)}</div>
								<div class="mb-1"><strong>Date :</strong> ${DateUtils.formatDateTime(ticket.startingAt)}</div>
								<div class="mb-1"><strong>Conducteur :</strong> ${UIHelper.sanitizeHtml(ticket.driver.pseudo)}</div>
								<div class="mb-1"><strong>Passager :</strong> ${UIHelper.sanitizeHtml(validation.passenger.pseudo)}</div>
								<div class="mb-1"><strong>Problème :</strong> ${UIHelper.sanitizeHtml(validation.content)}</div>
								<div class="mb-1"><strong>Statut :</strong> <span class="badge ${badgeClass}">${status}</span></div>
								<button class="btn ${btnClass} btn-sm btn-take mt-2 w-100"
									data-ticket-id="${ticket.id}"
									data-validation-id="${validation.id}">
									${btnLabel}
								</button>
							</div>
						`;
					}).join('')
				).join('')}
			</div>
		`;

		this.ticketsList.innerHTML = tableHtml + cardsHtml;

		// Ajout listeners sur les boutons "Prendre en charge" ou "Voir"
		this.ticketsList.querySelectorAll('.btn-take').forEach(btn => {
			btn.addEventListener('click', () => {
				const ticketId = btn.getAttribute('data-ticket-id');
				const validationId = btn.getAttribute('data-validation-id');
				this.openTicketModal(ticketId, validationId, isClosed);
			});
		});
	}

    initPagination(data, isClosed) {
        const { page = 1, limit = 10, total = 0 } = data;
        const totalPages = Math.ceil(total / limit);
        if (totalPages > 1) {
            new Pagination({
                container: this.ticketsList,
                currentPage: page,
                totalPages,
                onPageChange: (p) => this.load(p)
            });
        }
    }


	/*
	 * Ouverture de la modale pour gérer le ticket/validation à faire
	 */
	openTicketModal(ticketId, validationId, isClosed = false) {
		const tickets = this.lastData?.data || [];
		const ticket = tickets.find(t => t.id == ticketId);
		if (!ticket) return;
		const validation = ticket.validations.find(v => v.id == validationId);
		if (!validation) return;
		this.currentTicket = { ticket, validation };

		// Affiche le Ticket ID dans le header sticky
		document.getElementById('modal-ticket-id').textContent = `Ticket ID : ${ticket.id}`;

		// Préférences conducteur
		const driverPrefs = ticket.driver.userPreferences?.map(
			pref => `<li>${UIHelper.sanitizeHtml(pref.libelle)} : ${UIHelper.sanitizeHtml(pref.description)}</li>`
		).join('') || '';

		// Infos véhicule
		const vehicle = ticket.vehicle;
		const vehicleInfo = vehicle ? `
			<div><strong>Véhicule :</strong> ${UIHelper.sanitizeHtml(vehicle.brand)} ${UIHelper.sanitizeHtml(vehicle.model)} (${UIHelper.sanitizeHtml(vehicle.color)}, ${UIHelper.sanitizeHtml(vehicle.energy)}, ${vehicle.maxNbPlacesAvailable} places)</div>
		` : '';

		// Infos passager (validation)
		const passenger = validation.passenger;
		const passengerInfo = passenger ? `
			<div><strong>Passager plaignant :</strong> ${UIHelper.sanitizeHtml(passenger.pseudo)} (${UIHelper.sanitizeHtml(passenger.email)})</div>
		` : '';

		// Infos conducteur
		const driver = ticket.driver;
		const driverInfo = driver ? `
			<div><strong>Conducteur :</strong> ${UIHelper.sanitizeHtml(driver.pseudo)} (${UIHelper.sanitizeHtml(driver.email)})</div>
			<div><strong>Préférences conducteur :</strong><ul>${driverPrefs}</ul></div>
		` : '';

		// Infos validation
		const validationInfo = `
			<div><strong>Commentaire :</strong> ${UIHelper.sanitizeHtml(validation.content)}</div>
			<div><strong>Pris en charge par :</strong> ${
				validation.supportBy
					? UIHelper.sanitizeHtml(validation.supportBy.pseudo) + ' (' + UIHelper.sanitizeHtml(validation.supportBy.email) + ')'
					: 'Non'
			}</div>
			<div><strong>Clôturé :</strong> ${validation.isClosed ? 'Oui' : 'Non'}</div>
			<div><strong>Clôturé par :</strong> ${
				validation.closedBy
					? UIHelper.sanitizeHtml(validation.supportBy.pseudo) + ' (' + UIHelper.sanitizeHtml(validation.supportBy.email) + ')'
					: '-'
			}</div>
			<div><strong>Date création validation :</strong> ${DateUtils.formatDateTime(validation.createdAt)}</div>
			<div><strong>Date maj validation :</strong> ${validation.updatedAt ? DateUtils.formatDateTime(validation.updatedAt) : ''}</div>
		`;

		// Infos passagers du ticket (tableau)
		const passengersList = ticket.passenger?.map(
			p => `<li>${UIHelper.sanitizeHtml(p.pseudo)} (${UIHelper.sanitizeHtml(p.email)})</li>`
		).join('') || '';

		this.modalDetails.innerHTML = `
			<div><strong>Départ :</strong> ${UIHelper.sanitizeHtml(ticket.startingStreet)}, ${UIHelper.sanitizeHtml(ticket.startingPostCode)} ${UIHelper.sanitizeHtml(ticket.startingCity)}</div>
			<div><strong>Arrivée :</strong> ${UIHelper.sanitizeHtml(ticket.arrivalStreet)}, ${UIHelper.sanitizeHtml(ticket.arrivalPostCode)} ${UIHelper.sanitizeHtml(ticket.arrivalCity)}</div>
			<div><strong>Date prévue départ :</strong> ${DateUtils.formatDateTime(ticket.startingAt)}</div>
			<div><strong>Date prévue arrivée :</strong> ${DateUtils.formatDateTime(ticket.arrivalAt)}</div>
			<div><strong>Départ réel :</strong> ${ticket.actualDepartureAt ? DateUtils.formatDateTime(ticket.actualDepartureAt) : ''}</div>
			<div><strong>Arrivée réelle :</strong> ${ticket.actualArrivalAt ? DateUtils.formatDateTime(ticket.actualArrivalAt) : ''}</div>
			<div><strong>Prix :</strong> ${ticket.price} €</div>
			<div><strong>Places disponibles :</strong> ${ticket.nbPlacesAvailable}</div>
			${driverInfo}
			${vehicleInfo}
			<div><strong>Passagers du trajet :</strong><ul>${passengersList}</ul></div>
			${passengerInfo}
			${validationInfo}
			<div><strong>Date création ticket :</strong> ${DateUtils.formatDateTime(ticket.createdAt)}</div>
			<div><strong>Date maj ticket :</strong> ${DateUtils.formatDateTime(ticket.updatedAt)}</div>
		`;

		// Historique des commentaires (closeContent)
		if (validation.closeContent) {
			const lines = validation.closeContent.split(/\r?\n/).filter(l => l.trim() !== '');
			this.historyDiv.innerHTML = '<strong>Historique des commentaires :</strong><br>' +
				lines.map(line => {
					const match = line.match(/^\[(.*?)\](.*)$/);
					if (match) {
						return `<div><span class='text-primary fw-bold'>[${UIHelper.sanitizeHtml(match[1])}]</span>${UIHelper.sanitizeHtml(match[2])}</div>`;
					} else {
						return `<div>${UIHelper.sanitizeHtml(line)}</div>`;
					}
				}).join('');
		} else {
			this.historyDiv.innerHTML = '<strong>Historique des commentaires :</strong> <span class="text-muted">Aucun</span>';
		}

		// Gestion des boutons et textarea selon statut
		const textareaDiv = this.supportContent.parentElement;
		if (validation.isClosed) {
			this.supportContent.value = '';
			this.supportContent.setAttribute('disabled', 'disabled');
			textareaDiv.style.display = 'none';
			if (this.saveBtn) this.saveBtn.style.display = 'none';
			if (this.closeBtn) this.closeBtn.style.display = 'none';
			// Ajout du bouton "Fermer" si absent
			if (!document.getElementById('close-only-btn')) {
				const btn = document.createElement('button');
				btn.id = 'close-only-btn';
				btn.className = 'btn btn-secondary w-100 mt-2';
				btn.textContent = 'Fermer';
				btn.addEventListener('click', () => this.ticketModal.classList.add('d-none'));
				// Ajout à la place des boutons d'action
				if (this.closeBtn?.parentElement) {
					this.closeBtn.parentElement.appendChild(btn);
				} else if (this.saveBtn?.parentElement) {
					this.saveBtn.parentElement.appendChild(btn);
				} else {
					this.modalDetails.parentElement.appendChild(btn);
				}
			}
		} else {
			this.supportContent.removeAttribute('disabled');
			textareaDiv.style.display = '';
			this.supportContent.value = '';
			if (this.saveBtn) this.saveBtn.style.display = '';
			if (this.closeBtn) this.closeBtn.style.display = '';
			const closeOnlyBtn = document.getElementById('close-only-btn');
			if (closeOnlyBtn) closeOnlyBtn.remove();
		}

		this.ticketModal.classList.remove('d-none');
	}

	/**
	 * Envoie une action sur un ticket/validation à l'API (prise en charge ou clôture)
	 * @param {number} validationId - ID de la validation
	 * @param {object} payload - Données à envoyer (ex: { closeContent, isClosed })
	 */
	async sendTicketAction(validationId, payload) {
		try {
			await apiService.put(
				'ecoride/employee/supportValidation/' + validationId,
				payload,
				getToken()
			);
			this.ticketModal.classList.add('d-none');
			this.load();
		} catch (e) {
			alert("Erreur lors de l'envoi de l'action.");
			console.error(e);
		}
	}

}
