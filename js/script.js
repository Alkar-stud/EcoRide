// File: js/script.js
import { apiUrl } from './config.js';

// This file contains utility functions for handling cookies, user authentication, and UI interactions.
// It includes functions to set, get, and erase cookies, check user connection status, and manage UI elements based on user roles.
const tokenCookieName = "accesstoken";
const RoleCookieName = "role";
const signoutBtn = document.getElementById("signout-btn");

signoutBtn.addEventListener("click", signout);

function getRole(){
    return getCookie(RoleCookieName);
}

function signout(){
    eraseCookie(tokenCookieName);
    eraseCookie(RoleCookieName);
    window.location.reload();
}

function setToken(token){
    setCookie(tokenCookieName, token, 7);
}

function getToken(){
    return getCookie(tokenCookieName);
}

function setCookie(name,value,days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for(const element of ca) {
        let c = element;
        while (c.startsWith(' ')) c = c.substring(1,c.length);
        if (c.startsWith(nameEQ)) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {   
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function isConnected(){
    return !(getToken() == null || getToken == undefined);
}

/*
 * Affiche ou masque les éléments en fonction des rôles de l'utilisateur
 * Les éléments doivent avoir un attribut data-show avec les rôles requis, séparés par des virgules.
 */
function showAndHideElementsForRoles() {
    const allElementsToEdit = document.querySelectorAll('[data-show]');
    const userConnected = isConnected();
    const role = getRole(); // Doit retourner par exemple "ROLE_EMPLOYEE", "ROLE_ADMIN", etc.

    allElementsToEdit.forEach(element => {
        const showAttr = element.dataset.show;
        // Sépare les rôles multiples
        const roles = showAttr.split(',').map(r => r.trim());

        // Cas particuliers
        if (roles.includes('connected')) {
            if (!userConnected) element.classList.add('d-none');
            else element.classList.remove('d-none');
            return;
        }
        if (roles.includes('disconnected')) {
            if (userConnected) element.classList.add('d-none');
            else element.classList.remove('d-none');
            return;
        }
        if (roles.includes('client')) {
            if (role !== "ROLE_USER") element.classList.add('d-none');
            else element.classList.remove('d-none');
            return;
        }

        // Gestion des rôles explicites
        if (roles.some(r => r === role)) {
            element.classList.remove('d-none');
        } else {
            element.classList.add('d-none');
        }
    });
}


/*
 * Fonction pour neutraliser le code HTML potentiellement malveillant
 */
function sanitizeHtml(text){
    // Créez un élément HTML temporaire de type "div"
    const tempHtml = document.createElement('div');
    
    // Affectez le texte reçu en tant que contenu texte de l'élément "tempHtml"
    tempHtml.textContent = text;
    
    // Utilisez .innerHTML pour récupérer le contenu de "tempHtml"
    // Cela va "neutraliser" ou "échapper" tout code HTML potentiellement malveillant
    return tempHtml.innerHTML;
}


/*
 * Vérifie si une chaîne de caractères est une date valide
 */
function isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}


/*
 * Formate une date au format français (jj/mm/aaaa hh:mm)
 */
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/*
 * Formate un objet date pour input type="date" au format aaaa-mm-dd
 */
function formatDateForInput(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Mois commence à 0
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


async function showMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        messageElement.style.display = "block";
        
        // Retourne une promesse qui se résout après la durée d'affichage
        return new Promise(resolve => {
            setTimeout(() => {
                messageElement.style.display = "none";
                resolve(true);
            }, 5000); // Masquer le message après 5 secondes
        });
    }
    return true;
}

/*
 * Fonction pour récupérer les informations de l'utilisateur connecté
 */
async function getUserInfo() {
    try {
        let rawResponse = await sendFetchRequest(apiUrl + "account/me", getToken(), 'GET', null);

        if (!rawResponse.ok) {
            console.error("Erreur lors de la récupération des informations de l'utilisateur : ", rawResponse.status, rawResponse.statusText);
            return null;
        }
        let data = await rawResponse.json();

        let response = data.data;
        if (response.id) {
            //Récupération des avis associés à l'utilisateur
            let responseNotices = await sendFetchRequest(apiUrl + "notices/" + response.id, getToken(), 'GET', null);
            response.notices = responseNotices;
            return response;
        } else {
            console.error("Impossible de récupérer les informations de l'utilisateur");
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des informations de l'utilisateur", error);
    }
}

/*
 * Fonction pour afficher les étoiles en fonction de la note
 * La note doit être un nombre entre 0 et 10.
 */
function setGradeStyle(gradeValue, container = document.getElementById("starsContainer")) {
    // Vérifie si le conteneur existe
    if (!container) return;
    
    // Nettoie le conteneur
    container.innerHTML = "";

    if (!gradeValue || isNaN(gradeValue)) {
        // Si la note n'est pas valide, on affiche 5 étoiles vides
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("i");
            star.classList.add("bi", "bi-star");
            container.appendChild(star);
        }
        return;
    }

    // La note est un nombre entre 0 et 10, on la ramène sur 5
    gradeValue = gradeValue / 2;

    // Détermine la couleur selon la note
    let colorClass = "";
    if (gradeValue >= 3) {
        colorClass = "text-success";
    } else if (gradeValue >= 1.5 && gradeValue < 3) {
        colorClass = "text-warning";
    } else {
        colorClass = "text-danger";
    }

    // Génère les 5 étoiles avec la bonne couleur
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement("i");
        star.classList.add("bi", colorClass);

        if (gradeValue >= i) {
            star.classList.add("bi-star-fill");
        } else if (gradeValue >= i - 0.5) {
            star.classList.add("bi-star-half");
        } else {
            star.classList.add("bi-star");
        }
        container.appendChild(star);
    }
}

/*
 * Fonction pour envoyer une requête fetch avec des options personnalisées
 * @param {string} url - L'URL de la requête
 * @param {string} apiToken - Le token d'authentification (optionnel)
 * @param {string} method - La méthode HTTP (GET, POST, PUT, DELETE)
 * @param {Object} body - Le corps de la requête (optionnel)
 * @param {boolean} isFile - Indique si le corps contient un fichier (pour gérer le multipart/form-data)
  * @returns {Promise<Object>} - La réponse JSON
 */
async function sendFetchRequest(url, apiToken, method = 'GET', body = null, isFile = false) {
    let myHeaders = new Headers();
    if (apiToken) {
        myHeaders.append("X-AUTH-TOKEN", apiToken);
    }

    let requestOptions = {
        method: method,
        headers: myHeaders,
        redirect: 'follow'
    };

    if (body) {
        requestOptions.body = body;
        if (!isFile) {
            myHeaders.append("Content-Type", "application/json");
        } 
        //Si body contient un fichier, on ne met pas de Content-Type
        // car le navigateur va gérer le multipart/form-data automatiquement
        // myHeaders.append("Content-Type", "multipart/form-data");
    }

    try {
        const response = await fetch(url, requestOptions);

        //On gère les erreurs HTTP 5xx ici, sinon c'est l'appelant qui gère les erreurs
        if (response.status >= 500 && response.status < 600) {
            const error = new Error("Erreur serveur, veuillez réessayer plus tard.");
            error.status = response.status;
            throw error;
        }
        // Gérer les erreurs HTTP 401 (Unauthorized)
        // Si l'utilisateur n'est pas authentifié et que la page n'est pas la page de connexion, cela évite le rechargement de la page à cause de signout();
        if (response.status === 401 && window.location.pathname !== "/signin") {
            signout();
            throw new Error("Unauthorized");
        }

        //Sinon, on retourne la réponse brute
        if (!response.ok) {
            // Au lieu de lancer une exception, on ajoute juste un warning en console
            console.warn(`Attention: La requête a retourné une erreur: ${response.status} ${response.statusText}`);
            // On retourne quand même la réponse pour que l'appelant puisse la traiter
            return response;
        }
console.log("Récupération des informations brutes sendFetchRequest : ", response);
        return response;

    } catch (error) {
        console.error('Fetch error:', error);
        throw error; // Rejeter la promesse pour que l'appelant puisse gérer l'erreur
    }
}


export {
    showAndHideElementsForRoles,
    isConnected,
    getRole,
    setToken,
    setCookie,
    RoleCookieName,
    eraseCookie,
    getToken,
    getCookie,
    signout,
    sanitizeHtml,
    isValidDate,
    showMessage,
    getUserInfo,
    setGradeStyle,
    sendFetchRequest,
    formatDateTime,
    formatDateForInput
};
