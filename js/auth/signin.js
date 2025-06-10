//Fichier JS de la page de connexion
import { apiUrl } from '../config.js';
import { setToken, setCookie, RoleCookieName } from '../script.js';

const mailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const btnSignin = document.getElementById("btnSignin");
const signinForm = document.getElementById("signinForm");

btnSignin.addEventListener("click", checkCredentials);

// Ajout d'un écouteur pour détecter l'appui sur la touche Entrée
signinForm.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Empêche le comportement par défaut du formulaire
        checkCredentials(); // Appelle la fonction de validation
    }
});

//Function permettant de valider tout le formulaire
function checkCredentials(){
    let dataForm = new FormData(signinForm);
    
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    let raw = JSON.stringify({
        "email": dataForm.get("email"),
        "password": dataForm.get("mdp")
    });

    let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };
    fetch(apiUrl+"login", requestOptions)
    .then(response => {
        console.log(response);
        if(response.ok){
            return response.json();
        }
        else{
            mailInput.classList.add("is-invalid");
            passwordInput.classList.add("is-invalid");
        }
    })
    .then(result => {
        const token = result.apiToken;
        setToken(token);
        //placer ce token en cookie
        setCookie(RoleCookieName, result.roles[0], 1);
        //On cherche si on n'essaie pas d'atteindre une autre page, sinon page accueil
        //On récupère les paramètres de la page courante
        const urlParams = new URLSearchParams(window.location.search);
        //Si le paramètre page existe, on redirige vers cette page
        const redirectPage = urlParams.get("page");
        if (redirectPage) {
            window.location.replace(redirectPage);
        } else {
            window.location.replace("/");
        }
    })
    .catch(error => console.log('error : ', error));
}