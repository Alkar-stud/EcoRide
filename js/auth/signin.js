//Fichier JS de la page de connexion
import { apiUrl } from '../config.js';
import { setToken, setCookie, RoleCookieName, sendFetchRequest } from '../script.js';

const mailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const btnSignin = document.getElementById("btnSignin");
const signinForm = document.getElementById("signinForm");


btnSignin.addEventListener("click", function(event) {
    event.preventDefault();
    checkCredentials();
});


//Function permettant de valider tout le formulaire
async function checkCredentials(){
    let dataForm = new FormData(signinForm);

    let raw = JSON.stringify({
        "email": dataForm.get("email"),
        "password": dataForm.get("mdp")
    });

    try {
        let response = await sendFetchRequest(apiUrl+"login", null, 'POST', raw);

        // Vérifie si la réponse est OK
        if (!response.ok) {
            mailInput.classList.add("is-invalid");
            passwordInput.classList.add("is-invalid");
            passwordInput.value = "";
            return;
        }
        let result = await response.json();
        
        // Vérification si l'authentification a échoué côté API
        if (!result?.apiToken || result.error) {
            mailInput.classList.add("is-invalid");
            passwordInput.classList.add("is-invalid");
            passwordInput.value = "";
            return;
        }

        // Authentification réussie
        mailInput.classList.remove("is-invalid");
        passwordInput.classList.remove("is-invalid");
        
        const token = result.apiToken;
        setToken(token);
        setCookie(RoleCookieName, result.roles[0], 1);
        
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get("returnTo");
        
        if (returnTo) {
            window.location.replace(returnTo);
        } else {
            const redirectPage = urlParams.get("page");
            if (redirectPage) {
                window.location.replace(redirectPage);
            } else {
                window.location.replace("/");
            }
        }
    } catch (error) {
        console.error("Erreur lors de la connexion:", error);
        mailInput.classList.add("is-invalid");
        passwordInput.classList.add("is-invalid");
        passwordInput.value = "";
    }
}