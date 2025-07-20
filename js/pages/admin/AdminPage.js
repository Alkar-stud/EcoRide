import { AdminCredits } from '../../components/admin/AdminCredits.js';
import { AdminStats } from '../../components/admin/AdminStats.js';
import { AdminAccounts } from '../../components/admin/AdminAccounts.js';
import { AdminSettings } from '../../components/admin/AdminSettings.js';

export class AdminPage {
    constructor() {
		this.credits = new AdminCredits();
        this.stats = new AdminStats();
        this.accounts = new AdminAccounts();
        this.settings = new AdminSettings();
        this.credits.load();
        this.showTab('stats');
        this.initTabListeners();

    }

    initTabListeners() {
        document.getElementById('tab-stats').addEventListener('click', () => this.showTab('stats'));
        document.getElementById('tab-accounts').addEventListener('click', () => this.showTab('accounts'));
        document.getElementById('tab-settings').addEventListener('click', () => this.showTab('settings'));
    }

    showTab(tab) {
        // Onglets
        ['stats', 'accounts', 'settings'].forEach(t => {
            document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
            document.getElementById(`${t}-pane`).classList.toggle('d-none', t !== tab);
        });
        // Chargement du module concerné
        if (tab === 'stats') this.stats.load();
        if (tab === 'accounts') this.accounts.load();
        if (tab === 'settings') this.settings.load();
    }
}

new AdminPage();
