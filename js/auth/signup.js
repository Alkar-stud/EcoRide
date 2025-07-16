//Fichier JS de la page d'inscription
import { apiUrl } from '../config.js';
import { sendFetchRequest } from '../script.js';

const inputPseudo = document.getElementById("PseudoInput");
const inputMail = document.getElementById("EmailInput");
const inputPassword = document.getElementById("PasswordInput");
const inputValidationPassword = document.getElementById("ValidatePasswordInput");
const btnValidation = document.getElementById("btn-validation-inscription");
const formInscription = document.getElementById("formulaireInscription");

inputPseudo.addEventListener("keyup", validateForm); 
inputMail.addEventListener("keyup", validateForm);
inputPassword.addEventListener("keyup", validateForm);
inputValidationPassword.addEventListener("keyup", validateForm);

btnValidation.addEventListener("click", inscrireUtilisateur);


// Fonction pour mettre à jour le lien de connexion avec les paramètres d'URL
function updateSigninLink() {
    // Récupérer les paramètres d'URL
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get("returnTo");
    const rideId = urlParams.get("rideId");
    
    // Si rideId est présent, le stocker dans localStorage
    if (rideId) {
        localStorage.setItem('returnToRideId', rideId);
    }
    
    // Utiliser l'ID pour sélectionner directement le lien
    const signinLink = document.getElementById("goSignin");
    
    if (signinLink) {
        let href = "/signin";
        if (returnTo) {
            href += `?returnTo=${encodeURIComponent(returnTo)}`;
            if (rideId) {
                href += `&rideId=${rideId}`;
            }
        } else if (rideId) {
            href += `?rideId=${rideId}`;
        }
        signinLink.href = href;
    } else {
        console.log("Lien de connexion non trouvé, nouvelle tentative dans 100ms");
        // Si le lien n'est pas trouvé, réessayer après un court délai
        setTimeout(updateSigninLink, 100);
    }
}

// Exécuter la fonction immédiatement
updateSigninLink();



//Function permettant de valider tout le formulaire
function validateForm(){
    const pseudoOk = validateRequired(inputPseudo);
    const mailOk = validateMail(inputMail);
    const passwordOk = validatePassword(inputPassword);
    const passwordConfirmOk = validateConfirmationPassword(inputPassword,inputValidationPassword);

    if (pseudoOk && mailOk && passwordOk && passwordConfirmOk) {
        btnValidation.disabled = false;
    }
    else {
        btnValidation.disabled = true;
    }
}

function validateRequired(input){
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


function validateMail(input){
    //Définir mon regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mailUser = input.value;
    if(mailUser.match(emailRegex)){
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

async function inscrireUtilisateur(){
    let dataForm = new FormData(formInscription);

    let raw = JSON.stringify({
        "pseudo": dataForm.get("pseudo"),
        "email": dataForm.get("email"),
        "password": dataForm.get("mdp")
    });

    try {
        let result = await sendFetchRequest(apiUrl + "registration", null, 'POST', raw);
        alert("Vous êtes maintenant inscrit, vous pouvez vous connecter.");
        
        // Récupérer les paramètres d'URL
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get("returnTo");
        const rideId = urlParams.get("rideId");
        
        // Construire l'URL de redirection
        let redirectUrl = "/signin";
        if (returnTo) {
            redirectUrl += `?returnTo=${encodeURIComponent(returnTo)}`;
            if (rideId) {
                redirectUrl += `&rideId=${rideId}`;
            }
        } else if (rideId) {
            redirectUrl += `?rideId=${rideId}`;
        }
        
        // Rediriger vers la page de connexion
        window.location.href = redirectUrl;
    } catch (error) {
        alert("Erreur lors de l'inscription");
        console.error(error);
    }
}