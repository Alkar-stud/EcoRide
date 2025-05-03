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

function changePassword()
{
    // Crée un nouvel objet FormData à partir du formulaire contenu dans la variable "formInscription"
    let dataForm = new FormData(formChangePassword);


    // Crée un nouvel objet Headers pour définir les en-têtes de la requête HTTP
    let myHeaders = new Headers();
    myHeaders.append("X-AUTH-TOKEN", getToken()); // Ajoute uniquement le token

    let rawData = JSON.stringify({
        "password": dataForm.get("Password")
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
                alert('Erreur lors du changement de mot de passe !');
            }
        })
        .then(result => {
            alert('Mot de passe modifié avec succès !');
        })
        .catch(error => console.log('error', error));
}