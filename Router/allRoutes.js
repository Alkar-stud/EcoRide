import Route from "./Route.js";

//Définir ici vos routes
export const allRoutes = [
    new Route("/", "Accueil", "/pages/home.html", [], "/js/home.js"), 
    new Route("/mentionslegales", "Mentions légales", "/pages/mentionslegales.html", []),
    new Route("/contact", "Contactez-nous", "/pages/contact.html", []),
    new Route("/signin", "Connexion", "/pages/auth/signin.html", ["disconnected"], "/js/auth/signin.js"),
    new Route("/signup", "Inscription", "/pages/auth/signup.html", ["disconnected"], "/js/auth/signup.js"),

    
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "EcoRide";