// Module pour gérer le changement de mot de passe
import { sendFetchRequest, getToken } from '../script.js';
import { apiUrl } from '../config.js';

const inputPassword = document.getElementById("PasswordInput");
const inputValidationPassword = document.getElementById("ValidatePasswordInput");
const btnValidation = document.getElementById("btnChangePassword");

btnValidation.disabled = true;

inputPassword.addEventListener("keyup", validateForm);
inputValidationPassword.addEventListener("keyup", validateForm);
btnValidation.addEventListener("click", changePassword);


//Function permettant de valider tout le formulaire
function validateForm(){
    const passwordOk = validatePassword(inputPassword);
    const passwordConfirmOk = validateConfirmationPassword(inputPassword,inputValidationPassword);

    if (passwordOk && passwordConfirmOk) {
        btnValidation.disabled = false;
    }
    else {
        btnValidation.disabled = true;
    }
}


function validatePassword(input){
    //Définir mon regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordUser = input.value;
    if(passwordUser.match(passwordRegex)){
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

function validateConfirmationPassword(inputPwd, inputConfirmPwd){
    if(inputPwd.value == inputConfirmPwd.value){
        inputConfirmPwd.classList.add("is-valid");
        inputConfirmPwd.classList.remove("is-invalid");
        return true;
    }
    else{
        inputConfirmPwd.classList.add("is-invalid");
        inputConfirmPwd.classList.remove("is-valid");
        return false;
    }
}

async function changePassword() {
    try {
        // Récupération des données du formulaire
        let dataForm = new FormData(formChangePassword);
        
        // Préparation des données à envoyer
        let rawData = JSON.stringify({
            "password": dataForm.get("Password")
        });
        
        // Utilisation de sendFetchRequest pour faire l'appel API
        await sendFetchRequest(
            apiUrl + "account/edit", 
            getToken(), 
            'PUT', 
            rawData
        );
        
        // Si la requête réussit
        alert('Mot de passe modifié avec succès !');
        
    } catch (error) {
        console.error('Erreur lors du changement de mot de passe:', error);
        alert('Erreur lors du changement de mot de passe !');
    }
}