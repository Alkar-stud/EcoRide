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
    
    /*
	 * Vérifie si une chaîne de caractères est une date valide
	 */
    static isValidDate(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }
	
	/*
	 * Formate un objet date pour input type="date" au format aaaa-mm-dd
	 */
    static formatDateForInput(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Mois commence à 0
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }


	// Fonction pour vérifier si une date est passée
    static isDatePassed(dateTimeString) {
        const rideDate = new Date(dateTimeString);
        const today = new Date();
        
        // Réinitialiser l'heure à 00:00:00 pour ne comparer que les dates
        const rideDateOnly = new Date(rideDate.getFullYear(), rideDate.getMonth(), rideDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        return rideDateOnly < todayOnly;
    }


	//Pour vérifier si une date est aujourd'hui sans tenir compte de l'heure
    static isToday(dateTimeString) {
        const date = new Date(dateTimeString);
        const today = new Date();
        return date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear();
    }


	/**
	 * Configurer la restriction de date pour empêcher la sélection de dates passées
	 */
    static async setupDateRestriction(dateInput) {
        if (!dateInput) {
            console.warn('Champ date non trouvé');
            return;
        }

        // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
        const today = new Date();
        const todayString = today.getFullYear() + '-' + 
            String(today.getMonth() + 1).padStart(2, '0') + '-' + 
            String(today.getDate()).padStart(2, '0');

        // Définir la date minimum
        dateInput.setAttribute('min', todayString);

        // Ne pas écraser la valeur si déjà présente (ex: mode édition)
        if (!dateInput.value) {
            dateInput.value = todayString;
        }

        // Ajouter un écouteur pour valider la date en temps réel
        dateInput.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            selectedDate.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            } else {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
            }
        });
    }
    

    /**
     * Lie deux champs date pour que la date d'arrivée ne puisse pas être antérieure à la date de départ.
     * @param {HTMLInputElement} departInput - Champ date de départ
     * @param {HTMLInputElement} arriveeInput - Champ date d'arrivée
     */
    static linkDepartureAndArrivalDates(departInput, arriveeInput) {
        if (!departInput || !arriveeInput) return;

        // Initialiser la date min d'arrivée à la valeur de départ
        arriveeInput.min = departInput.value;

        // Quand la date de départ change
        departInput.addEventListener('change', function() {
            // Met à jour la date min d'arrivée
            arriveeInput.min = departInput.value;

            // Si la date d'arrivée est devenue invalide, la corriger
            if (arriveeInput.value < departInput.value) {
                arriveeInput.value = departInput.value;
            }
        });
    }
    
    /**
     * Formate une date pour rechercher via l'API (ajoute l'heure 00:00:00)
     * @param {string|Date} dateValue - Date au format YYYY-MM-DD ou objet Date
     * @returns {string} - Date au format YYYY-MM-DD 00:00:00
     */
    static formatDateTimeForApi(dateValue) {
        // Si c'est déjà au format YYYY-MM-DD HH:MM:SS, retourner tel quel
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
            return dateValue;
        }
        
        // Obtenir la date au format YYYY-MM-DD
        const formattedDate = this.formatDateForInput(dateValue);
        
        // Ajouter l'heure 00:00:00
        return `${formattedDate}`;
    }


	/*
	 * Fonction pour formater la date et l'heure
	 */
	static formatDateTime(dateTimeString) {
		const date = new Date(dateTimeString);
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const year = date.getFullYear();
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		
		return `${day}/${month}/${year} à ${hours}:${minutes}`;
	}

}
