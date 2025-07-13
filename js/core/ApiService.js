// core/ApiService.js
import { apiUrl } from '../config.js';

export class ApiService {
    constructor() {
        this.apiUrl = apiUrl;
        this.pendingRequests = new Map();
    }

    /**
     * Envoie une requête à l'API
     * @param {string} endpoint - Point d'entrée de l'API (sans le préfixe apiUrl)
     * @param {string|null} token - Token d'authentification
     * @param {string} method - Méthode HTTP (GET, POST, PUT, DELETE)
     * @param {string|FormData|null} body - Corps de la requête
     * @param {boolean} isFile - Si le corps est un FormData (pour l'upload de fichiers)
     * @returns {Promise<Response>} - Réponse de l'API
     */
    async send(endpoint, token = null, method = 'GET', body = null, isFile = false) {
        // Construire l'URL complète
        const url = `${this.apiUrl}${endpoint}`;
        
        // Générer une clé unique pour cette requête
        const requestKey = `${method}:${url}:${Date.now()}`;
        
        // Configuration de la requête
        const requestOptions = {
            method,
            headers: {}
        };
        
        // Ajouter l'en-tête d'autorisation si un token est fourni
        if (token) {
            requestOptions.headers['X-AUTH-TOKEN'] = token;
        }
        
        // Ajouter le corps de la requête si nécessaire
        if (body) {
            if (isFile) {
                // Pour FormData, ne pas définir Content-Type (le navigateur le fait automatiquement)
                requestOptions.body = body;
            } else {
                requestOptions.headers['Content-Type'] = 'application/json';
                requestOptions.body = body;
            }
        }
        
        try {
           
            // Stocker la promesse de requête
            const requestPromise = fetch(url, requestOptions);
            this.pendingRequests.set(requestKey, requestPromise);
            
            // Attendre la réponse
            const response = await requestPromise;
           
            // Gérer les erreurs non-HTTP (réseau, CORS, etc.)
            if (!response.ok) {
                // On ne lance pas d'exception pour permettre à l'appelant de gérer l'erreur
                console.warn(`Requête API échouée: ${response.status} ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            // Erreurs de réseau ou CORS
            console.error(`Erreur réseau lors de la requête à ${url}:`, error);
            
            throw error;
        } finally {
            // Supprimer la requête de la liste des requêtes en cours
            this.pendingRequests.delete(requestKey);
        }
    }


    /**
     * Effectue une requête GET
     * @param {string} endpoint - Point d'entrée de l'API
     * @param {string|null} token - Token d'authentification
     * @returns {Promise<Response>} - Réponse de l'API
     */
    async get(endpoint, token = null) {
        return this.send(endpoint, token, 'GET');
    }

    /**
     * Effectue une requête POST
     * @param {string} endpoint - Point d'entrée de l'API
     * @param {object} data - Données à envoyer
     * @param {string|null} token - Token d'authentification
     * @returns {Promise<Response>} - Réponse de l'API
     */
    async post(endpoint, data, token = null) {
        return this.send(endpoint, token, 'POST', JSON.stringify(data));
    }

    /**
     * Effectue une requête PUT
     * @param {string} endpoint - Point d'entrée de l'API
     * @param {object} data - Données à envoyer
     * @param {string|null} token - Token d'authentification
     * @returns {Promise<Response>} - Réponse de l'API
     */
    async put(endpoint, data, token = null) {
        return this.send(endpoint, token, 'PUT', JSON.stringify(data));
    }

    /**
     * Effectue une requête DELETE
     * @param {string} endpoint - Point d'entrée de l'API
     * @param {string|null} token - Token d'authentification
     * @returns {Promise<Response>} - Réponse de l'API
     */
    async delete(endpoint, token = null) {
        return this.send(endpoint, token, 'DELETE');
    }

    /**
     * Upload un fichier
     * @param {string} endpoint - Point d'entrée de l'API
     * @param {FormData} formData - Données du formulaire avec le fichier
     * @param {string|null} token - Token d'authentification
     * @returns {Promise<Response>} - Réponse de l'API
     */
    async uploadFile(endpoint, formData, token = null) {
        return this.send(endpoint, token, 'POST', formData, true);
    }
}

// Exporter une instance unique du service API (singleton)
export const apiService = new ApiService();
