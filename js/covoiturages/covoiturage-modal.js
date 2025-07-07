// Module unifié pour gérer la modale de covoiturage (création, modification, lecture seule)
import { apiUrl, url } from '../config.js';
import { getToken, sendFetchRequest, showMessage, getUserInfo } from '../script.js';

class CovoiturageModal {
    constructor() {
        this.modal = null;
        this.currentMode = null; // 'create', 'edit', 'view', 'passenger-view'
        this.covoiturageId = null;
        this.covoiturageData = null;
        this.selectedVehicle = null;
        this.vehiclesData = [];
        this.userPreferences = null;
        this.customPreferences = [];
        this.onSuccessCallback = null;
        this.isInitialized = false;
        this.searchTimeouts = {}; // Pour gérer les délais de recherche d'adresse
    }

    // Initialiser la modale
    async initialize() {
        if (this.isInitialized) return;
        
        // Charger la modale HTML si elle n'est pas déjà dans le DOM
        await this.loadModalIfNeeded();
        
        // Créer l'instance Bootstrap
        this.modal = new bootstrap.Modal(document.getElementById('covoiturageModal'));
        
        // Attacher tous les événements
        this.attachEvents();
        
        this.isInitialized = true;
    }

    // Charger la modale HTML depuis le fichier
    async loadModalIfNeeded() {
        if (document.getElementById('covoiturageModal')) {
            return; // Déjà chargée
        }

        try {
            const response = await fetch('/pages/covoiturages/covoiturage-modal.html');
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            const modalHTML = await response.text();
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        } catch (error) {
            console.error('Erreur lors du chargement de la modale:', error);
            throw error;
        }
    }

    // Attacher tous les événements
    attachEvents() {
        // Événements des boutons
        document.getElementById('createBtn').addEventListener('click', () => this.handleSubmit());
        document.getElementById('updateBtn').addEventListener('click', () => this.handleSubmit());
        document.getElementById('deleteCovoiturageBtn').addEventListener('click', () => this.handleDelete());
        document.getElementById('cancelCovoiturageBtn').addEventListener('click', () => this.handleCancel());
        document.getElementById('addPreferenceBtn').addEventListener('click', () => this.addCustomPreference());

        // Gestion du changement de véhicule
        document.getElementById('vehicle').addEventListener('change', (e) => {
            this.handleVehicleChange(e.target.value);
        });

        // Autocomplétion d'adresses
        this.setupAddressAutocomplete();

        // Validation des dates et heures
        this.setupDateTimeValidation();

        // Événement de fermeture de la modale
        document.getElementById('covoiturageModal').addEventListener('hidden.bs.modal', () => {
            this.resetModal();
        });

        // Événements attachés avec succès
    }

    // Configuration de l'autocomplétion d'adresses
    setupAddressAutocomplete() {
        this.setupSingleAddressAutocomplete('departAdresse', 'departSuggestions', 'starting');
        this.setupSingleAddressAutocomplete('arriveeAdresse', 'arriveeSuggestions', 'arrival');
    }

    // Configurer l'autocomplétion pour un champ d'adresse spécifique
    setupSingleAddressAutocomplete(inputId, suggestionsId, prefix) {
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
            
            if (this.searchTimeouts[prefix]) {
                clearTimeout(this.searchTimeouts[prefix]);
            }

            if (query.length >= 3) {
                this.searchTimeouts[prefix] = setTimeout(() => {
                    this.searchAddresses(query, suggestionsContainer, input, prefix);
                }, 300);
            } else {
                this.hideSuggestions(suggestionsContainer);
            }
        });

        // Masquer les suggestions quand on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!suggestionsContainer.contains(e.target) && e.target !== input) {
                this.hideSuggestions(suggestionsContainer);
            }
        });
    }

    // Rechercher des adresses via l'API Adresse
    async searchAddresses(query, suggestionsContainer, input, prefix) {
        try {
            const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                this.displaySuggestions(data.features, suggestionsContainer, input, prefix);
            } else {
                this.hideSuggestions(suggestionsContainer);
            }
        } catch (error) {
            console.error('Erreur lors de la recherche d\'adresses:', error);
            this.hideSuggestions(suggestionsContainer);
        }
    }

    // Afficher les suggestions d'adresses
    displaySuggestions(features, suggestionsContainer, input, prefix) {
        const maxSuggestions = 5;
        
        suggestionsContainer.innerHTML = '';
        
        features.slice(0, maxSuggestions).forEach(feature => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion-item p-2 border-bottom cursor-pointer';
            suggestion.style.cursor = 'pointer';
            suggestion.innerHTML = `
                <div class="fw-semibold">${feature.properties.label}</div>
                <small class="text-muted">
                    ${feature.properties.city || ''} 
                    ${feature.properties.postcode ? '(' + feature.properties.postcode + ')' : ''}
                </small>
            `;
            
            suggestion.addEventListener('click', () => {
                this.selectAddress(feature, input, suggestionsContainer, prefix);
            });
            
            suggestion.addEventListener('mouseenter', () => {
                suggestion.style.backgroundColor = '#f8f9fa';
            });
            
            suggestion.addEventListener('mouseleave', () => {
                suggestion.style.backgroundColor = '';
            });
            
            suggestionsContainer.appendChild(suggestion);
        });
        
        suggestionsContainer.style.display = 'block';
    }

    // Sélectionner une adresse
    selectAddress(feature, input, suggestionsContainer, prefix) {
        input.value = feature.properties.label;
        this.parseAndStoreAddress(feature.properties, prefix);
        this.hideSuggestions(suggestionsContainer);
    }

    // Parser et stocker les composants d'adresse
    parseAndStoreAddress(properties, prefix) {
        // Stocker les informations dans les champs cachés
        if (prefix === 'starting') {
            document.getElementById('startingStreet').value = properties.name || '';
            document.getElementById('startingPostCode').value = properties.postcode || '';
            document.getElementById('startingCity').value = properties.city || '';
        } else if (prefix === 'arrival') {
            document.getElementById('arrivalStreet').value = properties.name || '';
            document.getElementById('arrivalPostCode').value = properties.postcode || '';
            document.getElementById('arrivalCity').value = properties.city || '';
        }
        
        // Adresse stockée avec succès
    }

    // Nettoyer les champs cachés
    clearHiddenFields(prefix) {
        document.getElementById(prefix + 'Street').value = '';
        document.getElementById(prefix + 'PostCode').value = '';
        document.getElementById(prefix + 'City').value = '';
    }

    // Masquer les suggestions
    hideSuggestions(suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }

    // Configurer le mode de la modale
    setMode(mode) {
        this.currentMode = mode;
        
        const header = document.getElementById('covoiturageModalHeader');
        const modalTitle = document.getElementById('modalTitle');
        const modalIcon = document.getElementById('modalIcon');
        const preferencesSection = document.getElementById('preferencesSection');
        const addPreferenceSection = document.getElementById('addPreferenceSection');
        const editModeButtons = document.getElementById('editModeButtons');
        const createBtn = document.getElementById('createBtn');
        const updateBtn = document.getElementById('updateBtn');
        const closeBtn = document.getElementById('closeBtn');

        // Réinitialiser tous les boutons
        createBtn.style.display = 'none';
        updateBtn.style.display = 'none';
        editModeButtons.style.display = 'none';

        switch (mode) {
            case 'create':
                header.className = 'modal-header bg-primary text-white';
                modalIcon.className = 'fas fa-car me-2';
                modalTitle.textContent = 'Proposer un nouveau covoiturage';
                preferencesSection.style.display = 'block';
                addPreferenceSection.style.display = 'block';
                createBtn.style.display = 'inline-block';
                closeBtn.innerHTML = '<i class="fas fa-times me-2"></i>Annuler';
                this.setFieldsEnabled(true);
                this.setMinDate();
                break;

            case 'edit':
                header.className = 'modal-header bg-warning text-white';
                modalIcon.className = 'fas fa-edit me-2';
                modalTitle.textContent = 'Modifier le covoiturage';
                preferencesSection.style.display = 'none'; // Masquer les préférences en modification
                addPreferenceSection.style.display = 'none';
                editModeButtons.style.display = 'block';
                updateBtn.style.display = 'inline-block';
                closeBtn.innerHTML = '<i class="fas fa-times me-2"></i>Fermer';
                break;

            case 'view':
                header.className = 'modal-header bg-info text-white';
                modalIcon.className = 'fas fa-eye me-2';
                modalTitle.textContent = 'Détails du covoiturage';
                preferencesSection.style.display = 'none';
                addPreferenceSection.style.display = 'none';
                editModeButtons.style.display = 'none';
                closeBtn.innerHTML = '<i class="fas fa-times me-2"></i>Fermer';
                this.setFieldsEnabled(false);
                break;

            case 'passenger-view':
                header.className = 'modal-header bg-success text-white';
                modalIcon.className = 'fas fa-users me-2';
                modalTitle.textContent = 'Rejoindre ce covoiturage';
                preferencesSection.style.display = 'none'; // On va créer une vue spéciale
                addPreferenceSection.style.display = 'none';
                editModeButtons.style.display = 'none';
                closeBtn.innerHTML = '<i class="fas fa-times me-2"></i>Fermer';
                // La vue conviviale sera créée après l'assignation des données dans show()
                break;
        }
    }

    // Activer/désactiver les champs du formulaire selon le mode et les données envoyées à l'API
    setFieldsEnabled(enabled) {
        
        const form = document.getElementById('covoiturageForm');
        if (!form) return;

        if (!enabled) {
            // Mode lecture seule : désactiver tous les champs
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.disabled = true;
            });
            
            const addPreferenceBtn = document.getElementById('addPreferenceBtn');
            if (addPreferenceBtn) {
                addPreferenceBtn.disabled = true;
            }
            return;
        }

        // Mode actif : activer selon le contexte
        if (this.currentMode === 'create') {
            // En création : tous les champs sont modifiables (tous envoyés à l'API)
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.disabled = false;
            });
        } else if (this.currentMode === 'edit') {
            // En modification : désactiver selon ce qui n'est PAS envoyé à l'API
            const hasPassengers = this.hasPassengers();

            // Champs TOUJOURS modifiables en modification (toujours envoyés à l'API)
            const alwaysEnabledFields = ['nbPlacesAvailable', 'vehicle'];
            alwaysEnabledFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.disabled = false;
            });

            // Champs JAMAIS modifiables en modification (jamais envoyés à l'API)
            const neverEnabledFields = ['departAdresse', 'arriveeAdresse', 'startingStreet', 'startingPostCode', 'startingCity', 'arrivalStreet', 'arrivalPostCode', 'arrivalCity'];
            neverEnabledFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.disabled = true;
            });

            // Prix : modifiable SEULEMENT sans passagers (pas envoyé à l'API avec passagers)
            const priceField = document.getElementById('price');
            if (priceField) {
                priceField.disabled = hasPassengers;
            }

            // Dates/heures : modifiables SEULEMENT sans passagers (envoyées mais non modifiables avec passagers)
            const dateTimeFields = ['dateDepart', 'heureDepart', 'dateArrivee', 'heureArrivee'];
            dateTimeFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.disabled = hasPassengers;
            });
        }

        // Gérer spécifiquement le bouton d'ajout de préférence
        const addPreferenceBtn = document.getElementById('addPreferenceBtn');
        if (addPreferenceBtn) {
            addPreferenceBtn.disabled = !enabled;
        }
    }

    // Définir la date minimum à aujourd'hui
    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateDepartInput = document.getElementById('dateDepart');
        const dateArriveeInput = document.getElementById('dateArrivee');
        
        if (dateDepartInput) {
            dateDepartInput.min = today;
        }
        if (dateArriveeInput) {
            dateArriveeInput.min = today;
        }
    }

    // Charger les véhicules de l'utilisateur
    async loadUserVehicles() {
        try {
            const response = await sendFetchRequest(`${apiUrl}vehicle/list`, getToken(), 'GET');
            const vehicleSelect = document.getElementById('vehicle');
            
            if (!vehicleSelect) {
                console.error('Élément select véhicule non trouvé');
                return;
            }
            
            vehicleSelect.innerHTML = '<option value="">Sélectionnez votre véhicule</option>';
            
            if (response && response.length > 0) {
                response.forEach(vehicle => {
                    const option = document.createElement('option');
                    option.value = vehicle.id;
                    option.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.maxNbPlacesAvailable} places max)`;
                    option.dataset.maxPlaces = vehicle.maxNbPlacesAvailable;
                    vehicleSelect.appendChild(option);
                });
                
                this.vehiclesData = response;
            } else {
                const addVehicleOption = document.createElement('option');
                addVehicleOption.value = 'add-vehicle';
                addVehicleOption.textContent = '+ Ajouter un véhicule';
                vehicleSelect.appendChild(addVehicleOption);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des véhicules:', error);
            showMessage('Erreur lors du chargement des véhicules.', 'error');
        }
    }

    // Gérer le changement de véhicule
    handleVehicleChange(vehicleId) {
        const placesSelect = document.getElementById('nbPlacesAvailable');
        
        if (!placesSelect) return;
        
        placesSelect.innerHTML = '<option value="">Nombre de places</option>';
        
        if (vehicleId && vehicleId !== 'add-vehicle') {
            const vehicle = this.vehiclesData.find(v => v.id.toString() === vehicleId.toString());
            if (vehicle) {
                this.selectedVehicle = vehicle;
                const maxPlaces = vehicle.maxNbPlacesAvailable;
                
                for (let i = 1; i <= maxPlaces; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `${i} place${i > 1 ? 's' : ''}`;
                    placesSelect.appendChild(option);
                }
                
                // Pré-sélectionner le maximum de places
                placesSelect.value = maxPlaces;
            }
        }
    }

    // Charger les préférences utilisateur
    async loadUserPreferences() {
        try {
            const userInfo = await getUserInfo();
            this.userPreferences = userInfo?.userPreferences || [];
            this.displayPreferences();
        } catch (error) {
            console.error('Erreur lors du chargement des préférences:', error);
            this.userPreferences = [];
        }
    }

    // Afficher les préférences (en mode création ou passenger-view)
    displayPreferences() {
        if (this.currentMode !== 'create' && this.currentMode !== 'passenger-view') return;
        
        const predefinedContainer = document.getElementById('predefinedPreferences');
        const customContainer = document.getElementById('customPreferences');
        
        if (!predefinedContainer || !customContainer) {
            console.error('Conteneurs de préférences non trouvés');
            return;
        }
        
        predefinedContainer.innerHTML = '';
        customContainer.innerHTML = '';

        // En mode passenger-view, afficher les préférences du chauffeur depuis les données du covoiturage
        if (this.currentMode === 'passenger-view') {
            this.displayDriverPreferences(predefinedContainer, customContainer);
            return;
        }
        
        // Mode création : afficher les préférences de l'utilisateur
        if (!this.userPreferences || this.userPreferences.length === 0) {
            return;
        }

        this.userPreferences.forEach(preference => {
            if (preference.libelle === 'smokingAllowed' || preference.key === 'smokingAllowed') {
                // Créer la checkbox pour fumeur
                const isChecked = (preference.description === 'yes' || preference.value === 'true') ? 'checked' : '';
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
            } else if (preference.libelle === 'petsAllowed' || preference.key === 'petsAllowed') {
                // Créer la checkbox pour animaux
                const isChecked = (preference.description === 'yes' || preference.value === 'true') ? 'checked' : '';
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
                const prefKey = preference.libelle || preference.key;
                const prefValue = preference.description || preference.value;
                customContainer.innerHTML += `
                    <div class="alert alert-light border d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <strong>${prefKey}</strong>
                            ${prefValue ? `: ${prefValue}` : ''}
                        </div>
                    </div>
                `;
            }
        });
    }

    // Ajouter une préférence personnalisée
    async addCustomPreference() {
        const titleInput = document.getElementById('newPrefTitle');
        const descriptionInput = document.getElementById('newPrefDescription');
        
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        
        if (!title) {
            showMessage('Veuillez saisir un titre pour la préférence.', 'error');
            return;
        }
        
       
        try {
            const newPreference = {
                libelle: title,
                description: description || null
            };

            const response = await sendFetchRequest(`${apiUrl}account/preferences/add`, getToken(), 'POST', JSON.stringify(newPreference));
            
            // Ajouter à la liste locale
            this.userPreferences.push(response);
            
            // Réafficher les préférences
            this.displayPreferences();
            
            // Vider les champs
            titleInput.value = '';
            descriptionInput.value = '';
            
            showMessage('Préférence ajoutée avec succès !', 'success');
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la préférence:', error);
            showMessage('Erreur lors de l\'ajout de la préférence.', 'error');
        }
    }

    // Afficher la modale
    async show(mode, data = null, options = {}) {
        try {
            // Initialiser si nécessaire
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Réinitialiser la modale
            this.resetModal();

            // Définir le mode
            this.setMode(mode);

            // Charger les données nécessaires seulement si ce n'est pas la vue passager
            if (mode !== 'passenger-view') {
                await Promise.all([
                    this.loadUserVehicles(),
                    this.loadUserPreferences()
                ]);
            }

            // Traitement selon le mode
            if (mode === 'create') {
                // Mode création
                this.onSuccessCallback = options.onSuccess;
                document.getElementById('encouragementMessage').style.display = 
                    options.showEncouragement ? 'block' : 'none';
                
            } else if (mode === 'edit' || mode === 'view' || mode === 'passenger-view') {
                // Mode modification, lecture seule ou vue passager
                if (!data?.id) {
                    throw new Error('Données du covoiturage manquantes');
                }
                
                this.covoiturageId = data.id;
                this.covoiturageData = data;
                this.onSuccessCallback = options.onSuccess;
                
                if (mode === 'passenger-view') {
                    // En mode passenger-view, créer la vue spéciale après avoir assigné les données
                    this.createPassengerView();
                    this.configurePassengerViewButtons();
                } else {
                    // Pour les modes edit et view, pré-remplir le formulaire
                    this.populateForm(data);
                    
                    if (mode === 'edit') {
                        // Configurer les boutons d'action pour la modification
                        this.configureEditButtons();
                        // Activer les champs selon les règles métier (après chargement des données)
                        this.setFieldsEnabled(true);
                    }
                }
            }

            // Afficher la modale
            this.modal.show();

            // Si on est en mode passenger-view, finaliser l'affichage après que la modale soit visible
            if (mode === 'passenger-view') {
                // Attendre que la modale soit visible pour afficher les étoiles et préférences
                setTimeout(() => {
                    this.finalizePassengerView();
                }, 100);
            }

        } catch (error) {
            console.error('Erreur lors de l\'affichage de la modale:', error);
            showMessage('Erreur lors de l\'ouverture de la modale.', 'error');
        }
    }

        // Pré-remplir le formulaire avec les données existantes
    populateForm(data) {
        
        // Adresses de départ - utiliser la vraie structure API
        if (data.startingStreet && data.startingPostCode && data.startingCity) {
            document.getElementById('departAdresse').value = `${data.startingStreet}, ${data.startingPostCode} ${data.startingCity}`;
            // Remplir aussi les champs cachés
            document.getElementById('startingStreet').value = data.startingStreet;
            document.getElementById('startingPostCode').value = data.startingPostCode;
            document.getElementById('startingCity').value = data.startingCity;
        } else if (data.startingCity) {
            document.getElementById('departAdresse').value = data.startingCity;
            document.getElementById('startingCity').value = data.startingCity;
        }

        // Adresses d'arrivée - utiliser la vraie structure API
        if (data.arrivalStreet && data.arrivalPostCode && data.arrivalCity) {
            document.getElementById('arriveeAdresse').value = `${data.arrivalStreet}, ${data.arrivalPostCode} ${data.arrivalCity}`;
            // Remplir aussi les champs cachés
            document.getElementById('arrivalStreet').value = data.arrivalStreet;
            document.getElementById('arrivalPostCode').value = data.arrivalPostCode;
            document.getElementById('arrivalCity').value = data.arrivalCity;
        } else if (data.arrivalCity) {
            document.getElementById('arriveeAdresse').value = data.arrivalCity;
            document.getElementById('arrivalCity').value = data.arrivalCity;
        }

        // Date et heure (à partir de startingAt)
        if (data.startingAt) {
            const startingDate = new Date(data.startingAt);
            document.getElementById('dateDepart').value = startingDate.toISOString().split('T')[0];
            document.getElementById('heureDepart').value = startingDate.toTimeString().slice(0, 5);
        }

        // Date et heure d'arrivée (à partir de arrivalAt)
        if (data.arrivalAt) {
            const arrivalDate = new Date(data.arrivalAt);
            document.getElementById('dateArrivee').value = arrivalDate.toISOString().split('T')[0];
            document.getElementById('heureArrivee').value = arrivalDate.toTimeString().slice(0, 5);
        }

        // price
        document.getElementById('price').value = data.price || '';

        // Véhicule et places
        if (data.vehicle?.id) {
            document.getElementById('vehicle').value = data.vehicle.id;
            // Appeler handleVehicleChange pour remplir les places disponibles
            this.handleVehicleChange(data.vehicle.id);
            
            // Puis pré-sélectionner le nombre de places du covoiturage
            setTimeout(() => {
                if (data.nbPlacesAvailable) {
                    document.getElementById('nbPlacesAvailable').value = data.nbPlacesAvailable;
                }
            }, 100); // Petit délai pour laisser le temps au handleVehicleChange de s'exécuter
        }

        // Afficher la liste des passagers (pour les modes edit et view)
        this.displayPassengers();
        
        // Afficher les préférences pour le mode passenger-view
        if (this.currentMode === 'passenger-view') {
            this.displayPreferences();
        }
    }

    // Afficher les étoiles de notation du chauffeur
    // Afficher les étoiles de notation du chauffeur
    async finalizePassengerView() {
        if (!this.covoiturageData) return;

        // Afficher les étoiles de notation du chauffeur
        const driverRatingContainer = document.getElementById('driverRating');
        if (driverRatingContainer && this.covoiturageData.driver?.grade !== undefined) {
            // Import dynamique de setGradeStyle
            try {
                const { setGradeStyle } = await import('../script.js');
                setGradeStyle(this.covoiturageData.driver.grade, driverRatingContainer);
            } catch (error) {
                console.warn('Impossible d\'importer setGradeStyle:', error);
                // Fallback simple
                driverRatingContainer.innerHTML = `Note: ${this.covoiturageData.driver.grade}/5`;
            }
        }

        // Afficher les préférences du chauffeur
        this.displayDriverPreferencesInView();
    }

    // Afficher les préférences du chauffeur dans la vue passager
    displayDriverPreferencesInView() {
        const preferencesContainer = document.getElementById('driverPreferencesContent');
        
        if (!preferencesContainer || !this.covoiturageData?.driver) {
            return;
        }

        const driverPrefs = this.covoiturageData.driver.userPreferences || [];
        
        if (driverPrefs.length === 0) {
            this.displayEmptyPreferencesMessage(preferencesContainer);
            return;
        }

        this.renderDriverPreferences(preferencesContainer, driverPrefs);
    }

    // Afficher le message quand aucune préférence n'est définie
    displayEmptyPreferencesMessage(container) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-info-circle fs-2 mb-3 d-block opacity-50"></i>
                <p class="mb-0 fs-5">Aucune préférence spécifiée</p>
                <small>Le chauffeur n'a pas défini de préférences particulières</small>
            </div>
        `;
    }

    // Rendre les préférences du chauffeur
    renderDriverPreferences(container, driverPrefs) {
        let preferencesHTML = '<div class="row g-3">';
        
        driverPrefs.forEach(preference => {
            preferencesHTML += this.generatePreferenceCard(preference);
        });
        
        preferencesHTML += '</div>';
        container.innerHTML = preferencesHTML;
    }

    // Générer une carte de préférence
    generatePreferenceCard(preference) {
        if (this.isSmokingPreference(preference)) {
            return this.generateSmokingCard(preference);
        } else if (this.isPetsPreference(preference)) {
            return this.generatePetsCard(preference);
        } else {
            return this.generateCustomCard(preference);
        }
    }

    // Vérifier si c'est une préférence fumeur
    isSmokingPreference(preference) {
        return preference.libelle === 'smokingAllowed' || preference.key === 'smokingAllowed';
    }

    // Vérifier si c'est une préférence animaux
    isPetsPreference(preference) {
        return preference.libelle === 'petsAllowed' || preference.key === 'petsAllowed';
    }

    // Générer la carte pour la préférence fumeur
    generateSmokingCard(preference) {
        const allowed = preference.description === 'yes' || preference.value === 'true';
        const iconImage = allowed ? '/images/fumeur-ok.png' : '/images/fumeur-non.png';
        const text = allowed ? 'Fumeur accepté' : 'Non-fumeur uniquement';
        const bgColor = allowed ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger';
        const textColor = allowed ? 'text-success-emphasis' : 'text-danger-emphasis';
        
        return `
            <div class="col-md-6">
                <div class="card h-100 ${bgColor} border">
                    <div class="card-body d-flex align-items-center p-2">
                        <div class="me-2">
                            <img src="${iconImage}" alt="${text}" 
                                 style="width: 28px; height: 28px; object-fit: contain;">
                        </div>
                        <div>
                            <div class="fw-semibold ${textColor} small">${text}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Générer la carte pour la préférence animaux
    generatePetsCard(preference) {
        const allowed = preference.description === 'yes' || preference.value === 'true';
        const iconImage = allowed ? '/images/animaux-ok.png' : '/images/animaux-non.png';
        const text = allowed ? 'Animaux acceptés' : 'Animaux non autorisés';
        const bgColor = allowed ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger';
        const textColor = allowed ? 'text-success-emphasis' : 'text-danger-emphasis';
        
        return `
            <div class="col-md-6">
                <div class="card h-100 ${bgColor} border">
                    <div class="card-body d-flex align-items-center p-2">
                        <div class="me-2">
                            <img src="${iconImage}" alt="${text}" 
                                 style="width: 28px; height: 28px; object-fit: contain;">
                        </div>
                        <div>
                            <div class="fw-semibold ${textColor} small">${text}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Générer la carte pour les préférences personnalisées
    generateCustomCard(preference) {
        const prefTitle = preference.libelle || preference.key;
        const prefDescription = preference.description || preference.value || '';
        
        return `
            <div class="col-12">
                <div class="card border-primary border">
                    <div class="card-body p-2">
                        <div class="d-flex align-items-center">
                            <div class="me-2">
                                <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                                     style="width: 28px; height: 28px; font-size: 0.75rem;">
                                    <i class="fas fa-star"></i>
                                </div>
                            </div>
                            <div class="flex-grow-1">
                                ${prefDescription ? `<div class="text-muted" style="font-size: 0.75rem;">${prefDescription}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Afficher les passagers
    displayPassengers() {
        const passengersSection = document.getElementById('passengersSection');
        const passengersList = document.getElementById('passengersList');

        if (!passengersSection || !passengersList) return;

        // Afficher la section seulement en mode edit et view (PAS en passenger-view)
        if (this.currentMode === 'edit' || this.currentMode === 'view') {
            passengersSection.style.display = 'block';

            // Vérifier s'il y a des passagers
            const passagers = this.covoiturageData?.passenger; // Propriété officielle API
                             
            if (passagers && Array.isArray(passagers) && passagers.length > 0) {
                // Afficher la liste des passagers
                const passengersHTML = passagers.map(passenger => `
                    <div class="d-flex align-items-center mb-2 p-2 bg-white rounded border">
                        <div class="me-3">
                            <img src="${passenger.photo ? url + 'uploads/photos/' + passenger.photo : '/images/default-avatar.png'}" 
                                 alt="Photo de ${passenger.pseudo}" 
                                 class="rounded-circle" 
                                 style="width: 40px; height: 40px; object-fit: cover;">
                        </div>
                        <div>
                            <strong class="text-primary">${passenger.pseudo}</strong>
                            <div class="text-muted small">Passager inscrit</div>
                        </div>
                    </div>
                `).join('');

                passengersList.innerHTML = `
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            ${passagers.length} passager(s) inscrit(s)
                        </small>
                    </div>
                    ${passengersHTML}
                `;
            } else {
                // Aucun passager inscrit
                passengersList.innerHTML = `
                    <div class="text-center text-muted">
                        <i class="fas fa-user-slash fs-3 mb-2 d-block"></i>
                        <p class="mb-0">Aucun passager inscrit pour le moment</p>
                        <small>Les places sont encore disponibles !</small>
                    </div>
                `;
            }
        } else {
            // Masquer la section en mode création
            passengersSection.style.display = 'none';
        }
    }

    // Afficher les préférences du chauffeur
    displayDriverPreferences(predefinedContainer, customContainer) {
        if (!this.covoiturageData?.driver) return;

        const driverPrefs = this.covoiturageData.driver.userPreferences || [];
        
        // Titre de section
        predefinedContainer.innerHTML = `
            <div class="col-12 mb-3">
                <h6 class="text-muted mb-3">
                    <i class="fas fa-user-cog me-2"></i>Préférences du chauffeur
                </h6>
            </div>
        `;
        
        // Afficher les préférences prédéfinies avec icônes
        driverPrefs.forEach(preference => {
            if (preference.libelle === 'smokingAllowed' || preference.key === 'smokingAllowed') {
                const isAllowed = (preference.description === 'yes' || preference.value === 'true');
                const iconImage = isAllowed ? '/images/fumeur-ok.png' : '/images/fumeur-non.png';
                const text = isAllowed ? 'Fumeur autorisé' : 'Non-fumeur';
                
                predefinedContainer.innerHTML += `
                    <div class="col-md-6">
                        <div class="d-flex align-items-center mb-2 p-2 bg-light rounded">
                            <img src="${iconImage}" alt="${text}" style="width: 24px; height: 24px;" class="me-2">
                            <span>${text}</span>
                        </div>
                    </div>
                `;
            } else if (preference.libelle === 'petsAllowed' || preference.key === 'petsAllowed') {
                const isAllowed = (preference.description === 'yes' || preference.value === 'true');
                const iconImage = isAllowed ? '/images/animaux-ok.png' : '/images/animaux-non.png';
                const text = isAllowed ? 'Animaux acceptés' : 'Pas d\'animaux';
                
                predefinedContainer.innerHTML += `
                    <div class="col-md-6">
                        <div class="d-flex align-items-center mb-2 p-2 bg-light rounded">
                            <img src="${iconImage}" alt="${text}" style="width: 24px; height: 24px;" class="me-2">
                            <span>${text}</span>
                        </div>
                    </div>
                `;
            } else {
                // Préférences personnalisées
                customContainer.innerHTML += `
                    <div class="mb-2">
                        <div class="p-2 bg-light rounded border-start border-3 border-primary">
                            <div class="fw-bold text-primary">${preference.libelle}</div>
                            <div class="text-muted small">${preference.description || ''}</div>
                        </div>
                    </div>
                `;
            }
        });
        
        // Message si aucune préférence
        if (driverPrefs.length === 0) {
            predefinedContainer.innerHTML += `
                <div class="col-12">
                    <div class="text-muted text-center p-3">
                        <i class="fas fa-info-circle me-2"></i>
                        Aucune préférence spécifiée par le chauffeur
                    </div>
                </div>
            `;
        }
    }

    // Configurer les boutons d'action pour le mode modification
    configureEditButtons() {
        const deleteBtn = document.getElementById('deleteCovoiturageBtn');
        const cancelBtn = document.getElementById('cancelCovoiturageBtn');

        // Masquer tous les boutons par défaut
        deleteBtn.style.display = 'none';
        cancelBtn.style.display = 'none';

        // Afficher les boutons selon la logique
        if (this.covoiturageData?.status === 'COMING') {
            const hasPassengers = this.hasPassengers();

            if (!hasPassengers) {
                // Aucun passager → Bouton Supprimer
                deleteBtn.style.display = 'inline-block';
            } else {
                // Il y a des passagers → Bouton Annuler
                cancelBtn.style.display = 'inline-block';
            }
        }
    }

    // Créer une vue conviviale pour le mode passenger-view
    createPassengerView() {
        const modalBody = document.querySelector('#covoiturageModal .modal-body');
        if (!modalBody || !this.covoiturageData) {
            return;
        }

        // Masquer le formulaire existant
        const form = document.getElementById('covoiturageForm');
        if (form) {
            form.style.display = 'none';
        }

        // Créer le contenu convivial
        const passengerViewHTML = this.generatePassengerViewHTML();
        
        // Insérer le contenu convivial
        const existingPassengerView = document.getElementById('passengerViewContent');
        if (existingPassengerView) {
            existingPassengerView.remove();
        }
        
        modalBody.insertAdjacentHTML('beforeend', passengerViewHTML);
        
        // Ajouter les boutons d'action spécifiques au mode passager
        this.configurePassengerViewButtons();
    }

    // Générer le HTML pour la vue passager
    generatePassengerViewHTML() {
        const data = this.covoiturageData;
        
        const startDate = new Date(data.startingAt);
        const arrivalDate = new Date(data.arrivalAt);
        
        // Formatage des dates et heures
        const formatDate = (date) => date.toLocaleDateString('fr-FR', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
        const formatTime = (date) => date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', minute: '2-digit' 
        });

        // Informations du chauffeur
        const driver = data.driver || {};
        const driverName = driver.pseudo || 'Chauffeur';
        const driverPhoto = driver.photo ? `${url}uploads/photos/${driver.photo}` : '/images/default-avatar.png';

        // Formatage des adresses selon la vraie structure de l'API
        const startAddress = this.formatRealAddress(data.startingStreet, data.startingPostCode, data.startingCity);
        const arrivalAddress = this.formatRealAddress(data.arrivalStreet, data.arrivalPostCode, data.arrivalCity);

        // Véhicule
        const vehicle = data.vehicle || {};
        const vehicleInfo = vehicle.brand && vehicle.model ? 
            `${vehicle.brand} ${vehicle.model}` : 'Véhicule non spécifié';

        // Places restantes - calcul basé sur la vraie structure
        const totalPlaces = data.nbPlacesAvailable || 0;
        const passengersCount = (data.passenger && Array.isArray(data.passenger)) ? data.passenger.length : 0;
        const remainingSeats = totalPlaces - passengersCount;

        return `
        <div id="passengerViewContent" class="passenger-view-content">
            <!-- Informations du trajet -->
            <div class="card mb-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="fas fa-route me-2"></i>Détails du trajet</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <!-- Départ -->
                        <div class="col-md-6 mb-3">
                            <div class="d-flex align-items-start">
                                <div class="me-3">
                                    <i class="fas fa-map-marker-alt text-success fs-4"></i>
                                </div>
                                <div>
                                    <h6 class="text-success mb-1">Départ</h6>
                                    <p class="mb-1">${startAddress}</p>
                                    <small class="text-muted">
                                        <i class="fas fa-calendar me-1"></i>${formatDate(startDate)}
                                        <br>
                                        <i class="fas fa-clock me-1"></i>${formatTime(startDate)}
                                    </small>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Arrivée -->
                        <div class="col-md-6 mb-3">
                            <div class="d-flex align-items-start">
                                <div class="me-3">
                                    <i class="fas fa-map-marker-alt text-danger fs-4"></i>
                                </div>
                                <div>
                                    <h6 class="text-danger mb-1">Arrivée</h6>
                                    <p class="mb-1">${arrivalAddress}</p>
                                    <small class="text-muted">
                                        <i class="fas fa-calendar me-1"></i>${formatDate(arrivalDate)}
                                        <br>
                                        <i class="fas fa-clock me-1"></i>${formatTime(arrivalDate)}
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Informations du chauffeur -->
            <div class="card mb-4">
                <div class="card-header bg-info text-white">
                    <h5 class="mb-0"><i class="fas fa-user-tie me-2"></i>Votre chauffeur</h5>
                </div>
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <img src="${driverPhoto}" alt="Photo de ${driverName}" 
                                 class="rounded-circle border" 
                                 style="width: 80px; height: 80px; object-fit: cover;">
                        </div>
                        <div class="col">
                            <h5 class="mb-2">${driverName}</h5>
                            <div class="mb-2" id="driverRating">
                                <!-- Les étoiles seront ajoutées ici -->
                            </div>
                            <div class="row text-center">
                                <div class="col-4">
                                    <div class="border rounded p-2">
                                        <i class="fas fa-car text-primary fs-4"></i>
                                        <div class="small mt-1">${vehicleInfo}</div>
                                        <div class="small text-muted">Couleur: ${vehicle.color || 'Non spécifiée'}</div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="border rounded p-2">
                                        <i class="fas fa-users text-success fs-4"></i>
                                        <div class="small mt-1">${remainingSeats} place(s)</div>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="border rounded p-2">
                                        <i class="fas fa-euro-sign text-warning fs-4"></i>
                                        <div class="small mt-1">${data.price || 0} crédits</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Préférences du chauffeur -->
            <div class="card mb-4" id="driverPreferencesCard">
                <div class="card-header bg-secondary text-white">
                    <h5 class="mb-0"><i class="fas fa-cog me-2"></i>Préférences du chauffeur</h5>
                </div>
                <div class="card-body" id="driverPreferencesContent">
                    <!-- Les préférences seront ajoutées ici -->
                </div>
            </div>
        </div>
        `;
    }

    // Formater une adresse selon la vraie structure de l'API
    formatRealAddress(street, postcode, city) {
        const parts = [];
        
        if (street) {
            parts.push(street);
        }
        
        if (postcode && city) {
            parts.push(`${postcode} ${city}`);
        } else if (city) {
            parts.push(city);
        } else if (postcode) {
            parts.push(postcode);
        }
        
        return parts.length > 0 ? parts.join(', ') : 'Adresse non spécifiée';
    }

    // Formater une adresse (ancienne méthode conservée pour compatibilité)
    formatAddress(address) {
        if (!address) {
            return 'Adresse non spécifiée';
        }
        
        // Si l'adresse est une chaîne simple
        if (typeof address === 'string') {
            return address;
        }
        
        // Si l'adresse est un objet
        if (typeof address === 'object') {
            const parts = [];
            
            if (address.street) {
                parts.push(address.street);
            }
            
            if (address.postcode && address.city) {
                parts.push(`${address.postcode} ${address.city}`);
            } else if (address.city) {
                parts.push(address.city);
            } else if (address.postcode) {
                parts.push(address.postcode);
            }
            
            if (parts.length > 0) {
                return parts.join(', ');
            }
        }
        
        return 'Adresse non spécifiée';
    }

    // Configurer les boutons pour la vue passager
    configurePassengerViewButtons() {
        // Cacher tous les boutons d'édition
        const editModeButtons = document.getElementById('editModeButtons');
        if (editModeButtons) {
            editModeButtons.style.display = 'none';
        }

        // Ajouter un bouton "Rejoindre" ou "Quitter" dans le footer
        const footer = document.getElementById('covoiturageModalFooter');
        const closeBtn = document.getElementById('closeBtn');
        
        // Supprimer les anciens boutons s'ils existent
        const existingJoinBtn = document.getElementById('joinCovoiturageBtn');
        if (existingJoinBtn) {
            existingJoinBtn.remove();
        }
        
        const existingLeaveBtn = document.getElementById('leaveCovoiturageBtn');
        if (existingLeaveBtn) {
            existingLeaveBtn.remove();
        }
        
        // Vérifier si l'utilisateur est déjà inscrit à ce covoiturage
        const isUserAlreadyRegistered = this.isUserRegistered();
        
        // Créer le bouton approprié selon l'état d'inscription
        if (isUserAlreadyRegistered) {
            // Bouton "Quitter ce covoiturage"
            const leaveBtn = document.createElement('button');
            leaveBtn.id = 'leaveCovoiturageBtn';
            leaveBtn.className = 'btn btn-outline-danger me-2';
            leaveBtn.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i>Quitter ce covoiturage';
            leaveBtn.addEventListener('click', () => this.handleLeave());
            
            // Insérer le bouton avant le bouton fermer
            footer.insertBefore(leaveBtn, closeBtn);
        } else {
            // Bouton "Rejoindre ce covoiturage"
            const joinBtn = document.createElement('button');
            joinBtn.id = 'joinCovoiturageBtn';
            joinBtn.className = 'btn btn-success me-2';
            joinBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Rejoindre ce covoiturage';
            joinBtn.addEventListener('click', () => this.handleJoin());
            
            // Insérer le bouton avant le bouton fermer
            footer.insertBefore(joinBtn, closeBtn);
        }
    }

// Vérifier si l'utilisateur est déjà inscrit au covoiturage
isUserRegistered() {
    // Si la modale est appelée depuis mescovoiturages, l'utilisateur est forcément inscrit
    if (window.location.pathname.includes('/mescovoiturages')) {
        return true;
    }
    
    // Sinon, on vérifie dans les données du covoiturage
    if (!this.covoiturageData?.passenger) {
        return false;
    }
    
    // Récupérer l'ID de l'utilisateur connecté
    try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (!userInfo?.id) {
            return false;
        }
        
        // Vérifier si l'utilisateur est dans la liste des passagers
        return this.covoiturageData.passenger.some(passenger => 
            passenger.id === userInfo.id
        );
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'inscription:', error);
        return false;
    }
}

// Gérer la désinscription d'un covoiturage
async handleLeave() {
    if (!this.covoiturageId) {
        showMessage('Identifiant du covoiturage non trouvé', 'error');
        return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir vous désinscrire de ce covoiturage ?')) {
        return;
    }
    
    const leaveBtn = document.getElementById('leaveCovoiturageBtn');
    const originalHTML = leaveBtn.innerHTML;
    leaveBtn.disabled = true;
    leaveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Désinscription...';
    
    try {
        await sendFetchRequest(`${apiUrl}ride/${this.covoiturageId}/removeUser`, getToken(), 'PUT');
        showMessage('Vous avez quitté ce covoiturage avec succès !', 'success');
        
        // Fermer la modale
        this.modal.hide();
        
        // Rafraîchir la liste des covoiturages si nécessaire
        if (this.onSuccessCallback) {
            this.onSuccessCallback();
        } else if (typeof window.displayCovoiturages === 'function') {
            // Rafraîchir la liste des covoiturages passager
            window.displayCovoiturages('passenger', window.currentStatusPassenger, window.currentPagePassenger);
        }
    } catch (error) {
        console.error('Erreur lors de la désinscription:', error);
        showMessage('Erreur lors de la désinscription.', 'error');
    } finally {
        leaveBtn.disabled = false;
        leaveBtn.innerHTML = originalHTML;
    }
}

    // Réinitialiser la modale
    resetModal() {
        // Réinitialiser le formulaire
        const form = document.getElementById('covoiturageForm');
        if (form) {
            form.reset();
            form.style.display = 'block'; // Réafficher le formulaire
        }
        
        // Supprimer le contenu de la vue passager s'il existe
        const passengerViewContent = document.getElementById('passengerViewContent');
        if (passengerViewContent) {
            passengerViewContent.remove();
        }
        
        // Vider les champs cachés
        this.clearHiddenFields('starting');
        this.clearHiddenFields('arrival');
        
        // Réinitialiser les variables
        this.covoiturageId = null;
        this.covoiturageData = null;
        this.selectedVehicle = null;
        
        // Masquer le message d'encouragement
        const encouragementMessage = document.getElementById('encouragementMessage');
        if (encouragementMessage) {
            encouragementMessage.style.display = 'none';
        }
        
        // Supprimer le bouton rejoindre s'il existe
        const joinBtn = document.getElementById('joinCovoiturageBtn');
        if (joinBtn) {
            joinBtn.remove();
        }
    }

    // Collecter les données du formulaire
    collectFormData() {
        const hasPassengers = this.currentMode === 'edit' && this.hasPassengers();
        
        const formData = {
            nbPlacesAvailable: parseInt(document.getElementById('nbPlacesAvailable').value),
            vehicle: parseInt(document.getElementById('vehicle').value)
        };

        // Le prix ne peut être modifié que s'il n'y a pas de passagers
        if (this.currentMode === 'create' || !hasPassengers) {
            formData.price = parseFloat(document.getElementById('price').value);
        }

        // Ajouter les adresses SEULEMENT en création
        if (this.currentMode === 'create') {
            formData.startingAddress = this.getAddressData('starting');
            formData.arrivalAddress = this.getAddressData('arrival');
        }

        // Ajouter les dates selon le mode et la présence de passagers
        this.addDateTimeData(formData);

        return formData;
    }

    // Méthode auxiliaire pour récupérer les données d'adresse
    getAddressData(prefix) {
        const streetField = prefix === 'starting' ? 'startingStreet' : 'arrivalStreet';
        const postcodeField = prefix === 'starting' ? 'startingPostCode' : 'arrivalPostCode';
        const cityField = prefix === 'starting' ? 'startingCity' : 'arrivalCity';

        return {
            street: document.getElementById(streetField).value,
            postcode: document.getElementById(postcodeField).value,
            city: document.getElementById(cityField).value
        };
    }

    // Méthode auxiliaire pour ajouter les données de date/heure
    addDateTimeData(formData) {
        const dateDepart = document.getElementById('dateDepart').value;
        const heureDepart = document.getElementById('heureDepart').value;
        const dateArrivee = document.getElementById('dateArrivee').value;
        const heureArrivee = document.getElementById('heureArrivee').value;

        // En création ET en modification, toujours envoyer les dates
        if (this.currentMode === 'create' || this.currentMode === 'edit') {
            if (dateDepart && heureDepart) {
                formData.startingAt = `${dateDepart} ${heureDepart}:00`;
            }
            if (dateArrivee && heureArrivee) {
                formData.arrivalAt = `${dateArrivee} ${heureArrivee}:00`;
            }
        }
    }

    // Méthode utilitaire pour vérifier s'il y a des passagers
    hasPassengers() {
        if (this.currentMode !== 'edit' || !this.covoiturageData) {
            return false;
        }
        
        // Utiliser la propriété officielle de l'API selon la documentation
        const passagers = this.covoiturageData.passenger; // Propriété officielle
                         
        if (passagers && Array.isArray(passagers)) {
            return passagers.length > 0;
        }
        
        // Fallback sur l'ancien calcul (à supprimer une fois l'API stabilisée)
        const placesRestantes = this.covoiturageData.nbPlacesAvailable || 0;
        const placesMaxVehicule = this.covoiturageData.vehicle?.maxNbPlacesAvailable || 0;
        return placesRestantes < placesMaxVehicule;
    }

    // Valider le formulaire
    validateForm() {
        // Validation des champs communs
        const vehicule = document.getElementById('vehicle').value;
        const nbPlaces = document.getElementById('nbPlacesAvailable').value;

        let baseValidation = vehicule && nbPlaces;

        // Le prix est requis en création ou en modification sans passagers
        const hasPassengers = this.currentMode === 'edit' && this.hasPassengers();
        if (this.currentMode === 'create' || !hasPassengers) {
            const prix = document.getElementById('price').value;
            baseValidation = baseValidation && prix;
        }

        // Validation des adresses : SEULEMENT en mode création
        if (this.currentMode === 'create') {
            const requiredFields = ['startingStreet', 'startingPostCode', 'startingCity', 'arrivalStreet', 'arrivalPostCode', 'arrivalCity'];
            
            for (const field of requiredFields) {
                const value = document.getElementById(field).value.trim();
                if (!value) {
                    return false;
                }
            }
        }

        // Validation des dates : en création ET en modification (toujours requises)
        if (this.currentMode === 'create' || this.currentMode === 'edit') {
            const dateDepart = document.getElementById('dateDepart').value;
            const heureDepart = document.getElementById('heureDepart').value;
            const dateArrivee = document.getElementById('dateArrivee').value;
            const heureArrivee = document.getElementById('heureArrivee').value;
            
            return baseValidation && dateDepart && heureDepart && dateArrivee && heureArrivee;
        }

        return baseValidation;
    }

    // Gérer la soumission du formulaire
    async handleSubmit() {
        if (!this.validateForm()) {
            showMessage('Veuillez remplir tous les champs obligatoires et sélectionner des adresses valides.', 'error');
            return;
        }

        const submitBtn = this.currentMode === 'create' ? document.getElementById('createBtn') : document.getElementById('updateBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>' + 
                (this.currentMode === 'create' ? 'Création...' : 'Modification...');

            const formData = this.collectFormData();
            
            if (this.currentMode === 'create') {
                await sendFetchRequest(`${apiUrl}ride/add`, getToken(), 'POST', JSON.stringify(formData));
                showMessage('Covoiturage créé avec succès !', 'success');
            } else {
                try {
                    await sendFetchRequest(`${apiUrl}ride/update/${this.covoiturageId}`, getToken(), 'PUT', JSON.stringify(formData));
                    showMessage('Covoiturage modifié avec succès !', 'success');
                } catch (error) {
                    // Gestion spéciale pour les erreurs JSON (réponse vide)
                    if (error?.message?.includes('Unexpected end of JSON input')) {
                        showMessage('Covoiturage modifié avec succès !', 'success');
                    } else {
                        throw error; // Re-lancer l'erreur si ce n'est pas un problème de JSON
                    }
                }
            }

            // Fermer la modale
            this.modal.hide();
            
            // Appeler le callback de succès
            if (this.onSuccessCallback) {
                this.onSuccessCallback();
            }

        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            showMessage('Erreur lors de l\'enregistrement du covoiturage.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    // Gérer la suppression
    async handleDelete() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce covoiturage ?')) {
            return;
        }

        const deleteBtn = document.getElementById('deleteCovoiturageBtn');
        const originalHTML = deleteBtn.innerHTML;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Suppression...';

        try {
            await sendFetchRequest(`${apiUrl}ride/${this.covoiturageId}`, getToken(), 'DELETE');
            showMessage('Covoiturage supprimé avec succès !', 'success');
            
            this.modal.hide();
            
            if (this.onSuccessCallback) {
                this.onSuccessCallback();
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            showMessage('Erreur lors de la suppression du covoiturage.', 'error');
        } finally {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalHTML;
        }
    }

    // Gérer l'annulation
    async handleCancel() {
        if (!confirm('Êtes-vous sûr de vouloir annuler ce covoiturage ? Cette action est irréversible.')) {
            return;
        }

        const cancelBtn = document.getElementById('cancelCovoiturageBtn');
        const originalHTML = cancelBtn.innerHTML;
        cancelBtn.disabled = true;
        cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Annulation...';

        try {
            await sendFetchRequest(`${apiUrl}ride/${this.covoiturageId}/cancel`, getToken(), 'PUT');
            showMessage('Covoiturage annulé avec succès !', 'success');
            
            this.modal.hide();
            
            if (this.onSuccessCallback) {
                this.onSuccessCallback();
            }
        } catch (error) {
            console.error('Erreur lors de l\'annulation:', error);
            showMessage('Erreur lors de l\'annulation du covoiturage.', 'error');
        } finally {
            cancelBtn.disabled = false;
            cancelBtn.innerHTML = originalHTML;
        }
    }

    // Configuration de la validation des dates et heures
    setupDateTimeValidation() {
        const dateDepart = document.getElementById('dateDepart');
        const heureDepart = document.getElementById('heureDepart');
        const dateArrivee = document.getElementById('dateArrivee');
        const heureArrivee = document.getElementById('heureArrivee');

        // Fonction de validation
        const validateDateTime = () => {
            if (!dateDepart.value || !heureDepart.value || !dateArrivee.value || !heureArrivee.value) {
                return; // Ne pas valider si tous les champs ne sont pas remplis
            }

            const departDateTime = new Date(`${dateDepart.value}T${heureDepart.value}`);
            const arriveeDateTime = new Date(`${dateArrivee.value}T${heureArrivee.value}`);

            if (arriveeDateTime <= departDateTime) {
                // Afficher un message d'erreur
                showMessage('La date et heure d\'arrivée doivent être postérieures à celles de départ.', 'error');
                
                // Reset du champ d'arrivée
                if (dateArrivee.value === dateDepart.value) {
                    // Même jour, on ajuste l'heure
                    const newTime = new Date(departDateTime.getTime() + 30 * 60000); // +30 minutes
                    heureArrivee.value = newTime.toTimeString().slice(0, 5);
                } else {
                    // Jour différent, on ajuste la date
                    const newDate = new Date(departDateTime.getTime() + 24 * 60 * 60000); // +1 jour
                    dateArrivee.value = newDate.toISOString().split('T')[0];
                }
            }
        };

        // Événements de validation
        dateDepart.addEventListener('change', validateDateTime);
        heureDepart.addEventListener('change', validateDateTime);
        dateArrivee.addEventListener('change', validateDateTime);
        heureArrivee.addEventListener('change', validateDateTime);

        // Définir la date minimum à aujourd'hui pour le départ
        const today = new Date().toISOString().split('T')[0];
        dateDepart.min = today;
        
        // Quand on change la date de départ, ajuster la date minimum d'arrivée
        dateDepart.addEventListener('change', () => {
            dateArrivee.min = dateDepart.value;
            if (dateArrivee.value && dateArrivee.value < dateDepart.value) {
                dateArrivee.value = dateDepart.value;
            }
        });
    }

    // Gérer l'inscription à un covoiturage
    async handleJoin() {
        if (!this.covoiturageId) {
            showMessage('Identifiant du covoiturage non trouvé', 'error');
            return;
        }
        
        const joinBtn = document.getElementById('joinCovoiturageBtn');
        
        // Utiliser la fonction globale joinRide définie dans searchcovoiturages.js
        // Passer true comme troisième paramètre pour indiquer que l'appel vient de la modale
        const success = await window.joinRide(this.covoiturageId, joinBtn, true);
        
        // Si l'inscription a réussi, fermer la modale
        if (success) {
            this.modal.hide();
        }
    }
}

// Créer une instance globale
const covoiturageModal = new CovoiturageModal();

// Exporter la classe et l'instance
export { CovoiturageModal, covoiturageModal };
export default covoiturageModal;
