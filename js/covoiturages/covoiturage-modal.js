// Module unifié pour gérer la modale de covoiturage (création, modification, lecture seule)
import { apiUrl } from '../config.js';
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
                preferencesSection.style.display = 'block'; // Afficher les préférences du chauffeur
                addPreferenceSection.style.display = 'none'; // Ne pas permettre d'ajouter des préférences
                editModeButtons.style.display = 'none';
                closeBtn.innerHTML = '<i class="fas fa-times me-2"></i>Fermer';
                this.setFieldsEnabled(false); // Tous les champs en lecture seule
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

            // Charger les données nécessaires
            await Promise.all([
                this.loadUserVehicles(),
                this.loadUserPreferences()
            ]);

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
                
                // Pré-remplir le formulaire
                this.populateForm(data);
                
                if (mode === 'edit') {
                    // Configurer les boutons d'action pour la modification
                    this.configureEditButtons();
                    // Activer les champs selon les règles métier (après chargement des données)
                    this.setFieldsEnabled(true);
                } else if (mode === 'passenger-view') {
                    // Configurer les boutons pour la vue passager
                    this.configurePassengerViewButtons();
                }
            }

            // Afficher la modale
            this.modal.show();

        } catch (error) {
            console.error('Erreur lors de l\'affichage de la modale:', error);
            showMessage('Erreur lors de l\'ouverture de la modale.', 'error');
        }
    }

    // Pré-remplir le formulaire avec les données existantes
    populateForm(data) {
        
        // Adresses de départ - nouvelle structure avec startingAddress
        if (data.startingAddress && data.startingAddress.street && data.startingAddress.postcode && data.startingAddress.city) {
            document.getElementById('departAdresse').value = `${data.startingAddress.street}, ${data.startingAddress.postcode} ${data.startingAddress.city}`;
            // Remplir aussi les champs cachés
            document.getElementById('startingStreet').value = data.startingAddress.street;
            document.getElementById('startingPostCode').value = data.startingAddress.postcode;
            document.getElementById('startingCity').value = data.startingAddress.city;
        } else if (data.startingAddress?.city) {
            document.getElementById('departAdresse').value = data.startingAddress.city;
        } else if (data.startingStreet && data.startingPostCode && data.startingCity) {
            // Fallback pour l'ancienne structure
            document.getElementById('departAdresse').value = `${data.startingStreet}, ${data.startingPostCode} ${data.startingCity}`;
            document.getElementById('startingStreet').value = data.startingStreet;
            document.getElementById('startingPostCode').value = data.startingPostCode;
            document.getElementById('startingCity').value = data.startingCity;
        } else if (data.startingCity) {
            document.getElementById('departAdresse').value = data.startingCity;
        }

        // Adresses d'arrivée - nouvelle structure avec arrivalAddress
        if (data.arrivalAddress && data.arrivalAddress.street && data.arrivalAddress.postcode && data.arrivalAddress.city) {
            document.getElementById('arriveeAdresse').value = `${data.arrivalAddress.street}, ${data.arrivalAddress.postcode} ${data.arrivalAddress.city}`;
            // Remplir aussi les champs cachés
            document.getElementById('arrivalStreet').value = data.arrivalAddress.street;
            document.getElementById('arrivalPostCode').value = data.arrivalAddress.postcode;
            document.getElementById('arrivalCity').value = data.arrivalAddress.city;
        } else if (data.arrivalAddress?.city) {
            document.getElementById('arriveeAdresse').value = data.arrivalAddress.city;
        } else if (data.arrivalStreet && data.arrivalPostCode && data.arrivalCity) {
            // Fallback pour l'ancienne structure
            document.getElementById('arriveeAdresse').value = `${data.arrivalStreet}, ${data.arrivalPostCode} ${data.arrivalCity}`;
            document.getElementById('arrivalStreet').value = data.arrivalStreet;
            document.getElementById('arrivalPostCode').value = data.arrivalPostCode;
            document.getElementById('arrivalCity').value = data.arrivalCity;
        } else if (data.arrivalCity) {
            document.getElementById('arriveeAdresse').value = data.arrivalCity;
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

    // Afficher les préférences du chauffeur en mode passenger-view
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

    // Configuration des boutons pour la vue passager
    configurePassengerViewButtons() {
        const editModeButtons = document.getElementById('editModeButtons');
        const deleteBtn = document.getElementById('deleteCovoiturageBtn');
        const cancelBtn = document.getElementById('cancelCovoiturageBtn');
        
        // Masquer les boutons d'édition
        editModeButtons.style.display = 'none';
        deleteBtn.style.display = 'none';
        cancelBtn.style.display = 'none';

        // Créer et afficher le bouton "Je m'inscris" s'il n'existe pas
        let joinBtn = document.getElementById('joinCovoiturageBtn');
        if (!joinBtn) {
            joinBtn = document.createElement('button');
            joinBtn.id = 'joinCovoiturageBtn';
            joinBtn.className = 'btn btn-success me-2';
            joinBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Je m\'inscris';
            joinBtn.addEventListener('click', () => this.handleJoin());
            
            // Insérer avant le bouton fermer
            const closeBtn = document.getElementById('closeBtn');
            closeBtn.parentNode.insertBefore(joinBtn, closeBtn);
        }
        
        joinBtn.style.display = 'inline-block';
    }

    // Réinitialiser la modale
    resetModal() {
        // Réinitialiser le formulaire
        const form = document.getElementById('covoiturageForm');
        if (form) {
            form.reset();
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

    // Afficher la liste des passagers
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
                            <img src="${passenger.photo || '/images/default-avatar.png'}" 
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

    // Gérer l'inscription à un covoiturage
    async handleJoin() {
        // Fonctionnalité d'inscription en cours de développement
        showMessage('Fonctionnalité d\'inscription en cours de développement', 'info');
    }
}

// Créer une instance globale
const covoiturageModal = new CovoiturageModal();

// Exporter la classe et l'instance
export { CovoiturageModal, covoiturageModal };
export default covoiturageModal;
