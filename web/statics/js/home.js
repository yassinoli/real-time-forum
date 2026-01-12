import { creatPost } from "./createPost.js"
let main = document.querySelector('main')
let tryt = document.querySelector('.try_ws')
displaCategories()

function displayPost(name, date, title, content, categories) {
    let container = document.createElement('div')
    container.className = 'postContainer'
    let main = document.querySelector('main')
    main.appendChild(container)

    let info = document.createElement('div')
    info.className = 'postInfo'
    info.innerHTML = `<h4>${name}</h4><p>${date}</p>
    <p>${title}</p>`
    container.appendChild(info)

    let body = document.createElement('div')
    body.className = 'postBody'
    body.innerHTML = `
        <p>${content}</p>
        <p>Category: ${categories}</p>
    `
    container.appendChild(body)
}
displayPost('ytest' , '2010-02-02' , 'titest' , ' content test' , 'cat test')
displayPost('ytest' , '2010-02-02' , 'titest' , ' content test' , 'cat test')
displayPost('ytest' , '2010-02-02' , 'titest' , ' content test' , 'cat test')
displayPost('ytest' , '2010-02-02' , 'titest' , ' content test' , 'cat test')


let postCreat = document.querySelector('.createPost')
postCreat.addEventListener('click' , ()=>{
    main.style.visibility = 'hidden'
     tryt.style.visibility = 'hidden'
    creatPost()
})


let closecreatPost = document.querySelector('.closePosrCreat') 

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('closePosrCreat')) {
        e.target.closest('.creatPostDiv').remove()
        main.style.visibility = 'visible'
     tryt.style.visibility = 'visible'
    }
})

function displaCategories(){
    let divCat = document.querySelector('.categorienews')
    let categori = document.createElement('div')
    categori.className = 'categories'
    categori.innerHTML = `<select class="categorit">
             <option class="catLi"><button>All Categories</button></option>
            <option class="catLi"><button>Music</button></option>
              <option class="catLi"><button>Cinema</button></option>  
                <option class="catLi"><button>Art</button>
            </option></main></select>`
    divCat.appendChild(categori)
}































/*------------web socket---------------------*/
const socket = new WebSocket("ws://localhost:8080/ws");

    socket.onopen = () => {
        console.log("Connected to WebSocket");
    };

    socket.onmessage = (event) => {
        const log = document.getElementById("log");
        log.innerHTML += `<p>Server: ${event.data} </p>`;
    };

    socket.onclose = () => {
        console.log("Connection closed");
    };

    document.getElementById("send").addEventListener("click", () => {
        const msg = document.getElementById("msg").value;
        socket.send(msg);
    });
