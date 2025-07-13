// Détection simple de l'environnement
const isProd = window.location.hostname.includes('ecoridestud.alwaysdata.net');

// URLs selon l'environnement
const baseUrl = isProd ? 'https://ecoridestud.alwaysdata.net/' : 'https://localhost:8000/';

// Export des URLs
export const url = baseUrl;
export const apiUrl = url + 'api/';
export const photoUrl = url + 'uploads/photos/';

// Afficher l'environnement en console (optionnel)
console.log(`Environnement: ${isProd ? 'PRODUCTION' : 'LOCAL'}`);

/*
export const url = 'https://localhost:8000/'
export const apiUrl = url + 'api/'
export const photoUrl = url + 'uploads/photos/'
*/