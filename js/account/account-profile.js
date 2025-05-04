//Module pour gérer les infos de l'utilisateur
import { setPreferences, displayPreferences } from './account-preferences.js';
import { openVehicleModal } from './account-vehicles.js';

//Pour les infos perso du user
const pseudoInput = document.getElementById("PseudoInput");
const photo = document.getElementById("photo"); // Affichage de la photo
const photoInput = document.getElementById("PhotoInput"); //form pour changer la photo
const credits = document.getElementById("credits");
const grade = document.getElementById("grade");

const roleRadios = document.querySelectorAll('input[name="userRole"]');


//Les boutons et leur(s) listener(s)
//Pour mettre à jour le compte
const submitFormInfoUser = document.getElementById("btnSubmitFormInfoUser");
submitFormInfoUser.addEventListener("click", setUserInfo);

//listener lorsque l'utilisateur coche la case pour supprimer la photo, à condition que la photo existe et que l'un des boutons radio soit coché
const deletePhotoCheck = document.getElementById("deletePhotoCheck"); //checkbox pour supprimer la photo
deletePhotoCheck.addEventListener("change", function() {
    submitFormInfoUser.disabled = false;
});


// Ajouter un listener sur chaque bouton radio
roleRadios.forEach(radio => {
    radio.addEventListener('change', checkRoleSelection);
});


export // Fonction pour récupérer les infos de l'utilisateur, si il est passager, chauffeur ou les deux, son pseudo et la photo s'il y en a une
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

//Pour mettre à jour les données de l'utilisateur
export function setUserInfo() {
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
            headers: myHeaders, 
            body: formData, 
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


// Fonction pour supprimer le compte utilisateur
export async function deleteAccount() {
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
                    eraseCookie("accesstoken");
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


// Fonction pour vérifier si un bouton radio est sélectionné
export async function checkRoleSelection() {
    const isChecked = Array.from(roleRadios).some(radio => radio.checked);
    submitFormInfoUser.disabled = !isChecked; // Active ou désactive le bouton
    document.getElementById("roleNone").style.display = "none";
}




//Function permettant de valider tout le formulaire
export function validateFormAccount(){
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