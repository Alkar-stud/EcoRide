import { CovoiturageSearch } from '../components/covoiturage/CovoiturageSearch.js';

export class HomePage {
    constructor() {
       
        // Initialiser le composant de recherche
        this.covoiturageSearch = new CovoiturageSearch({
            selectors: {
                departInputId: 'depart',
                departSuggestionsId: 'departSuggestions',
                destinationInputId: 'destination',
                destinationSuggestionsId: 'destinationSuggestions',
                dateInputId: 'searchDate',
                formId: 'searchcovoiturages',
                searchButtonId: 'btn-search'
            },
            redirectUrl: '/searchcovoiturages'
        });
        
        this.covoiturageSearch.initialize();
        
    }
    

}

// Initialiser la page
new HomePage();
