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

function sanitizeHtml(text){
    // Créez un élément HTML temporaire de type "div"
    const tempHtml = document.createElement('div');
    
    // Affectez le texte reçu en tant que contenu texte de l'élément "tempHtml"
    tempHtml.textContent = text;
    
    // Utilisez .innerHTML pour récupérer le contenu de "tempHtml"
    // Cela va "neutraliser" ou "échapper" tout code HTML potentiellement malveillant
    return tempHtml.innerHTML;
}



function isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
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

async function getUserInfo() {
    try {
        let response = await sendFetchRequest(apiUrl + "account/me", getToken(), 'GET', null);
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

function setGradeStyle(gradeValue, container = document.getElementById("starsContainer")) {
    // Vérifie si le conteneur existe
    if (!container) return;
    
    // Nettoie le conteneur
    container.innerHTML = "";

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


async function sendFetchRequest(url, apiToken, method = 'GET', body = null, isFile = false, silent404 = false) {
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

        if (response.status === 401) {
            signout();
            throw new Error("Unauthorized");
        }
        if (response.status === 404) {
            if (!silent404) {
                console.error("Resource not found:", url);
            }
            const error = new Error("Ressource non trouvée");
            error.status = 404;
            throw error;
        }
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Gérer les réponses 204 (No Content) qui n'ont pas de body JSON
        if (response.status === 204) {
            return null; // Pas de contenu à parser
        }

        return response.json();

    } catch (error) {
        console.error('Fetch error:', error);
        throw error; // Rejeter la promesse pour que l'appelant puisse gérer l'erreur
    }
}

// Formatage de la date
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
    formatDate
};