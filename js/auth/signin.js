//Fichier JS de la page de connexion
import { apiUrl } from '../config.js';
import { setToken, setCookie, RoleCookieName, sendFetchRequest } from '../script.js';

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
async function checkCredentials(){
    let dataForm = new FormData(signinForm);

    let raw = JSON.stringify({
        "email": dataForm.get("email"),
        "password": dataForm.get("mdp")
    });

    try {
        let result = await sendFetchRequest(apiUrl+"login", null, 'POST', raw);
        
        // Vérification si l'authentification a échoué
        if (!result || !result.apiToken || result.error) {
            // Afficher l'erreur d'authentification
            mailInput.classList.add("is-invalid");
            passwordInput.classList.add("is-invalid");
            // Vider le champ de mot de passe
            passwordInput.value = "";
            return;
        }

        // Authentification réussie
        mailInput.classList.remove("is-invalid");
        passwordInput.classList.remove("is-invalid");
        
        const token = result.apiToken;
        setToken(token);
        //placer ce token en cookie
        setCookie(RoleCookieName, result.roles[0], 1);
        
        // Vérifier s'il y a un paramètre returnTo dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get("returnTo");
        
        if (returnTo) {
            // Rediriger vers la page d'origine
            window.location.replace(returnTo);
        } else {
            // Vérifier s'il y a un paramètre page dans l'URL (pour la compatibilité)
            const redirectPage = urlParams.get("page");
            if (redirectPage) {
                window.location.replace(redirectPage);
            } else {
                window.location.replace("/");
            }
        }
    } catch (error) {
        // Gestion des erreurs de requête
        console.error("Erreur lors de la connexion:", error);
        mailInput.classList.add("is-invalid");
        passwordInput.classList.add("is-invalid");
        // Vider le champ de mot de passe
        passwordInput.value = "";
    }
}