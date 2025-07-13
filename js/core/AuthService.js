// core/AuthService.js
import { apiService } from './ApiService.js';

export class AuthService {
    constructor() {
        this.tokenKey = 'ecoRideToken';
        this.roleCookieName = 'role';
        this.currentUser = null;
    }

    /**
     * Authentifie un utilisateur
     * @param {string} email - Email de l'utilisateur
     * @param {string} password - Mot de passe de l'utilisateur
     * @returns {Promise<object>} - Résultat de l'authentification
     */
    async login(email, password) {
        const loginData = { email, password };
        
        try {
            const response = await apiService.post('login', loginData);
console.log('AuthService response : ', response);
            if (!response.ok) {
                // Gérer les erreurs HTTP (400, 401, etc.)
                if (response.status === 401) {
                    throw new Error('Identifiants incorrects');
                } else {
                    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
                }
            }
            
            const result = await response.json();
            
            if (!result?.apiToken) {
                throw new Error('Token non trouvé dans la réponse');
            }
            
            // Stocker le token et le rôle
            this.setToken(result.apiToken);
            
            // Stocker le rôle dans un cookie
            if (result.roles && result.roles.length > 0) {
                this.setCookie(this.roleCookieName, result.roles[0], 1);
            }
            
            // Charger les informations utilisateur
            //await this.loadUserInfo();

            return result;
        } catch (error) {
            console.error('Erreur d\'authentification:', error);
            
            throw error;
        }
    }

    /**
     * Enregistre un nouvel utilisateur
     * @param {object} userData - Données de l'utilisateur
     * @returns {Promise<object>} - Résultat de l'enregistrement
     */
    async register(userData) {
        try {
            const response = await apiService.post('register', userData);
            
            if (!response.ok) {
                // Extraire le message d'erreur de la réponse si possible
                let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (e) {
                    // Ignorer les erreurs de parsing JSON
                }
                
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            
            return result;
        } catch (error) {
            console.error('Erreur d\'enregistrement:', error);
            
            throw error;
        }
    }

    /**
     * Déconnecte l'utilisateur
     */
    logout() {
alert('ok');
        // Supprimer le token du localStorage
		localStorage.removeItem(this.tokenKey);
		
		// Supprimer le cookie de rôle
		this.setCookie(this.roleCookieName, '', -1);
		
		// Réinitialiser l'utilisateur courant
		this.currentUser = null;
		
		// Pour compatibilité avec le code existant, supprimer aussi les anciens cookies
		document.cookie = "accesstoken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
		document.cookie = "role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
		
		// Rediriger vers la page d'accueil
		// Utiliser window.location au lieu de router car router n'est pas importé
		window.location.replace("/");
	}

    /**
     * Vérifie si l'utilisateur est connecté
     * @returns {boolean} - True si l'utilisateur est connecté
     */
    isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * Récupère le token d'authentification
     * @returns {string|null} - Token d'authentification
     */
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    /**
     * Stocke le token d'authentification
     * @param {string} token - Token à stocker
     */
    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    /**
     * Définit un cookie
     * @param {string} name - Nom du cookie
     * @param {string} value - Valeur du cookie
     * @param {number} days - Nombre de jours avant expiration
     */
    setCookie(name, value, days) {
        let expires = '';
        
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = `; expires=${date.toUTCString()}`;
        }
        
        document.cookie = `${name}=${value || ''}${expires}; path=/`;
    }

    /**
     * Récupère un cookie par son nom
     * @param {string} name - Nom du cookie
     * @returns {string|null} - Valeur du cookie ou null
     */
    getCookie(name) {
        const nameEQ = `${name}=`;
        const ca = document.cookie.split(';');
        
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                return c.substring(nameEQ.length, c.length);
            }
        }
        
        return null;
    }

    /**
     * Récupère le rôle de l'utilisateur
     * @returns {string} - Rôle de l'utilisateur ou 'visitor'
     */
    getUserRole() {
        return this.getCookie(this.roleCookieName) || 'visitor';
    }

    /**
     * Vérifie si l'utilisateur a un rôle spécifique
     * @param {string|Array} role - Rôle(s) à vérifier
     * @returns {boolean} - True si l'utilisateur a le rôle
     */
    hasRole(role) {
        const userRole = this.getUserRole();
        
        if (Array.isArray(role)) {
            return role.includes(userRole);
        }
        
        return userRole === role;
    }

    /**
     * Charge les informations de l'utilisateur courant
     * @returns {Promise<object>} - Informations de l'utilisateur
     */
    async loadUserInfo() {
        if (!this.isAuthenticated()) {
            this.currentUser = null;
            return null;
        }
        
        try {
            const response = await apiService.get('account/me', this.getToken());

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            
            const userData = await response.json();

            this.currentUser = userData.data || userData;

            return this.currentUser;
        } catch (error) {
            console.error('Erreur lors du chargement des informations utilisateur:', error);
            
            // Si l'erreur est due à un token invalide, déconnecter l'utilisateur
            if (error.status === 401) {
                this.logout();
            }
            
            throw error;
        }
    }

    /**
     * Récupère l'utilisateur courant
     * @param {boolean} reload - Si true, recharge les informations depuis l'API
     * @returns {Promise<object>} - Utilisateur courant
     */
    async getCurrentUser(reload = false) {
        if (!this.currentUser || reload) {
            return await this.loadUserInfo();
        }
        
        return this.currentUser;
    }

    /**
     * Demande un mail de réinitialisation de mot de passe
     * @param {string} email - Email de l'utilisateur
     * @returns {Promise<object>} - Résultat de la demande
     */
    async forgotPassword(email) {
        try {
            const response = await apiService.post('reset-password/request', { email });
            
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            return result;
        } catch (error) {
            console.error('Erreur lors de la demande de réinitialisation:', error);
            throw error;
        }
    }

    /**
     * Réinitialise le mot de passe avec un token
     * @param {string} token - Token de réinitialisation
     * @param {string} newPassword - Nouveau mot de passe
     * @returns {Promise<object>} - Résultat de la réinitialisation
     */
    async resetPassword(token, newPassword) {
        try {
            const response = await apiService.post('reset-password/reset', {
                token,
                password: newPassword
            });
            
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            return result;
        } catch (error) {
            console.error('Erreur lors de la réinitialisation du mot de passe:', error);
            throw error;
        }
    }

    /**
     * Change le mot de passe de l'utilisateur connecté
     * @param {string} currentPassword - Mot de passe actuel
     * @param {string} newPassword - Nouveau mot de passe
     * @returns {Promise<object>} - Résultat du changement
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await apiService.put('user/password', {
                currentPassword,
                newPassword
            }, this.getToken());
            
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
              
            return result;
        } catch (error) {
            console.error('Erreur lors du changement de mot de passe:', error);
            throw error;
        }
    }
}

// Exporter une instance unique du service d'authentification (singleton)
export const authService = new AuthService();
