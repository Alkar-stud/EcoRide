// Module utilitaire pour les fonctionnalités communes des covoiturages
import { apiUrl } from '../config.js';
import { getToken, sendFetchRequest, getUserInfo } from '../script.js';

/**
 * Utilitaires pour l'autocomplétion d'adresses
 */
export class AddressAutocomplete {
    constructor() {
        this.searchTimeouts = {};
    }

    // Configurer l'autocomplétion pour un champ d'adresse spécifique
    setupSingleAddressAutocomplete(inputId, suggestionsId, prefix, onAddressSelected = null) {
        const input = document.getElementById(inputId);
        const suggestionsContainer = document.getElementById(suggestionsId);

        if (!input || !suggestionsContainer) {
            console.warn(`Éléments d'autocomplétion non trouvés: ${inputId}, ${suggestionsId}`);
            return;
        }

        // Événement de saisie avec délai
        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Nettoyer les champs cachés si on modifie l'adresse
            this.clearHiddenFields(prefix);
            
            // Annuler la recherche précédente
            if (this.searchTimeouts[inputId]) {
                clearTimeout(this.searchTimeouts[inputId]);
            }

            if (query.length < 3) {
                this.hideSuggestions(suggestionsContainer);
                return;
            }

            // Délai de 300ms avant la recherche
            this.searchTimeouts[inputId] = setTimeout(() => {
                this.searchAddresses(query, suggestionsContainer, input, prefix, onAddressSelected);
            }, 300);
        });

        // Cacher les suggestions quand on clique ailleurs
        input.addEventListener('blur', (e) => {
            setTimeout(() => {
                this.hideSuggestions(suggestionsContainer);
            }, 200);
        });

        // Afficher les suggestions quand on focus le champ
        input.addEventListener('focus', (e) => {
            if (e.target.value.trim().length >= 3) {
                this.searchAddresses(e.target.value.trim(), suggestionsContainer, input, prefix, onAddressSelected);
            }
        });
    }

    // Rechercher des adresses via l'API française
    async searchAddresses(query, suggestionsContainer, input, prefix, onAddressSelected = null) {
        try {
            const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
            
            if (!response.ok) {
                throw new Error(`Erreur API: ${response.status}`);
            }

            const data = await response.json();
            this.displaySuggestions(data.features, suggestionsContainer, input, prefix, onAddressSelected);
            
        } catch (error) {
            console.error('Erreur lors de la recherche d\'adresses:', error);
            this.hideSuggestions(suggestionsContainer);
        }
    }

    // Afficher les suggestions d'adresses
    displaySuggestions(features, suggestionsContainer, input, prefix, onAddressSelected = null) {
        if (!features || features.length === 0) {
            this.hideSuggestions(suggestionsContainer);
            return;
        }

        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'block';

        features.forEach(feature => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion-item p-2 border-bottom';
            suggestion.style.cursor = 'pointer';
            
            const properties = feature.properties;
            const fullAddress = properties.label;
            const context = properties.context ? ` (${properties.context})` : '';
            
            suggestion.innerHTML = `
                <div class="fw-bold">${fullAddress}</div>
                <small class="text-muted">${context}</small>
            `;

            suggestion.addEventListener('click', () => {
                this.selectAddress(feature, input, suggestionsContainer, prefix, onAddressSelected);
            });

            suggestion.addEventListener('mouseenter', () => {
                suggestion.style.backgroundColor = '#f8f9fa';
            });

            suggestion.addEventListener('mouseleave', () => {
                suggestion.style.backgroundColor = '';
            });

            suggestionsContainer.appendChild(suggestion);
        });
    }

    // Sélectionner une adresse et parser les données
    selectAddress(feature, input, suggestionsContainer, prefix, onAddressSelected = null) {
        const properties = feature.properties;
        
        // Afficher l'adresse complète dans le champ
        input.value = properties.label;
        
        // Parser et stocker les composants de l'adresse
        const addressData = this.parseAndStoreAddress(properties, prefix);
        
        // Cacher les suggestions
        this.hideSuggestions(suggestionsContainer);
        
        // Callback personnalisé si fourni
        if (onAddressSelected) {
            onAddressSelected(addressData, prefix);
        }
    }

    // Parser l'adresse et la stocker dans les champs cachés
    parseAndStoreAddress(properties, prefix) {
        const housenumber = properties.housenumber || '';
        const street = properties.street || properties.name || '';
        const postcode = properties.postcode || '';
        const city = properties.city || '';

        // Construire le nom de rue complet
        const fullStreet = housenumber ? `${housenumber} ${street}` : street;

        // Remplir les champs cachés
        const streetField = document.getElementById(`${prefix}Street`);
        const postcodeField = document.getElementById(`${prefix}Postcode`);
        const cityField = document.getElementById(`${prefix}City`);

        if (streetField) streetField.value = fullStreet;
        if (postcodeField) postcodeField.value = postcode;
        if (cityField) cityField.value = city;

        // Retourner les données parsées
        return {
            fullAddress: properties.label,
            street: fullStreet,
            postcode: postcode,
            city: city
        };
    }

    // Nettoyer les champs cachés
    clearHiddenFields(prefix) {
        const streetField = document.getElementById(`${prefix}Street`);
        const postcodeField = document.getElementById(`${prefix}Postcode`);
        const cityField = document.getElementById(`${prefix}City`);

        if (streetField) streetField.value = '';
        if (postcodeField) postcodeField.value = '';
        if (cityField) cityField.value = '';
    }

    // Cacher les suggestions
    hideSuggestions(suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
        suggestionsContainer.innerHTML = '';
    }

    // Valider qu'une adresse complète a été sélectionnée
    validateAddress(prefix) {
        const streetField = document.getElementById(`${prefix}Street`);
        const postcodeField = document.getElementById(`${prefix}Postcode`);
        const cityField = document.getElementById(`${prefix}City`);

        return streetField?.value && postcodeField?.value && cityField?.value;
    }
}

/**
 * Utilitaires pour la gestion des véhicules
 */
export class VehicleManager {
    constructor() {
        this.vehiclesData = [];
    }

    // Charger les véhicules de l'utilisateur
    async loadUserVehicles() {
        try {
            const response = await sendFetchRequest(`${apiUrl}vehicle/list`, getToken(), 'GET');
            this.vehiclesData = response;
            return this.vehiclesData;
        } catch (error) {
            console.error('Erreur lors du chargement des véhicules:', error);
            throw error;
        }
    }

    // Remplir le select des véhicules
    populateVehicleSelect(selectId = 'vehicle', placeholderText = 'Sélectionnez votre véhicule') {
        const vehiculeSelect = document.getElementById(selectId);
        if (!vehiculeSelect) {
            console.warn(`Select véhicule non trouvé: ${selectId}`);
            return;
        }

        vehiculeSelect.innerHTML = `<option value="">${placeholderText}</option>`;

        this.vehiclesData.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = vehicle.id;
            option.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.maxNbPlacesAvailable} places max)`;
            option.dataset.maxPlaces = vehicle.maxNbPlacesAvailable;
            vehiculeSelect.appendChild(option);
        });
    }

    // Mettre à jour les places disponibles selon le véhicule sélectionné
    updateAvailablePlaces(vehicleId, placesSelectId = 'nbPlaces') {
        const placesSelect = document.getElementById(placesSelectId);
        if (!placesSelect) {
            console.warn(`Select places non trouvé: ${placesSelectId}`);
            return;
        }

        placesSelect.innerHTML = '<option value="">Sélectionnez le nombre de places</option>';

        if (!vehicleId) return;

        const vehicle = this.vehiclesData.find(v => v.id == vehicleId);
        if (vehicle) {
            const maxPlaces = vehicle.maxNbPlacesAvailable;

            for (let i = 1; i <= maxPlaces; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i} place${i > 1 ? 's' : ''}`;
                placesSelect.appendChild(option);
            }

            return vehicle;
        }
        return null;
    }

    // Obtenir les données d'un véhicule par ID
    getVehicleById(vehicleId) {
        return this.vehiclesData.find(v => v.id == vehicleId);
    }
}

/**
 * Utilitaires pour la validation de formulaire
 */
export class FormValidator {
    // Valider les champs requis d'un formulaire de covoiturage
    static validateCovoiturageForm(formId = 'covoiturageForm') {
        const requiredFields = [
            'departAdresse', 'arriveeAdresse', 'dateDepart', 'heureDepart',
            'dateArrivee', 'heureArrivee', 'price', 'vehicle', 'nbPlacesAvailable'
        ];

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field?.value?.trim()) {
                return {
                    isValid: false,
                    field: fieldId,
                    message: `Le champ ${fieldId} est requis.`
                };
            }
        }

        return { isValid: true };
    }

    // Valider que les adresses sont complètes
    static validateAddresses(prefixes = ['depart', 'arrivee']) {
        const addressAutocomplete = new AddressAutocomplete();
        
        for (const prefix of prefixes) {
            if (!addressAutocomplete.validateAddress(prefix)) {
                return {
                    isValid: false,
                    prefix: prefix,
                    message: `L'adresse ${prefix === 'depart' ? 'de départ' : 'd\'arrivée'} doit être sélectionnée dans les suggestions.`
                };
            }
        }

        return { isValid: true };
    }

    // Validation complète d'un formulaire de covoiturage
    static validateComplete(formId = 'covoiturageForm') {
        // Valider les champs requis
        const formValidation = this.validateCovoiturageForm(formId);
        if (!formValidation.isValid) {
            return formValidation;
        }

        // Valider les adresses
        const addressValidation = this.validateAddresses();
        if (!addressValidation.isValid) {
            return addressValidation;
        }

        return { isValid: true };
    }
}

/**
 * Utilitaires pour la collecte de données
 */
export class DataCollector {
    // Collecter les données d'un formulaire de covoiturage
    static collectCovoiturageFormData(formId = 'covoiturageForm') {
        // Construire les objets d'adresse
        const startingAddress = {
            street: document.getElementById('startingStreet')?.value || '',
            postcode: document.getElementById('startingPostCode')?.value || '',
            city: document.getElementById('startingCity')?.value || ''
        };

        const arrivalAddress = {
            street: document.getElementById('arrivalStreet')?.value || '',
            postcode: document.getElementById('arrivalPostCode')?.value || '',
            city: document.getElementById('arrivalCity')?.value || ''
        };

        // Construire les dates
        const dateDepart = document.getElementById('dateDepart')?.value || '';
        const heureDepart = document.getElementById('heureDepart')?.value || '';
        const dateArrivee = document.getElementById('dateArrivee')?.value || '';
        const heureArrivee = document.getElementById('heureArrivee')?.value || '';
        
        let startingAt = null;
        if (dateDepart && heureDepart) {
            startingAt = `${dateDepart} ${heureDepart}:00`;
        }
        
        let arrivalAt = null;
        if (dateArrivee && heureArrivee) {
            arrivalAt = `${dateArrivee} ${heureArrivee}:00`;
        }

        return {
            startingAddress: startingAddress,
            arrivalAddress: arrivalAddress,
            startingAt: startingAt,
            arrivalAt: arrivalAt,
            price: parseInt(document.getElementById('price')?.value) || 0,
            vehicle: parseInt(document.getElementById('vehicle')?.value) || 0,
            nbPlacesAvailable: parseInt(document.getElementById('nbPlacesAvailable')?.value) || 0
        };
    }

    // Pré-remplir un formulaire avec des données existantes
    static populateCovoiturageForm(data, formId = 'covoiturageForm') {
        // Adresses - nouvelle structure avec objets address
        const departAdresse = document.getElementById('departAdresse');
        const arriveeAdresse = document.getElementById('arriveeAdresse');
        
        // Construire les adresses complètes à partir des objets
        if (departAdresse && data.startingAddress) {
            const addr = data.startingAddress;
            if (addr.street && addr.postcode && addr.city) {
                departAdresse.value = `${addr.street}, ${addr.postcode} ${addr.city}`;
            } else if (addr.city) {
                departAdresse.value = addr.city;
            }
        }
        
        if (arriveeAdresse && data.arrivalAddress) {
            const addr = data.arrivalAddress;
            if (addr.street && addr.postcode && addr.city) {
                arriveeAdresse.value = `${addr.street}, ${addr.postcode} ${addr.city}`;
            } else if (addr.city) {
                arriveeAdresse.value = addr.city;
            }
        }
        
        // Champs cachés d'adresse
        const startingStreet = document.getElementById('startingStreet');
        const startingPostCode = document.getElementById('startingPostCode');
        const startingCity = document.getElementById('startingCity');
        const arrivalStreet = document.getElementById('arrivalStreet');
        const arrivalPostCode = document.getElementById('arrivalPostCode');
        const arrivalCity = document.getElementById('arrivalCity');

        if (startingStreet) startingStreet.value = data.startingAddress?.street || '';
        if (startingPostCode) startingPostCode.value = data.startingAddress?.postcode || '';
        if (startingCity) startingCity.value = data.startingAddress?.city || '';
        if (arrivalStreet) arrivalStreet.value = data.arrivalAddress?.street || '';
        if (arrivalPostCode) arrivalPostCode.value = data.arrivalAddress?.postcode || '';
        if (arrivalCity) arrivalCity.value = data.arrivalAddress?.city || '';

        // Date et heure
        const dateDepart = document.getElementById('dateDepart');
        const heureDepart = document.getElementById('heureDepart');
        
        if (dateDepart) dateDepart.value = data.dateDepart || '';
        if (heureDepart) heureDepart.value = data.heureDepart || '';

        // Prix
        const prix = document.getElementById('price');
        if (prix) prix.value = data.price || '';

        // Véhicule et places
        const vehicule = document.getElementById('vehicle');
        const nbPlaces = document.getElementById('nbPlacesAvailable');
        
        if (vehicule && data.vehicle?.id) {
            vehicule.value = data.vehicle.id;
        }
        
        if (nbPlaces) {
            // Attendre un peu que les options soient créées par le changement de véhicule
            setTimeout(() => {
                nbPlaces.value = data.nbPlacesAvailable || '';
            }, 100);
        }
    }
}

/**
 * Utilitaires pour les préférences utilisateur
 */
export class PreferencesManager {
    constructor() {
        this.userPreferences = null;
    }

    // Charger les préférences utilisateur
    async loadUserPreferences() {
        try {
            const userInfo = await getUserInfo();
            this.userPreferences = userInfo?.userPreferences || [];
            return this.userPreferences;
        } catch (error) {
            console.error('Erreur lors du chargement des préférences:', error);
            this.userPreferences = [];
            throw error;
        }
    }

    // Afficher les préférences de l'utilisateur dans le formulaire
    displayUserPreferences(predefinedContainerId = 'predefinedPreferences', customContainerId = 'customPreferences') {
        const predefinedContainer = document.getElementById(predefinedContainerId);
        const customContainer = document.getElementById(customContainerId);
        
        if (!predefinedContainer || !customContainer) {
            console.warn('Conteneurs de préférences non trouvés');
            return;
        }
        
        predefinedContainer.innerHTML = '';
        customContainer.innerHTML = '';
        
        if (!this.userPreferences || this.userPreferences.length === 0) {
            customContainer.innerHTML = '<p class="text-muted">Aucune préférence personnalisée définie.</p>';
            return;
        }

        this.userPreferences.forEach(preference => {
            if (preference.libelle === 'Fumeur autorisé' || preference.libelle === 'Animaux autorisés') {
                // Préférences prédéfinies
                const col = document.createElement('div');
                col.className = 'col-md-6';
                col.innerHTML = `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="${preference.id}" 
                               id="pref_${preference.id}" name="preferences" checked>
                        <label class="form-check-label" for="pref_${preference.id}">
                            <i class="fas fa-${preference.libelle.includes('Fumeur') ? 'smoking' : 'paw'} me-2"></i>
                            ${preference.libelle}
                        </label>
                    </div>
                `;
                predefinedContainer.appendChild(col);
            } else {
                // Préférences personnalisées
                const prefDiv = document.createElement('div');
                prefDiv.className = 'form-check mb-2';
                prefDiv.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${preference.id}" 
                           id="pref_${preference.id}" name="preferences" checked>
                    <label class="form-check-label" for="pref_${preference.id}">
                        <strong>${preference.libelle}</strong>
                        ${preference.description ? `<br><small class="text-muted">${preference.description}</small>` : ''}
                    </label>
                `;
                customContainer.appendChild(prefDiv);
            }
        });
    }

    // Ajouter une nouvelle préférence personnalisée
    async addCustomPreference(libelle, description = null) {
        if (!libelle?.trim()) {
            throw new Error('Le libellé de la préférence est requis');
        }
        
        // Vérifier que la préférence n'existe pas déjà
        const existsInUserPrefs = this.userPreferences?.some(pref => 
            pref.libelle.toLowerCase() === libelle.toLowerCase()
        );
        
        if (existsInUserPrefs) {
            throw new Error('Cette préférence existe déjà dans vos préférences');
        }

        try {
            const newPreference = {
                libelle: libelle.trim(),
                description: description?.trim() || null
            };

            const response = await sendFetchRequest(`${apiUrl}account/preferences/add`, getToken(), 'POST', JSON.stringify(newPreference));
            
            // Ajouter à la liste locale
            if (!this.userPreferences) this.userPreferences = [];
            this.userPreferences.push(response);
            
            return response;

        } catch (error) {
            console.error('Erreur lors de l\'ajout de la préférence:', error);
            throw error;
        }
    }
}

/**
 * Utilitaires pour les API de covoiturage
 */
export class CovoiturageAPI {
    // Récupérer les données d'un covoiturage
    static async fetchCovoiturageData(covoiturageId) {
        try {
            const response = await sendFetchRequest(`${apiUrl}ride/show/${covoiturageId}`, getToken(), 'GET');
            return response;
        } catch (error) {
            console.error('Erreur lors de la récupération des données du covoiturage:', error);
            throw error;
        }
    }

    // Créer un nouveau covoiturage
    static async createCovoiturage(formData) {
        try {
            const response = await sendFetchRequest(`${apiUrl}ride/add`, getToken(), 'POST', JSON.stringify(formData));
            return response;
        } catch (error) {
            console.error('Erreur lors de la création du covoiturage:', error);
            throw error;
        }
    }

    // Modifier un covoiturage existant
    static async updateCovoiturage(covoiturageId, formData) {
        try {
            const response = await sendFetchRequest(`${apiUrl}ride/update/${covoiturageId}`, getToken(), 'PUT', JSON.stringify(formData));
            return response;
        } catch (error) {
            console.error('Erreur lors de la modification du covoiturage:', error);
            throw error;
        }
    }

    // Supprimer un covoiturage
    static async deleteCovoiturage(covoiturageId) {
        try {
            await sendFetchRequest(`${apiUrl}ride/${covoiturageId}`, getToken(), 'DELETE');
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression du covoiturage:', error);
            throw error;
        }
    }

    // Annuler un covoiturage
    static async cancelCovoiturage(covoiturageId) {
        try {
            await sendFetchRequest(`${apiUrl}ride/${covoiturageId}/cancel`, getToken(), 'PUT');
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'annulation du covoiturage:', error);
            throw error;
        }
    }
}

/**
 * Utilitaires pour les dates
 */
export class DateUtils {
    // Définir la date minimum à aujourd'hui
    static setMinDateToToday(inputId = 'dateDepart') {
        const dateInput = document.getElementById(inputId);
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
        }
    }

    // Formater une date pour l'affichage
    static formatDisplayDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    // Formater une heure pour l'affichage
    static formatDisplayTime(timeString) {
        if (!timeString) return '';
        
        const [hours, minutes] = timeString.split(':');
        return `${hours}:${minutes}`;
    }
}

// Exports par défaut pour une utilisation simplifiée
export const addressAutocomplete = new AddressAutocomplete();
export const vehicleManager = new VehicleManager();
export const preferencesManager = new PreferencesManager();
