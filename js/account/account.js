import { setPreferences, displayPreferences, addPreferences, savePreference, deletePreference } from './account-preferences.js';


//Pour les infos perso du user
const pseudoInput = document.getElementById("PseudoInput");
const photo = document.getElementById("photo"); // Affichage de la photo
const photoInput = document.getElementById("PhotoInput"); //form pour changer la photo
const deletePhotoCheck = document.getElementById("deletePhotoCheck"); //checkbox pour supprimer la photo
const credits = document.getElementById("credits");
const grade = document.getElementById("grade");
const userRoleInput = document.getElementsByTagName("userRole");
const passwordInput = document.getElementById("PasswordInput");

const submitFormInfoUser = document.getElementById("btnSubmitFormInfoUser");

const btnDeleteAccount = document.getElementById("btnDelete");

pseudoInput.addEventListener("blur", validateFormAccount); 
photoInput.addEventListener("blur", validateFormAccount);
submitFormInfoUser.addEventListener("click", setUserInfo);
btnDeleteAccount.addEventListener("click", deleteAccount);


// Fonction pour supprimer le compte utilisateur
async function deleteAccount() {
    // Afficher une boîte de dialogue de confirmation
    const userConfirmed = confirm("Êtes-vous sûr de vouloir supprimer votre compte ?");

    if (userConfirmed) {
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());
        let requestOptions = {
            method: 'DELETE',
            headers: myHeaders,
            redirect: 'follow'
        };
        fetch(apiUrl + "account", requestOptions)
            .then(response => {
                if (response.ok) {
                    //Suppression des cookies
                    eraseCookie("X-AUTH-TOKEN");
                    eraseCookie("role");
                    // Rediriger vers la page d'accueil ou afficher un message de succès
                    window.location.href = "/";
                } else {
                    console.log("Impossible de supprimer le compte");
                }
            })
            .catch(error => console.error("Erreur lors de la suppression du compte", error));
    } else {
        console.log("Suppression annulée par l'utilisateur.");
    }
}


const roleRadios = document.querySelectorAll('input[name="userRole"]');


// Fonction pour récupérer les infos de l'utilisateur, si il est passager, chauffeur ou les deux, son pseudo et la photo s'il y en a une
async function getUserInfo() {
    try {
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());
        let requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };
        let response = await fetch(apiUrl + "account/me", requestOptions);
        if (response.ok) {
            let result = await response.json();
console.log(result);
            // Vérification de la présence d'une photo
            if (result.photo) {
                result.photo = url + "uploads/photos/" + result.photo;
            } else {
                result.photo = "/images/default-avatar.png";
            }
            //Si le role est différente de "ROLE_USER", on ne bloque pas le bouton Enregistrer si ni chauffeur ni passager
            if (result.roles[0] != "ROLE_USER" && result.isDriver == false && result.isPassenger == false) {
                submitFormInfoUser.disabled = false;
            }
            //Si ni chauffeur ni passager, on bloque le bouton Enregistrer
            if (result.isDriver == true && result.isPassenger == null) {
                document.getElementById("isDriver").checked = true;
                document.getElementById("vehicles-tab").style.display = "block";
                document.getElementById("preferences-tab").style.display = "block";
            } else if (result.isDriver == null && result.isPassenger == true) {
                document.getElementById("isPassenger").checked = true;
                document.getElementById("vehicles-tab").style.display = "none";
                document.getElementById("preferences-tab").style.display = "none";
            } else if (result.isDriver == true && result.isPassenger == true) {
                document.getElementById("isBoth").checked = true;
                document.getElementById("vehicles-tab").style.display = "block";
                document.getElementById("preferences-tab").style.display = "block";
            } else {
                document.getElementById("vehicles-tab").style.display = "none";
                document.getElementById("preferences-tab").style.display = "none";
                //Si le role est différente de "ROLE_USER", on ne bloque pas le bouton Enregistrer si ni chauffeur ni passager
                if (getCookie('role') == "ROLE_USER") {
                    document.getElementById("roleNone").style.display = "block";
                    submitFormInfoUser.disabled = true;
                }
                else {
                    submitFormInfoUser.setAttribute('title', "Vous devez choisir d'être chauffeur, passager ou les deux.");
                    submitFormInfoUser.disabled = false;
                }
            }

            //pour la note bg-success si supérieur ou égal à 4, en orange entre 1.5 et 3.9, danger en dessous
            if (result.grade >= 4) {
                grade.classList.add("bg-success");
            } else if (result.grade >= 1.5 && result.grade < 4) {
                grade.classList.add("bg-warning");
            } else {
                grade.classList.add("bg-danger");
            }
            //on affiche la note
            grade.innerHTML = result.grade;
            //Les crédits disponibles
            credits.innerHTML = result.credits;
            //le pseudo
            pseudoInput.value = result.pseudo;
            //et la photo s'il y en a une
            photo.src = result.photo;


            //On affiche les préférences de l'utilisateur
            if (result.preferences) {
                setPreferences(result.preferences);
                const preferences = result.preferences;

                displayPreferences(preferences);
            }
            //On affiche les véhicules de l'utilisateur
            if (result.vehicles) {
                const vehicles = result.vehicles;
                const vehicleList = document.getElementById('vehicleList');
                vehicleList.innerHTML = ''; // Vider le conteneur avant d'ajouter les véhicules

                // Boucle pour afficher les véhicules
                vehicles.forEach(vehicle => {
                    const vehicleRow = document.createElement("tr");
                    vehicleRow.className = "vehicle";
                    vehicleRow.innerHTML = `
                        <td>${vehicle.brand} ${vehicle.model}</td>
                        <td class="d-none d-md-table-cell">${vehicle.color}</td>
                        <td>${vehicle.registration}</td>
                        <td class="d-none d-md-table-cell">${new Date(vehicle.registrationFirstDate).toLocaleDateString('fr-FR')}</td>
                        <td class="d-none d-md-table-cell">${vehicle.nbPlace}</td>
                        <td class="d-none d-md-table-cell">${vehicle.energy.libelle}</td>
                        <td class="d-none d-md-table-cell">
                            <button type="button" class="btn btn-primary btn-sm" onclick="editVehicle(${vehicle.id})">
                                <i class="bi bi-pencil"></i> Modifier
                            </button>
                        </td>
                    `;
            
                    // Ajouter un événement pour ouvrir la modale au clic sur une ligne
                    vehicleRow.addEventListener("click", () => openVehicleModal(vehicle));
            
                    vehicleList.appendChild(vehicleRow);
                });
            }

            return result;
        } else {
            console.log("Impossible de récupérer les informations de l'utilisateur");
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des informations de l'utilisateur", error);
    }
}



/*
* Fonction pour gérer les infos de l'utilisateur
*/
getUserInfo();


// Fonction pour vérifier si un bouton radio est sélectionné
async function checkRoleSelection() {
    const isChecked = Array.from(roleRadios).some(radio => radio.checked);
    submitFormInfoUser.disabled = !isChecked; // Active ou désactive le bouton
    document.getElementById("roleNone").style.display = "none";
}

// Ajouter un listener sur chaque bouton radio
roleRadios.forEach(radio => {
    radio.addEventListener('change', checkRoleSelection);
});

//listener lorsque l'utilisateur coche la case pour supprimer la photo, à condition que la photo existe et que l'un des botons radio soit coché
deletePhotoCheck.addEventListener("change", function() {
    submitFormInfoUser.disabled = false;

});


// Initialiser l'état du bouton au chargement de la page
checkRoleSelection();


//Function permettant de valider tout le formulaire
function validateFormAccount(){
    const pseudoOk = validateRequiredAccount(pseudoInput);
    const userRoleOk = document.querySelector('input[name="userRole"]:checked') != null;

    if (pseudoOk && userRoleOk) {
        submitFormInfoUser.disabled = false;
    }
    else {
        submitFormInfoUser.disabled = true;
    }
}

function validateRequiredAccount(input){
    if(input.value != ''){
        input.classList.add("is-valid");
        input.classList.remove("is-invalid");
        return true;
    }
    else{
        input.classList.remove("is-valid");
        input.classList.add("is-invalid");
        return false;
    }
}


function setUserInfo() {
    let isDriver = null;
    let isPassenger = null;

    let myHeaders = new Headers();
    myHeaders.append("X-AUTH-TOKEN", getToken());

    if (document.getElementById("isDriver").checked || document.getElementById("isBoth").checked) {
        isDriver = true;
    }
    if (document.getElementById("isPassenger").checked || document.getElementById("isBoth").checked) {
        isPassenger = true;
    }

    // Envoi de la photo si le champ est rempli
    if (photoInput.files.length > 0) {
        let formData = new FormData();
        formData.append("photo", photoInput.files[0]); // Ajoute le fichier au form-data
    
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken()); // Ajoute uniquement le token
    
        let requestOptions = {
            method: 'POST',
            headers: myHeaders, // Ne définissez pas Content-Type ici
            body: formData, // Utilise form-data comme corps de la requête
            redirect: 'follow'
        };

        fetch(apiUrl + "account/upload", requestOptions)
        .then(async response => {
            if (!response.ok) {
                const errorDetails = await response.text();
                console.error("Erreur :", response.status, errorDetails);
            }
            return response.json();
        })
        .then(result => {
            console.log("Résultat de l'upload :", result);
        })
        .catch(error => console.error("Erreur :", error));
    }

    //Envoi des données de l'utilisateur
    let deletePhoto = null;
    if (deletePhotoCheck.checked) {
        deletePhoto = true;
    }

    let rawData = JSON.stringify({
        "pseudo": pseudoInput.value,
        "isDriver": isDriver,
        "isPassenger": isPassenger,
        "deletePhoto": deletePhoto
    });
    let requestOptions = {
        method: 'PUT',
        headers: myHeaders,
        body: rawData,
        redirect: 'follow'
    };
    fetch(apiUrl + "account/edit", requestOptions)
        .then(response => {
            if (response.ok) {
                return response;
            } else {
                console.error('Erreur de réponse');
            }
        })
        .then(result => {
            // On recharge la page pour afficher les nouvelles infos
            window.location.reload();
        })
        .catch(error => console.log('error', error));
}


document.addEventListener('DOMContentLoaded', function () {
    const roleRadios = document.querySelectorAll('input[name="userRole"]');
    const additionalInfoSection = document.getElementById('additionalInfo');

    // Fonction pour afficher/masquer les informations supplémentaires
    function toggleAdditionalInfo() {
        const selectedRole = document.querySelector('input[name="userRole"]:checked').value;
        if (selectedRole === 'Chauffeur' || selectedRole === 'Les 2') {
            additionalInfoSection.style.display = 'block';
        } else {
            additionalInfoSection.style.display = 'none';
        }
    }

    // Ajout d'un écouteur d'événement sur les boutons radio
    roleRadios.forEach(radio => {
        radio.addEventListener('change', toggleAdditionalInfo);
    });

    // Initialisation de l'affichage
    toggleAdditionalInfo();
});



/*
* fonctions pour les préférences
*/

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



/*
* fonctions pour les véhicules
*/

async function getVehicle()
{
    try {
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());

        let requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };

        let response = await fetch(apiUrl+"vehicle/list", requestOptions);

        if (response.ok) {
            let result = await response.json();
            return result;
        } else {
            console.log("Impossible de récupérer les véhicules utilisateur");
        }
    } catch (error) {
        console.error("erreur lors de la récupération des véhicules de l'utilisateur", error);
    }
}


// Fonction pour ajouter une section de véhicule
// Cette fonction est appelée lorsque l'utilisateur clique sur le bouton "Ajouter un véhicule"
// Elle crée un nouvel élément de formulaire pour un véhicule et l'ajoute au conteneur de véhicules
// Elle utilise un compteur pour donner un identifiant unique à chaque véhicule ajouté
let vehicleCount = 1;

function addVehicleSection(event) {
    event.preventDefault();

    const vehicleContainer = document.getElementById('vehicleContainer');
    const newVehicle = document.createElement('fieldset');
    newVehicle.className = 'border rounded-3 p-3 mt-3';
    newVehicle.innerHTML = `
        <legend>Véhicule ${++vehicleCount}</legend>
        <div class="mb-3">
            <label for="LicensePlateInput${vehicleCount}" class="form-label">Plaque d'immatriculation</label>
            <input type="text" class="form-control" id="LicensePlateInput${vehicleCount}">
        </div>
        <div class="mb-3">
            <label for="LicenseDateInput${vehicleCount}" class="form-label">Date de première immatriculation</label>
            <input type="date" class="form-control" id="LicenseDateInput${vehicleCount}">
        </div>
        <div class="mb-3">
            <label for="VehicleBrandInput${vehicleCount}" class="form-label">Marque du véhicule</label>
            <input type="text" class="form-control" id="VehicleBrandInput${vehicleCount}">
        </div>
        <div class="mb-3">
            <label for="VehicleModelInput${vehicleCount}" class="form-label">Modèle du véhicule</label>
            <input type="text" class="form-control" id="VehicleModelInput${vehicleCount}">
        </div>
        <div class="mb-3">
            <label for="VehicleColorInput${vehicleCount}" class="form-label">Couleur du véhicule</label>
            <input type="text" class="form-control" id="VehicleColorInput${vehicleCount}">
        </div>
        <div class="mb-3">
            <label for="VehicleEnergyInput${vehicleCount}" class="form-label">&Eacute;nergie du véhicule</label>
            <select id="VehicleEnergyInput${vehicleCount}" class="form-select">
                <option value="">--- Choisir ---</option>
                <option value="Electrique">Electrique</option>
                <option value="Hybride">Hybride</option>
                <option value="Essence">Essence</option>
                <option value="Diesel">Diesel</option>
            </select>
        </div>
        <div class="mb-3">
            <label for="AvailablePlacesInput${vehicleCount}" class="form-label">Nombres de places disponibles</label>
            <input type="number" class="form-control" id="AvailablePlacesInput${vehicleCount}" placeholder="Combien vous êtes habituellement ?" value="4" name="NbConvives">
        </div>
    `;
    vehicleContainer.appendChild(newVehicle);
}

// Fonction pour ouvrir la modale avec les informations du véhicule
function openVehicleModal(vehicle) {
    // Charger les options de la liste déroulante des énergies
    loadEnergyOptions().then(() => {
        // Pré-sélectionner l'énergie du véhicule si elle existe
        const energySelect = document.getElementById("modalVehicleEnergy");
        if (vehicle.energy && vehicle.energy.id) {
            energySelect.value = vehicle.energy.id;
        }
    });

    // Remplir les autres champs de la modale
    document.getElementById("modalVehicleBrand").value = vehicle.brand;
    document.getElementById("modalVehicleModel").value = vehicle.model;
    document.getElementById("modalVehicleColor").value = vehicle.color;
    document.getElementById("modalVehicleRegistration").value = vehicle.registration;
    document.getElementById("modalVehicleRegistrationDate").value = vehicle.registrationFirstDate.split('T')[0];
    document.getElementById("modalVehicleNbPlace").value = vehicle.nbPlace;

    // Ajouter les actions pour les boutons Modifier et Supprimer
    document.getElementById("saveVehicleBtn").onclick = () => editVehicle(vehicle.id);
    document.getElementById("deleteVehicleBtn").onclick = () => deleteVehicle(vehicle.id);

    // Afficher la modale
    const vehicleModal = new bootstrap.Modal(document.getElementById("vehicleModal"));
    vehicleModal.show();
}

async function loadEnergyOptions(source = 'modalVehicleEnergy') {
    try {
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());

        let requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };

        let response = await fetch(apiUrl + "energy/list", requestOptions);

        if (response.ok) {
            let energies = await response.json();
            const energySelect = document.getElementById(source);

            // Vider les options existantes
            energySelect.innerHTML = '<option value="">--- Choisir une énergie ---</option>';

            // Ajouter les options récupérées
            energies.forEach(energy => {
                const option = document.createElement("option");
                option.value = energy.id; // Utilisez l'ID comme valeur
                option.textContent = energy.libelle; // Utilisez le libellé comme texte
                energySelect.appendChild(option);
            });
        } else {
            console.error("Impossible de récupérer la liste des énergies");
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des énergies", error);
    }
}

async function editVehicle(vehicleId) {
    try {

        // Récupérer la date saisie
        const registrationFirstDate = document.getElementById("modalVehicleRegistrationDate").value;

        // Vérifier si la date est valide
        if (!isValidDate(registrationFirstDate)) {
            alert("Veuillez saisir une date valide pour la première immatriculation.");
            return; // Arrêter l'exécution si la date est invalide
        }

        const vehicleData = {
            brand: document.getElementById("modalVehicleBrand").value,
            model: document.getElementById("modalVehicleModel").value,
            color: document.getElementById("modalVehicleColor").value,
            registration: document.getElementById("modalVehicleRegistration").value,
            registrationFirstDate: document.getElementById("modalVehicleRegistrationDate").value,
            nbPlace: parseInt(document.getElementById("modalVehicleNbPlace").value, 10),
            energy: {
                id: parseInt(document.getElementById("modalVehicleEnergy").value, 10)
            }
        };

        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());
        myHeaders.append("Content-Type", "application/json");

        let requestOptions = {
            method: 'PUT',
            headers: myHeaders,
            body: JSON.stringify(vehicleData),
            redirect: 'follow'
        };

        let response = await fetch(apiUrl + `vehicle/${vehicleId}`, requestOptions);

        if (response.ok) {
            showMessage("vehicleUpdateMessage"); // Afficher le message de succès
            refreshVehiclesTab(); // Rafraîchir l'onglet
            // Fermer la modale
            const vehicleModal = bootstrap.Modal.getInstance(document.getElementById("vehicleModal"));
            vehicleModal.hide();
        } else {
            console.error("Erreur lors de la modification du véhicule");
        }
    } catch (error) {
        console.error("Erreur lors de la modification du véhicule", error);
    }
}

async function deleteVehicle(vehicleId) {
    const userConfirmed = confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?");
    if (userConfirmed) {
        try {
            let myHeaders = new Headers();
            myHeaders.append("X-AUTH-TOKEN", getToken());

            let requestOptions = {
                method: 'DELETE',
                headers: myHeaders,
                redirect: 'follow'
            };

            let response = await fetch(apiUrl + `vehicle/${vehicleId}`, requestOptions);

            if (response.ok) {
                showMessage("vehicleDeleteMessage"); // Afficher le message de succès
                refreshVehiclesTab(); // Rafraîchir l'onglet
                // Fermer la modale
                const vehicleModal = bootstrap.Modal.getInstance(document.getElementById("vehicleModal"));
                vehicleModal.hide();
            } else {
                console.error("Erreur lors de la suppression du véhicule");
            }
        } catch (error) {
            console.error("Erreur lors de la suppression du véhicule", error);
        }
    }
}

async function addVehicle() {
    try {
        // Récupérer les données du formulaire
        const vehicleData = {
            brand: document.getElementById("vehicleBrand").value,
            model: document.getElementById("vehicleModel").value,
            color: document.getElementById("vehicleColor").value,
            registration: document.getElementById("vehicleRegistration").value,
            registrationFirstDate: document.getElementById("registrationFirstDate").value,
            nbPlace: parseInt(document.getElementById("nbPlace").value, 10),
            energy: {
                id: parseInt(document.getElementById("VehicleEnergy").value, 10)
            }
        };

        // Vérifier si tous les champs obligatoires sont remplis
        if (!vehicleData.brand || !vehicleData.model || !vehicleData.registration || !vehicleData.registrationFirstDate || !vehicleData.energy.id) {
            alert("Veuillez remplir tous les champs obligatoires.");
            return;
        }

        // Vérifier si la date est valide
        if (!isValidDate(vehicleData.registrationFirstDate)) {
            alert("Veuillez saisir une date valide pour la première immatriculation.");
            return;
        }

        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());
        myHeaders.append("Content-Type", "application/json");

        let requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: JSON.stringify(vehicleData),
            redirect: 'follow'
        };

        let response = await fetch(apiUrl + "vehicle/add", requestOptions);

        if (response.ok) {
            showMessage("vehicleConfirmationMessage"); // Afficher le message de succès
            refreshVehiclesTab(); // Rafraîchir l'onglet
        } else {
            console.error("Erreur lors de l'ajout du véhicule");
        }
    } catch (error) {
        console.error("Erreur lors de l'ajout du véhicule", error);
    }
}

async function refreshVehiclesTab() {
    try {
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());

        let requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };

        let response = await fetch(apiUrl + "vehicle/list", requestOptions);

        if (response.ok) {
            let vehicles = await response.json();
            const vehicleList = document.getElementById('vehicleList');
            vehicleList.innerHTML = ''; // Vider le conteneur avant d'ajouter les véhicules

            // Boucle pour afficher les véhicules
            vehicles.forEach(vehicle => {
                const vehicleRow = document.createElement("tr");
                vehicleRow.className = "vehicle";
                vehicleRow.innerHTML = `
                    <td>${vehicle.brand} ${vehicle.model}</td>
                    <td class="d-none d-md-table-cell">${vehicle.color}</td>
                    <td>${vehicle.registration}</td>
                    <td class="d-none d-md-table-cell">${new Date(vehicle.registrationFirstDate).toLocaleDateString('fr-FR')}</td>
                    <td class="d-none d-md-table-cell">${vehicle.nbPlace}</td>
                    <td class="d-none d-md-table-cell">${vehicle.energy.libelle}</td>
                    <td class="d-none d-md-table-cell">
                        <button type="button" class="btn btn-primary btn-sm" onclick="editVehicle(${vehicle.id})">
                            <i class="bi bi-pencil"></i> Modifier
                        </button>
                    </td>
                `;

                // Ajouter un événement pour ouvrir la modale au clic sur une ligne
                vehicleRow.addEventListener("click", () => openVehicleModal(vehicle));

                vehicleList.appendChild(vehicleRow);
            });


            // Revenir en haut de la page
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            console.error("Impossible de rafraîchir les véhicules");
        }
    } catch (error) {
        console.error("Erreur lors du rafraîchissement des véhicules", error);
    }
}

document.getElementById('vehicles-tab').addEventListener('shown.bs.tab', function () {
    loadEnergyOptions('VehicleEnergy');
});

document.getElementById("addVehicleBtn").addEventListener("click", function (event) {
    event.preventDefault(); // Empêcher le comportement par défaut du bouton
    addVehicle(); // Appeler la fonction pour ajouter un véhicule
});

document.getElementById("preferences").addEventListener("click", function (event) {
    if (event.target && event.target.id === "deletePreferenceBtn") {
        const preferenceId = event.target.dataset.id; // Récupérer l'ID de la préférence
        deletePreference(preferenceId);
    }
});