import Route from "./Route.js";

//Définir ici vos routes
export const allRoutes = [
    new Route("/", "Accueil", "/pages/home.html", [], "/js/home.js"), 
    new Route("/mentionslegales", "Mentions légales", "/pages/mentionslegales.html", []),
    new Route("/contact", "Contactez-nous", "/pages/contact.html", []),
    new Route("/signin", "Connexion", "/pages/auth/signin.html", ["disconnected"], "/js/auth/signin.js"),
    new Route("/signup", "Inscription", "/pages/auth/signup.html", ["disconnected"], "/js/auth/signup.js"),
    new Route("/account", "Mon compte", "/pages/account/account.html", ["ROLE_EMPLOYEE", "ROLE_ADMIN", "ROLE_USER"], "/js/account/account.js"),
    new Route("/editPassword", "Changement de mot de passe", "/pages/account/editPassword.html", ["ROLE_USER", "ROLE_EMPLOYEE", "ROLE_ADMIN"], "/js/account/editPassword.js"),
    new Route("/mescovoiturages", "Mes covoiturages", "/pages/covoiturages/mescovoiturages.html", ["ROLE_USER"], "/js/covoiturages/mescovoiturages.js"),
    new Route("/searchcovoiturages", "Recherche de covoiturages", "/pages/covoiturages/searchcovoiturages.html", [], "/js/covoiturages/searchcovoiturages.js"),
    new Route("/ecoride/validation", "Validation des avis", "/pages/ecoride/validation.html", ["ROLE_EMPLOYEE", "ROLE_ADMIN"], "/js/ecoride/validations.js"),
    new Route("/ecoride/admin", "Administration", "/pages/ecoride/admin.html", ["ROLE_ADMIN"], "/js/ecoride/admin.js"),


    
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "EcoRide";