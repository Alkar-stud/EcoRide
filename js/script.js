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

function showAndHideElementsForRoles(){
    const userConnected = isConnected();
    const role = getRole();

    let allElementsToEdit = document.querySelectorAll('[data-show]');
    allElementsToEdit.forEach(element =>{
         switch(element.dataset.show){
            case 'disconnected': 
                if(userConnected){
                    element.classList.add("d-none");
                }
                break;
            case 'connected': 
                if(!userConnected){
                    element.classList.add("d-none");
                }
                break;
            case 'admin': 
                if(!userConnected || role != "admin"){
                    element.classList.add("d-none");
                }
                break;
                case 'employee': 
                if(!userConnected || role != "employee"){
                    element.classList.add("d-none");
                }
                break;
                case 'client': 
                if(!userConnected || role != "ROLE_USER"){
                    element.classList.add("d-none");
                }
                break;
        }
    })
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


function showMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        messageElement.style.display = "block";
        setTimeout(() => {
            messageElement.style.display = "none";
        }, 5000); // Masquer le message après 5 secondes
    }
}

async function getUserInfo() {
    try {
        let response = await sendFetchRequest(apiUrl + "account/me", getToken(), 'GET', null);
        if (response.email) {
            return response;
        } else {
            console.log("Impossible de récupérer les informations de l'utilisateur");
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des informations de l'utilisateur", error);
    }
}

function setGradeStyle(gradeValue) {
    // Sélecteur du conteneur des étoiles
    const starsContainer = document.getElementById("starsContainer");
    if (!starsContainer) return;
    // Nettoie le conteneur
    starsContainer.innerHTML = "";

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
        starsContainer.appendChild(star);
    }
}


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

    return fetch(url, requestOptions)
        .then(response => {
            if (response.status === 401) {
                signout();
            }
            if (response.status === 404) {
                console.error("Resource not found:", apiUrl);
                throw new Error("Ressource non trouvée");
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => console.error('Fetch error:', error));
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
    sendFetchRequest
};