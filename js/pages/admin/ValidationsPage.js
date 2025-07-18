/*
 * Pour gérer la pages des validations, Avis (notes et avis) et Validations (quand Covoiturage s'est mal déroulé)
 */
import { ValidationsNotices } from '../../components/admin/ValidationsNotices.js';
import { ValidationsTickets } from '../../components/admin/ValidationsTickets.js';

export class ValidationsPage {
    constructor() {
        this.notices = new ValidationsNotices();
        this.tickets = new ValidationsTickets();
        this.currentTab = 'notices'; // notices | validations

        this.initTabListeners();
        this.tabManagement(this.currentTab);
    }

    initTabListeners() {
        document.getElementById('tab-notices').addEventListener('click', () => {
            this.tabManagement('notices');
        });
        document.getElementById('tab-validations').addEventListener('click', () => {
            this.tabManagement('validations');
        });
    }

    tabManagement(tab) {
        this.currentTab = tab;
        if (tab === 'notices') {
            document.getElementById('tab-notices').classList.add('active');
            document.getElementById('tab-validations').classList.remove('active');
            document.getElementById('tab-notices-pane').classList.add('show', 'active');
            document.getElementById('tab-validations-pane').classList.remove('show', 'active');
            this.notices.load(); // recharge les avis
        } else {
            document.getElementById('tab-validations').classList.add('active');
            document.getElementById('tab-notices').classList.remove('active');
            document.getElementById('tab-validations-pane').classList.add('show', 'active');
            document.getElementById('tab-notices-pane').classList.remove('show', 'active');
            this.tickets.load(); // recharge les tickets
        }
    }
    
	switchNoticesSubTab(subTab) {
		currentNoticesSubTab = subTab;
		document.getElementById('tab-notices-todo').classList.toggle('active', subTab === 'todo');
		document.getElementById('tab-notices-closed').classList.toggle('active', subTab === 'closed');
		loadNotices(1, subTab === 'closed');
	}

	switchValidationSubTab(subTab) {
		currentValidationSubTab = subTab;
		// Gestion visuelle des sous-onglets
		document.getElementById('tab-validations-todo').classList.toggle('active', subTab === 'todo');
		document.getElementById('tab-validations-closed').classList.toggle('active', subTab === 'closed');
		// Chargement des tickets selon le sous-onglet
		loadTickets(1, subTab === 'closed');
	}

    
}

// Initialiser la page
new ValidationsPage();

console.log('Pages des validations : ', ValidationsPage);
