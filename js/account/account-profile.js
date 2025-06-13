//Module pour gérer les infos de l'utilisateur
import { apiUrl, url } from '../config.js';
import { getToken, eraseCookie, setGradeStyle, sendFetchRequest } from '../script.js';
import { handleRoleAndTabs } from './account.js';



//Pour les infos perso du user
const pseudoInput = document.getElementById("PseudoInput");
const photo = document.getElementById("photo"); // Affichage de la photo
const photoInput = document.getElementById("PhotoInput"); //form pour changer la photo

const credits = document.getElementById("credits");
const AddCreditsBtn = document.getElementById("AddCreditsBtn");
AddCreditsBtn.addEventListener("click", function() {
  alert('[Mode démo renvoi vers le formulaire lié à la banque] Crédits ajoutés !');
});
const widrawCreditsBtn = document.getElementById("widrawCreditsBtn");
widrawCreditsBtn.addEventListener("click", function() {
  alert('[Mode démo renvoi vers le formulaire lié à la banque] Crédits retirés !');
});



const grade = document.getElementById("grade");

const submitFormInfoUser = document.getElementById("btnSubmitFormInfoUser");
submitFormInfoUser.addEventListener("click", setUserInfo);

const btnDeleteAccount = document.getElementById("btnDelete");
btnDeleteAccount.addEventListener("click", deleteAccount);


// Fonction pour afficher les infos de l'utilisateur, si il est passager, chauffeur ou les deux, son pseudo et la photo s'il y en a une
export async function displayUserInfo(user) {
    
    // Vérification de la présence d'une photo
    user.photo = user.photo ? url + "uploads/photos/" + user.photo : "/images/default-avatar.png";

    handleRoleAndTabs(user);

    if (user.grade !== null && user.grade !== undefined) {
        setGradeStyle(user.grade);
    }
    credits.innerHTML = user.credits;
    pseudoInput.value = user.pseudo;
    photo.src = user.photo;

    return user;
}


//Pour mettre à jour les données de l'utilisateur
export async function setUserInfo() {
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

        let response = await sendFetchRequest(apiUrl + "account/upload", getToken(), 'POST', formData, true)
        if (response?.success) {
            photo.src = url + "uploads/photos/" + response.fileName; // Met à jour la source de l'image
        } else {
            console.error("Erreur lors de l'envoi de la photo");
        }
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
        await sendFetchRequest(apiUrl + "account/edit", getToken(), 'PUT', rawData);
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