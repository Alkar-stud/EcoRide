import { getUserInfo } from '../script.js';
import { displayUserInfo } from './account-profile.js';
import { displayUserPreferences } from './account-preferences.js';



async function chargerInfosUtilisateur() {
    const user = await getUserInfo(); // 1 seule requête API
console.log("Informations de l'utilisateur récupérées :", user);
    //Affichage des infos de l'utilisateur
    if (!user) {
        console.error("Aucun utilisateur trouvé");
        return;
    }
    displayUserInfo(user);
    displayUserPreferences(user.userPreferences);    

}


chargerInfosUtilisateur();


// Gère l'affichage des rôles et des onglets sans recharger la page
export function handleRoleAndTabs(result) {
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