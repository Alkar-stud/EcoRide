/**
 * Utilitaires pour l'autocomplétion d'adresses
 */
export class AddressAutocomplete {
    constructor() {
        this.searchTimeouts = {};
        console.log("AddressAutocomplete: Initialisation...");

    }

    /**
     * Configure l'autocomplétion pour un champ de ville
     * @param {string} inputId - ID du champ de saisie
     * @param {string} suggestionsId - ID du conteneur de suggestions
     */
    setupCityAutocomplete(inputId, suggestionsId) {
        const input = document.getElementById(inputId);
        const suggestionsContainer = document.getElementById(suggestionsId);

        if (!input || !suggestionsContainer) {
            console.warn(`Éléments d'autocomplétion non trouvés: ${inputId}, ${suggestionsId}`);
            return;
        }

        // Événement de saisie avec délai
        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Effacer les données stockées si l'utilisateur modifie le champ
            input.removeAttribute('data-city-name');
            input.removeAttribute('data-postcode');
            
            // Annuler la recherche précédente
            if (this.searchTimeouts[inputId]) {
                clearTimeout(this.searchTimeouts[inputId]);
            }

            if (query.length < 2) {
                this.hideSuggestions(suggestionsContainer);
                return;
            }

            // Délai de 300ms avant la recherche
            this.searchTimeouts[inputId] = setTimeout(() => {
                this.searchCities(query, suggestionsContainer, input);
            }, 300);
        });

        // Cacher les suggestions quand on clique ailleurs
        input.addEventListener('blur', (e) => {
            setTimeout(() => {
                this.hideSuggestions(suggestionsContainer);
            }, 200);
        });

        // Afficher les suggestions quand on focus le champ (si il y a déjà du texte)
        input.addEventListener('focus', (e) => {
            if (e.target.value.trim().length >= 2) {
                this.searchCities(e.target.value.trim(), suggestionsContainer, input);
            }
        });
    }

    /**
     * Rechercher des villes via l'API française d'adresses
     */
    async searchCities(query, suggestionsContainer, input) {
        try {
            // Utiliser l'API d'adresses française en filtrant sur les villes
            const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=8&type=municipality`);
            
            if (!response.ok) {
                throw new Error(`Erreur API: ${response.status}`);
            }

            const data = await response.json();
            this.displayCitySuggestions(data.features, suggestionsContainer, input);
            
        } catch (error) {
            console.error('Erreur lors de la recherche de villes:', error);
            this.hideSuggestions(suggestionsContainer);
        }
    }

    /**
     * Afficher les suggestions de villes
     */
    displayCitySuggestions(features, suggestionsContainer, input) {
        if (!features || features.length === 0) {
            this.hideSuggestions(suggestionsContainer);
            return;
        }

        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'block';

        features.forEach(feature => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion-item p-2 border-bottom address-suggestion';
            suggestion.style.cursor = 'pointer';
            
            const properties = feature.properties;
            const cityName = properties.city || properties.name;
            const postcode = properties.postcode;
            const context = properties.context ? ` (${properties.context})` : '';
            
            suggestion.innerHTML = `
                <div class="fw-bold">${cityName}</div>
                <small class="text-muted">${postcode}${context}</small>
            `;
            
            // Événement de clic sur la suggestion
            suggestion.addEventListener('click', () => {
                input.value = cityName;
                
                // Stocker les données complètes dans des attributs data
                input.setAttribute('data-city-name', cityName);
                input.setAttribute('data-postcode', postcode);
                
                this.hideSuggestions(suggestionsContainer);
                
                // Retirer la classe d'erreur si présente
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
            });

            // Effet hover
            suggestion.addEventListener('mouseenter', () => {
                suggestion.style.backgroundColor = '#f8f9fa';
            });
            
            suggestion.addEventListener('mouseleave', () => {
                suggestion.style.backgroundColor = '';
            });
            
            suggestionsContainer.appendChild(suggestion);
        });
    }

    /**
     * Configurer l'autocomplétion pour un champ d'adresse spécifique
     * @param {string} inputId - ID du champ de saisie
     * @param {string} suggestionsId - ID du conteneur de suggestions
     * @param {string} prefix - Préfixe pour les champs cachés
     * @param {Function} onAddressSelected - Callback après sélection d'une adresse
     */
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

    /**
     * Rechercher des adresses via l'API française
     */
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

    /**
     * Afficher les suggestions d'adresses
     */
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

    /**
     * Sélectionner une adresse et parser les données
     */
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

    /**
     * Parser l'adresse et la stocker dans les champs cachés
     */
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

    /**
     * Nettoyer les champs cachés
     */
    clearHiddenFields(prefix) {
        const streetField = document.getElementById(`${prefix}Street`);
        const postcodeField = document.getElementById(`${prefix}Postcode`);
        const cityField = document.getElementById(`${prefix}City`);

        if (streetField) streetField.value = '';
        if (postcodeField) postcodeField.value = '';
        if (cityField) cityField.value = '';
    }

    /**
     * Cacher les suggestions
     */
    hideSuggestions(suggestionsContainer) {
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.innerHTML = '';
        }
    }

    /**
     * Valider qu'une adresse complète a été sélectionnée
     */
    validateAddress(prefix) {
        const streetField = document.getElementById(`${prefix}Street`);
        const postcodeField = document.getElementById(`${prefix}Postcode`);
        const cityField = document.getElementById(`${prefix}City`);

        return streetField?.value && postcodeField?.value && cityField?.value;
    }
}
