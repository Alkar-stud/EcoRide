const DEFAULT_STATE = 'COMING'; // Statut par défaut pour les covoiturages

const STATES_LABELS = {
    COMING: 'À venir',
    PROGRESSING: 'En cours',
    VALIDATIONPROCESSING: 'En attente de validation',
    CANCELED: 'Annulé',
    FINISHED: 'Terminé',
    BADEXP: 'En attente d\'examen',
    all: 'Tous'
};

const STATES_COLORS = {
    all: 'btn-secondary',
    COMING: 'btn-primary',
    PROGRESSING: 'btn-info',
    VALIDATIONPROCESSING: 'btn-warning',
    BADEXP: 'btn-warning',
    FINISHED: 'btn-success',
    CANCELED: 'btn-danger'
};

// Ordre des statuts à afficher
const STATES_ORDER = [
    'all',
    'COMING',
    'PROGRESSING',
    'VALIDATIONPROCESSING',
    'BADEXP',
    'FINISHED',
    'CANCELED'
];


// Mapping des transitions d'état
const STATES_TRANSITIONS = {
start: { initial: ['COMING'], become: 'PROGRESSING' },
stop: { initial: ['PROGRESSING'], become: 'VALIDATIONPROCESSING' },
badxp: { initial: ['VALIDATIONPROCESSING'], become: 'AWAITINGVALIDATION' },
finish: { initial: ['AWAITINGVALIDATION', 'VALIDATIONPROCESSING'], become: 'FINISHED' },
cancel: { initial: ['COMING'], become: 'CANCELED' }
};


export {    
    STATES_LABELS,
    STATES_COLORS,
    STATES_TRANSITIONS,
    DEFAULT_STATE,
    STATES_ORDER
};
