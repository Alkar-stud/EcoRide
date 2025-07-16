//Fichier JS de la page de connexion
//import { apiUrl } from '../config.js';
import { apiService } from '../core/ApiService.js'; // Service API pour les requêtes
import { setToken, setCookie, RoleCookieName, sendFetchRequest } from '../script.js';

import { AuthService } from '../core/AuthService.js'; // Service d'authentification

const mailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const btnSignin = document.getElementById("btnSignin");
const signinForm = document.getElementById("signinForm");


btnSignin.addEventListener("click", function(event) {
    event.preventDefault();
    checkCredentials();
});

    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get("returnTo");
    const rideId = urlParams.get("rideId");
    
    // Mise à jour du lien d'inscription
    const signupLink = document.querySelector('a[href="/signup"]');
    if (signupLink) {
        let href = "/signup";
        if (returnTo) {
            href += `?returnTo=${encodeURIComponent(returnTo)}`;
            if (rideId) {
                href += `&rideId=${rideId}`;
            }
        } else if (rideId) {
            href += `?rideId=${rideId}`;
        }
        signupLink.href = href;
    }
    
    // Mise à jour du lien de mot de passe oublié
    const forgotPasswordLink = document.querySelector('a[href="/forgotPassword"]');
    if (forgotPasswordLink) {
        let href = "/forgotPassword";
        if (returnTo) {
            href += `?returnTo=${encodeURIComponent(returnTo)}`;
            if (rideId) {
                href += `&rideId=${rideId}`;
            }
        } else if (rideId) {
            href += `?rideId=${rideId}`;
        }
        forgotPasswordLink.href = href;
    }

//Function permettant de valider tout le formulaire
async function checkCredentials(){
    let dataForm = new FormData(signinForm);

	let authService = new AuthService();

	authService.login(dataForm.get("email"), dataForm.get("mdp"))
		.then(response => {
			console.log('Structure complète de la réponse:', response);
			
			// Adapter selon la structure réelle
			const apiToken = response?.apiToken || response?.data?.apiToken;
			
			if (apiToken) {
				mailInput.classList.remove("is-invalid");
				passwordInput.classList.remove("is-invalid");
				
				// Utiliser le token et rediriger
				setToken(apiToken);
				
				const roles = response?.roles || response?.data?.roles || [];
				if (roles.length > 0) {
					setCookie(RoleCookieName, roles[0], 1);
				}
				
				// Redirection
				const urlParams = new URLSearchParams(window.location.search);
				const returnTo = urlParams.get("returnTo");
				if (returnTo) {
					// Garder rideId dans localStorage pour que la page de destination puisse l'utiliser
					// Ne pas supprimer returnToRideId ici
					window.location.replace(returnTo);
				} else {
					const redirectPage = urlParams.get("page");
					if (redirectPage) {
						window.location.replace(redirectPage);
					} else {
						window.location.replace("/");
					}
				}
			} else {
				mailInput.classList.add("is-invalid");
				passwordInput.classList.add("is-invalid");
				passwordInput.value = "";
			}
		})
		.catch(error => {
			console.error("Erreur lors de la connexion:", error);
			mailInput.classList.add("is-invalid");
			passwordInput.classList.add("is-invalid");
			passwordInput.value = "";
		});

}
