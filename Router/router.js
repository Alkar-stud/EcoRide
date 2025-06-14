import Route from "./Route.js";
import { allRoutes, websiteName } from "./allRoutes.js";
import { showAndHideElementsForRoles, isConnected, getRole } from "../js/script.js";

// Création d'une route pour la page 404 (page introuvable)
const route404 = new Route("404", "Page introuvable", "/pages/404.html", []);

// Fonction pour récupérer la route correspondant à une URL donnée
const getRouteByUrl = (url) => {
  let currentRoute = null;
  // Parcours de toutes les routes pour trouver la correspondance
  allRoutes.forEach((element) => {
    if (element.url == url) {
      currentRoute = element;
    }
  });
  // Si aucune correspondance n'est trouvée, on retourne la route 404
  if (currentRoute != null) {
    return currentRoute;
  } else {
    return route404;
  }
};

// Fonction pour charger le contenu de la page
// Gérér la logique d'accès aux pages
function handleAccessControl(allRolesArray) {
  if (allRolesArray.length > 0) {
    if (allRolesArray.includes("disconnected")) {
      if (isConnected()) {
        window.location.replace("/");
        return false;
      }
    } else {
      const roleUser = getRole();
      if (!allRolesArray.includes(roleUser)) {
        window.location.replace("/");
        return false;
      }
    }
  }
  return true;
}

// Fonction pour activer le lien du menu correspondant à la page actuelle
function activateMenuLink(path) {
  let myLinkPath = path;
  if (myLinkPath === "/") {
    myLinkPath = "accueil";
  } else {
    myLinkPath = myLinkPath.substring(1);
  }
  const myLink = document.getElementById("link-" + myLinkPath);
  if (myLink) {
    myLink.classList.add("link-menu-active");
  }
}

const LoadContentPage = async () => {
  const path = window.location.pathname;
  // Récupération de l'URL actuelle
  const actualRoute = getRouteByUrl(path);
  // Vérifier les droits d'accès à la page
  const allRolesArray = actualRoute.authorize;

  if (!handleAccessControl(allRolesArray)) {
    return;
  }

  // Récupération du contenu HTML de la route
  const html = await fetch(actualRoute.pathHtml).then((data) => data.text());
  // Ajout du contenu HTML à l'élément avec l'ID "main-page"
  document.getElementById("main-page").innerHTML = html;

  // Ajout du contenu JavaScript
  if (actualRoute.pathJS !== "") {
    // Supprimer les anciens scripts pour éviter les doublons
    const existingScript = document.querySelector(`script[src="${actualRoute.pathJS}"]`);
    if (existingScript) {
      existingScript.remove();
    }

    // Création d'une balise script avec type="module"
    const scriptTag = document.createElement("script");
    scriptTag.setAttribute("type", "module");
    scriptTag.setAttribute("src", actualRoute.pathJS);

    // Ajout de la balise script au corps du document
    document.querySelector("body").appendChild(scriptTag);
  }

  // Changement du titre de la page
  document.title = actualRoute.title + " - " + websiteName;
  // Changement du title h1
  const titleH1 = document.getElementById("title-h1");
  if (actualRoute.title !== "Accueil") {
    titleH1.innerHTML = actualRoute.title;
  }

  // Afficher et masquer les éléments en fonction du rôle
  showAndHideElementsForRoles();

  // Ajout de la class sur le lien du menu qui est actif
  activateMenuLink(path);
};

// Fonction pour gérer les événements de routage (clic sur les liens)
const routeEvent = (event) => {
  event = event || window.event;
  event.preventDefault();
  // Mise à jour de l'URL dans l'historique du navigateur
  window.history.pushState({}, "", event.target.href);
  // Chargement du contenu de la nouvelle page
  LoadContentPage();
};

// Gestion de l'événement de retour en arrière dans l'historique du navigateur
window.onpopstate = LoadContentPage;
// Assignation de la fonction routeEvent à la propriété route de la fenêtre
window.route = routeEvent;
// Chargement du contenu de la page au chargement initial
LoadContentPage();