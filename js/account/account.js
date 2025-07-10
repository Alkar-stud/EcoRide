import { getUserInfo } from '../script.js';
import { displayUserInfo } from './account-profile.js';
import { displayUserPreferences } from './account-preferences.js';
import { displayUserVehicles } from './account-vehicles.js';


// Récupérer le bouton 'Enregistrer' pour pouvoir y faire référence
const submitFormInfoUser = document.getElementById("btnFormInfoUser");



// Gère l'affichage des rôles et des onglets selon si le user est chauffeur, passager ou les deux
export function handleRoleAndTabs(result) {
    //Si le user est chauffeur uniquement, on affiche les onglets de préférences et véhicules
    if (result.isDriver === true && result.isPassenger === false) {
        document.getElementById("isDriver").checked = true;
        document.getElementById("preferences-tab").classList.remove('d-none');
        document.getElementById("vehicles-tab").classList.remove('d-none');
    } else if (result.isDriver === false && result.isPassenger === true) {
    //Si le user est passager uniquement, on masque les onglets de préférences et véhicules
        document.getElementById("isPassenger").checked = true;
        document.getElementById("preferences-tab").classList.add('d-none');
        document.getElementById("vehicles-tab").classList.add('d-none');
    } else if (result.isDriver === true && result.isPassenger === true) {
    //Si le user est chauffeur/passager, on affiche les onglets de préférences et véhicules
        document.getElementById("isBoth").checked = true;
        document.getElementById("preferences-tab").classList.remove('d-none');
        document.getElementById("vehicles-tab").classList.remove('d-none');
    } else {
    //Par défaut, on n'affiche que les infos personnelles
        document.getElementById("preferences-tab").classList.add('d-none');
        document.getElementById("vehicles-tab").classList.add('d-none');
    }
}


/*
 * Fonction pour charger les informations de l'utilisateur et gérer l'affichage des catégories
 */
async function chargerInfosUtilisateur() {
    // Récupération des informations de l'utilisateur
    const user = await getUserInfo();

    //Affichage des infos de l'utilisateur
    if (!user) {
        console.error("Aucun utilisateur trouvé");
        return;
    }
    //Affichage des informations de l'utilisateur
    displayUserInfo(user);
    //Affichage des préférences de l'utilisateur
    displayUserPreferences(user.userPreferences);
    //Affichage des véhicules de l'utilisateur
    displayUserVehicles(user.userVehicles);
}

// Appel de la fonction pour charger les informations de l'utilisateur
chargerInfosUtilisateur();


/*
 * Fonction pour gérer la touche Entrée sur les champs de formulaire
 */
function setupEnterKeyListener() {
    // Écouteur d'événement pour la touche Entrée
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && 
            (event.target.tagName === 'INPUT' || 
             event.target.tagName === 'SELECT' || 
             event.target.tagName === 'TEXTAREA')) {
            
            event.preventDefault();
            event.stopPropagation();
            
            // Vérifier si l'élément est dans le formulaire de préférences
            if (event.target.id === 'prefsLibelle' || event.target.id === 'prefsDescription' || 
                event.target.closest('#preferencesForm')) {
                const addPreferenceBtn = document.getElementById('addPreferenceBtn');
                if (addPreferenceBtn && !addPreferenceBtn.disabled) {
                    addPreferenceBtn.click();
                    return false;
                }
            } 
            // Vérifier si l'élément est dans le formulaire d'ajout de véhicule
            else if (event.target.id.startsWith('vehicle') || event.target.id === 'nbPlace' || 
                     event.target.id === 'licenseFirstDate' || event.target.id === 'VehicleEnergy' ||
                     event.target.closest('#vehiclesForm')) {
                const addVehicleBtn = document.getElementById('addVehicleBtn');
                if (addVehicleBtn && !addVehicleBtn.disabled) {
                    addVehicleBtn.click();
                    return false;
                }
            } 
            // Vérifier si l'élément est dans le formulaire de modification de véhicule (modal)
            else if (event.target.id.startsWith('modalVehicle') || event.target.closest('#vehicleForm')) {
                const saveVehicleBtn = document.getElementById('saveVehicleBtn');
                if (saveVehicleBtn && !saveVehicleBtn.disabled) {
                    saveVehicleBtn.click();
                    return false;
                }
            } 
            // Par défaut, cliquer sur le bouton d'enregistrement des informations personnelles
            if (submitFormInfoUser && !submitFormInfoUser.disabled) {
                submitFormInfoUser.click();
                return false;
            }
        }
    }, true);
}

//Les écouteurs pour le fonctionnement de la touche Entrée
setupEnterKeyListener();

