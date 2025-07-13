// models/User.js
import { ApiService } from '../core/ApiService.js';
import { appConfig } from '../config/AppConfig.js';

export class User {
    constructor(userData = {}) {
        // Propriétés de base
        this.id = userData.id || null;
        this.email = userData.email || '';
        this.firstName = userData.firstName || '';
        this.lastName = userData.lastName || '';
        this.phoneNumber = userData.phoneNumber || '';
        this.birthDate = userData.birthDate ? new Date(userData.birthDate) : null;
        this.profilePicture = userData.profilePicture || null;
        
        // Rôles et statuts
        this.isDriver = userData.isDriver || false;
        this.isPassenger = userData.isPassenger || false;
        this.isAdmin = userData.isAdmin || false;
        this.isActive = userData.isActive !== undefined ? userData.isActive : true;
        this.emailVerified = userData.emailVerified || false;
        
        // Statistiques
        this.rating = userData.rating || 0;
        this.totalRides = userData.totalRides || 0;
        this.totalDriverRides = userData.totalDriverRides || 0;
        this.totalPassengerRides = userData.totalPassengerRides || 0;
        this.co2Saved = userData.co2Saved || 0;
        
        // Préférences
        this.preferences = {
            allowSmoking: userData.preferences?.allowSmoking || false,
            allowPets: userData.preferences?.allowPets || false,
            allowMusic: userData.preferences?.allowMusic || false,
            allowTalking: userData.preferences?.allowTalking || true
        };
        
        // Dates
        this.createdAt = userData.createdAt ? new Date(userData.createdAt) : null;
        this.updatedAt = userData.updatedAt ? new Date(userData.updatedAt) : null;
        
        // Services
        this.apiService = new ApiService();
    }

    /**
     * Vérifie si l'utilisateur a un rôle spécifique
     * @param {string} role - Rôle à vérifier ('driver', 'passenger', 'admin')
     * @returns {boolean} - True si l'utilisateur a le rôle
     */
    hasRole(role) {
        switch(role.toLowerCase()) {
            case 'driver':
                return this.isDriver;
            case 'passenger':
                return this.isPassenger;
            case 'admin':
                return this.isAdmin;
            default:
                return false;
        }
    }

    /**
     * Obtient le nom complet de l'utilisateur
     * @returns {string} - Nom complet
     */
    get fullName() {
        return `${this.firstName} ${this.lastName}`.trim() || 'Utilisateur';
    }

    /**
     * Obtient l'URL de l'avatar de l'utilisateur
     * @returns {string} - URL de l'avatar
     */
    get avatarUrl() {
        if (this.profilePicture) {
            return `${appConfig.photoUrl}${this.profilePicture}`;
        }
        
        // Avatar par défaut
        return '/assets/images/default-avatar.png';
    }

    /**
     * Obtient l'initiale du prénom pour l'avatar
     * @returns {string} - Initiale
     */
    get initial() {
        return this.firstName ? this.firstName.charAt(0).toUpperCase() : '?';
    }

    /**
     * Formate le numéro de téléphone
     * @returns {string} - Numéro formaté
     */
    get formattedPhoneNumber() {
        if (!this.phoneNumber) return '';
        
        // Format français: XX XX XX XX XX
        const cleaned = this.phoneNumber.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
        
        if (match) {
            return `${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
        }
        
        return this.phoneNumber;
    }

    /**
     * Calcule l'âge de l'utilisateur
     * @returns {number|null} - Âge ou null si la date de naissance n'est pas définie
     */
    get age() {
        if (!this.birthDate) return null;
        
        const today = new Date();
        let age = today.getFullYear() - this.birthDate.getFullYear();
        const monthDiff = today.getMonth() - this.birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    /**
     * Charge les données utilisateur depuis l'API
     * @param {number} userId - ID de l'utilisateur à charger
     * @returns {Promise<User>} - Instance User avec les données chargées
     */
    async load(userId) {
        try {
            const response = await this.apiService.send(`user/${userId}`, localStorage.getItem('ecoRideToken'));
            
            if (!response.ok) {
                throw new Error(`Erreur lors du chargement de l'utilisateur: ${response.status}`);
            }
            
            const userData = await response.json();
            
            // Mettre à jour toutes les propriétés
            Object.assign(this, new User(userData.data || userData));
            
            return this;
        } catch (error) {
            console.error("Erreur lors du chargement de l'utilisateur:", error);
            throw error;
        }
    }

    /**
     * Enregistre les modifications de l'utilisateur
     * @returns {Promise<User>} - Instance User mise à jour
     */
    async save() {
        try {
            // Préparer les données à envoyer
            const userData = {
                firstName: this.firstName,
                lastName: this.lastName,
                email: this.email,
                phoneNumber: this.phoneNumber,
                birthDate: this.birthDate,
                preferences: this.preferences
            };
            
            // Endpoint et méthode différents selon création ou mise à jour
            const endpoint = this.id ? `user/update/${this.id}` : 'user/create';
            const method = this.id ? 'PUT' : 'POST';
            
            const response = await this.apiService.send(
                endpoint,
                localStorage.getItem('ecoRideToken'),
                method,
                JSON.stringify(userData)
            );
            
            if (!response.ok) {
                throw new Error(`Erreur lors de l'enregistrement de l'utilisateur: ${response.status}`);
            }
            
            const updatedData = await response.json();
            
            // Mettre à jour l'instance avec les données retournées
            if (updatedData.data) {
                Object.assign(this, new User(updatedData.data));
            }
            
            return this;
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de l'utilisateur:", error);
            throw error;
        }
    }

    /**
     * Met à jour le mot de passe de l'utilisateur
     * @param {string} currentPassword - Mot de passe actuel
     * @param {string} newPassword - Nouveau mot de passe
     * @returns {Promise<boolean>} - True si la mise à jour a réussi
     */
    async updatePassword(currentPassword, newPassword) {
        try {
            const passwordData = {
                currentPassword,
                newPassword
            };
            
            const response = await this.apiService.send(
                'user/password',
                localStorage.getItem('ecoRideToken'),
                'PUT',
                JSON.stringify(passwordData)
            );
            
            return response.ok;
        } catch (error) {
            console.error("Erreur lors de la mise à jour du mot de passe:", error);
            throw error;
        }
    }

    /**
     * Charge les véhicules de l'utilisateur
     * @returns {Promise<Array>} - Liste des véhicules
     */
    async loadVehicles() {
        try {
            const response = await this.apiService.send(
                'vehicle/list',
                localStorage.getItem('ecoRideToken')
            );
            
            if (!response.ok) {
                throw new Error(`Erreur lors du chargement des véhicules: ${response.status}`);
            }
            
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error("Erreur lors du chargement des véhicules:", error);
            return [];
        }
    }

    /**
     * Convertit l'objet User en objet simple pour l'affichage ou le stockage
     * @returns {object} - Objet représentant l'utilisateur
     */
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            phoneNumber: this.phoneNumber,
            birthDate: this.birthDate,
            profilePicture: this.profilePicture,
            isDriver: this.isDriver,
            isPassenger: this.isPassenger,
            isAdmin: this.isAdmin,
            isActive: this.isActive,
            emailVerified: this.emailVerified,
            rating: this.rating,
            totalRides: this.totalRides,
            preferences: { ...this.preferences },
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}
