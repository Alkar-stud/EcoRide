//Module pour gérer les véhicules de l'utilisateur

// Affiche la liste des véhicules
function renderVehicles(vehicles) {
    const vehicleList = document.getElementById('vehicleList');
    vehicleList.innerHTML = '';
    vehicles.forEach(vehicle => {
        const vehicleRow = document.createElement("tr");
        vehicleRow.className = "vehicle";
        vehicleRow.innerHTML = `
            <td>${vehicle.brand} ${vehicle.model}</td>
            <td class="d-none d-md-table-cell">${vehicle.color}</td>
            <td>${vehicle.licensePlate}</td>
            <td class="d-none d-md-table-cell">${new Date(vehicle.licenseFirstDate).toLocaleDateString('fr-FR')}</td>
            <td class="d-none d-md-table-cell">${vehicle.nbPlace}</td>
            <td class="d-none d-md-table-cell">${vehicle.energy.libelle}</td>
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

export async function deleteVehicle(vehicleId) {
    const userConfirmed = confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ?");
    if (userConfirmed) {
        try {
            let myHeaders = new Headers();
            myHeaders.append("X-AUTH-TOKEN", getToken());

            let requestOptions = {
                method: 'DELETE',
                headers: myHeaders,
                redirect: 'follow'
            };

            let response = await fetch(apiUrl + `vehicle/${vehicleId}`, requestOptions);

            if (response.ok) {
                showMessage("vehicleDeleteMessage"); // Afficher le message de succès
                refreshVehiclesTab(); // Rafraîchir l'onglet
                // Fermer la modale
                const vehicleModal = bootstrap.Modal.getInstance(document.getElementById("vehicleModal"));
                vehicleModal.hide();
            } else {
                console.error("Erreur lors de la suppression du véhicule");
            }
        } catch (error) {
            console.error("Erreur lors de la suppression du véhicule", error);
        }
    }
}

export async function addVehicle() {
    const vehicleForm = document.getElementById("vehiclesForm");
    try {
        // Récupérer les données du formulaire
        const vehicleData = {
            brand: document.getElementById("vehicleBrand").value,
            model: document.getElementById("vehicleModel").value,
            color: document.getElementById("vehicleColor").value,
            licensePlate: document.getElementById("vehicleLicensePlate").value,
            licenseFirstDate: document.getElementById("licenseFirstDate").value,
            nbPlace: parseInt(document.getElementById("nbPlace").value, 10),
            energy: parseInt(document.getElementById("VehicleEnergy").value, 10)
        };

        // Vérifier si tous les champs obligatoires sont remplis
        if (!vehicleData.brand || !vehicleData.model || !vehicleData.color || !vehicleData.licensePlate || !vehicleData.licenseFirstDate || !vehicleData.nbPlace || !vehicleData.energy) {
            alert("Veuillez remplir tous les champs obligatoires.");
            return;
        }

        // Vérifier si la date est valide
        if (!isValidDate(vehicleData.licenseFirstDate)) {
            alert("Veuillez saisir une date valide pour la première immatriculation.");
            return;
        }

        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());
        myHeaders.append("Content-Type", "application/json");

        let requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: JSON.stringify(vehicleData),
            redirect: 'follow'
        };

        let response = await fetch(apiUrl + "vehicle/add", requestOptions);
        if (response.ok) {
            // Réinitialiser le formulaire
            vehicleForm.reset();
            // Masquer le formulaire
            document.getElementById("vehiclesFormContainer").style.display = "none";
            showMessage("vehicleConfirmationMessage"); // Afficher le message de succès
            refreshVehiclesTab(); // Rafraîchir l'onglet
        } else {
            const errorData = await response.json();
            console.error("Erreur lors de l'ajout du véhicule :", errorData.message);
        }
    } catch (error) {
        console.error("Erreur lors de l'ajout du véhicule", error);
    }
}

export // Fonction pour ouvrir la modale avec les informations du véhicule
function openVehicleModal(vehicle) {
    // Charger les options de la liste déroulante des énergies
    loadEnergyOptions().then(() => {
        // Pré-sélectionner l'énergie du véhicule si elle existe
        const energySelect = document.getElementById("modalVehicleEnergy");
        if (vehicle.energy && vehicle.energy.id) {
            energySelect.value = vehicle.energy.id;
        } else {
            console.warn("Aucune énergie correspondante trouvée pour ce véhicule.");
        }
    });

    // Remplir les autres champs de la modale
    document.getElementById("modalVehicleBrand").value = vehicle.brand;
    document.getElementById("modalVehicleModel").value = vehicle.model;
    document.getElementById("modalVehicleColor").value = vehicle.color;
    document.getElementById("modalVehicleLicensePlate").value = vehicle.licensePlate;
    document.getElementById("modalVehicleLicenseFirstDate").value = vehicle.licenseFirstDate.split('T')[0];
    document.getElementById("modalVehicleNbPlace").value = vehicle.nbPlace;

    // Ajouter les actions pour les boutons Modifier et Supprimer
    document.getElementById("saveVehicleBtn").onclick = () => editVehicle(vehicle.id);
    document.getElementById("deleteVehicleBtn").onclick = () => deleteVehicle(vehicle.id);

    // Afficher la modale
    const vehicleModal = new bootstrap.Modal(document.getElementById("vehicleModal"));
    vehicleModal.show();
}

export async function loadEnergyOptions(source = 'modalVehicleEnergy') {
    try {
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());

        let requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };

        let response = await fetch(apiUrl + "energy/list", requestOptions);

        if (response.ok) {
            let energies = await response.json();
            const energySelect = document.getElementById(source);

            // Vider les options existantes
            energySelect.innerHTML = '<option value="">--- Choisir une énergie ---</option>';

            // Ajouter les options récupérées
            energies.forEach(energy => {
                const option = document.createElement("option");
                option.value = energy.id; // Utilisez l'ID comme valeur
                option.textContent = energy.libelle; // Utilisez le libellé comme texte
                energySelect.appendChild(option);
            });
        } else {
            console.error("Impossible de récupérer la liste des énergies");
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des énergies", error);
    }
}

export async function editVehicle(vehicleId) {
    try {

        // Récupérer la date saisie
        const licenseFirstDate = document.getElementById("modalVehicleLicenseFirstDate").value;

        // Vérifier si la date est valide
        if (!isValidDate(licenseFirstDate)) {
            alert("Veuillez saisir une date valide pour la première immatriculation.");
            return; // Arrêter l'exécution si la date est invalide
        }

        const vehicleData = {
            brand: document.getElementById("modalVehicleBrand").value,
            model: document.getElementById("modalVehicleModel").value,
            color: document.getElementById("modalVehicleColor").value,
            licensePlate: document.getElementById("modalVehicleLicensePlate").value,
            licenseFirstDate: document.getElementById("modalVehicleLicenseFirstDate").value,
            nbPlace: parseInt(document.getElementById("modalVehicleNbPlace").value, 10),
            energy: parseInt(document.getElementById("modalVehicleEnergy").value, 10)
        };

        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());
        myHeaders.append("Content-Type", "application/json");

        let requestOptions = {
            method: 'PUT',
            headers: myHeaders,
            body: JSON.stringify(vehicleData),
            redirect: 'follow'
        };

        let response = await fetch(apiUrl + `vehicle/${vehicleId}`, requestOptions);

        if (response.ok) {
            showMessage("vehicleUpdateMessage"); // Afficher le message de succès
            refreshVehiclesTab(); // Rafraîchir l'onglet
            // Fermer la modale
            const vehicleModal = bootstrap.Modal.getInstance(document.getElementById("vehicleModal"));
            vehicleModal.hide();
        } else {
            console.error("Erreur lors de la modification du véhicule");
        }
    } catch (error) {
        console.error("Erreur lors de la modification du véhicule", error);
    }
}


export async function refreshVehiclesTab() {
    try {
        let myHeaders = new Headers();
        myHeaders.append("X-AUTH-TOKEN", getToken());

        let requestOptions = {
            method: 'GET',
            headers: myHeaders,
            redirect: 'follow'
        };

        let response = await fetch(apiUrl + "vehicle/list", requestOptions);

        if (response.ok) {
            let vehicles = await response.json();
            const vehicleList = document.getElementById('vehicleList');
            vehicleList.innerHTML = ''; // Vider le conteneur avant d'ajouter les véhicules

            // Boucle pour afficher les véhicules
            vehicles.forEach(vehicle => {
                const licenseDate = new Date(vehicle.licenseFirstDate);
                const formattedDate = isNaN(licenseDate) ? "Date invalide" : licenseDate.toLocaleDateString('fr-FR');                const vehicleRow = document.createElement("tr");
                vehicleRow.className = "vehicle";
                vehicleRow.innerHTML = `
                    <td>${vehicle.brand} ${vehicle.model}</td>
                    <td class="d-none d-md-table-cell">${vehicle.color}</td>
                    <td>${vehicle.licensePlate}</td>
                    <td class="d-none d-md-table-cell">${new Date(vehicle.licenseFirstDate).toLocaleDateString('fr-FR')}</td>
                    <td class="d-none d-md-table-cell">${vehicle.nbPlace}</td>
                    <td class="d-none d-md-table-cell">${vehicle.energy.libelle}</td>
                    <td class="d-none d-md-table-cell">
                        <button type="button" class="btn btn-primary btn-sm">
                            <i class="bi bi-pencil"></i> Modifier
                        </button>
                    </td>
                `;

                // Ajouter un événement pour ouvrir la modale au clic sur une ligne
                vehicleRow.addEventListener("click", () => openVehicleModal(vehicle));

                vehicleList.appendChild(vehicleRow);
            });


            // Revenir en haut de la page
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            console.error("Impossible de rafraîchir les véhicules");
        }
    } catch (error) {
        console.error("Erreur lors du rafraîchissement des véhicules", error);
    }
}