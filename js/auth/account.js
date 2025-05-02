const pseudoInput = document.getElementById("PseudoInput");
const photo = document.getElementById("photo"); // Affichage de la photo
const photoInput = document.getElementById("PhotoInput"); //form pour changer la photo
const credits = document.getElementById("credits");
const userRoleInput = document.getElementsByTagName("userRole");
const passwordInput = document.getElementById("PasswordInput");
const submitFormInfoUser = document.getElementById("btnSubmitFormInfoUser");

// Fonction pour récupérer les infos de l'utilisateur, si il est passager, chauffeur ou les deux, son pseudo et la photo s'il y en a une
async function getUserInfo() {
    try {
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());
        let requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };
        let response = await fetch(apiUrl + "account/me", requestOptions);
        if (response.ok) {
            let result = await response.json();
console.log(result);
            // Vérification de la présence d'une photo
            if (result.photo) {
                result.photo = url + "uploads/photos/" + result.photo;
            } else {
                result.photo = "/images/default-avatar.png";
            }
            //Si le role est différente de "ROLE_USER", on ne bloque pas le bouton Enregistrer si ni chauffeur ni passager
            if (result.roles[0] != "ROLE_USER" && result.isDriver == false && result.isPassenger == false) {
                submitFormInfoUser.disabled = false;
            }
            //Si ni chauffeur ni passager, on bloque le bouton Enregistrer
            if (result.isDriver == true && result.isPassenger == false) {
                document.getElementById("userRoleDriver").checked = true;
            } else if (result.isDriver == false && result.isPassenger == true) {
                document.getElementById("userRolePassenger").checked = true;
            } else if (result.isDriver == true && result.isPassenger == true) {
                document.getElementById("roleBoth").checked = true;
            } else {
console.log(getCookie('role'));
                //Si le role est différente de "ROLE_USER", on ne bloque pas le bouton Enregistrer si ni chauffeur ni passager
                if (getCookie('role') == "ROLE_USER") {
                    document.getElementById("roleNone").style.display = "block";
                    submitFormInfoUser.disabled = true;
                }
                else {
                    submitFormInfoUser.disabled = false;
                }
            }
            pseudoInput.value = result.pseudo;
            photoInput.src = result.photo;
            credits.innerHTML = result.credits;

            return result;
        } else {
            console.log("Impossible de récupérer les informations de l'utilisateur");
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des informations de l'utilisateur", error);
    }
}


pseudoInput.addEventListener("blur", validateFormAccount); 
photoInput.addEventListener("blur", validateFormAccount);
submitFormInfoUser.addEventListener("click", setUserInfo);
const roleRadios = document.querySelectorAll('input[name="userRole"]');

// Fonction pour vérifier si un bouton radio est sélectionné
function checkRoleSelection() {
    const isChecked = Array.from(roleRadios).some(radio => radio.checked);
    submitFormInfoUser.disabled = !isChecked; // Active ou désactive le bouton
    document.getElementById("roleNone").style.display = "none";
}

// Ajouter un listener sur chaque bouton radio
roleRadios.forEach(radio => {
    radio.addEventListener('change', checkRoleSelection);
});

// Initialiser l'état du bouton au chargement de la page
checkRoleSelection();


//Function permettant de valider tout le formulaire
function validateFormAccount(){
    const pseudoOk = validateRequiredAccount(pseudoInput);
    const userRoleOk = validateRequiredAccount(userRole);

    if (pseudoOk && userRoleOk) {
        submitFormInfoUser.disabled = false;
    }
    else {
        submitFormInfoUser.disabled = true;
    }
}

function validateRequiredAccount(input){
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

function setUserInfo() {
    const formData = new FormData();

}




// Fonction pour ajouter une section de véhicule
// Cette fonction est appelée lorsque l'utilisateur clique sur le bouton "Ajouter un véhicule"
// Elle crée un nouvel élément de formulaire pour un véhicule et l'ajoute au conteneur de véhicules
// Elle utilise un compteur pour donner un identifiant unique à chaque véhicule ajouté
let vehicleCount = 1;

function addVehicleSection(event) {
    event.preventDefault();

    const vehicleContainer = document.getElementById('vehicleContainer');
    const newVehicle = document.createElement('fieldset');
    newVehicle.className = 'border rounded-3 p-3 mt-3';
    newVehicle.innerHTML = `
        <legend>Véhicule ${++vehicleCount}</legend>
        <div class="mb-3">
            <label for="LicensePlateInput${vehicleCount}" class="form-label">Plaque d'immatriculation</label>
            <input type="text" class="form-control" id="LicensePlateInput${vehicleCount}">
        </div>
        <div class="mb-3">
            <label for="LicenseDateInput${vehicleCount}" class="form-label">Date de première immatriculation</label>
            <input type="date" class="form-control" id="LicenseDateInput${vehicleCount}">
        </div>
        <div class="mb-3">
            <label for="VehicleBrandInput${vehicleCount}" class="form-label">Marque du véhicule</label>
            <input type="text" class="form-control" id="VehicleBrandInput${vehicleCount}">
        </div>
        <div class="mb-3">
            <label for="VehicleModelInput${vehicleCount}" class="form-label">Modèle du véhicule</label>
            <input type="text" class="form-control" id="VehicleModelInput${vehicleCount}">
        </div>
        <div class="mb-3">
            <label for="VehicleColorInput${vehicleCount}" class="form-label">Couleur du véhicule</label>
            <input type="text" class="form-control" id="VehicleColorInput${vehicleCount}">
        </div>
        <div class="mb-3">
            <label for="VehicleEnergyInput${vehicleCount}" class="form-label">&Eacute;nergie du véhicule</label>
            <select id="VehicleEnergyInput${vehicleCount}" class="form-select">
                <option value="">--- Choisir ---</option>
                <option value="Electrique">Electrique</option>
                <option value="Hybride">Hybride</option>
                <option value="Essence">Essence</option>
                <option value="Diesel">Diesel</option>
            </select>
        </div>
        <div class="mb-3">
            <label for="AvailablePlacesInput${vehicleCount}" class="form-label">Nombres de places disponibles</label>
            <input type="number" class="form-control" id="AvailablePlacesInput${vehicleCount}" placeholder="Combien vous êtes habituellement ?" value="4" name="NbConvives">
        </div>
    `;
    vehicleContainer.appendChild(newVehicle);
}

async function getVehicle()
{
    try {
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());

        let requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };

        let response = await fetch(apiUrl+"vehicle/list", requestOptions);

        if (response.ok) {
            let result = await response.json();
            return result;
        } else {
            console.log("Impossible de récupérer les véhicules utilisateur");
        }
    } catch (error) {
        console.error("erreur lors de la récupération des véhicules de l'utilisateur", error);
    }
}

getUserInfo();

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