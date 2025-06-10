//Module pour gérer les infos de l'utilisateur
import { apiUrl, url } from '../config.js';
import { getUserInfo, getCookie, getToken, eraseCookie, sendFetchRequest } from '../script.js';
import { setPreferences, displayPreferences } from './account-preferences.js';

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


// Fonction pour afficher les infos de l'utilisateur, si il est passager, chauffeur ou les deux, son pseudo et la photo s'il y en a une
export async function displayUserInfo() {
    let result = await getUserInfo();
    // Vérification de la présence d'une photo
    result.photo = result.photo ? url + "uploads/photos/" + result.photo : "/images/default-avatar.png";

    handleRoleAndTabs(result);

    setGradeStyle(result.grade);
    grade.innerHTML = result.grade;
    credits.innerHTML = result.credits;
    pseudoInput.value = result.pseudo;
    photo.src = result.photo;

    // On affiche les préférences de l'utilisateur
    if (result.preferences) {
        setPreferences(result.preferences);
        displayPreferences(result.preferences);
    }

    // On affiche les véhicules de l'utilisateur
    if (result.vehicles) {
        renderVehicles(result.vehicles);
    }

    return result;
}

// Gère l'affichage des rôles et des onglets
function handleRoleAndTabs(result) {
        //Si le role est différente de "ROLE_USER", on ne bloque pas le bouton Enregistrer si ni chauffeur ni passager
    if (result.roles[0] != "ROLE_USER" && !result.isDriver && !result.isPassenger) {
        submitFormInfoUser.disabled = false;
    }
    if (result.isDriver === true && result.isPassenger === false) {
        document.getElementById("isDriver").checked = true;
        document.getElementById("preferences-tab").classList.remove('d-none');
        document.getElementById("vehicles-tab").classList.remove('d-none');
    } else if (result.isDriver === false && result.isPassenger === true) {
        document.getElementById("isPassenger").checked = true;
        document.getElementById("preferences-tab").classList.add('d-none');
        document.getElementById("vehicles-tab").classList.add('d-none');
    } else if (result.isDriver === true && result.isPassenger === true) {
        document.getElementById("isBoth").checked = true;
        document.getElementById("preferences-tab").classList.remove('d-none');
        document.getElementById("vehicles-tab").classList.remove('d-none');
    } else {
        document.getElementById("preferences-tab").classList.add('d-none');
        document.getElementById("vehicles-tab").classList.add('d-none');
        if (getCookie('role') == "ROLE_USER") {
            document.getElementById("roleNone").style.display = "block";
            submitFormInfoUser.disabled = true;
        } else {
            submitFormInfoUser.setAttribute('title', "Vous devez choisir d'être chauffeur, passager ou les deux.");
            submitFormInfoUser.disabled = false;
        }
    }
}

// Applique la classe de style à la note
function setGradeStyle(gradeValue) {
    grade.classList.remove("bg-success", "bg-warning", "bg-danger");
    if (gradeValue >= 4) {
        grade.classList.add("bg-success");
    } else if (gradeValue >= 1.5 && gradeValue < 4) {
        grade.classList.add("bg-warning");
    } else {
        grade.classList.add("bg-danger");
    }
}


//Pour mettre à jour les données de l'utilisateur
export function setUserInfo() {
    let isDriver = false;
    let isPassenger = false;

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

    try {
        let response = sendFetchRequest(apiUrl + "account/edit", getToken(), 'PUT', rawData);
        // On recharge la page pour afficher les nouvelles infos
        window.location.reload();
    } catch (error) {
        console.error("Erreur lors de l'envoi du fichier'", error);
    }

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