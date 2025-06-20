import { getUserInfo, getCookie } from '../script.js';
import { displayUserInfo } from './account-profile.js';
import { displayUserPreferences } from './account-preferences.js';
import { displayUserVehicles } from './account-vehicles.js';



async function chargerInfosUtilisateur() {
    const user = await getUserInfo();
    //Affichage des infos de l'utilisateur
    if (!user) {
        console.error("Aucun utilisateur trouvé");
        return;
    }
    displayUserInfo(user);
    displayUserPreferences(user.userPreferences);
    displayUserVehicles(user.userVehicles);
}


chargerInfosUtilisateur();

// Fonction pour gérer la touche Entrée sur les champs de formulaire
function setupEnterKeyListener() {
    // Désactiver la soumission par défaut pour tous les formulaires
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Déterminer quel bouton doit être cliqué en fonction du formulaire
            if (form.id === 'preferencesForm') {
                const addPreferenceBtn = document.getElementById('addPreferenceBtn');
                if (addPreferenceBtn && !addPreferenceBtn.disabled) {
                    addPreferenceBtn.click();
                }
            } else if (form.id === 'vehiclesForm') {
                const addVehicleBtn = document.getElementById('addVehicleBtn');
                if (addVehicleBtn && !addVehicleBtn.disabled) {
                    addVehicleBtn.click();
                }
            } else if (form.id === 'vehicleForm') {
                const saveVehicleBtn = document.getElementById('saveVehicleBtn');
                if (saveVehicleBtn && !saveVehicleBtn.disabled) {
                    saveVehicleBtn.click();
                }
            } else {
                // Formulaire d'informations personnelles par défaut
                const submitButton = document.getElementById('btnSubmitFormInfoUser');
                if (submitButton && !submitButton.disabled) {
                    submitButton.click();
                }
            }
        });
    });
    
    // Utilisons aussi la délégation d'événements pour la touche Entrée
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
            else {
                // Par défaut, cliquer sur le bouton d'enregistrement des informations personnelles
                const submitButton = document.getElementById('btnSubmitFormInfoUser');
                if (submitButton && !submitButton.disabled) {
                    submitButton.click();
                    return false;
                }
            }
        }
    }, true);
}

// S'assurer que les écouteurs sont configurés une fois que le DOM est chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEnterKeyListener);
} else {
    // Le DOM est déjà chargé
    setupEnterKeyListener();
}

// Gère l'affichage des rôles et des onglets sans recharger la page
export function handleRoleAndTabs(result) {
    // Récupérer le bouton de soumission pour pouvoir y faire référence
    const submitFormInfoUser = document.getElementById("btnSubmitFormInfoUser");
    
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