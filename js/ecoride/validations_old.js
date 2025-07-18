import { loadTickets } from './validations-validations.js';
import { loadNotices } from './validations-notices.js';


const defaultTab = 'notices'; // ou 'validations'
let lastActiveTab = defaultTab;
let currentValidationSubTab = 'todo'; // 'todo' ou 'closed'
let currentNoticesSubTab = 'todo'; // 'todo' ou 'closed'


// Actions au chargement des onglets principaux
tabManagement(defaultTab);

document.getElementById('tab-notices').addEventListener('click', () => {
    tabManagement('notices');
});
document.getElementById('tab-validations').addEventListener('click', () => {
    tabManagement('validations');
});

// Listeners pour les sous-onglets avis
document.getElementById('tab-notices-todo').addEventListener('click', () => {
    switchNoticesSubTab('todo');
});
document.getElementById('tab-notices-closed').addEventListener('click', () => {
    switchNoticesSubTab('closed');
});

// Actions au chargement des sous-onglets validations
document.getElementById('tab-validations-todo').addEventListener('click', () => {
    switchValidationSubTab('todo');
});
document.getElementById('tab-validations-closed').addEventListener('click', () => {
    switchValidationSubTab('closed');
});

function tabManagement(activeTab) {
    lastActiveTab = activeTab;
    if (activeTab === 'notices') {
        switchNoticesSubTab(currentNoticesSubTab);
        document.getElementById('tab-notices').classList.add('active');
        document.getElementById('tab-validations').classList.remove('active');
        document.getElementById('tab-notices-pane').classList.add('show', 'active');
        document.getElementById('tab-validations-pane').classList.remove('show', 'active');
    } else {
        switchValidationSubTab(currentValidationSubTab);
        document.getElementById('tab-validations').classList.add('active');
        document.getElementById('tab-notices').classList.remove('active');
        document.getElementById('tab-validations-pane').classList.add('show', 'active');
        document.getElementById('tab-notices-pane').classList.remove('show', 'active');
    }
}

function switchNoticesSubTab(subTab) {
    currentNoticesSubTab = subTab;
    document.getElementById('tab-notices-todo').classList.toggle('active', subTab === 'todo');
    document.getElementById('tab-notices-closed').classList.toggle('active', subTab === 'closed');
    loadNotices(1, subTab === 'closed');
}

function switchValidationSubTab(subTab) {
    currentValidationSubTab = subTab;
    // Gestion visuelle des sous-onglets
    document.getElementById('tab-validations-todo').classList.toggle('active', subTab === 'todo');
    document.getElementById('tab-validations-closed').classList.toggle('active', subTab === 'closed');
    // Chargement des tickets selon le sous-onglet
    loadTickets(1, subTab === 'closed');
}


window.addEventListener('resize', () => {
    if (lastActiveTab === 'avis') {
        loadNotices(1, currentNoticesSubTab === 'closed');
    } else {
        loadTickets(1, currentValidationSubTab === 'closed');
    }
});
