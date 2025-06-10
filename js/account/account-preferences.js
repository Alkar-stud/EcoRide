//Module pour gérer les préférences de l'utilisateur

const prefsLibelleInput = document.getElementById("prefsLibelle");
const prefsDescriptionInput = document.getElementById("prefsDescription");

let preferences = []; // Liste des préférences



export function setPreferences(newPreferences) {
    preferences = newPreferences;
}

//Fonction pour afficher les préférences
export function displayPreferences(preferences) {
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
        if (event.target && event.target.classList.contains("delete-preference-btn")) {
            const id = event.target.dataset.id; // Récupérer l'ID de la préférence
            deletePreference(id);
        }
    });
}

//Fonction pour ajouter une préférence
export function addPreferences() {
    let libelle = prefsLibelleInput.value;
    let description = prefsDescriptionInput.value;

    let myHeaders = new Headers();
    myHeaders.append("X-AUTH-TOKEN", getToken());
    let rawData = JSON.stringify({
        "libelle": libelle,
        "description": description
    });
    let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: rawData,
        redirect: 'follow'
    };

    fetch(apiUrl + "account/preferences/add", requestOptions)
        .then(response => {
            if (response.ok) {
                response.json().then(newPreference => {
                    // Ajouter la nouvelle préférence à la liste locale
                    preferences.push(newPreference);
                    displayPreferences(preferences); // Réafficher la liste mise à jour

                    showMessage("preferenceUpdateMessage"); // Afficher un message de succès

                    // Réinitialiser les champs du formulaire
                    prefsLibelleInput.value = '';
                    prefsDescriptionInput.value = '';
                });
            } else {
                console.error("Erreur lors de l'ajout de la préférence");
            }
        })
        .catch(error => console.error("Erreur lors de l'ajout de la préférence", error));
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

export async function savePreference(id, libelle, description, confirmationMessageId) {
    try {
        const confirmationMessageLoading = document.getElementById(confirmationMessageId + 'Loading');
        confirmationMessageLoading.style.display = "block";

        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());
        myHeaders.append("Content-Type", "application/json");

        let body = JSON.stringify({
            libelle: libelle,
            description: description
        });

        let requestOptions = {
            method: 'PUT',
            headers: myHeaders,
            body: body,
            redirect: 'follow'
        };

        let response = await fetch(apiUrl + "account/preferences/" + id, requestOptions);

        if (response.ok) {
            const updatedPreference = await response.json(); // Récupérer la préférence mise à jour

            // Remplacer l'objet correspondant dans la liste locale
            const index = preferences.findIndex(pref => pref.id === id);
            if (index !== -1) {
                preferences[index] = updatedPreference; // Mettre à jour l'objet dans la liste
            }

            updatePreferenceCheckboxes(libelle, description);

            // Afficher un message de confirmation
            const confirmationMessage = document.getElementById(confirmationMessageId);
            confirmationMessage.style.display = "block";
            confirmationMessageLoading.style.display = "none";
            setTimeout(() => {
                confirmationMessage.style.display = "none";
            }, 3000); // Masquer le message après 3 secondes
        } else {
            console.error("Erreur lors de la sauvegarde de la préférence");
        }
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de la préférence", error);
    }
}


export function deletePreference(id) {
    const userConfirmed = confirm("Êtes-vous sûr de vouloir supprimer cette préférence ?");
    
    if (userConfirmed) {
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());
        let requestOptions = {
            method: 'DELETE',
            headers: myHeaders,
            redirect: 'follow'
        };

        fetch(apiUrl + "account/preferences/" + id, requestOptions)
            .then(response => {
                if (response.ok) {
                    // Supprimer la préférence de la liste locale
                    const index = preferences.findIndex(pref => pref.id === id);
                    if (index !== -1) {
                        preferences.splice(index, 1); // Retirer l'élément de la liste
                    }

                    // Supprimer l'élément HTML correspondant
                    const preferenceElement = document.querySelector(`.delete-preference-btn[data-id="${id}"]`).parentElement;
                    if (preferenceElement) {
                        preferenceElement.remove();
                    }

                    showMessage("preferenceDeleteMessage"); // Afficher un message de succès
                } else {
                    console.error("Erreur lors de la suppression de la préférence");
                }
            })
            .catch(error => console.error("Erreur lors de la suppression de la préférence", error));
    } else {
        console.log("Suppression annulée par l'utilisateur.");
    }
}