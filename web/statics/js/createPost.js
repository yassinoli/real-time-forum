
export function creatPost(){
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

