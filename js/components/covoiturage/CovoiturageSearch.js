import { AddressAutocomplete } from '../../components/common/AddressAutocomplete.js';
import { DateUtils } from '../../utils/helpers/DateHelper.js';

/**
 * Composant de recherche de covoiturages réutilisable
 */
export class CovoiturageSearch {
    /**
     * @param {Object} config - Configuration du composant
     * @param {Object} config.selectors - Sélecteurs des éléments HTML
     * @param {string} config.selectors.departInputId - ID du champ départ
     * @param {string} config.selectors.departSuggestionsId - ID du conteneur de suggestions départ
     * @param {string} config.selectors.destinationInputId - ID du champ destination
     * @param {string} config.selectors.destinationSuggestionsId - ID du conteneur de suggestions destination
     * @param {string} config.selectors.dateInputId - ID du champ date
     * @param {string} config.selectors.formId - ID du formulaire
     * @param {string} config.selectors.searchButtonId - ID du bouton de recherche
     * @param {string} config.redirectUrl - URL de redirection pour la recherche (par défaut: /searchcovoiturages)
     * @param {Function} config.onSearch - Callback exécuté lors de la recherche
     */
    constructor(config = {}) {
        this.config = {
            selectors: {
                departInputId: 'depart',
                departSuggestionsId: 'departSuggestions',
                destinationInputId: 'destination',
                destinationSuggestionsId: 'destinationSuggestions',
                dateInputId: 'searchDate',
                formId: 'searchForm',
                searchButtonId: 'searchButton',
                ...config.selectors
            },
            redirectUrl: '/searchcovoiturages',
            onSearch: null,
            ...config
        };

        // Éléments DOM
        this.departInput = document.getElementById(this.config.selectors.departInputId);
        this.destinationInput = document.getElementById(this.config.selectors.destinationInputId);
        this.dateInput = document.getElementById(this.config.selectors.dateInputId);
        this.searchButton = document.getElementById(this.config.selectors.searchButtonId);
        this.form = document.getElementById(this.config.selectors.formId);

        // Créer une instance d'autocomplete
        this.autocomplete = new AddressAutocomplete();
    }

    /**
     * Initialise le composant
     */
    initialize() {
        console.log("CovoiturageSearch: Initialisation...");
        
        // Initialiser l'autocomplétion
        this.setupAutocomplete();
        
        // Initialiser la date
        this.setupDateField();
        
        // Ajouter les écouteurs d'événements
        this.attachEvents();
        
        // Pré-remplir les champs avec les paramètres d'URL si présents
        this.fillFieldsFromUrl();
        
        return this; // Pour le chaînage de méthodes
    }
    
    /**
     * Configure l'autocomplétion pour les champs départ et destination
     */
    setupAutocomplete() {
        if (this.departInput && document.getElementById(this.config.selectors.departSuggestionsId)) {
            this.autocomplete.setupCityAutocomplete(
                this.config.selectors.departInputId, 
                this.config.selectors.departSuggestionsId
            );
        } else {
            console.warn("RideSearch: Éléments d'autocomplétion départ non trouvés");
        }
        
        if (this.destinationInput && document.getElementById(this.config.selectors.destinationSuggestionsId)) {
            this.autocomplete.setupCityAutocomplete(
                this.config.selectors.destinationInputId, 
                this.config.selectors.destinationSuggestionsId
            );
        } else {
            console.warn("RideSearch: Éléments d'autocomplétion destination non trouvés");
        }
    }
    
    /**
     * Configure le champ de date
     */
    setupDateField() {
        if (this.dateInput) {
            // Définir la date d'aujourd'hui comme valeur par défaut si le champ est vide
            if (!this.dateInput.value) {
                this.dateInput.value = DateUtils.formatDateForInput(new Date());
            }
            
            // Configurer les restrictions de date (empêcher les dates passées)
            DateUtils.setupDateRestriction(this.dateInput);
        }
    }
    
    /**
     * Ajoute les écouteurs d'événements
     */
    attachEvents() {
        // Ajouter un écouteur d'événement pour le bouton de recherche
        if (this.searchButton) {
            this.searchButton.addEventListener("click", (e) => {
                e.preventDefault();
                this.search();
            });
        }
        
        // Ajouter un écouteur pour la soumission du formulaire
        if (this.form) {
            this.form.addEventListener("submit", (e) => {
                e.preventDefault();
                this.search();
            });
        }
    }
    
    /**
     * Pré-remplit les champs avec les paramètres d'URL
     */
    fillFieldsFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('depart') && this.departInput) {
            this.departInput.value = urlParams.get('depart');
        }
        
        if (urlParams.has('destination') && this.destinationInput) {
            this.destinationInput.value = urlParams.get('destination');
        }
        
        if (urlParams.has('date') && this.dateInput) {
            this.dateInput.value = urlParams.get('date');
        }
    }
    
    /**
     * Effectue la recherche
     */
    search() {
        // Récupérer les valeurs des champs
        const depart = this.departInput ? this.departInput.value.trim() : '';
        const destination = this.destinationInput ? this.destinationInput.value.trim() : '';
        const date = this.dateInput ? this.dateInput.value.trim() : '';
        
        // Réinitialiser les classes de validation
        [this.departInput, this.destinationInput, this.dateInput].forEach(input => {
            if (input) input.classList.remove('is-invalid', 'is-valid');
        });
        
        // Valider les champs
        if (!this.validateFields(depart, destination, date)) {
            return;
        }
        
        // Récupérer les codes postaux si disponibles
        const departPostcode = this.departInput ? this.departInput.getAttribute('data-postcode') || '' : '';
        const destinationPostcode = this.destinationInput ? this.destinationInput.getAttribute('data-postcode') || '' : '';
        
        // Préparer les données de recherche
        const searchData = {
            depart,
            destination,
            date,
            departPostcode,
            destinationPostcode
        };
        
        // Exécuter le callback onSearch si défini
        if (typeof this.config.onSearch === 'function') {
            this.config.onSearch(searchData);
            return;
        }
        
        // Sinon, effectuer la redirection par défaut
        this.redirectToSearch(searchData);
    }
    
    /**
     * Valide les champs du formulaire
     * @returns {boolean} True si les champs sont valides, false sinon
     */
    validateFields(depart, destination, date) {
        let hasErrors = false;
        
        // Vérifier le champ départ
        if (!depart && this.departInput) {
            this.departInput.classList.add("is-invalid");
            hasErrors = true;
        } else if (this.departInput) {
            this.departInput.classList.add("is-valid");
        }
        
        // Vérifier le champ destination
        if (!destination && this.destinationInput) {
            this.destinationInput.classList.add("is-invalid");
            hasErrors = true;
        } else if (this.destinationInput) {
            this.destinationInput.classList.add("is-valid");
        }
        
        // Vérifier la date
        if (!date && this.dateInput) {
            this.dateInput.classList.add("is-invalid");
            hasErrors = true;
        } else if (this.dateInput) {
            // Vérifier que la date n'est pas dans le passé
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                this.dateInput.classList.add("is-invalid");
                hasErrors = true;
            } else {
                this.dateInput.classList.add("is-valid");
            }
        }
        
        return !hasErrors;
    }
    
    /**
     * Redirige vers la page de recherche
     */
    redirectToSearch(searchData) {
        // Construire l'URL de recherche
        let url = `${this.config.redirectUrl}?depart=${encodeURIComponent(searchData.depart)}&destination=${encodeURIComponent(searchData.destination)}&date=${encodeURIComponent(searchData.date)}`;
        
        // Ajouter les codes postaux si disponibles
        if (searchData.departPostcode) {
            url += `&departPostcode=${encodeURIComponent(searchData.departPostcode)}`;
        }
        if (searchData.destinationPostcode) {
            url += `&destinationPostcode=${encodeURIComponent(searchData.destinationPostcode)}`;
        }
        
        // Rediriger vers la page de recherche
        window.location.href = url;
    }
}
