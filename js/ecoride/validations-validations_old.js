import { apiUrl } from '../config.js';
import { getToken, sendFetchRequest, sanitizeHtml, formatDate } from '../script.js';


const ticketsList = document.getElementById('tickets-list');
const ticketModal = document.getElementById('ticket-modal');
const closeModalBtn = document.getElementById('close-ticket-modal');
const modalDetails = document.getElementById('modal-ticket-details');
const supportContent = document.getElementById('support-content');
let currentTicket = null;
let lastData = null;


// Affiche la liste des tickets à examiner (tableau desktop, cartes mobile)
export async function loadTickets(page = 1, isClosed = false) {
    try {
        const url = apiUrl + 'ecoride/employee/showValidations?page=' + page + '&isClosed=' + (isClosed ? 'true' : 'false');
        const data = await sendFetchRequest(url, getToken(), 'GET');
        lastData = data;
        ticketsList.innerHTML = '';
        // Pagination : récupération des infos
        const tickets = data.data || [];
        const currentPage = data.page || 1;
        const limit = data.limit || 10;
        const total = data.total || tickets.length;
        const totalPages = Math.ceil(total / limit);

        if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
            ticketsList.innerHTML = '<div class="col-12 text-center text-muted">Aucun ticket à valider pour le moment, tout se passe bien !</div>';
        } else if (window.innerWidth >= 768) {
            // TABLEAU CLASSIQUE
            ticketsList.innerHTML = `
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
                    <tbody id="tickets-tbody"></tbody>
                </table>
            `;
            const tbody = document.getElementById('tickets-tbody');
            tickets.forEach(ticket => {
                ticket.validations.forEach(validation => {
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
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${sanitizeHtml(ticket.startingCity)}</td>
                        <td>${sanitizeHtml(ticket.arrivalCity)}</td>
                        <td>${formatDate(ticket.startingAt)}</td>
                        <td>${sanitizeHtml(ticket.driver.pseudo)}</td>
                        <td>${sanitizeHtml(validation.passenger.pseudo)}</td>
                        <td>${sanitizeHtml(validation.content)}</td>
                        <td><span class="badge ${badgeClass}">${status}</span></td>
                        <td>
                            <button class="btn btn-outline-primary btn-sm btn-take"
                                data-ticket-id="${ticket.id}"
                                data-validation-id="${validation.id}">
                                ${btnLabel}
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            });
        } else {
            // AFFICHAGE EN CARTES SUR MOBILE
            let html = '';
            tickets.forEach(ticket => {
                ticket.validations.forEach(validation => {
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
                    html += `
                    <div class="ticket-card ticket-card-mobile mb-3">
                        <div class="ticket-header mb-2">${sanitizeHtml(ticket.startingCity)} → ${sanitizeHtml(ticket.arrivalCity)}</div>
                        <div class="mb-1"><strong>Date :</strong> ${formatDate(ticket.startingAt)}</div>
                        <div class="mb-1"><strong>Conducteur :</strong> ${sanitizeHtml(ticket.driver.pseudo)}</div>
                        <div class="mb-1"><strong>Passager :</strong> ${sanitizeHtml(validation.passenger.pseudo)}</div>
                        <div class="mb-1"><strong>Problème :</strong> ${sanitizeHtml(validation.content)}</div>
                        <div class="mb-1"><strong>Statut :</strong> <span class="badge ${badgeClass}">${status}</span></div>
                        <button class="btn btn-outline-primary btn-sm btn-take mt-2 w-100"
                            data-ticket-id="${ticket.id}"
                            data-validation-id="${validation.id}">
                            ${btnLabel}
                        </button>
                    </div>
                    `;
                });
            });
            ticketsList.innerHTML = html;
        }
        // Ajout des listeners sur les boutons "Prise en charge"
        document.querySelectorAll('.btn-take').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ticketId = btn.getAttribute('data-ticket-id');
                const validationId = btn.getAttribute('data-validation-id');
                openModal(tickets, ticketId, validationId);
            });
        });
        // Pagination
        let paginationHtml = '';
        if (totalPages > 1) {
            paginationHtml += '<nav class="d-flex justify-content-center mt-3"><ul class="pagination">';
            // Précédent
            paginationHtml += `<li class="page-item${currentPage === 1 ? ' disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">Précédent</a></li>`;
            // Pages
            for (let i = 1; i <= totalPages; i++) {
                paginationHtml += `<li class="page-item${i === currentPage ? ' active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
            }
            // Suivant
            paginationHtml += `<li class="page-item${currentPage === totalPages ? ' disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">Suivant</a></li>`;
            paginationHtml += '</ul></nav>';
        }
        // Ajout de la pagination sous la liste
        ticketsList.insertAdjacentHTML('afterend', paginationHtml);
        // Listeners pagination
        document.querySelectorAll('.pagination a.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.getAttribute('data-page'));
                if (!isNaN(page) && page >= 1 && page <= totalPages && page !== currentPage) {
                    loadTickets(page);
                }
            });
        });
    } catch (e) {
        console.error('Erreur lors du chargement des tickets :', e);
        ticketsList.innerHTML = '<div class="col-12 text-danger">Erreur lors du chargement des tickets.</div>';
    }
}


// Ouvre la modale avec les détails du ticket
function openModal(data, ticketId, validationId) {
    const ticket = data.find(t => t.id == ticketId);
    if (!ticket) return;
    const validation = ticket.validations.find(v => v.id == validationId);
    if (!validation) return;
    currentTicket = { ticket, validation };

    // Affiche le Ticket ID dans le header sticky
    document.getElementById('modal-ticket-id').textContent = `Ticket ID : ${ticket.id}`;

    // Préférences conducteur
    const driverPrefs = ticket.driver.userPreferences?.map(
        pref => `<li>${sanitizeHtml(pref.libelle)} : ${sanitizeHtml(pref.description)}</li>`
    ).join('') || '';

    // Infos véhicule
    const vehicle = ticket.vehicle;
    const vehicleInfo = vehicle ? `
        <div><strong>Véhicule :</strong> ${sanitizeHtml(vehicle.brand)} ${sanitizeHtml(vehicle.model)} (${sanitizeHtml(vehicle.color)}, ${sanitizeHtml(vehicle.energy)}, ${vehicle.maxNbPlacesAvailable} places)</div>
    ` : '';

    // Infos passager (validation)
    const passenger = validation.passenger;
    const passengerInfo = passenger ? `
        <div><strong>Passager plaignant :</strong> ${sanitizeHtml(passenger.pseudo)} (${sanitizeHtml(passenger.email)})</div>
    ` : '';

    // Infos conducteur
    const driver = ticket.driver;
    const driverInfo = driver ? `
        <div><strong>Conducteur :</strong> ${sanitizeHtml(driver.pseudo)} (${sanitizeHtml(driver.email)})</div>
        <div><strong>Préférences conducteur :</strong><ul>${driverPrefs}</ul></div>
    ` : '';

    // Infos validation
    const validationInfo = `
        <div><strong>Commentaire :</strong> ${sanitizeHtml(validation.content)}</div>
        <div><strong>Pris en charge par :</strong> ${validation.supportBy ? sanitizeHtml(validation.supportBy.pseudo) : 'Non'}</div>
        <div><strong>Clôturé :</strong> ${validation.isClosed ? 'Oui' : 'Non'}</div>
        <div><strong>Clôturé par :</strong> ${validation.closedBy ? sanitizeHtml(validation.closedBy) : '-'}</div>
        <div><strong>Date création validation :</strong> ${formatDate(validation.createdAt)}</div>
        <div><strong>Date maj validation :</strong> ${validation.updatedAt ? formatDate(validation.updatedAt) : ''}</div>
    `;

    // Infos passagers du ticket (tableau)
    const passengersList = ticket.passenger?.map(
        p => `<li>${sanitizeHtml(p.pseudo)} (${sanitizeHtml(p.email)})</li>`
    ).join('') || '';

    modalDetails.innerHTML = `
        <div><strong>Départ :</strong> ${sanitizeHtml(ticket.startingStreet)}, ${sanitizeHtml(ticket.startingPostCode)} ${sanitizeHtml(ticket.startingCity)}</div>
        <div><strong>Arrivée :</strong> ${sanitizeHtml(ticket.arrivalStreet)}, ${sanitizeHtml(ticket.arrivalPostCode)} ${sanitizeHtml(ticket.arrivalCity)}</div>
        <div><strong>Date prévue départ :</strong> ${formatDate(ticket.startingAt)}</div>
        <div><strong>Date prévue arrivée :</strong> ${formatDate(ticket.arrivalAt)}</div>
        <div><strong>Départ réel :</strong> ${ticket.actualDepartureAt ? formatDate(ticket.actualDepartureAt) : ''}</div>
        <div><strong>Arrivée réelle :</strong> ${ticket.actualArrivalAt ? formatDate(ticket.actualArrivalAt) : ''}</div>
        <div><strong>Prix :</strong> ${ticket.price} €</div>
        <div><strong>Places disponibles :</strong> ${ticket.nbPlacesAvailable}</div>
        ${driverInfo}
        ${vehicleInfo}
        <div><strong>Passagers du trajet :</strong><ul>${passengersList}</ul></div>
        ${passengerInfo}
        ${validationInfo}
        <div><strong>Date création ticket :</strong> ${formatDate(ticket.createdAt)}</div>
        <div><strong>Date maj ticket :</strong> ${formatDate(ticket.updatedAt)}</div>
    `;

    // Affichage de l'historique des commentaires (closeContent)
    const historyDiv = document.getElementById('support-history');
    if (validation.closeContent) {
        // On affiche chaque ligne de l'historique dans un <div>, timestamp en gras
        const lines = validation.closeContent.split(/\r?\n/).filter(l => l.trim() !== '');
        historyDiv.innerHTML = '<strong>Historique des commentaires :</strong><br>' +
            lines.map(line => {
                const match = line.match(/^\[(.*?)\](.*)$/);
                if (match) {
                    return `<div><span class='text-primary fw-bold'>[${sanitizeHtml(match[1])}]</span>${sanitizeHtml(match[2])}</div>`;
                } else {
                    return `<div>${sanitizeHtml(line)}</div>`;
                }
            }).join('');
    } else {
        historyDiv.innerHTML = '<strong>Historique des commentaires :</strong> <span class="text-muted">Aucun</span>';
    }
    // Désactive ou masque le textarea si le ticket est clos
    const textareaDiv = supportContent.parentElement;
    const saveBtn = document.getElementById('save-support');
    const closeBtn = document.getElementById('close-ticket');
    let closeOnlyBtn = document.getElementById('close-only-btn');
    if (closeOnlyBtn) closeOnlyBtn.remove(); // Nettoyage éventuel

    if (validation.isClosed) {
        supportContent.value = '';
        supportContent.setAttribute('disabled', 'disabled');
        textareaDiv.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'none';
        // Ajout du bouton "Fermer" si absent
        if (!document.getElementById('close-only-btn')) {
            const btn = document.createElement('button');
            btn.id = 'close-only-btn';
            btn.className = 'btn btn-secondary w-100 mt-2';
            btn.textContent = 'Fermer';
            btn.addEventListener('click', closeModal);
            // Ajout à la place des boutons d'action
            if (closeBtn?.parentElement) {
                closeBtn.parentElement.appendChild(btn);
            } else if (saveBtn?.parentElement) {
                saveBtn.parentElement.appendChild(btn);
            } else {
                // fallback: ajout à la fin de la modale
                modalDetails.parentElement.appendChild(btn);
            }
        }
    } else {
        supportContent.removeAttribute('disabled');
        textareaDiv.style.display = '';
        supportContent.value = '';
        if (saveBtn) saveBtn.style.display = '';
        if (closeBtn) closeBtn.style.display = '';
        if (closeOnlyBtn) closeOnlyBtn.remove();
    }
    ticketModal.classList.remove('d-none');
}

// Ferme la modale
function closeModal() {
    ticketModal.classList.add('d-none');
    currentTicket = null;
}


// Listeners pour la fermeture de la modale
closeModalBtn.addEventListener('click', closeModal);
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// Listener pour le bouton Enregistrer
const saveSupportBtn = document.getElementById('save-support');
if (saveSupportBtn) {
    saveSupportBtn.addEventListener('click', async () => {
        if (!currentTicket) return;
        const content = supportContent.value.trim();
        if (!content) {
            alert('Le commentaire est obligatoire pour enregistrer.');
            supportContent.focus();
            return;
        }
        const validationId = currentTicket.validation.id;
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let closeContent = currentTicket.validation.closeContent ? currentTicket.validation.closeContent.trim() : '';
        if (content) {
            // Ajoute la date/heure devant chaque nouvelle ligne ajoutée
            const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
            const newLines = lines.map(line => `[${dateStr}] ${line}`);
            closeContent = closeContent ? closeContent + '\n' + newLines.join('\n') : newLines.join('\n');
        }
        try {
            await sendFetchRequest(
                apiUrl + 'ecoride/employee/supportValidation/' + validationId,
                getToken(),
                'PUT',
                JSON.stringify({ closeContent }),
                { 'Content-Type': 'application/json' }
            );
            closeModal();
            loadTickets();
        } catch (e) {
            alert('Erreur lors de l\'enregistrement : ' + (e.message || e));
        }
    });
}

// Listener pour le bouton Clôturer
const closeTicketBtn = document.getElementById('close-ticket');
if (closeTicketBtn) {
    closeTicketBtn.addEventListener('click', async () => {
        if (!currentTicket) return;
        if (!confirm('Voulez-vous vraiment clôturer ce ticket ?')) return;
        const validationId = currentTicket.validation.id;
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let content = supportContent.value.trim();
        let closeContent = currentTicket.validation.closeContent ? currentTicket.validation.closeContent.trim() : '';
        if (content) {
            // Ajoute la date/heure devant chaque nouvelle ligne ajoutée
            const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
            const newLines = lines.map(line => `[${dateStr}] ${line}`);
            closeContent = closeContent ? closeContent + '\n' + newLines.join('\n') : newLines.join('\n');
        }
        try {
            await sendFetchRequest(
                apiUrl + 'ecoride/employee/supportValidation/' + validationId,
                getToken(),
                'PUT',
                JSON.stringify({ closeContent, isClosed: true }),
                { 'Content-Type': 'application/json' }
            );
            closeModal();
            loadTickets();
        } catch (e) {
            alert('Erreur lors de la clôture : ' + (e.message || e));
        }
    });
}

