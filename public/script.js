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

function creatPost(){
    let container = document.createElement('div')
    container.className = 'creatPostDiv'
    container.innerHTML = `<div>
    <div>title : <input type="text" id="title-input"></div>
    <div>content : <input type="text" id="title-input"></div>
    <div>categories :     <input type="checkbox" id="music" name="Music">    <input type="checkbox" id="movies" name="Movies">     <input type="checkbox" id="art" name="Art"></div>
    <button class="submitPost">submit</button>
    <button class="closePosrCreat">Close</button>
    </div>`
    
    document.body.appendChild(container)
    
}

let postCreat = document.querySelector('.createPost')
postCreat.addEventListener('click' , ()=>{
    creatPost()
})

let closecreatPost = document.querySelector('.closePosrCreat') 

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('closePosrCreat')) {
        e.target.closest('.creatPostDiv').remove()
    }
})


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
