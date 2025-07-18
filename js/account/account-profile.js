//Module pour gérer les infos de l'utilisateur
import { apiUrl, photoUrl } from '../config.js';
import { getToken, eraseCookie, sendFetchRequest } from '../script.js';
import { handleRoleAndTabs } from './account.js';
import { setGradeStyle } from '../utils/RatingUtils.js';


//Pour les infos perso du user
const pseudoInput = document.getElementById("PseudoInput");
const photo = document.getElementById("photo"); // Affichage de la photo
const photoInput = document.getElementById("PhotoInput"); //form pour changer la photo

//Boutons pour action démo pour créditer ou retirer des crédits
const credits = document.getElementById("credits");
const AddCreditsBtn = document.getElementById("AddCreditsBtn");
AddCreditsBtn.addEventListener("click", function() {
  alert('[Mode démo renvoi vers le formulaire lié à la banque] Crédits ajoutés !');
});
const widrawCreditsBtn = document.getElementById("widrawCreditsBtn");
widrawCreditsBtn.addEventListener("click", function() {
  alert('[Mode démo renvoi vers le formulaire lié à la banque] Crédits retirés !');
});

const grade = document.getElementById("grade");

const notices = document.getElementById("notices");

//Boutons
const submitFormInfoUser = document.getElementById("btnFormInfoUser");
submitFormInfoUser.addEventListener("click", setUserInfo);

const btnDeleteAccount = document.getElementById("btnDelete");
btnDeleteAccount.addEventListener("click", deleteAccount);


// Fonction pour afficher les infos de l'utilisateur, si il est passager, chauffeur ou les deux, son pseudo et la photo s'il y en a une
export async function displayUserInfo(user) {
    
    //Gestion des onglets à afficher
    handleRoleAndTabs(user);

    // Vérification de la présence d'une photo, sinon on met une photo par défaut
    user.photo = user.photo ? photoUrl + user.photo : "/images/default-avatar.png";
    photo.src = user.photo;
    pseudoInput.value = user.pseudo;

    credits.innerHTML = user.credits;


    //La note globale de l'utilisateur
	setGradeStyle(user.grade);
    
    
    // Afficher les avis récents
    displayRecentNotices(user);

    return user;
}


//Pour mettre à jour les données de l'utilisateur
async function setUserInfo() {
    let isDriver = false;
    let isPassenger = false;

    if (document.getElementById("isDriver").checked || document.getElementById("isBoth").checked) {
        isDriver = true;
    }
    if (document.getElementById("isPassenger").checked || document.getElementById("isBoth").checked) {
        isPassenger = true;
    }

    // Envoi de la photo si le champ est rempli
    if (photoInput.files.length > 0) {
        let formData = new FormData();
        formData.append("photo", photoInput.files[0]); // Ajoute le fichier au form-data

        let response = await sendFetchRequest(apiUrl + "account/upload", getToken(), 'POST', formData, true)
        if (response?.success) {
            photo.src = photoUrl + response.fileName; // Met à jour la source de l'image
        } else {
            console.error("Erreur lors de l'envoi de la photo");
        }
    }

    //Envoi des données de l'utilisateur
    let deletePhoto = null;
    if (deletePhotoCheck.checked) {
        deletePhoto = true;
    }

    let rawData = JSON.stringify({
        "pseudo": pseudoInput.value,
        "isDriver": isDriver,
        "isPassenger": isPassenger,
        "deletePhoto": deletePhoto
    });
    
    try {
        await sendFetchRequest(apiUrl + "account/edit", getToken(), 'PUT', rawData);
        // On recharge la page pour afficher les nouvelles infos
        window.location.reload();
    } catch (error) {
        console.error("Erreur lors de l'envoi du fichier'", error);
    }

}


// Fonction pour afficher les 3 avis les plus récents
function displayRecentNotices(user) {
    if (!user.notices?.ridesNotices || Object.keys(user.notices.ridesNotices).length === 0) {
        notices.innerHTML = "<em>Aucun avis pour le moment</em>";
        return;
    }

    // Convertir l'objet en tableau
    const noticesArray = Object.values(user.notices.ridesNotices);
    
    // Trier par date de création (du plus récent au plus ancien)
    noticesArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Prendre les 3 premiers avis
    const recentNotices = noticesArray.slice(0, 3);
    
    // Créer le HTML pour afficher les avis
    let noticesHtml = '<div class="recent-notices">';
    
    recentNotices.forEach((ride, rideIndex) => {
        const rideDate = new Date(ride.startingAt).toLocaleDateString() + ' à ' + 
                         new Date(ride.startingAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        noticesHtml += `
            <div class="ride-item mb-3 p-2 border rounded">
                <div class="ride-info mb-2">
                    <div><strong>Trajet :</strong> ${ride.startingCity} → ${ride.arrivalCity}</div>
                    <div><strong>Date :</strong> ${rideDate}</div>
                </div>`;
        
        // Vérifier si des avis existent pour ce trajet
        if (ride.notices && ride.notices.length > 0) {
            noticesHtml += `<div class="notices-list">`;
            ride.notices.forEach((notice, noticeIndex) => {
                const noticeDate = new Date(notice.createdAt).toLocaleDateString();
                noticesHtml += `
                    <div class="notice-item p-2 mb-2 border-top">
                        <div class="d-flex justify-content-between">
                            <strong>${notice.title}</strong>
                            <div class="d-flex align-items-center">
                                <div id="stars-ride-${rideIndex}-notice-${noticeIndex}" class="me-2"></div>
                                <small>(${notice.grade}/10)</small>
                            </div>
                        </div>
                        <p class="mb-1">${notice.content}</p>
                        <small class="text-muted">Avis posté le ${noticeDate}</small>
                    </div>
                `;
            });
            noticesHtml += `</div>`;
        } else {
            noticesHtml += `<div class="text-muted">Aucun avis pour ce trajet</div>`;
        }
        
        noticesHtml += `</div>`;
    });
    
    noticesHtml += '</div>';
    notices.innerHTML = noticesHtml;
    
    // Maintenant que le HTML est en place, on ajoute les étoiles des avis
    recentNotices.forEach((ride, rideIndex) => {
        if (ride.notices && ride.notices.length > 0) {
            ride.notices.forEach((notice, noticeIndex) => {
                const starsContainer = document.getElementById(`stars-ride-${rideIndex}-notice-${noticeIndex}`);
                if (starsContainer) {
                    setGradeStyle(notice.grade, starsContainer);
                }
            });
        }
    });
}



// Fonction pour supprimer le compte utilisateur
async function deleteAccount() {
    // Afficher une boîte de dialogue de confirmation
    const userConfirmed = confirm("Êtes-vous sûr de vouloir supprimer votre compte ?");

    if (userConfirmed) {
        try {
            await sendFetchRequest(apiUrl + "account", getToken(), 'DELETE');
            //Suppression des cookies
            eraseCookie("accesstoken");
            eraseCookie("role");
            // Rediriger vers la page d'accueil
            window.location.href = "/";
        } catch (error) {
            console.error("Erreur lors de la suppression du compte", error);
        }
    }
}
