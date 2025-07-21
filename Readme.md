# EcoRide
Ce site est la partie Front de la startup EcoRide pour le projet ECF de Studi

# Installation en local
1. Modifier l'URL de l'API dans le fichier /js/config.js
2. Construire le docker `sudo docker build -t ecoride_front .`
3. Lancer le docker `sudo docker run -d -p 3000:3000 --name ecoride_front_container ecoride_front`

Une fois l'installation terminée, le front est disponible ici https://localhost:3000.