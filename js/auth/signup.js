//Fichier JS de la page d'inscription
import { apiUrl } from '../config.js';

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

function inscrireUtilisateur(){
    // Crée un nouvel objet FormData à partir du formulaire contenu dans la variable "formInscription"
    let dataForm = new FormData(formInscription);

    // Crée un nouvel objet Headers pour définir les en-têtes de la requête HTTP
    let myHeaders = new Headers();
    // Ajoute l'en-tête "Content-Type" avec la valeur "application/json"
    myHeaders.append("Content-Type", "application/json");

    // Convertit les données du formulaire en une chaîne JSON
    let raw = JSON.stringify({
        "pseudo": dataForm.get("pseudo"),
        "email": dataForm.get("email"),
        "password": dataForm.get("mdp")
    });

    // Configure les options de la requête HTTP
    let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    fetch(apiUrl + "registration", requestOptions)
    .then((response) => {
        if (response.ok) {
            return response.json();
        }
        else {
            alert("Erreur lors de l'inscription");
            throw new Error("Erreur lors de l'inscription");
        }
        
    })
    .then((result) => {
        alert("Vous êtes maintenant inscrit, vous devez cliquer sur le lien dans le mail reçu afin de pouvoir vous connecter.");
        window.location.href="/signin";
    })
    .catch((error) => console.error(error));
}