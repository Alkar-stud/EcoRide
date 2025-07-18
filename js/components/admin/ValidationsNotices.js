import { apiService } from '../../core/ApiService.js';
import { Pagination } from '../common/Pagination.js';
import { getToken } from '../../script.js';
import { UIHelper } from '../../utils/helpers/UIHelper.js';
import { DateUtils } from '../../utils/helpers/DateHelper.js';

export class ValidationsNotices {
    constructor() {
        this.currentSubTab = 'todo'; // 'todo' ou 'closed'
        this.noticesList = document.getElementById('notices-list');
        this.noticeModal = document.getElementById('notice-modal');
        this.closeModalBtn = document.getElementById('close-notice-modal');
        this.modalDetails = document.getElementById('modal-notice-details');
        this.lastData = null;

        // Listeners sur les sous-onglets
        document.getElementById('tab-notices-todo').addEventListener('click', () => {
            this.switchSubTab('todo');
        });
        document.getElementById('tab-notices-closed').addEventListener('click', () => {
            this.switchSubTab('closed');
        });

        this.closeModalBtn.addEventListener('click', () => {
            this.noticeModal.classList.add('d-none');
        });
    }

    switchSubTab(subTab) {
        if (this.currentSubTab === subTab) return;
        this.currentSubTab = subTab;
        document.getElementById('tab-notices-todo').classList.toggle('active', subTab === 'todo');
        document.getElementById('tab-notices-closed').classList.toggle('active', subTab === 'closed');
        this.load();
    }

    async load(page = 1) {
        this.noticeModal.classList.add('d-none');
        const isValidated = this.currentSubTab === 'closed';
        try {
            const endpoint = `ecoride/employee/showNotices?page=${page}&isValidated=${isValidated}`;
            const response = await apiService.get(endpoint, getToken());
            const data = await response.json();
            this.lastData = data;
            this.renderList(data, isValidated);
            this.initPagination(data, isValidated);
        } catch (e) {
            this.noticesList.innerHTML = '<div class="col-12 text-danger">Erreur lors du chargement des avis.</div>';
            console.error('Erreur lors du chargement des avis :', e);
        }
    }

	renderList(data, isValidated) {
		const notices = data.data || [];
		if (!notices.length) {
			this.noticesList.innerHTML = `<div class="col-12 text-center text-muted">Aucun avis ${isValidated ? 'clos':'à valider'} pour le moment.</div>`;
			return;
		}

		// Génère les lignes du tableau
		let tableRows = notices.map(notice => {
			const btnLabel = 'Voir';
			let btnClass = 'btn-outline-primary';
			if (isValidated) {
				if (notice.notice.status === 'VALIDATED') btnClass = 'btn-success';
				else if (notice.notice.status === 'REFUSED') btnClass = 'btn-danger';
			}
			return `
				<tr>
					<td>${UIHelper.sanitizeHtml(notice.relatedFor.startingCity)}</td>
					<td>${UIHelper.sanitizeHtml(notice.relatedFor.arrivalCity)}</td>
					<td>${DateUtils.formatDateTime(notice.relatedFor.startingAt)}</td>
					<td>${UIHelper.sanitizeHtml(notice.relatedFor.driver.pseudo)}</td>
					<td>${UIHelper.sanitizeHtml(notice.publishedBy.pseudo)}</td>
					<td>${UIHelper.sanitizeHtml(notice.notice.title)}</td>
					<td>${UIHelper.sanitizeHtml(notice.notice.grade)}</td>
					<td>
						<button class="btn ${btnClass} btn-sm btn-take"
							data-notice-id="${notice.notice.id}">
							${btnLabel}
						</button>
					</td>
				</tr>
			`;
		}).join('');

		// Génère le tableau desktop
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
							<th>Titre</th>
							<th>Note</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						${tableRows}
					</tbody>
				</table>
			</div>
		`;

		// Génère les cartes mobile
		let cardsHtml = `
			<div class="d-md-none">
				${notices.map(notice => {
					const btnLabel = 'Voir';
					let btnClass = 'btn-outline-primary';
					if (isValidated) {
						if (notice.notice.status === 'VALIDATED') btnClass = 'btn-success';
						else if (notice.notice.status === 'REFUSED') btnClass = 'btn-danger';
					}
					return `
					<div class="notice-card notice-card-mobile mb-3">
						<div class="notice-header mb-2">${UIHelper.sanitizeHtml(notice.relatedFor.startingCity)} → ${UIHelper.sanitizeHtml(notice.relatedFor.arrivalCity)}</div>
						<div class="mb-1"><strong>Date :</strong> ${DateUtils.formatDateTime(notice.relatedFor.startingAt)}</div>
						<div class="mb-1"><strong>Conducteur :</strong> ${UIHelper.sanitizeHtml(notice.relatedFor.driver.pseudo)}</div>
						<div class="mb-1"><strong>Passager :</strong> ${UIHelper.sanitizeHtml(notice.publishedBy.pseudo)}</div>
						<div class="mb-1"><strong>Titre :</strong> ${UIHelper.sanitizeHtml(notice.notice.title)}</div>
						<div class="mb-1"><strong>Note :</strong> ${UIHelper.sanitizeHtml(notice.notice.grade)}</div>
						<button class="btn ${btnClass} btn-sm btn-take"
							data-notice-id="${notice.notice.id}">
							${btnLabel}
						</button>
					</div>
					`;
				}).join('')}
			</div>
		`;

		// Injecte les deux versions dans le DOM
		this.noticesList.innerHTML = tableHtml + cardsHtml;

		// Ajoute les listeners sur tous les boutons "Voir"
		this.noticesList.querySelectorAll('.btn-take').forEach(btn => {
			btn.addEventListener('click', () => {
				this.openNoticeModal(btn.dataset.noticeId, isValidated);
			});
		});
	}

    initPagination(data, isValidated) {
        const { page = 1, limit = 10, total = 0 } = data;
        const totalPages = Math.ceil(total / limit);
        if (totalPages > 1) {
            new Pagination({
                container: this.noticesList,
                currentPage: page,
                totalPages,
                onPageChange: (p) => this.load(p)
            });
        }
    }

	/*
	 * Ouverture de la modale pour valider/refuser l'avis
	 */
    openNoticeModal(noticeId, isClosed = false) {
        const notices = this.lastData?.data || [];
        const notice = notices.find(n => n.notice.id == noticeId);
        if (!notice) return;

        document.getElementById('modal-notice-id').textContent = notice.notice.id;
        this.modalDetails.innerHTML = `
            <div><strong>Départ :</strong> ${UIHelper.sanitizeHtml(notice.relatedFor.startingCity)}</div>
            <div><strong>Arrivée :</strong> ${UIHelper.sanitizeHtml(notice.relatedFor.arrivalCity)}</div>
            <div><strong>Date :</strong> ${DateUtils.formatDateTime(notice.relatedFor.startingAt)}</div>
            <div><strong>Départ déclaré :</strong> ${DateUtils.formatDateTime(notice.relatedFor.actualDepartureAt)}</div>
            <div><strong>Arrivée déclarée :</strong> ${DateUtils.formatDateTime(notice.relatedFor.actualArrivalAt)}</div>
            <div><strong>Conducteur :</strong> ${UIHelper.sanitizeHtml(notice.relatedFor.driver.pseudo)}</div>
            <div><strong>Passager :</strong> ${UIHelper.sanitizeHtml(notice.publishedBy.pseudo)}</div>
            <div><strong>Note :</strong> ${UIHelper.sanitizeHtml(notice.notice.grade)}</div>
            <div><strong>Titre :</strong> ${UIHelper.sanitizeHtml(notice.notice.title)}</div>
            <div><strong>Commentaire :</strong> ${UIHelper.sanitizeHtml(notice.notice.content)}</div>
            <div class="d-flex justify-content-between mt-3">
                ${isClosed
                    ? `<button id="close-only-notice" class="btn btn-secondary w-100">Fermer</button>`
                    : `<button id="accept-notice" class="btn btn-primary">Accepter</button>
                       <button id="refuse-notice" class="btn btn-danger">Refuser</button>`
                }
            </div>
        `;

        if (isClosed) {
            document.getElementById('close-only-notice').onclick = () => this.noticeModal.classList.add('d-none');
        } else {
            document.getElementById('accept-notice').onclick = async () => {
                await this.sendNoticeAction(noticeId, 'VALIDATED');
            };
            document.getElementById('refuse-notice').onclick = async () => {
                await this.sendNoticeAction(noticeId, 'REFUSED');
            };
        }

        this.noticeModal.classList.remove('d-none');
    }


	/*
	 * Envoi de la validation ou refus de l'avis ) l'API
	 */
    async sendNoticeAction(noticeId, action) {
        try {
            await apiService.post('ecoride/employee/validateNotice', { id: noticeId, action }, getToken());
            this.noticeModal.classList.add('d-none');
            this.load();
        } catch (e) {
            alert("Erreur lors de l'envoi de l'action.");
            console.error(e);
        }
    }
}
