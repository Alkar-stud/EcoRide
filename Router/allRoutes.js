import Route from "./Route.js";

//Définir ici vos routes
export const allRoutes = [
    new Route("/", "Accueil", "/pages/home.html", [], "/js/home.js"), // home.js pour vérifier le formulaire de recherche en page d'accueil
    new Route("/mentionslegales", "Mentions légales", "/pages/mentionslegales.html", []),
    new Route("/contact", "Contactez-nous", "/pages/contact.html", []),
    new Route("/searchcovoiturages", "Liste des covoiturages", "/pages/covoiturages/searchcovoiturages.html", [], "/js/covoiturages/searchcovoiturages.js"),
    new Route("/signin", "Connexion", "/pages/auth/signin.html", ["disconnected"], "/js/auth/signin.js"),
    new Route("/signup", "Inscription", "/pages/auth/signup.html", ["disconnected"], "/js/auth/signup.js"),
    new Route("/account", "Mon compte", "/pages/account/account.html", ["employee", "admin", "ROLE_USER"], "/js/account/account.js"),
    new Route("/editPassword", "Changement de mot de passe", "/pages/account/editPassword.html", ["ROLE_USER", "employee", "admin"], "/js/account/editPassword.js"),
    new Route("/mescovoiturages", "Mes covoiturages", "/pages/covoiturages/mescovoiturages.html", ["ROLE_USER"]),
    
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "EcoRide";
