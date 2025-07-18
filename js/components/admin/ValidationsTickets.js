import { STATES_TRANSITIONS } from '../../utils/constants/CovoituragesConstants.js'; // Import des constantes
import { apiService } from '../../core/ApiService.js';
import { Pagination } from '../common/Pagination.js';

export class ValidationsTickets {
    constructor() {
        this.currentSubTab = 'todo'; // todo | closed
        this.lastData = null;
        this.listContainer = document.getElementById('tickets-list');
        this.modal = document.getElementById('ticket-modal');
        this.modalDetails = document.getElementById('modal-ticket-details');
        this.supportContent = document.getElementById('support-content');
        this.closeModalBtn = document.getElementById('close-ticket-modal');
        this.saveBtn = document.getElementById('save-support');
        this.closeBtn = document.getElementById('close-ticket');
        this.historyDiv = document.getElementById('support-history');
        this.currentTicket = null;

    }

    load() {
        // ... code pour charger les tickets ...
        console.log('Chargement des tickets');
    }


	refreshTab(currentSubTab) {
		
		console.log('Rechargement des tickets');
	}

}
