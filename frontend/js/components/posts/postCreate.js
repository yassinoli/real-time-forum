 const postsTemplate = () => {
    return `
<div class="user-list-container">
            <h3>Users</h3>
            <div class="user-list-wrapper"></div>
        </div>

        <div class="posts-container">
            <div class="contentWrapper">
                <aside class="sidebar">
                    <div class="categorienews"></div>
                </aside>
                <main></main>
            </div>
        </div>

        <div class="chat-container">
            <div id="messages"></div>

            <div id="chat-input">
                <textarea id="chat-textarea" rows="1" placeholder="Écrire un message…"></textarea>
                <button id="send-btn">📨</button>
            </div>
            
        </div>
    `
}