import { displayUserInfo, setUserInfo, deleteAccount, checkRoleSelection, validateFormAccount } from './account-profile.js';
import { addPreferences, savePreference, deletePreference } from './account-preferences.js';
import { addVehicle, loadEnergyOptions } from './account-vehicles.js';

//Pour les infos perso du user
const pseudoInput = document.getElementById("PseudoInput");
const photo = document.getElementById("photo"); // Affichage de la photo
const photoInput = document.getElementById("PhotoInput"); //form pour changer la photo

const credits = document.getElementById("credits");
const grade = document.getElementById("grade");

const submitFormInfoUser = document.getElementById("btnSubmitFormInfoUser");
submitFormInfoUser.addEventListener("click", setUserInfo);

const btnDeleteAccount = document.getElementById("btnDelete");

pseudoInput.addEventListener("blur", validateFormAccount); 
photoInput.addEventListener("blur", validateFormAccount);
btnDeleteAccount.addEventListener("click", deleteAccount);


/*
* Fonction pour gérer les infos de l'utilisateur
*/
displayUserInfo();


// Initialiser l'état du bouton au chargement de la page
checkRoleSelection();


document.addEventListener('DOMContentLoaded', function () {
    const roleRadios = document.querySelectorAll('input[name="userRole"]');
    const additionalInfoSection = document.getElementById('additionalInfo');

    // Fonction pour afficher/masquer les informations supplémentaires
    function toggleAdditionalInfo() {
        const selectedRole = document.querySelector('input[name="userRole"]:checked').value;
        if (selectedRole === 'Chauffeur' || selectedRole === 'Les 2') {
            additionalInfoSection.style.display = 'block';
        } else {
            additionalInfoSection.style.display = 'none';
        }
    }

    // Ajout d'un écouteur d'événement sur les boutons radio
    roleRadios.forEach(radio => {
        radio.addEventListener('change', toggleAdditionalInfo);
    });

    // Initialisation de l'affichage
    toggleAdditionalInfo();
});



/*
* fonctions pour les préférences
*/

const addPreferenceBtn = document.getElementById("addPreferenceBtn");

addPreferenceBtn.addEventListener("click", function (event) {
    // Empêcher le comportement par défaut du bouton
    event.preventDefault();

    // Appeler la fonction pour ajouter une préférence
    addPreferences();
});

// Ajouter des listeners pour les boutons radio
document.querySelectorAll('input[name="SmokeAsk"]').forEach(radio => {
    radio.addEventListener("change", (event) => {
        const description = event.target.value;
        const id = event.target.dataset.id; // Récupérer l'ID de la préférence
        savePreference(id, "smokingAllowed", description, "smokeConfirmationMessage");
    });
});

document.querySelectorAll('input[name="PetAsk"]').forEach(radio => {
    radio.addEventListener("change", (event) => {
        const description = event.target.value;
        const id = event.target.dataset.id; // Récupérer l'ID de la préférence
        savePreference(id, "petsAllowed", description, "petConfirmationMessage");
    });
});


/*
* fonctions pour les véhicules
*/
// Fonction pour ouvrir le formulaire d'ajout de véhicule
const showVehicleFormBtn = document.getElementById("showVehicleFormBtn");
showVehicleFormBtn.addEventListener("click", function (event) {
    // Empêcher le comportement par défaut du bouton
    event.preventDefault();

    // Afficher le formulaire pour ajouter un véhicule
    document.getElementById("vehiclesFormContainer").style.display = "block";
});

//Pour afficher la liste des énergies/motorisations
document.getElementById('vehicles-tab').addEventListener('shown.bs.tab', function () {
    loadEnergyOptions('VehicleEnergy');
});

//Listener pour ajouter un véhicule
document.getElementById("addVehicleBtn").addEventListener("click", function (event) {
    event.preventDefault(); // Empêcher le comportement par défaut du bouton
    addVehicle(); // Appeler la fonction pour ajouter un véhicule
});
//Listener pour supprimer un véhicule
document.getElementById("preferences").addEventListener("click", function (event) {
    if (event.target && event.target.id === "deletePreferenceBtn") {
        const preferenceId = event.target.dataset.id; // Récupérer l'ID de la préférence
        deletePreference(preferenceId);
    }
});