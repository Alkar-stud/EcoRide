//Fichier JS de la page de connexion

const mailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const btnSignin = document.getElementById("btnSignin");
const signinForm = document.getElementById("signinForm");

btnSignin.addEventListener("click", checkCredentials);

/*
function checkCredentials(){
    //Ici, il faudra appeler l'API pour vérifier les credentials en BDD
    
    if(mailInput.value == "test@mail.com" && passwordInput.value == "123"){
        //Il faudra récupérer le vrai token
        const token = "lkjsdngfljsqdnglkjsdbglkjqskjgkfjgbqslkfdgbskldfgdfgsdgf";
        setToken(token);
        //placer ce token en cookie

        setCookie(RoleCookieName, "client", 7);
        //On cherche si on n'essaie pas d'atteindre une autre page, sinon page accueil
        //On récupère les paramètres de la page courante
        const urlParams = new URLSearchParams(window.location.search);
        //Si le paramètre page existe, on redirige vers cette page
        const redirectPage = urlParams.get("page");
        if (redirectPage) {
            window.location.replace(redirectPage);
        } else {
            window.location.replace("/");
        }
    }
    else{
        mailInput.classList.add("is-invalid");
        passwordInput.classList.add("is-invalid");
    }
}
*/
/*
 * La fonction ci-dessus est quand on simule une connexion avec un utilisateur fictif
 * La fonction ci-desous est quand on appelle l'API
 */

function checkCredentials(){
    let dataForm = new FormData(signinForm);
    
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    let raw = JSON.stringify({
        "email": dataForm.get("email"),
        "password": dataForm.get("mdp")
    });

    let requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };
    fetch(apiUrl+"login", requestOptions)
    .then(response => {
        console.log(response);
        if(response.ok){
            return response.json();
        }
        else{
            mailInput.classList.add("is-invalid");
            passwordInput.classList.add("is-invalid");
        }
    })
    .then(result => {
        const token = result.apiToken;
        setToken(token);
        //placer ce token en cookie

        setCookie(RoleCookieName, result.roles[0], 7);
        //On cherche si on n'essaie pas d'atteindre une autre page, sinon page accueil
        //On récupère les paramètres de la page courante
        const urlParams = new URLSearchParams(window.location.search);
        //Si le paramètre page existe, on redirige vers cette page
        const redirectPage = urlParams.get("page");
        if (redirectPage) {
            window.location.replace(redirectPage);
        } else {
            window.location.replace("/");
        }
    })
    .catch(error => console.log('error : ', error));
}
