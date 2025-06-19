// Module pour gérer la modale de modification de covoiturage
import { apiUrl } from '../config.js';
import { getToken, sendFetchRequest, showMessage } from '../script.js';

class ModifierCovoiturageModal {
    constructor() {
        this.modal = null;
        this.covoiturageId = null;
        this.covoiturageData = null;
        this.selectedVehicle = null;
        this.vehiclesData = []; // Changer pour correspondre à la création
        this.onSuccessCallback = null;
        this.isInitialized = false;
        this.searchTimeouts = {}; // Pour gérer les délais de recherche (comme dans la création)
        this.isReadOnlyMode = false; // Mode lecture seule pour les détails
        // Ne pas initialiser immédiatement, attendre l'appel à show()
    }

    async initialize() {
        if (this.isInitialized) return;
        
        this.createModal();
        // Attendre que la modale soit dans le DOM avant d'attacher les événements
        setTimeout(() => {
            this.attachEvents();
        }, 100);
        this.isInitialized = true;
    }

    createModal() {
        // Créer la structure de la modale identique à celle de création (sans les préférences)
        const modalHTML = `
            <div class="modal fade" id="modifierCovoiturageModal" tabindex="-1" aria-labelledby="modifierCovoiturageModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="modifierCovoiturageModalLabel">
                                <i class="fas fa-edit me-2"></i>Modifier le covoiturage
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fermer"></button>
                        </div>
                        <div class="modal-body">
                            <form id="modifierCovoiturageForm">
                                <div class="row">
                                    <!-- Départ -->
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="modifierDepartAdresse" class="form-label">
                                                <i class="fas fa-map-marker-alt text-success me-1"></i>Adresse de départ *
                                            </label>
                                            <div class="position-relative">
                                                <input type="text" class="form-control" id="modifierDepartAdresse" name="modifierDepartAdresse" required 
                                                       placeholder="Ex: 10 Rue de Rivoli, 75001 Paris"
                                                       autocomplete="off">
                                                <div id="modifierDepartSuggestions" class="position-absolute w-100 bg-white border rounded shadow-sm" 
                                                     style="display: none; z-index: 1000; max-height: 200px; overflow-y: auto; top: 100%;"></div>
                                            </div>
                                            <div class="form-text">Saisissez l'adresse complète du point de rendez-vous</div>
                                            <!-- Champs cachés pour stocker les données parsées -->
                                            <input type="hidden" id="modifierDepartStreet" name="modifierDepartStreet">
                                            <input type="hidden" id="modifierDepartPostcode" name="modifierDepartPostcode">
                                            <input type="hidden" id="modifierDepartCity" name="modifierDepartCity">
                                        </div>
                                    </div>

                                    <!-- Arrivée -->
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="modifierArriveeAdresse" class="form-label">
                                                <i class="fas fa-flag-checkered text-danger me-1"></i>Adresse d'arrivée *
                                            </label>
                                            <div class="position-relative">
                                                <input type="text" class="form-control" id="modifierArriveeAdresse" name="modifierArriveeAdresse" required 
                                                       placeholder="Ex: 25 Avenue des Champs-Élysées, 75008 Paris"
                                                       autocomplete="off">
                                                <div id="modifierArriveeSuggestions" class="position-absolute w-100 bg-white border rounded shadow-sm" 
                                                     style="display: none; z-index: 1000; max-height: 200px; overflow-y: auto; top: 100%;"></div>
                                            </div>
                                            <div class="form-text">Saisissez l'adresse complète du point d'arrivée</div>
                                            <!-- Champs cachés pour stocker les données parsées -->
                                            <input type="hidden" id="modifierArriveeStreet" name="modifierArriveeStreet">
                                            <input type="hidden" id="modifierArriveePostcode" name="modifierArriveePostcode">
                                            <input type="hidden" id="modifierArriveeCity" name="modifierArriveeCity">
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <!-- Date de départ -->
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="modifierDateDepart" class="form-label">
                                                <i class="fas fa-calendar text-primary me-1"></i>Date de départ *
                                            </label>
                                            <input type="date" class="form-control" id="modifierDateDepart" name="modifierDateDepart" required>
                                        </div>
                                    </div>

                                    <!-- Heure de départ -->
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="modifierHeureDepart" class="form-label">
                                                <i class="fas fa-clock text-primary me-1"></i>Heure de départ *
                                            </label>
                                            <input type="time" class="form-control" id="modifierHeureDepart" name="modifierHeureDepart" required>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <!-- Véhicule -->
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="modifierVehicule" class="form-label">
                                                <i class="fas fa-car text-info me-1"></i>Véhicule *
                                            </label>
                                            <select class="form-select" id="modifierVehicule" name="modifierVehicule" required>
                                                <option value="">Sélectionnez votre véhicule</option>
                                                <!-- Les véhicules seront chargés dynamiquement -->
                                            </select>
                                        </div>
                                    </div>

                                    <!-- Nombre de places -->
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="modifierNbPlaces" class="form-label">
                                                <i class="fas fa-users text-info me-1"></i>Nombre de places disponibles *
                                            </label>
                                            <select class="form-select" id="modifierNbPlaces" name="modifierNbPlaces" required>
                                                <option value="">Sélectionnez le nombre de places</option>
                                                <option value="1">1 place</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <!-- Prix par place -->
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="modifierPrix" class="form-label">
                                                <i class="fas fa-euro-sign text-warning me-1"></i>Prix par place (en crédits) *
                                            </label>
                                            <input type="number" class="form-control" id="modifierPrix" name="modifierPrix" required 
                                                   min="1" step="1" pattern="[0-9]+" placeholder="Ex: 15">
                                            <div class="form-text">Le prix doit être équitable et couvrir les frais d'essence tout en prenant en compte la commission de EcoRide. Le prix moyen constaté est de 1 à 2 crédits par kilomètre</div>
                                        </div>
                                    </div>
                                    
                                    <!-- Colonne vide pour l'équilibrage -->
                                    <div class="col-md-6"></div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-danger" id="supprimerCovoiturageBtn" style="display: none;">
                                <i class="fas fa-trash me-2"></i>Supprimer
                            </button>
                            <button type="button" class="btn btn-warning" id="annulerCovoiturageBtn" style="display: none;">
                                <i class="fas fa-ban me-2"></i>Annuler le covoiturage
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times me-2"></i>Fermer
                            </button>
                            <button type="button" class="btn btn-primary" id="modifierCovoiturageSubmitBtn">
                                <i class="fas fa-save me-2"></i>Enregistrer les modifications
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Ajouter la modale au DOM si elle n'existe pas
        if (!document.getElementById('modifierCovoiturageModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        this.modal = new bootstrap.Modal(document.getElementById('modifierCovoiturageModal'));
    }

    attachEvents() {
        // Vérifier que les éléments existent avant d'attacher les événements
        const submitBtn = document.getElementById('modifierCovoiturageSubmitBtn');
        const deleteBtn = document.getElementById('supprimerCovoiturageBtn');
        const cancelBtn = document.getElementById('annulerCovoiturageBtn');
        const vehicleSelect = document.getElementById('modifierVehicule');

        if (!submitBtn || !deleteBtn || !cancelBtn || !vehicleSelect) {
            console.error('Éléments de la modale non trouvés, réessai dans 500ms...');
            setTimeout(() => this.attachEvents(), 500);
            return;
        }

        // Événement de soumission
        submitBtn.addEventListener('click', () => {
            this.handleSubmit();
        });

        // Événement de suppression
        deleteBtn.addEventListener('click', () => {
            this.handleDelete();
        });

        // Événement d'annulation du covoiturage
        cancelBtn.addEventListener('click', () => {
            this.handleCancel();
        });

        // Gestion du changement de véhicule
        vehicleSelect.addEventListener('change', (e) => {
            this.handleVehicleChange(e.target.value);
        });

        // Autocomplétion des adresses (identique à la création)
        this.setupAddressAutocomplete();

        // Événement quand la modale est fermée
        const modalElement = document.getElementById('modifierCovoiturageModal');
        modalElement.addEventListener('hidden.bs.modal', () => {
            // Réinitialiser le mode normal quand la modale est fermée
            this.setReadOnlyMode(false);
            
            // Effacer le formulaire
            this.clearForm();
        });

        console.log('Événements attachés avec succès à la modale de modification');
    }

    // Configuration de l'autocomplétion d'adresses (identique à la création)
    setupAddressAutocomplete() {
        this.setupSingleAddressAutocomplete('modifierDepartAdresse', 'modifierDepartSuggestions', 'modifierDepart');
        this.setupSingleAddressAutocomplete('modifierArriveeAdresse', 'modifierArriveeSuggestions', 'modifierArrivee');
    }

    // Configurer l'autocomplétion pour un champ d'adresse spécifique (copié de la création)
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

    // Rechercher des adresses via l'API française (copié de la création)
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

    // Afficher les suggestions d'adresses (copié de la création)
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

    // Sélectionner une adresse et parser les données (copié de la création)
    selectAddress(feature, input, suggestionsContainer, prefix) {
        const properties = feature.properties;
        
        // Afficher l'adresse complète dans le champ
        input.value = properties.label;
        
        // Parser et stocker les composants de l'adresse
        this.parseAndStoreAddress(properties, prefix);
        
        // Cacher les suggestions
        this.hideSuggestions(suggestionsContainer);
    }

    // Parser l'adresse et la stocker dans les champs cachés (copié de la création)
    parseAndStoreAddress(properties, prefix) {
        // Extraire les composants de l'adresse
        const housenumber = properties.housenumber || '';
        const street = properties.street || properties.name || '';
        const postcode = properties.postcode || '';
        const city = properties.city || '';

        // Construire le nom de rue complet
        const fullStreet = housenumber ? `${housenumber} ${street}` : street;

        // Remplir les champs cachés (adapter les ID pour la modification)
        let streetField, postcodeField, cityField;
        
        if (prefix === 'modifierDepart') {
            streetField = document.getElementById('modifierDepartStreet');
            postcodeField = document.getElementById('modifierDepartPostcode');
            cityField = document.getElementById('modifierDepartCity');
        } else if (prefix === 'modifierArrivee') {
            streetField = document.getElementById('modifierArriveeStreet');
            postcodeField = document.getElementById('modifierArriveePostcode');
            cityField = document.getElementById('modifierArriveeCity');
        }

        if (streetField) streetField.value = fullStreet;
        if (postcodeField) postcodeField.value = postcode;
        if (cityField) cityField.value = city;
    }

    // Cacher les suggestions (copié de la création)
    hideSuggestions(suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
        suggestionsContainer.innerHTML = '';
    }

    // Nettoyer les champs cachés (copié de la création)
    clearHiddenFields(prefix) {
        let streetField, postcodeField, cityField;
        
        if (prefix === 'modifierDepart') {
            streetField = document.getElementById('modifierDepartStreet');
            postcodeField = document.getElementById('modifierDepartPostcode');
            cityField = document.getElementById('modifierDepartCity');
        } else if (prefix === 'modifierArrivee') {
            streetField = document.getElementById('modifierArriveeStreet');
            postcodeField = document.getElementById('modifierArriveePostcode');
            cityField = document.getElementById('modifierArriveeCity');
        }

        if (streetField) streetField.value = '';
        if (postcodeField) postcodeField.value = '';
        if (cityField) cityField.value = '';
    }

    // Récupérer les données du covoiturage à modifier
    async fetchCovoiturageData(covoiturageId) {
        try {
            const endpoint = apiUrl + 'ride/show/' + covoiturageId;
            const data = await sendFetchRequest(endpoint, getToken(), 'GET');
            return data;
        } catch (error) {
            console.error('Erreur lors de la récupération du covoiturage:', error);
            throw error;
        }
    }

    // Récupérer les véhicules de l'utilisateur
    async fetchUserVehicles() {
        try {
            const endpoint = apiUrl + 'vehicle/list';
            const vehicles = await sendFetchRequest(endpoint, getToken(), 'GET');
            return vehicles || [];
        } catch (error) {
            console.error('Erreur lors de la récupération des véhicules:', error);
            return [];
        }
    }

    // Charger les véhicules dans le select (identique à la création)
    loadVehiclesInSelect() {
        const vehicleSelect = document.getElementById('modifierVehicule');
        
        if (!vehicleSelect) return;
        
        vehicleSelect.innerHTML = '<option value="">Sélectionnez votre véhicule</option>';
        
        if (this.vehiclesData && this.vehiclesData.length > 0) {
            this.vehiclesData.forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle.id;
                option.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.maxNbPlacesAvailable} places max)`;
                // Stocker les informations du véhicule dans l'option
                option.dataset.maxPlaces = vehicle.maxNbPlacesAvailable;
                vehicleSelect.appendChild(option);
            });
        } else {
            const addVehicleOption = document.createElement('option');
            addVehicleOption.value = 'add-vehicle';
            addVehicleOption.textContent = '+ Ajouter un véhicule';
            vehicleSelect.appendChild(addVehicleOption);
        }
    }

    // Gestion du changement de véhicule (identique à la création)
    handleVehicleChange(vehicleId) {
        const placesSelect = document.getElementById('modifierNbPlaces');
        placesSelect.innerHTML = '';

        if (!vehicleId) {
            placesSelect.innerHTML = '<option value="">Sélectionnez le nombre de places</option>';
            return;
        }

        const vehicle = this.vehiclesData.find(v => v.id == vehicleId);
        if (!vehicle) return;

        this.selectedVehicle = vehicle;
        const maxPlaces = vehicle.maxNbPlacesAvailable;

        // Ajouter l'option par défaut
        placesSelect.innerHTML = '<option value="">Sélectionnez le nombre de places</option>';

        // Ajouter les options de places (identique à la création)
        for (let i = 1; i <= maxPlaces; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i + (i === 1 ? ' place' : ' places');
            placesSelect.appendChild(option);
        }

        // Pré-sélectionner le maximum automatiquement (comme dans la création)
        placesSelect.value = maxPlaces;
    }

    // Pré-remplir le formulaire avec les données du covoiturage
    populateForm() {
        if (!this.covoiturageData) return;

        const data = this.covoiturageData;

        // Reconstituer et remplir les adresses complètes avec les bons noms de champs
        if (data.startingStreet && data.startingPostCode && data.startingCity) {
            document.getElementById('modifierDepartAdresse').value = `${data.startingStreet}, ${data.startingPostCode} ${data.startingCity}`;
            // Remplir aussi les champs cachés
            document.getElementById('modifierDepartStreet').value = data.startingStreet;
            document.getElementById('modifierDepartPostcode').value = data.startingPostCode;
            document.getElementById('modifierDepartCity').value = data.startingCity;
        } else if (data.startingCity) {
            document.getElementById('modifierDepartAdresse').value = data.startingCity;
        }

        if (data.arrivalStreet && data.arrivalPostCode && data.arrivalCity) {
            document.getElementById('modifierArriveeAdresse').value = `${data.arrivalStreet}, ${data.arrivalPostCode} ${data.arrivalCity}`;
            // Remplir aussi les champs cachés
            document.getElementById('modifierArriveeStreet').value = data.arrivalStreet;
            document.getElementById('modifierArriveePostcode').value = data.arrivalPostCode;
            document.getElementById('modifierArriveeCity').value = data.arrivalCity;
        } else if (data.arrivalCity) {
            document.getElementById('modifierArriveeAdresse').value = data.arrivalCity;
        }

        document.getElementById('modifierPrix').value = data.price || '';

        // Formater et remplir les dates
        if (data.startingAt) {
            const startingDate = new Date(data.startingAt);
            document.getElementById('modifierDateDepart').value = startingDate.toISOString().split('T')[0];
            document.getElementById('modifierHeureDepart').value = startingDate.toTimeString().slice(0, 5);
        }

        // Pré-sélectionner le véhicule et gérer les places
        if (data.vehicle?.id) {
            const vehicleSelect = document.getElementById('modifierVehicule');
            vehicleSelect.value = data.vehicle.id;
            
            // Déclencher le changement de véhicule pour mettre à jour les places
            this.handleVehicleChange(data.vehicle.id);
            
            // Attendre que les options de places soient créées puis sélectionner la valeur du véhicule (pas les places restantes)
            setTimeout(() => {
                const placesSelect = document.getElementById('modifierNbPlaces');
                // Utiliser maxNbPlacesAvailable du véhicule, pas nbPlacesAvailable du covoiturage
                if (data.vehicle.maxNbPlacesAvailable) {
                    placesSelect.value = data.vehicle.maxNbPlacesAvailable;
                }
            }, 100);
        }
    }

    // Vérifier si le covoiturage peut être modifié (simplifié)
    canModifyCovoiturage() {
        if (!this.covoiturageData) return false;
        // Seuls les covoiturages 'COMING' peuvent être modifiés
        return this.covoiturageData.status === 'COMING';
    }

    // Afficher ou masquer les boutons selon la logique
    toggleActionButtons() {
        const deleteBtn = document.getElementById('supprimerCovoiturageBtn');
        const cancelBtn = document.getElementById('annulerCovoiturageBtn');
        const modifyBtn = document.getElementById('modifierCovoiturageSubmitBtn');

        // Par défaut, cacher tous les boutons d'action
        deleteBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        modifyBtn.style.display = 'none';

        // En mode lecture seule, aucun bouton d'action n'est affiché
        if (this.isReadOnlyMode) {
            return;
        }

        // Seuls les covoiturages 'COMING' peuvent avoir des actions
        if (this.covoiturageData.status === 'COMING') {
            // Le bouton Modifier est toujours visible pour les covoiturages COMING
            modifyBtn.style.display = 'inline-block';

            // Logique pour Supprimer vs Annuler basée sur les places
            const placesRestantes = this.covoiturageData.nbPlacesAvailable;
            const placesMaxVehicule = this.covoiturageData.vehicle?.maxNbPlacesAvailable;

            if (placesRestantes && placesMaxVehicule) {
                if (placesRestantes === placesMaxVehicule) {
                    // Aucun passager → Bouton Supprimer
                    deleteBtn.style.display = 'inline-block';
                } else if (placesRestantes < placesMaxVehicule) {
                    // Des passagers présents → Bouton Annuler
                    cancelBtn.style.display = 'inline-block';
                }
            }
        }
        // Pour tous les autres statuts (FINISHED, CANCELED, etc.), aucun bouton n'est affiché
    }

    // Gestion de la soumission
    async handleSubmit() {
        if (!this.validateForm()) return;

        const submitBtn = document.getElementById('modifierCovoiturageSubmitBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Modification en cours...';

            const formData = this.collectFormData();
            const endpoint = apiUrl + 'ride/' + this.covoiturageId;
            
            await sendFetchRequest(endpoint, getToken(), 'PUT', JSON.stringify(formData));
            
            showMessage('Covoiturage modifié avec succès !', 'success');
            this.modal.hide();
            
            if (this.onSuccessCallback) {
                this.onSuccessCallback();
            }

        } catch (error) {
            console.error('Erreur lors de la modification:', error);
            showMessage('Erreur lors de la modification du covoiturage.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    // Gestion de l'annulation du covoiturage
    async handleCancel() {
        if (!confirm('Êtes-vous sûr de vouloir annuler ce covoiturage ? Les passagers seront notifiés et remboursés.')) {
            return;
        }

        const cancelBtn = document.getElementById('annulerCovoiturageBtn');
        const originalText = cancelBtn.innerHTML;
        
        try {
            cancelBtn.disabled = true;
            cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Annulation...';

            const endpoint = apiUrl + 'ride/' + this.covoiturageId + '/cancel';
            await sendFetchRequest(endpoint, getToken(), 'PUT');
            
            showMessage('Covoiturage annulé avec succès ! Les passagers ont été notifiés.', 'success');
            this.modal.hide();
            
            if (this.onSuccessCallback) {
                this.onSuccessCallback();
            }

        } catch (error) {
            console.error('Erreur lors de l\'annulation:', error);
            showMessage('Erreur lors de l\'annulation du covoiturage.', 'error');
        } finally {
            cancelBtn.disabled = false;
            cancelBtn.innerHTML = originalText;
        }
    }

    // Gestion de la suppression
    async handleDelete() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce covoiturage ? Cette action est irréversible.')) {
            return;
        }

        const deleteBtn = document.getElementById('supprimerCovoiturageBtn');
        const originalText = deleteBtn.innerHTML;
        
        try {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Suppression...';

            const endpoint = apiUrl + 'ride/' + this.covoiturageId;
            await sendFetchRequest(endpoint, getToken(), 'DELETE');
            
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
            deleteBtn.innerHTML = originalText;
        }
    }

    // Basculer la modale en mode lecture seule
    setReadOnlyMode(isReadOnly) {
        this.isReadOnlyMode = isReadOnly;
        
        if (isReadOnly) {
            // Changer le titre
            const title = document.getElementById('modifierCovoiturageModalLabel');
            if (title) {
                title.innerHTML = '<i class="fas fa-eye me-2"></i>Détails du covoiturage';
            }

            // Désactiver tous les champs de formulaire
            const form = document.getElementById('modifierCovoiturageForm');
            if (form) {
                const inputs = form.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    input.disabled = true;
                    input.style.backgroundColor = '#f8f9fa';
                    input.style.cursor = 'default';
                    input.style.border = '1px solid #e9ecef';
                });
            }

            // Masquer les conteneurs de suggestions
            const suggestions = document.querySelectorAll('#modifierDepartSuggestions, #modifierArriveeSuggestions');
            suggestions.forEach(suggestion => {
                suggestion.style.display = 'none';
            });

            // Désactiver les événements d'autocomplétion en mode lecture seule
            const addressInputs = document.querySelectorAll('#modifierDepartAdresse, #modifierArriveeAdresse');
            addressInputs.forEach(input => {
                // Cloner l'élément pour supprimer tous les event listeners
                const newInput = input.cloneNode(true);
                input.parentNode.replaceChild(newInput, input);
            });

        } else {
            // Mode modification normal
            const title = document.getElementById('modifierCovoiturageModalLabel');
            if (title) {
                title.innerHTML = '<i class="fas fa-edit me-2"></i>Modifier le covoiturage';
            }

            // Réactiver tous les champs
            const form = document.getElementById('modifierCovoiturageForm');
            if (form) {
                const inputs = form.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    input.disabled = false;
                    input.style.backgroundColor = '';
                    input.style.cursor = '';
                    input.style.border = '';
                });
            }

            // Les événements d'autocomplétion sont déjà attachés dans attachEvents()
            // Pas besoin de les réattacher ici
        }
    }

    // Méthode pour nettoyer le formulaire
    clearForm() {
        const form = document.getElementById('modifierCovoiturageForm');
        if (form) {
            form.reset();
            
            // Nettoyer les champs cachés d'adresse
            const hiddenFields = [
                'modifierDepartRue',
                'modifierDepartCodePostal', 
                'modifierDepartVille',
                'modifierArriveeRue',
                'modifierArriveeCodePostal',
                'modifierArriveeVille'
            ];

            hiddenFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = '';
                }
            });

            // Masquer les suggestions
            const suggestions = document.querySelectorAll('#modifierDepartSuggestions, #modifierArriveeSuggestions');
            suggestions.forEach(suggestion => {
                suggestion.style.display = 'none';
                suggestion.innerHTML = '';
            });
        }

        // Réinitialiser les données
        this.covoiturageData = null;
        this.covoiturageId = null;
        this.selectedVehicle = null;
    }

    // Validation du formulaire
    validateForm() {
        const requiredFields = [
            'modifierDepartAdresse',
            'modifierArriveeAdresse', 
            'modifierDateDepart',
            'modifierHeureDepart',
            'modifierPrix',
            'modifierVehicule',
            'modifierNbPlaces'
        ];

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                field.focus();
                showMessage('Veuillez remplir tous les champs obligatoires.', 'error');
                return false;
            }
        }

        // Validation des dates
        const dateDepart = document.getElementById('modifierDateDepart').value;
        const heureDepart = document.getElementById('modifierHeureDepart').value;
        const startingDateTime = new Date(`${dateDepart}T${heureDepart}`);
        const now = new Date();

        if (startingDateTime <= now) {
            showMessage('La date et heure de départ doivent être dans le futur.', 'error');
            return false;
        }

        return true;
    }

    // Collecter les données du formulaire
    collectFormData() {
        const dateDepart = document.getElementById('modifierDateDepart').value;
        const heureDepart = document.getElementById('modifierHeureDepart').value;
        
        return {
            startingCity: document.getElementById('modifierDepartAdresse').value.trim(),
            arrivalCity: document.getElementById('modifierArriveeAdresse').value.trim(),
            startingAt: `${dateDepart}T${heureDepart}:00`,
            price: parseFloat(document.getElementById('modifierPrix').value),
            vehicleId: parseInt(document.getElementById('modifierVehicule').value),
            nbPlacesAvailable: parseInt(document.getElementById('modifierNbPlaces').value)
        };
    }

    // Méthode publique pour ouvrir la modale en mode lecture seule (détails)
    async showDetails(covoiturageId) {
        // S'assurer que la modale est initialisée
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.covoiturageId = covoiturageId;
        this.onSuccessCallback = null; // Pas de callback en mode lecture seule

        try {
            // Charger les données du covoiturage et les véhicules
            const [covoiturageData, vehicles] = await Promise.all([
                this.fetchCovoiturageData(covoiturageId),
                this.fetchUserVehicles()
            ]);

            this.covoiturageData = covoiturageData;
            this.vehiclesData = vehicles;

            // Activer le mode lecture seule
            this.setReadOnlyMode(true);

            // Charger les véhicules et pré-remplir le formulaire
            this.loadVehiclesInSelect();
            this.populateForm();
            this.toggleActionButtons(); // Masquera tous les boutons d'action

            // Afficher la modale
            this.modal.show();

        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            showMessage('Erreur lors du chargement des données du covoiturage.', 'error');
        }
    }

    // Méthode publique pour ouvrir la modale
    async show(covoiturageId, options = {}) {
        // S'assurer que la modale est initialisée
        if (!this.isInitialized) {
            await this.initialize();
        }

        this.covoiturageId = covoiturageId;
        this.onSuccessCallback = options.onSuccess;

        try {
            // Charger les données du covoiturage et les véhicules
            const [covoiturageData, vehicles] = await Promise.all([
                this.fetchCovoiturageData(covoiturageId),
                this.fetchUserVehicles()
            ]);

            this.covoiturageData = covoiturageData;
            this.vehiclesData = vehicles; // Utiliser vehiclesData comme dans la création

            // Désactiver le mode lecture seule et activer le mode modification
            this.setReadOnlyMode(false);

            // Vérifier si le covoiturage peut être modifié
            if (!this.canModifyCovoiturage()) {
                showMessage('Ce covoiturage ne peut plus être modifié (statut non autorisé).', 'warning');
                return;
            }

            // Charger les véhicules et pré-remplir le formulaire
            this.loadVehiclesInSelect();
            this.populateForm();
            this.toggleActionButtons();

            // Afficher la modale
            this.modal.show();

        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            showMessage('Erreur lors du chargement des données du covoiturage.', 'error');
        }
    }
}

// Créer et exporter une instance unique
const modifierCovoiturageModal = new ModifierCovoiturageModal();
export default modifierCovoiturageModal;
