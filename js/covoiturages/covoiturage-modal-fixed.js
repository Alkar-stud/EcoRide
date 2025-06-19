// Module unifié pour gérer la modale de covoiturage (création, modification, lecture seule)
import { apiUrl } from '../config.js';
import { getToken, sendFetchRequest, showMessage, getUserInfo } from '../script.js';

class CovoiturageModal {
    constructor() {
        this.modal = null;
        this.currentMode = null; // 'create', 'edit', 'view'
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
        document.getElementById('vehicule').addEventListener('change', (e) => {
            this.handleVehicleChange(e.target.value);
        });

        // Autocomplétion d'adresses
        this.setupAddressAutocomplete();

        // Événement de fermeture de la modale
        document.getElementById('covoiturageModal').addEventListener('hidden.bs.modal', () => {
            this.resetModal();
        });

        console.log('Événements attachés à la modale unifiée');
    }

    // Configuration de l'autocomplétion d'adresses
    setupAddressAutocomplete() {
        this.setupSingleAddressAutocomplete('departAdresse', 'departSuggestions', 'depart');
        this.setupSingleAddressAutocomplete('arriveeAdresse', 'arriveeSuggestions', 'arrivee');
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
        document.getElementById(prefix + 'Street').value = properties.name || '';
        document.getElementById(prefix + 'Postcode').value = properties.postcode || '';
        document.getElementById(prefix + 'City').value = properties.city || '';
        
        console.log(`Adresse ${prefix} stockée:`, {
            street: properties.name,
            postcode: properties.postcode,
            city: properties.city
        });
    }

    // Nettoyer les champs cachés
    clearHiddenFields(prefix) {
        document.getElementById(prefix + 'Street').value = '';
        document.getElementById(prefix + 'Postcode').value = '';
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
                this.setFieldsEnabled(true);
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
        }
    }

    // Activer/désactiver les champs du formulaire
    setFieldsEnabled(enabled) {
        const form = document.getElementById('covoiturageForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.disabled = !enabled;
        });

        // Gérer spécifiquement le bouton d'ajout de préférence
        const addPreferenceBtn = document.getElementById('addPreferenceBtn');
        if (addPreferenceBtn) {
            addPreferenceBtn.disabled = !enabled;
        }
    }

    // Définir la date minimum à aujourd'hui
    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('dateDepart');
        if (dateInput) {
            dateInput.min = today;
        }
    }

    // Charger les véhicules de l'utilisateur
    async loadUserVehicles() {
        try {
            const response = await sendFetchRequest(`${apiUrl}vehicle/list`, getToken(), 'GET');
            const vehicleSelect = document.getElementById('vehicule');
            
            if (!vehicleSelect) return;
            
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
        const placesSelect = document.getElementById('nbPlaces');
        
        if (!placesSelect) return;
        
        placesSelect.innerHTML = '<option value="">Nombre de places</option>';
        
        if (vehicleId && vehicleId !== 'add-vehicle') {
            const vehicle = this.vehiclesData.find(v => v.id.toString() === vehicleId);
            if (vehicle) {
                this.selectedVehicle = vehicle;
                const maxPlaces = vehicle.maxNbPlacesAvailable;
                
                for (let i = 1; i <= maxPlaces; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `${i} place${i > 1 ? 's' : ''}`;
                    placesSelect.appendChild(option);
                }
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

    // Afficher les préférences (seulement en mode création)
    displayPreferences() {
        if (this.currentMode !== 'create') return;
        
        const container = document.getElementById('preferencesContainer');
        if (!container) return;

        container.innerHTML = '';

        // Cases à cocher pour fumeurs et animaux
        const predefinedPrefs = [
            { key: 'smokingAllowed', label: 'Fumeurs autorisés', icon: 'fas fa-smoking' },
            { key: 'petsAllowed', label: 'Animaux autorisés', icon: 'fas fa-paw' }
        ];

        predefinedPrefs.forEach(pref => {
            const isChecked = this.userPreferences.some(up => up.key === pref.key && up.value === 'true');
            
            const prefElement = document.createElement('div');
            prefElement.className = 'form-check mb-2';
            prefElement.innerHTML = `
                <input class="form-check-input" type="checkbox" id="${pref.key}" name="${pref.key}" ${isChecked ? 'checked' : ''}>
                <label class="form-check-label" for="${pref.key}">
                    <i class="${pref.icon} me-2"></i>${pref.label}
                </label>
            `;
            container.appendChild(prefElement);
        });

        // Préférences personnalisées (affichage simple en texte)
        const customPrefs = this.userPreferences.filter(up => !['smokingAllowed', 'petsAllowed'].includes(up.key));
        
        if (customPrefs.length > 0) {
            const customContainer = document.createElement('div');
            customContainer.className = 'mt-3';
            customContainer.innerHTML = '<h6><i class="fas fa-star me-2"></i>Préférences personnalisées :</h6>';
            
            customPrefs.forEach(pref => {
                const prefElement = document.createElement('div');
                prefElement.className = 'form-check mb-2';
                prefElement.innerHTML = `
                    <input class="form-check-input" type="checkbox" id="custom_${pref.id}" name="custom_${pref.id}" checked>
                    <label class="form-check-label" for="custom_${pref.id}">
                        <strong>${pref.key}</strong>${pref.value ? ': ' + pref.value : ''}
                    </label>
                `;
                customContainer.appendChild(prefElement);
            });
            
            container.appendChild(customContainer);
        }
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
        
        // Vérifier si cette préférence existe déjà
        const exists = this.userPreferences.some(pref => 
            pref.key.toLowerCase() === title.toLowerCase()
        );
        
        if (exists) {
            showMessage('Cette préférence existe déjà dans vos préférences.', 'warning');
            return;
        }
        
        try {
            const newPreference = {
                key: title,
                value: description || null
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
                
            } else if (mode === 'edit' || mode === 'view') {
                // Mode modification ou lecture seule
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
        // Adresses de départ
        if (data.startingStreet && data.startingPostCode && data.startingCity) {
            document.getElementById('departAdresse').value = `${data.startingStreet}, ${data.startingPostCode} ${data.startingCity}`;
            // Remplir aussi les champs cachés
            document.getElementById('departStreet').value = data.startingStreet;
            document.getElementById('departPostcode').value = data.startingPostCode;
            document.getElementById('departCity').value = data.startingCity;
        } else if (data.startingCity) {
            document.getElementById('departAdresse').value = data.startingCity;
        }

        // Adresses d'arrivée
        if (data.arrivalStreet && data.arrivalPostCode && data.arrivalCity) {
            document.getElementById('arriveeAdresse').value = `${data.arrivalStreet}, ${data.arrivalPostCode} ${data.arrivalCity}`;
            // Remplir aussi les champs cachés
            document.getElementById('arriveeStreet').value = data.arrivalStreet;
            document.getElementById('arriveePostcode').value = data.arrivalPostCode;
            document.getElementById('arriveeCity').value = data.arrivalCity;
        } else if (data.arrivalCity) {
            document.getElementById('arriveeAdresse').value = data.arrivalCity;
        }

        // Date et heure (à partir de startingAt)
        if (data.startingAt) {
            const startingDate = new Date(data.startingAt);
            document.getElementById('dateDepart').value = startingDate.toISOString().split('T')[0];
            document.getElementById('heureDepart').value = startingDate.toTimeString().slice(0, 5);
        }

        // Prix
        document.getElementById('prix').value = data.price || '';

        // Véhicule et places
        if (data.vehicle?.id) {
            document.getElementById('vehicule').value = data.vehicle.id;
            this.handleVehicleChange(data.vehicle.id);
            
            // Attendre un peu que les options soient créées puis utiliser maxNbPlacesAvailable du véhicule
            setTimeout(() => {
                if (data.vehicle.maxNbPlacesAvailable) {
                    document.getElementById('nbPlaces').value = data.vehicle.maxNbPlacesAvailable;
                }
            }, 100);
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
        if (this.covoiturageData.status === 'COMING') {
            const placesRestantes = this.covoiturageData.nbPlacesAvailable;
            const placesMaxVehicule = this.covoiturageData.vehicle?.maxNbPlacesAvailable;

            if (placesRestantes && placesMaxVehicule) {
                if (placesRestantes === placesMaxVehicule) {
                    // Aucun passager → Bouton Supprimer
                    deleteBtn.style.display = 'inline-block';
                } else {
                    // Il y a des passagers → Bouton Annuler
                    cancelBtn.style.display = 'inline-block';
                }
            }
        }
    }

    // Réinitialiser la modale
    resetModal() {
        // Réinitialiser le formulaire
        const form = document.getElementById('covoiturageForm');
        if (form) {
            form.reset();
        }
        
        // Vider les champs cachés
        this.clearHiddenFields('depart');
        this.clearHiddenFields('arrivee');
        
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
        const formData = {
            startingStreet: document.getElementById('departStreet').value,
            startingPostCode: document.getElementById('departPostcode').value,
            startingCity: document.getElementById('departCity').value,
            arrivalStreet: document.getElementById('arriveeStreet').value,
            arrivalPostCode: document.getElementById('arriveePostcode').value,
            arrivalCity: document.getElementById('arriveeCity').value,
            price: parseFloat(document.getElementById('prix').value),
            nbPlacesAvailable: parseInt(document.getElementById('nbPlaces').value),
            vehicleId: parseInt(document.getElementById('vehicule').value)
        };

        // Construire la date et heure de départ
        const dateDepart = document.getElementById('dateDepart').value;
        const heureDepart = document.getElementById('heureDepart').value;
        if (dateDepart && heureDepart) {
            formData.startingAt = `${dateDepart}T${heureDepart}:00`;
        }

        // Ajouter les préférences (seulement en mode création)
        if (this.currentMode === 'create') {
            formData.preferences = [];
            
            // Préférences prédéfinies
            const smokingAllowed = document.getElementById('smokingAllowed')?.checked;
            const petsAllowed = document.getElementById('petsAllowed')?.checked;
            
            if (smokingAllowed) {
                formData.preferences.push({ key: 'smokingAllowed', value: 'true' });
            }
            if (petsAllowed) {
                formData.preferences.push({ key: 'petsAllowed', value: 'true' });
            }
            
            // Préférences personnalisées cochées
            const customCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="custom_"]:checked');
            customCheckboxes.forEach(checkbox => {
                const prefId = checkbox.id.replace('custom_', '');
                const pref = this.userPreferences.find(p => p.id.toString() === prefId);
                if (pref) {
                    formData.preferences.push({ key: pref.key, value: pref.value });
                }
            });
        }

        return formData;
    }

    // Valider le formulaire
    validateForm() {
        const requiredFields = ['departStreet', 'departPostcode', 'departCity', 'arriveeStreet', 'arriveePostcode', 'arriveeCity'];
        
        for (const field of requiredFields) {
            const value = document.getElementById(field).value.trim();
            if (!value) {
                return false;
            }
        }

        const dateDepart = document.getElementById('dateDepart').value;
        const heureDepart = document.getElementById('heureDepart').value;
        const prix = document.getElementById('prix').value;
        const vehicule = document.getElementById('vehicule').value;
        const nbPlaces = document.getElementById('nbPlaces').value;

        return dateDepart && heureDepart && prix && vehicule && nbPlaces;
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
                await sendFetchRequest(`${apiUrl}ride/update/${this.covoiturageId}`, getToken(), 'PUT', JSON.stringify(formData));
                showMessage('Covoiturage modifié avec succès !', 'success');
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
}

// Créer une instance globale
const covoiturageModal = new CovoiturageModal();

// Exporter la classe et l'instance
export { CovoiturageModal, covoiturageModal };
export default covoiturageModal;
