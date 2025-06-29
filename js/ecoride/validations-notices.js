import { apiUrl } from '../config.js';
import { getToken, sendFetchRequest, sanitizeHtml, formatDate } from '../script.js';


const noticesList = document.getElementById('notices-list');
const noticeModal = document.getElementById('notice-modal');
const closeModalBtn = document.getElementById('close-notice-modal');
const modalDetails = document.getElementById('modal-notice-details');
const supportContent = document.getElementById('support-content');
let currentNotice = null;
let lastData = null;


// Affiche la liste des avis à examiner (tableau desktop, cartes mobile)
export async function loadNotices(page = 1, isValidated = false) {
    noticeModal.classList.add('d-none');
    try {
        const url = apiUrl + 'ecoride/employee/showNotices?page=' + page + '&isValidated=' + (isValidated ? 'true' : 'false');
        const data = await sendFetchRequest(url, getToken(), 'GET');
        lastData = data;
        noticesList.innerHTML = '';
        // Pagination : récupération des infos
        const notices = data.data || [];
        const currentPage = data.page || 1;
        const limit = data.limit || 10;
        const total = data.total || notices.length;
        const totalPages = Math.ceil(total / limit);

        if (!notices || !Array.isArray(notices) || notices.length === 0) {
            noticesList.innerHTML = '<div class="col-12 text-center text-muted">Aucun avis à valider pour le moment.</div>';
        } else if (window.innerWidth >= 768) {
            // TABLEAU CLASSIQUE
            noticesList.innerHTML = `
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
                    <tbody id="notices-tbody"></tbody>
                </table>
            `;
            const tbody = document.getElementById('notices-tbody');
            notices.forEach(notice => {
                const btnLabel = 'Voir';
                let btnClass = 'btn-outline-primary';
                // Si on est dans l'onglet Clos, adapte la couleur
                if (isValidated) {
                    if (notice.notice.status === 'VALIDATED') {
                        btnClass = 'btn-success';
                    } else if (notice.notice.status === 'REFUSED') {
                        btnClass = 'btn-danger';
                    }
                }
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${sanitizeHtml(notice.relatedFor.startingCity)}</td>
                    <td>${sanitizeHtml(notice.relatedFor.arrivalCity)}</td>
                    <td>${formatDate(notice.relatedFor.startingAt)}</td>
                    <td>${sanitizeHtml(notice.relatedFor.driver.pseudo)}</td>
                    <td>${sanitizeHtml(notice.publishedBy.pseudo)}</td>
                    <td>${sanitizeHtml(notice.notice.title)}</td>
                    <td>${sanitizeHtml(notice.notice.grade)}</td>
                    <td>
                        <button class="btn ${btnClass} btn-sm btn-take"
                            data-notice-id="${notice.notice.id}">
                            ${btnLabel}
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            // AFFICHAGE EN CARTES SUR MOBILE
            let html = '';
            notices.forEach(notice => {
                const btnLabel = 'Voir';
                let btnClass = 'btn-outline-primary';
                // Si on est dans l'onglet Clos, adapte la couleur
                if (isValidated) {
                    if (notice.notice.status === 'VALIDATED') {
                        btnClass = 'btn-success';
                    } else if (notice.notice.status === 'REFUSED') {
                        btnClass = 'btn-danger';
                    }
                }
                html += `
                <div class="notice-card notice-card-mobile mb-3">
                    <div class="notice-header mb-2">${sanitizeHtml(notice.relatedFor.startingCity)} → ${sanitizeHtml(notice.relatedFor.arrivalCity)}</div>
                    <div class="mb-1"><strong>Date :</strong> ${formatDate(notice.relatedFor.startingAt)}</div>
                    <div class="mb-1"><strong>Conducteur :</strong> ${sanitizeHtml(notice.relatedFor.driver.pseudo)}</div>
                    <div class="mb-1"><strong>Passager :</strong> ${sanitizeHtml(notice.publishedBy.pseudo)}</div>
                    <div class="mb-1"><strong>Titre :</strong> ${sanitizeHtml(notice.notice.title)}</div>
                    <div class="mb-1"><strong>Note :</strong> ${sanitizeHtml(notice.notice.grade)}</div>
                    <button class="btn ${btnClass} btn-sm btn-take"
                        data-notice-id="${notice.notice.id}">
                        ${btnLabel}
                    </button>
                </div>
                `;
            });
            noticesList.innerHTML = html;
        }

        //Suite

    } catch (e) {
        console.error('Erreur lors du chargement des avis :', e);
        noticesList.innerHTML = '<div class="col-12 text-danger">Erreur lors du chargement des avis.</div>';
    }

    // Ajout des listeners sur les boutons "Voir"
    document.querySelectorAll('.btn-take').forEach(btn => {
        btn.addEventListener('click', () => {
            openNoticeModal(btn.dataset.noticeId, isValidated);
        });
    });

}

function openNoticeModal(noticeId, isClosed = false) {
    // Récupère l'avis courant dans lastData
    const notices = lastData?.data || [];
    const notice = notices.find(n => n.notice.id == noticeId);
    if (!notice) return;

    // Affiche l'ID dans la modale
    document.getElementById('modal-notice-id').textContent = notice.notice.id;

    // Nettoie le contenu de la modale AVANT d'injecter
    while (modalDetails.firstChild) {
        modalDetails.removeChild(modalDetails.firstChild);
    }

    // Génère les boutons
    let buttonsHtml = '';
    if (isClosed) {
        buttonsHtml = `<button id="close-only-notice" class="btn btn-secondary w-100">Fermer</button>`;
    } else {
        buttonsHtml = `<button id="accept-notice" class="btn btn-primary">Accepter</button><button id="refuse-notice" class="btn btn-danger">Refuser</button>`;
    }

    // Injecte les détails de l'avis
    modalDetails.innerHTML = `
        <div><strong>Départ :</strong> ${sanitizeHtml(notice.relatedFor.startingCity)}</div>
        <div><strong>Arrivée :</strong> ${sanitizeHtml(notice.relatedFor.arrivalCity)}</div>
        <div><strong>Date :</strong> ${formatDate(notice.relatedFor.startingAt)}</div>
        <div><strong>Départ déclaré :</strong> ${formatDate(notice.relatedFor.actualDepartureAt)}</div>
        <div><strong>Arrivée déclarée :</strong> ${formatDate(notice.relatedFor.actualArrivalAt)}</div>
        <div><strong>Conducteur :</strong> ${sanitizeHtml(notice.relatedFor.driver.pseudo)}</div>
        <div><strong>Passager :</strong> ${sanitizeHtml(notice.publishedBy.pseudo)}</div>
        <div><strong>Note :</strong> ${sanitizeHtml(notice.notice.grade)}</div>
        <div><strong>Titre :</strong> ${sanitizeHtml(notice.notice.title)}</div>
        <div><strong>Commentaire :</strong> ${sanitizeHtml(notice.notice.content)}</div>
        <div class="d-flex justify-content-between mt-3">
            ${buttonsHtml}
        </div>
    `;

    // Ajoute les listeners sur les bons boutons
    if (isClosed) {
        document.getElementById('close-only-notice').onclick = () => {
            noticeModal.classList.add('d-none');
        };
    } else {
        document.getElementById('accept-notice').onclick = async () => {
            await sendNoticeAction(noticeId, 'VALIDATED');
        };
        document.getElementById('refuse-notice').onclick = async () => {
            await sendNoticeAction(noticeId, 'REFUSED');
        };
    }

    noticeModal.classList.remove('d-none');
}

closeModalBtn.addEventListener('click', () => {
    noticeModal.classList.add('d-none');
});


async function sendNoticeAction(noticeId, action) {
    try {
        await sendFetchRequest(
            apiUrl + 'ecoride/employee/validateNotice',
            getToken(),
            'POST',
            JSON.stringify({ id: noticeId, action })
        );
        //Fermeture de la modale
        noticeModal.classList.add('d-none');
        //Puis on recharge la liste des avis
        const isClosed = window.currentNoticesSubTab === 'closed';
        loadNotices(1, isClosed);
    } catch (e) {
        console.error(e);
        alert("Erreur lors de l'envoi de l'action.");
    }
}