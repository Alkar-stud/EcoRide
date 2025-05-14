# EcoRide
Ce site est la partie Front de la startup EcoRide

# Installation en local
Build docker
`sudo docker build -t ecoride_front .`
Run docker
`sudo docker run -d -p 3000:3000 --name ecoride_front_container ecoride_front`

Le dossier local étant monté dans le conteneur, le développement se fait sans avoir à reconstruire l'image