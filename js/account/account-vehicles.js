// Module pour gérer les véhicules de l'utilisateur
import { apiUrl } from '../config.js';
import { getToken, isValidDate, sendFetchRequest } from '../script.js';

// ======================
// Fonctions utilitaires
// ======================

function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = "block";
        return true;
    }
    console.error(`Élément non trouvé: ${elementId}`);
    return false;
}

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

    return isValidDate(vehicleData.licenseFirstDate);
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
    const vehicleForm = document.getElementById("vehiclesForm");
    if (!vehicleForm) return;

    try {
        const vehicleData = {
            brand: document.getElementById("vehicleBrand").value,
            model: document.getElementById("vehicleModel").value,
            color: document.getElementById("vehicleColor").value,
            licensePlate: document.getElementById("vehicleLicensePlate").value,
            licenseFirstDate: document.getElementById("licenseFirstDate").value,
            maxNbPlacesAvailable: parseInt(document.getElementById("nbPlace").value, 10),
            energy: document.getElementById("VehicleEnergy").value
        };

        if (!validateVehicleData(vehicleData)) {
            alert("Veuillez remplir tous les champs obligatoires avec des données valides.");
            return;
        }

        const url = `${apiUrl}vehicle/add`;
        const apiToken = getToken();
        await sendFetchRequest(url, apiToken, 'POST', JSON.stringify(vehicleData));

        vehicleForm.reset();
        hideElement("vehiclesFormContainer");
        displayMessage("vehicleConfirmationMessage");
        refreshVehiclesTab();
    } catch (error) {
        console.error("Erreur lors de l'ajout du véhicule", error);
        displayMessage("vehicleErrorMessage", "Erreur lors de l'ajout du véhicule.");
    }
}

function openVehicleModal(vehicle) {
    // Remplir la liste déroulante des énergies
    const energySelect = document.getElementById("modalVehicleEnergy");
    if (energySelect) {
        energySelect.innerHTML = generateEnergySelect(vehicle.energy);
    }

    // Remplir les champs de la modale
    document.getElementById("modalVehicleBrand").value = vehicle.brand;
    document.getElementById("modalVehicleModel").value = vehicle.model;
    document.getElementById("modalVehicleColor").value = vehicle.color;
    document.getElementById("modalVehicleLicensePlate").value = vehicle.licensePlate;

    const date = new Date(vehicle.licenseFirstDate);
    const formattedDate = date.toISOString().split('T')[0];
    document.getElementById("modalVehicleLicenseFirstDate").value = formattedDate;
    document.getElementById("modalVehicleNbPlace").value = vehicle.maxNbPlacesAvailable;

    // Configurer les boutons de la modale
    document.getElementById("saveVehicleBtn").onclick = () => editVehicle(vehicle.id);
    document.getElementById("deleteVehicleBtn").onclick = () => deleteVehicle(vehicle.id);

    // Afficher la modale
    const vehicleModal = new bootstrap.Modal(document.getElementById("vehicleModal"));
    vehicleModal.show();
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
        const vehicles = await sendFetchRequest(url, apiToken, 'GET');
        if (vehicles) {
            displayUserVehicles(vehicles);
            scrollToTop();
        }
    } catch (error) {
        console.error("Erreur lors du rafraîchissement des véhicules", error);
        displayMessage("vehicleErrorMessage", "Erreur lors du rafraîchissement de la liste des véhicules.");
    }
}

// ======================
// Initialisation
// ======================

const showVehicleFormBtn = document.getElementById("showVehicleFormBtn");
showVehicleFormBtn.addEventListener("click", function (event) {
    // Empêcher le comportement par défaut du bouton
    event.preventDefault();

    // Remplir la liste déroulante des énergies
    const energySelect = document.getElementById("VehicleEnergy");
    if (energySelect) {
        energySelect.innerHTML = generateEnergySelect();
    }

    // Afficher le formulaire pour ajouter un véhicule
    document.getElementById("vehiclesFormContainer").style.display = "block";
});

//Listener pour ajouter un véhicule
document.getElementById("addVehicleBtn").addEventListener("click", function (event) {
    event.preventDefault(); // Empêcher le comportement par défaut du bouton
    addVehicle(); // Appeler la fonction pour ajouter un véhicule
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
