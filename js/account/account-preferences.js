//Module pour gérer les préférences de l'utilisateur
import { apiUrl } from '../config.js';
import { getToken, showMessage, sendFetchRequest } from '../script.js';


const prefsLibelleInput = document.getElementById("prefsLibelle");
const prefsDescriptionInput = document.getElementById("prefsDescription");

const addPreferenceBtn = document.getElementById("addPreferenceBtn");

addPreferenceBtn.addEventListener("click", function (event) {
    // Empêcher le comportement par défaut du bouton
    event.preventDefault();

    // Appeler la fonction pour ajouter une préférence
    addPreferences();
});

// Ajouter des listeners pour les boutons radio
document.querySelectorAll('input[name="SmokeAsk"]').forEach(radio => {
    radio.addEventListener("change", (event) => {
        const description = event.target.value;
        const id = event.target.dataset.id; // Récupérer l'ID de la préférence
        savePreference(id, "smokingAllowed", description, "smokeConfirmationMessage");
    });
});

document.querySelectorAll('input[name="PetAsk"]').forEach(radio => {
    radio.addEventListener("change", (event) => {
        const description = event.target.value;
        const id = event.target.dataset.id; // Récupérer l'ID de la préférence
        savePreference(id, "petsAllowed", description, "petConfirmationMessage");
    });
});


let preferencesTab = []; // Liste des préférences

//Fonction pour afficher les préférences
export function displayUserPreferences(preferences) {
    preferencesTab = preferences; // Pour ajouter et supprimer des préférences sans recharger la page
    // Vider le conteneur des préférences avant de les afficher
    if (!preferences || preferences.length === 0) {
        document.getElementById("preferencesList").innerHTML = "<p>Aucune préférence définie.</p>";
        return;
    }

    const preferencesList = document.getElementById('preferencesList');
    preferencesList.innerHTML = ''; // Vider le conteneur avant d'ajouter les préférences

    // Boucle pour afficher les préférences
    preferences.forEach(preference => {
        if (preference.libelle === 'smokingAllowed') {
            document.getElementById("NoSmoke").dataset.id = preference.id;
            document.getElementById("OkSmoke").dataset.id = preference.id;
            document.getElementById("NoSmoke").checked = preference.description === 'no';
            document.getElementById("OkSmoke").checked = preference.description === 'yes';
        } else if (preference.libelle === 'petsAllowed') {
            document.getElementById("NoPet").dataset.id = preference.id;
            document.getElementById("OkPet").dataset.id = preference.id;
            document.getElementById("NoPet").checked = preference.description === 'no';
            document.getElementById("OkPet").checked = preference.description === 'yes';
        } else {
            const preferenceDiv = document.createElement("div");
            preferenceDiv.className = "preference";
            preferenceDiv.innerHTML = `
                <strong>${preference.libelle}</strong>: ${preference.description}
                <button type="button" class="btn btn-danger btn-sm me-2 mt-2 delete-preference-btn" data-id="${preference.id}">Supprimer</button>
                <hr>
            `;
            preferencesList.appendChild(preferenceDiv);
        }
    });

    // Supprimer les anciens gestionnaires d'événements avant d'en ajouter un nouveau
    preferencesList.replaceWith(preferencesList.cloneNode(true));
    const updatedPreferencesList = document.getElementById("preferencesList");
    updatedPreferencesList.addEventListener("click", function (event) {
        if (event.target?.classList.contains("delete-preference-btn")) {
            deletePreference(event.target.dataset.id);
        }
    });
}

//Fonction pour ajouter une préférence
async function addPreferences() {
    let libelle = prefsLibelleInput.value;
    let description = prefsDescriptionInput.value;


    let rawData = JSON.stringify({
        "libelle": libelle,
        "description": description
    });
    
    try {
        let response = await sendFetchRequest(apiUrl + "account/preferences/add", getToken(), 'POST', rawData)
        if (response.id) {
            // Ajouter la nouvelle préférence à la liste locale
            preferencesTab.push(response);

            displayUserPreferences(preferencesTab); // Réafficher la liste mise à jour

            showMessage("preferenceUpdateMessage"); // Afficher un message de succès

            // Réinitialiser les champs du formulaire
            prefsLibelleInput.value = '';
            prefsDescriptionInput.value = '';
            return response;
        } else {
            console.error("Erreur lors de l'ajout de la préférence: ", response);
        }
    } catch (error) {
        console.error("Erreur lors de l'ajout de la préférence", error);
    }

}


// Fonction pour sauvegarder une préférence
function updatePreferenceCheckboxes(libelle, description) {
    if (libelle === 'smokingAllowed') {
        document.getElementById("NoSmoke").checked = description === 'no';
        document.getElementById("OkSmoke").checked = description === 'yes';
    } else if (libelle === 'petsAllowed') {
        document.getElementById("NoPet").checked = description === 'no';
        document.getElementById("OkPet").checked = description === 'yes';
    }
}

async function savePreference(preferenceId, libelle, description, confirmationMessageId) {
    try {
        const confirmationMessageLoading = document.getElementById(confirmationMessageId + 'Loading');
        confirmationMessageLoading.style.display = "block";

        let rawData = JSON.stringify({
            libelle: libelle,
            description: description
        });

        let response = await sendFetchRequest(apiUrl + "account/preferences/" + preferenceId, getToken(), 'PUT', rawData)
        if (response.success) {
            confirmationMessageLoading.style.display = "none";
            if (libelle === 'smokingAllowed' || libelle === 'petsAllowed') {
                await showMessage(confirmationMessageId); // Afficher un message de succès
            } else {
                // Ajouter la nouvelle préférence à la liste locale
                preferencesTab.push(response);

                displayUserPreferences(preferencesTab); // Réafficher la liste mise à jour
            }
            
            
            // Réinitialiser les champs du formulaire
            prefsLibelleInput.value = '';
            prefsDescriptionInput.value = '';
            return response;
        } else {
            console.error("Erreur lors de la sauvegarde de la préférence: ", response);
        }
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de la préférence", error);
    }

}


async function deletePreference(preferenceId) {
    const userConfirmed = confirm("Êtes-vous sûr de vouloir supprimer cette préférence ?");
    
    if (userConfirmed) {
        try {
            let response = await sendFetchRequest(apiUrl + "account/preferences/" + preferenceId, getToken(), 'DELETE')
            if (response) {
                // Supprimer la préférence de la liste locale
                const idNumber = parseInt(preferenceId, 10);
                preferencesTab = preferencesTab.filter(preference => preference.id !== idNumber);

                // Supprimer l'élément HTML correspondant
                const preferenceElement = document.querySelector(`.delete-preference-btn[data-id="${preferenceId}"]`).parentElement;
                if (preferenceElement) {
                    preferenceElement.remove();
                }

                showMessage("preferenceDeleteMessage"); // Afficher un message de succès
                return response;
            } else {
                console.error("Erreur lors de la suppression de la préférence: ", response);
            }
        } catch (error) {
            console.error("Erreur lors de la suppression de la préférence", error);
        }
    }
}