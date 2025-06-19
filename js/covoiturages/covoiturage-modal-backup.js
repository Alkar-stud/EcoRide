// Module pour gérer la modale de création de covoiturage
import { apiUrl } from '../config.js';
import { getToken, sendFetchRequest, getUserInfo } from '../script.js';

export class NouveauCovoiturageModal {
    constructor() {
        this.modal = null;
        this.form = null;
        this.isLoaded = false;
        this.onSuccessCallback = null;
        this.userPreferences = null;
        this.customPreferences = [];
        this.searchTimeouts = {}; // Pour gérer les délais de recherche
        this.vehiclesData = []; // Pour stocker les données des véhicules
    }

    // Charger la modale depuis le fichier HTML
    async loadModal() {
        if (this.isLoaded) {
            return;
        }

        try {
            const response = await fetch('/pages/covoiturages/nouveau-covoiturage-modal.html');
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const modalHTML = await response.text();
            
            // Ajouter la modale au body
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Initialiser les références
            const modalElement = document.getElementById('nouveauCovoiturageModal');
            this.modal = new bootstrap.Modal(modalElement);
            this.form = document.getElementById('nouveauCovoiturageForm');
            
            // Charger les préférences utilisateur
            await this.loadUserPreferences();
            
            // Charger les véhicules de l'utilisateur
            await this.loadUserVehicles();
            
            // Initialiser les événements
            this.initializeEvents();
            
            // Définir la date minimum à aujourd'hui
            this.setMinDate();
            
            this.isLoaded = true;
        } catch (error) {
            console.error('Erreur lors du chargement de la modale:', error);
            throw error;
        }
    }

    // Charger les préférences de l'utilisateur
    async loadUserPreferences() {
        try {
            const userInfo = await getUserInfo();
            this.userPreferences = userInfo?.userPreferences || [];
        } catch (error) {
            console.error('Erreur lors du chargement des préférences:', error);
            this.userPreferences = [];
        }
    }

    // Charger les véhicules de l'utilisateur
    async loadUserVehicles() {
        try {
            const vehicles = await sendFetchRequest(apiUrl + 'vehicle/list', getToken(), 'GET');
            const vehicleSelect = document.getElementById('vehicule');
            
            if (!vehicleSelect) return;
            
            vehicleSelect.innerHTML = '<option value="">Sélectionnez votre véhicule</option>';
            
            if (vehicles && vehicles.length > 0) {
                vehicles.forEach(vehicle => {
                    const option = document.createElement('option');
                    option.value = vehicle.id;
                    option.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.maxNbPlacesAvailable} places max)`;
                    // Stocker les informations du véhicule dans l'option
                    option.dataset.maxPlaces = vehicle.maxNbPlacesAvailable;
                    vehicleSelect.appendChild(option);
                });
                
                // Stocker les données des véhicules pour un accès facile
                this.vehiclesData = vehicles;
            } else {
                const addVehicleOption = document.createElement('option');
                addVehicleOption.value = 'add-vehicle';
                addVehicleOption.textContent = '+ Ajouter un véhicule';
                vehicleSelect.appendChild(addVehicleOption);
                this.vehiclesData = [];
            }
        } catch (error) {
            console.error('Erreur lors du chargement des véhicules:', error);
            this.vehiclesData = [];
        }
    }

    // Initialiser l'autocomplétion pour les adresses
    setupAddressAutocomplete() {
        this.setupSingleAddressAutocomplete('departAdresse', 'departSuggestions', 'depart');
        this.setupSingleAddressAutocomplete('arriveeAdresse', 'arriveeSuggestions', 'arrivee');
    }

    // Configurer l'autocomplétion pour un champ d'adresse spécifique
    setupSingleAddressAutocomplete(inputId, suggestionsId, prefix) {
        const input = document.getElementById(inputId);
        const suggestionsContainer = document.getElementById(suggestionsId);

        if (!input || !suggestionsContainer) {
            console.error(`Éléments d'autocomplétion non trouvés pour ${inputId}`);
            return;
        }

        // Événement de saisie avec délai
        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Nettoyer le timeout précédent
            if (this.searchTimeouts[inputId]) {
                clearTimeout(this.searchTimeouts[inputId]);
            }

            if (query.length < 3) {
                this.hideSuggestions(suggestionsContainer);
                this.clearHiddenFields(prefix);
                return;
            }

            // Délai de 300ms avant la recherche
            this.searchTimeouts[inputId] = setTimeout(() => {
                this.searchAddresses(query, suggestionsContainer, input, prefix);
            }, 300);
        });

        // Cacher les suggestions quand on clique ailleurs
        input.addEventListener('blur', (e) => {
            // Délai pour permettre le clic sur une suggestion
            setTimeout(() => {
                this.hideSuggestions(suggestionsContainer);
            }, 200);
        });

        // Afficher les suggestions quand on focus le champ (si il y a du contenu)
        input.addEventListener('focus', (e) => {
            if (e.target.value.trim().length >= 3) {
                this.searchAddresses(e.target.value.trim(), suggestionsContainer, input, prefix);
            }
        });
    }

    // Rechercher des adresses via l'API française
    async searchAddresses(query, suggestionsContainer, input, prefix) {
        try {
            const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
            
            if (!response.ok) {
                throw new Error(`Erreur API: ${response.status}`);
            }

            const data = await response.json();
            this.displaySuggestions(data.features, suggestionsContainer, input, prefix);
            
        } catch (error) {
            console.error('Erreur lors de la recherche d\'adresses:', error);
            this.hideSuggestions(suggestionsContainer);
        }
    }

    // Afficher les suggestions d'adresses
    displaySuggestions(features, suggestionsContainer, input, prefix) {
        if (!features || features.length === 0) {
            this.hideSuggestions(suggestionsContainer);
            return;
        }

        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'block';

        features.forEach(feature => {
            const suggestion = document.createElement('div');
            suggestion.className = 'p-2 border-bottom address-suggestion';
            suggestion.style.cursor = 'pointer';
            
            const properties = feature.properties;
            
            suggestion.innerHTML = `
                <div class="fw-bold">${properties.name || properties.label}</div>
                <small class="text-muted">${properties.context || ''}</small>
            `;

            // Événement de sélection
            suggestion.addEventListener('click', () => {
                this.selectAddress(feature, input, suggestionsContainer, prefix);
            });

            // Survol
            suggestion.addEventListener('mouseenter', () => {
                suggestion.style.backgroundColor = '#f8f9fa';
            });

            suggestion.addEventListener('mouseleave', () => {
                suggestion.style.backgroundColor = 'white';
            });

            suggestionsContainer.appendChild(suggestion);
        });
    }

    // Sélectionner une adresse et parser les données
    selectAddress(feature, input, suggestionsContainer, prefix) {
        const properties = feature.properties;
        
        // Afficher l'adresse complète dans le champ
        input.value = properties.label;
        
        // Parser et stocker les composants de l'adresse
        this.parseAndStoreAddress(properties, prefix);
        
        // Cacher les suggestions
        this.hideSuggestions(suggestionsContainer);
        
        // Trigger validation
        this.validateForm();
    }

    // Parser l'adresse et la stocker dans les champs cachés
    parseAndStoreAddress(properties, prefix) {
        // Extraire les composants de l'adresse
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

        const street = streetField ? streetField.value : '';
        const postcode = postcodeField ? postcodeField.value : '';
        const city = cityField ? cityField.value : '';

        return street && postcode && city;
    }

    // Afficher les préférences de l'utilisateur
    displayUserPreferences() {
        const predefinedContainer = document.getElementById('predefinedPreferences');
        const customContainer = document.getElementById('customPreferences');
        
        if (!predefinedContainer || !customContainer) {
            console.error('Conteneurs de préférences non trouvés');
            return;
        }
        
        predefinedContainer.innerHTML = '';
        customContainer.innerHTML = '';
        
        if (!this.userPreferences || this.userPreferences.length === 0) {
            return;
        }

        this.userPreferences.forEach(preference => {
            if (preference.libelle === 'smokingAllowed') {
                // Créer la checkbox pour fumeur
                const isChecked = preference.description === 'yes' ? 'checked' : '';
                predefinedContainer.innerHTML += `
                    <div class="col-md-6">
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="fumeurAccepte" name="fumeurAccepte" ${isChecked}>
                            <label class="form-check-label" for="fumeurAccepte">
                                <i class="fas fa-smoking me-1"></i>Fumeur accepté
                            </label>
                        </div>
                    </div>
                `;
            } else if (preference.libelle === 'petsAllowed') {
                // Créer la checkbox pour animaux
                const isChecked = preference.description === 'yes' ? 'checked' : '';
                predefinedContainer.innerHTML += `
                    <div class="col-md-6">
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="animauxAcceptes" name="animauxAcceptes" ${isChecked}>
                            <label class="form-check-label" for="animauxAcceptes">
                                <i class="fas fa-paw me-1"></i>Animaux acceptés
                            </label>
                        </div>
                    </div>
                `;
            } else {
                // Afficher les autres préférences en texte simple
                customContainer.innerHTML += `
                    <div class="alert alert-light border d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <strong>${preference.libelle}</strong>
                            ${preference.description ? `: ${preference.description}` : ''}
                        </div>
                    </div>
                `;
            }
        });
    }

    // Ajouter une nouvelle préférence personnalisée via l'API
    async addCustomPreference() {
        const titleInput = document.getElementById('newPrefTitle');
        const descriptionInput = document.getElementById('newPrefDescription');
        
        const libelle = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        
        if (!libelle) {
            alert('Le titre est obligatoire');
            return;
        }
        
        // Vérifier que la préférence n'existe pas déjà dans les préférences utilisateur
        const existsInUserPrefs = this.userPreferences.some(pref => 
            pref.libelle.toLowerCase() === libelle.toLowerCase()
        );
        
        if (existsInUserPrefs) {
            alert('Cette préférence existe déjà dans vos préférences');
            return;
        }

        // Désactiver le bouton pendant l'ajout
        const addBtn = document.getElementById('addPreferenceBtn');
        const originalText = addBtn.innerHTML;
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout...';

        try {
            // Utiliser exactement la même logique que dans account-preferences.js
            const rawData = JSON.stringify({
                "libelle": libelle,
                "description": description
            });
            
            const response = await sendFetchRequest(apiUrl + "account/preferences/add", getToken(), 'POST', rawData);
            
            if (response?.id) {
                // Ajouter la nouvelle préférence à la liste des préférences utilisateur
                this.userPreferences.push(response);
                
                // Rafraîchir l'affichage des préférences
                this.displayUserPreferences();
                
                // Vider les champs
                titleInput.value = '';
                descriptionInput.value = '';
                
                // Afficher un message de succès
                this.showPreferenceSuccessMessage();
                
            } else {
                console.error("Erreur lors de l'ajout de la préférence:", response);
                alert('Erreur lors de l\'ajout de la préférence. Veuillez réessayer.');
            }
        } catch (error) {
            console.error("Erreur lors de l'ajout de la préférence", error);
            alert('Erreur lors de l\'ajout de la préférence. Veuillez réessayer.');
        } finally {
            // Restaurer le bouton
            addBtn.disabled = false;
            addBtn.innerHTML = originalText;
        }
    }

    // Afficher un message de succès pour l'ajout de préférence
    showPreferenceSuccessMessage() {
        const toastHTML = `
            <div class="toast align-items-center text-bg-info border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-check-circle me-2"></i>
                        Préférence ajoutée avec succès !
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            const toast = new bootstrap.Toast(toastContainer.lastElementChild);
            toast.show();
        }
    }

    // Définir la date minimum à aujourd'hui
    setMinDate() {
        const dateInput = document.getElementById('dateDepart');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            dateInput.value = today;
        }
    }

    // Mettre à jour les places disponibles selon le véhicule sélectionné
    updateAvailablePlaces(vehicleId) {
        const placesSelect = document.getElementById('nbPlaces');
        if (!placesSelect || !vehicleId || !this.vehiclesData) {
            return;
        }

        // Trouver le véhicule sélectionné
        const selectedVehicle = this.vehiclesData.find(vehicle => vehicle.id == vehicleId);
        if (!selectedVehicle) {
            console.error('Véhicule non trouvé:', vehicleId);
            return;
        }

        const maxPlaces = selectedVehicle.maxNbPlacesAvailable;

        // Vider et recréer les options
        placesSelect.innerHTML = '<option value="">Sélectionnez le nombre de places</option>';

        // Ajouter les options de 1 au maximum du véhicule
        for (let i = 1; i <= maxPlaces; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i === 1 ? '1 place' : `${i} places`;
            placesSelect.appendChild(option);
        }

        // Pré-sélectionner le maximum de places
        placesSelect.value = maxPlaces;
        
        // Déclencher la validation du formulaire
        this.validateForm();
    }

    // Initialiser les événements
    initializeEvents() {
        // Initialiser l'autocomplétion des adresses
        this.setupAddressAutocomplete();
        
        // Événement pour le bouton de création
        const createBtn = document.getElementById('creerCovoiturageBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.handleSubmit();
            });
        }

        // Événement pour ajouter une préférence (via API)
        const addPrefBtn = document.getElementById('addPreferenceBtn');
        if (addPrefBtn) {
            addPrefBtn.addEventListener('click', () => {
                this.addCustomPreference();
            });
        }

        // Événements pour les champs de nouvelle préférence (Enter)
        const titleInput = document.getElementById('newPrefTitle');
        const descInput = document.getElementById('newPrefDescription');
        
        [titleInput, descInput].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.addCustomPreference();
                    }
                });
            }
        });

        // Événement pour la sélection de véhicule
        const vehicleSelect = document.getElementById('vehicule');
        if (vehicleSelect) {
            vehicleSelect.addEventListener('change', (e) => {
                if (e.target.value === 'add-vehicle') {
                    window.location.href = '/account#vehicles';
                } else {
                    // Mettre à jour les places disponibles selon le véhicule sélectionné
                    this.updateAvailablePlaces(e.target.value);
                }
            });
        }

        // Validation en temps réel
        if (this.form) {
            this.form.addEventListener('input', () => {
                this.validateForm();
            });
        }

        // Validation spéciale pour le champ prix (entiers uniquement)
        const prixInput = document.getElementById('prix');
        if (prixInput) {
            prixInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
                if (e.target.value === '0') {
                    e.target.value = '';
                }
            });
            
            prixInput.addEventListener('keypress', (e) => {
                if (!/\d/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }
    }

    // Afficher la modale
    async show(options = {}) {
        try {
            if (!this.isLoaded) {
                await this.loadModal();
            }

            // Réinitialiser les préférences temporaires
            this.customPreferences = [];

            // Pré-remplir avec les options si fournies
            if (options.fromAddress) {
                const fromAddressInput = document.getElementById('departAdresse');
                if (fromAddressInput) fromAddressInput.value = options.fromAddress;
            }
            if (options.toAddress) {
                const toAddressInput = document.getElementById('arriveeAdresse');
                if (toAddressInput) toAddressInput.value = options.toAddress;
            }
            if (options.date) {
                const dateInput = document.getElementById('dateDepart');
                if (dateInput) dateInput.value = options.date;
            }

            // Afficher les préférences utilisateur
            this.displayUserPreferences();

            // Afficher le message d'encouragement si demandé
            const encouragementMessage = document.getElementById('encouragementMessage');
            if (encouragementMessage) {
                encouragementMessage.style.display = options.showEncouragement ? 'block' : 'none';
            }

            // Stocker le callback de succès
            this.onSuccessCallback = options.onSuccess;

            // Afficher la modale
            this.modal.show();
        } catch (error) {
            console.error('Erreur lors de l\'affichage de la modale:', error);
            alert('Erreur lors du chargement de la modale: ' + error.message);
        }
    }

    // Cacher la modale
    hide() {
        if (this.modal) {
            this.modal.hide();
        }
    }

    // Valider le formulaire
    validateForm() {
        if (!this.form) return false;
        
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;

        // Validation des champs requis classiques
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
            }
        });

        // Validation spéciale pour les adresses
        if (!this.validateAddress('depart')) {
            isValid = false;
        }
        if (!this.validateAddress('arrivee')) {
            isValid = false;
        }

        const submitBtn = document.getElementById('creerCovoiturageBtn');
        if (submitBtn) {
            submitBtn.disabled = !isValid;
        }

        return isValid;
    }

    // Collecter toutes les préférences sélectionnées
    collectPreferences() {
        const preferences = [];
        
        // Préférences prédéfinies (smokingAllowed, petsAllowed)
        const fumeurCheckbox = document.getElementById('fumeurAccepte');
        if (fumeurCheckbox) {
            preferences.push({
                libelle: 'smokingAllowed',
                description: fumeurCheckbox.checked ? 'yes' : 'no'
            });
        }
        
        const animauxCheckbox = document.getElementById('animauxAcceptes');
        if (animauxCheckbox) {
            preferences.push({
                libelle: 'petsAllowed',
                description: animauxCheckbox.checked ? 'yes' : 'no'
            });
        }
        
        // Préférences personnalisées existantes (cochées)
        const customPrefCheckboxes = document.querySelectorAll('input[name^="customPref_"]:checked');
        customPrefCheckboxes.forEach(checkbox => {
            preferences.push({
                libelle: checkbox.dataset.libelle,
                description: checkbox.dataset.description
            });
        });
        
        // Préférences temporaires ajoutées
        this.customPreferences.forEach(pref => {
            preferences.push({
                libelle: pref.title,
                description: pref.description
            });
        });
        
        return preferences;
    }

    // Gérer la soumission du formulaire
    async handleSubmit() {
        if (!this.validateForm()) {
            alert('Veuillez remplir tous les champs obligatoires et sélectionner des adresses valides.');
            return;
        }

        // Vérifier que les adresses ont bien été sélectionnées
        if (!this.validateAddress('depart')) {
            alert('Veuillez sélectionner une adresse de départ valide dans la liste de suggestions.');
            return;
        }
        if (!this.validateAddress('arrivee')) {
            alert('Veuillez sélectionner une adresse d\'arrivée valide dans la liste de suggestions.');
            return;
        }

        const submitBtn = document.getElementById('creerCovoiturageBtn');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        
        try {
            // Afficher le loader
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Création en cours...';
            }

            // Préparer les données
            // Calculer l'heure d'arrivée (approximation : +2h)
            const dateInput = document.getElementById('dateDepart');
            const timeInput = document.getElementById('heureDepart');
            const dateValue = dateInput ? dateInput.value : '';
            const timeValue = timeInput ? timeInput.value : '';
            const startDateTime = new Date(`${dateValue}T${timeValue}:00`);
            const arrivalDateTime = new Date(startDateTime.getTime() + (2 * 60 * 60 * 1000)); // +2 heures
            
            // Fonction pour formater la date au format Y-m-d H:i:s
            const formatDateTime = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                
                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            };
            
            // Collecter les préférences sélectionnées
            const preferences = this.collectPreferences();
            
            // Récupérer les valeurs des champs
            const vehicleInput = document.getElementById('vehicule');
            const placesInput = document.getElementById('nbPlaces');
            const prixInput = document.getElementById('prix');
            
            const data = {
                startingAddress: {
                    street: document.getElementById('departStreet').value,
                    postcode: document.getElementById('departPostcode').value,
                    city: document.getElementById('departCity').value
                },
                arrivalAddress: {
                    street: document.getElementById('arriveeStreet').value,
                    postcode: document.getElementById('arriveePostcode').value,
                    city: document.getElementById('arriveeCity').value
                },
                startingAt: formatDateTime(startDateTime),
                arrivalAt: formatDateTime(arrivalDateTime),
                vehicle: parseInt(vehicleInput ? vehicleInput.value : '0'),
                nbPlacesAvailable: parseInt(placesInput ? placesInput.value : '0'),
                price: parseInt(prixInput ? prixInput.value : '0'),
                preferences: preferences // Ajouter les préférences
            };

            // Convertir les données en JSON
            const jsonData = JSON.stringify(data);

            // Envoyer à l'API
            const result = await sendFetchRequest(apiUrl + 'ride/add', getToken(), 'POST', jsonData);

            if (result) {
                // Succès
                this.hide();
                this.form.reset();
                this.customPreferences = [];
                this.clearHiddenFields('depart');
                this.clearHiddenFields('arrivee');
                this.setMinDate();

                // Afficher un message de succès
                this.showSuccessMessage();

                // Appeler le callback de succès si défini
                if (this.onSuccessCallback) {
                    this.onSuccessCallback(result);
                }

                // Rafraîchir l'onglet actuel des covoiturages
                this.refreshCurrentTab();
            }
        } catch (error) {
            console.error('Erreur lors de la création du covoiturage:', error);
            alert('Une erreur est survenue lors de la création du covoiturage. Veuillez réessayer.');
        } finally {
            // Restaurer le bouton
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    // Afficher un message de succès
    showSuccessMessage() {
        const toastHTML = `
            <div class="toast align-items-center text-bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-check-circle me-2"></i>
                        Votre covoiturage a été créé avec succès !
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            const toast = new bootstrap.Toast(toastContainer.lastElementChild);
            toast.show();
        }
    }

    // Rafraîchir l'onglet actuel des covoiturages
    refreshCurrentTab() {
        try {
            // Vérifier si on est sur la page mes covoiturages
            if (window.location.pathname.includes('mescovoiturages') || 
                window.location.pathname.includes('covoiturages')) {
                
                // Méthode 1: Utiliser displayCovoiturages qui préserve la pagination
                if (typeof window.displayCovoiturages === 'function' && typeof window.currentTab !== 'undefined') {
                    // Préserver la page actuelle selon l'onglet
                    const currentPage = window.currentTab === 'driver' ? 
                        (window.currentPageDriver || 1) : 
                        (window.currentPagePassenger || 1);
                    window.displayCovoiturages(window.currentTab, currentPage);
                    return;
                }
                
                // Méthode 2: Utiliser fetchCovoiturages en préservant la pagination
                if (typeof window.fetchCovoiturages === 'function' && 
                    typeof window.currentTab !== 'undefined' && 
                    typeof window.currentPageDriver !== 'undefined' && 
                    typeof window.currentPagePassenger !== 'undefined') {
                    
                    const currentPage = window.currentTab === 'driver' ? 
                        window.currentPageDriver : 
                        window.currentPagePassenger;
                    window.fetchCovoiturages(window.currentTab, 'coming', currentPage);
                    return;
                }
                
                // Méthode 3: Déclencher un événement personnalisé
                const refreshEvent = new CustomEvent('refreshCovoiturages', {
                    detail: { 
                        type: window.currentTab || 'driver', 
                        newRide: true,
                        preservePagination: true
                    }
                });
                document.dispatchEvent(refreshEvent);
                
                // Méthode 4: Recharger la page en dernier recours après un délai
                setTimeout(() => {
                    if (window.location.pathname.includes('mescovoiturages') || 
                        window.location.pathname.includes('covoiturages')) {
                        window.location.reload();
                    }
                }, 2000); // Délai de 2 secondes pour laisser le temps au toast de s'afficher
            }
        } catch (error) {
            console.error('Erreur lors du rafraîchissement:', error);
            // En cas d'erreur, recharger la page
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    }

}

// Créer une instance globale
const nouveauCovoiturageModal = new NouveauCovoiturageModal();

// Exporter à la fois la classe et l'instance
export { nouveauCovoiturageModal };
export default nouveauCovoiturageModal;