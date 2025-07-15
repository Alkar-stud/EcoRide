// Module pour gérer les véhicules de l'utilisateur
import { apiUrl } from '../config.js';
import { getToken, sendFetchRequest } from '../script.js';
import { DateUtils } from '../utils/helpers/DateHelper.js';

// ======================
// Fonctions utilitaires
// ======================

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = "none";
        return true;
    }
    console.error(`Élément non trouvé: ${elementId}`);
    return false;
}

function displayMessage(messageId, messageText = '') {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        if (messageText) {
            messageElement.textContent = messageText;
        }
        messageElement.style.display = "block";
        setTimeout(() => {
            messageElement.style.display = "none";
        }, 5000);
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ======================
// Validation des données
// ======================

function validateVehicleData(vehicleData) {
    const requiredFields = [
        'brand', 'model', 'color', 'licensePlate', 'licenseFirstDate', 'maxNbPlacesAvailable', 'energy'
    ];

    for (const field of requiredFields) {
        if (!vehicleData[field]) {
            return false;
        }
    }

    return DateUtils.isValidDate(vehicleData.licenseFirstDate);
}

// ======================
// Gestion des énergies
// ======================

function loadEnergyOptions() {
    return [
        { id: "Électrique", libelle: "Électrique" },
        { id: "Hybride", libelle: "Hybride" },
        { id: "Carburant inflammable", libelle: "Carburant inflammable" }
    ];
}

function generateEnergySelect(energyId = "") {
    const energies = loadEnergyOptions();
    let selectContent = '<option value="" disabled selected>Choisir une énergie</option>';
    energies.forEach(energy => {
        const isSelected = energy.id === energyId ? 'selected' : '';
        selectContent += `<option value="${energy.id}" ${isSelected}>${energy.libelle}</option>`;
    });
    return selectContent;
}

// ======================
// Fonctions principales
// ======================

function displayUserVehicles(vehicles) {
    const vehicleList = document.getElementById('vehicleList');
    if (!vehicleList) return;

    vehicleList.innerHTML = '';

    if (!vehicles || vehicles.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `<td colspan="7" class="text-center">Aucun véhicule enregistré.</td>`;
        vehicleList.appendChild(emptyRow);
        return;
    }

    vehicles.forEach(vehicle => {
        const vehicleRow = document.createElement("tr");
        vehicleRow.className = "vehicle";

        vehicleRow.innerHTML = `
            <td>${vehicle.brand} ${vehicle.model}</td>
            <td class="d-none d-md-table-cell">${vehicle.color}</td>
            <td>${vehicle.licensePlate}</td>
            <td class="d-none d-md-table-cell">${new Date(vehicle.licenseFirstDate).toLocaleDateString('fr-FR')}</td>
            <td class="d-none d-md-table-cell">${vehicle.maxNbPlacesAvailable}</td>
            <td class="d-none d-md-table-cell">${vehicle.energy}</td>
            <td class="d-none d-md-table-cell">
                <button type="button" class="btn btn-primary btn-sm" onclick="editVehicle(${vehicle.id})">
                    <i class="bi bi-pencil"></i> Modifier
                </button>
            </td>
        `;
        vehicleRow.addEventListener("click", () => openVehicleModal(vehicle));
        vehicleList.appendChild(vehicleRow);
    });
}

async function addVehicle() {
    const vehicleForm = document.getElementById("vehicleForm");
    if (!vehicleForm) return;

    try {
        const vehicleData = {
            brand: document.getElementById("modalVehicleBrand").value,
            model: document.getElementById("modalVehicleModel").value,
            color: document.getElementById("modalVehicleColor").value,
            licensePlate: document.getElementById("modalVehicleLicensePlate").value,
            licenseFirstDate: document.getElementById("modalVehicleLicenseFirstDate").value,
            maxNbPlacesAvailable: parseInt(document.getElementById("modalVehicleNbPlace").value, 10),
            energy: document.getElementById("modalVehicleEnergy").value
        };

        if (!validateVehicleData(vehicleData)) {
            alert("Veuillez remplir tous les champs obligatoires avec des données valides.");
            return;
        }

        await sendFetchRequest(apiUrl + "vehicle/add", getToken(), 'POST', JSON.stringify(vehicleData));

        vehicleForm.reset();
        hideElement("vehiclesFormContainer");
        displayMessage("vehicleConfirmationMessage");
        refreshVehiclesTab();
        //Puis fermeture de la modale
        const modalElement = document.getElementById("vehicleModal");
        const vehicleModal = bootstrap.Modal.getInstance(modalElement);
        if (vehicleModal) vehicleModal.hide();
    } catch (error) {
        console.error("Erreur lors de l'ajout du véhicule", error);
        displayMessage("vehicleErrorMessage", "Erreur lors de l'ajout du véhicule.");
    }
}

async function editVehicle(vehicleId) {
    try {
        const vehicleData = {
            brand: document.getElementById("modalVehicleBrand").value,
            model: document.getElementById("modalVehicleModel").value,
            color: document.getElementById("modalVehicleColor").value,
            licensePlate: document.getElementById("modalVehicleLicensePlate").value,
            licenseFirstDate: document.getElementById("modalVehicleLicenseFirstDate").value,
            maxNbPlacesAvailable: parseInt(document.getElementById("modalVehicleNbPlace").value, 10),
            energy: document.getElementById("modalVehicleEnergy").value
        };

        if (!validateVehicleData(vehicleData)) {
            alert("Veuillez remplir tous les champs obligatoires avec des données valides.");
            return;
        }

        const url = `${apiUrl}vehicle/${vehicleId}`;
        const apiToken = getToken();
        await sendFetchRequest(url, apiToken, 'PUT', JSON.stringify(vehicleData));

        displayMessage("vehicleUpdateMessage");
        refreshVehiclesTab();
        const vehicleModal = bootstrap.Modal.getInstance(document.getElementById("vehicleModal"));
        if (vehicleModal) vehicleModal.hide();
    } catch (error) {
        console.error("Erreur lors de la modification du véhicule", error);
        displayMessage("vehicleUpdateErrorMessage", "Erreur lors de la mise à jour du véhicule.");
    }
}

async function deleteVehicle(vehicleId) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?")) {
        return;
    }

    try {
        const url = `${apiUrl}vehicle/${vehicleId}`;
        const apiToken = getToken();
        await sendFetchRequest(url, apiToken, 'DELETE');

        displayMessage("vehicleDeleteMessage", "Véhicule supprimé avec succès !");
        refreshVehiclesTab();

        const vehicleModal = bootstrap.Modal.getInstance(document.getElementById("vehicleModal"));
        if (vehicleModal) vehicleModal.hide();
    } catch (error) {
        console.error("Erreur lors de la suppression du véhicule", error);
        displayMessage("vehicleDeleteErrorMessage", "Erreur lors de la suppression du véhicule.");
    }
}

async function refreshVehiclesTab() {
    try {
        const url = `${apiUrl}vehicle/list`;
        const apiToken = getToken();
        const rawResponse = await sendFetchRequest(url, apiToken, 'GET');
        const vehicles = await rawResponse.json();

        if (vehicles) {
            displayUserVehicles(vehicles);
            scrollToTop();
        }
    } catch (error) {
        console.error("Erreur lors du rafraîchissement des véhicules", error);
        displayMessage("vehicleErrorMessage", "Erreur lors du rafraîchissement de la liste des véhicules.");
    }
}


function openVehicleModal(vehicle = null, add = false) {
    // Remplir la liste déroulante des énergies
    const energySelect = document.getElementById("modalVehicleEnergy");

    if (add === false) {
        // Cacher les boutons de modification/suppression si on n'est pas en mode ajout
        document.getElementById("saveVehicleBtn").style.display = "inline-block";
        document.getElementById("deleteVehicleBtn").style.display = "inline-block";
        document.getElementById("addVehicleBtn").style.display = "none";
        document.getElementById("cancelVehicleBtn").style.display = "none";

        // Remplir les champs de la modale
        document.getElementById("modalVehicleBrand").value = vehicle.brand;
        document.getElementById("modalVehicleModel").value = vehicle.model;
        document.getElementById("modalVehicleColor").value = vehicle.color;
        document.getElementById("modalVehicleLicensePlate").value = vehicle.licensePlate;

		//const date = new Date(vehicle.licenseFirstDate).toLocaleDateString('fr-FR');
        const date = new Date(vehicle.licenseFirstDate);
        const formattedDate = DateUtils.formatDateForInput(date);

        document.getElementById("modalVehicleLicenseFirstDate").value = formattedDate;
        document.getElementById("modalVehicleNbPlace").value = vehicle.maxNbPlacesAvailable;

        //Ajout de la liste déroulante des énergies avec préselection de l'énergie du véhicule
        energySelect.innerHTML = generateEnergySelect(vehicle.energy);

        // Configurer les boutons de la modale
        document.getElementById("saveVehicleBtn").onclick = () => editVehicle(vehicle.id);
        document.getElementById("deleteVehicleBtn").onclick = () => deleteVehicle(vehicle.id);


    } else {
        // Afficher les boutons de Ajouter/annuler si on est en mode ajout
        document.getElementById("saveVehicleBtn").style.display = "none";
        document.getElementById("deleteVehicleBtn").style.display = "none";
        document.getElementById("addVehicleBtn").style.display = "inline-block";
        document.getElementById("cancelVehicleBtn").style.display = "inline-block";

        // Réinitialiser les champs à l'ouverture en mode ajout
        document.getElementById("modalVehicleBrand").value = "";
        document.getElementById("modalVehicleModel").value = "";
        document.getElementById("modalVehicleColor").value = "";
        document.getElementById("modalVehicleLicensePlate").value = "";
        document.getElementById("modalVehicleLicenseFirstDate").value = "";
        document.getElementById("modalVehicleNbPlace").value = "";

        //Ajout de la liste déroulante des énergies
        energySelect.innerHTML = generateEnergySelect();

        // Configurer les boutons de la modale
        document.getElementById("addVehicleBtn").onclick = () => addVehicle();
        document.getElementById("cancelVehicleBtn").onclick = () => {
            if (!confirm("Êtes-vous sûr de vouloir annuler ?")) {
                return;
            }
            const modalElement = document.getElementById("vehicleModal");
            const vehicleModal = bootstrap.Modal.getInstance(modalElement);
            if (vehicleModal) vehicleModal.hide();
        };
    }

    // Afficher la modale
    const modalElement = document.getElementById("vehicleModal");
    let vehicleModal = bootstrap.Modal.getInstance(modalElement);
    if (!vehicleModal) {
        vehicleModal = new bootstrap.Modal(modalElement);
    }
    vehicleModal.show();
}

// ======================
// Initialisation
// ======================


document.getElementById("showVehicleFormBtn").addEventListener("click", function (event) {
    // Empêcher le comportement par défaut du bouton
    event.preventDefault();

    openVehicleModal(null, true);

});


// ======================
// Export des fonctions nécessaires
// ======================

export {
    displayUserVehicles,
    deleteVehicle,
    addVehicle,
    editVehicle,
    refreshVehiclesTab,
    openVehicleModal
};
