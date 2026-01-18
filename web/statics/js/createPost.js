import { loadPosts } from "./home.js"
export function creatPost() {
    let container = document.createElement('div')
    container.className = 'creatPostDiv'
    container.innerHTML = `
        <div class="createPostContent">
            <h2>Create New Post</h2>
            <form id="createPostForm">
                <div class="formGroup">
                    <label for="title-input">Title:</label>
                    <input type="text" id="title-input" name="title" required maxlength="200" placeholder="Enter post title">
                </div>
                <div class="formGroup">
                    <label for="content-input">Content:</label>
                    <textarea id="content-input" name="content" required maxlength="5000" placeholder="Enter post content"></textarea>
                </div>
                <div class="formGroup">
                    <label>Categories:</label>
                    <div class="categoryCheckboxes">
                        <label><input type="checkbox" name="categories" value="Music"> Music</label>
                        <label><input type="checkbox" name="categories" value="Movies"> Movies</label>
                        <label><input type="checkbox" name="categories" value="Art"> Art</label>
                        <label><input type="checkbox" name="categories" value="Gaming"> Gaming</label>
                        <label><input type="checkbox" name="categories" value="Technology"> Technology</label>
                        <label><input type="checkbox" name="categories" value="Sports"> Sports</label>
                    </div>
                </div>
                <div class="formActions">
                    <button type="submit" class="submitPost">Submit</button>
                    <button type="button" class="closePosrCreat">Close</button>
                </div>
            </form>
        </div>
    `
    
    document.body.appendChild(container)
    
    // Handle form submission
    const form = document.getElementById('createPostForm')
    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        await submitPost(form)
    })
}

async function submitPost(form) {
    // Get form values
    const title = form.querySelector('#title-input').value.trim()
    const content = form.querySelector('#content-input').value.trim()
    
    // Get selected categories
    const categories = []
    form.querySelectorAll('input[name="categories"]:checked').forEach(checkbox => {
        categories.push(checkbox.value)
    })
    
    // Validate
    if (!title) {
        alert('Please enter a title')
        return
    }
    if (!content) {
        alert('Please enter content')
        return
    }
    
    // Create form data
    const formData = new FormData()
    formData.append('title', title)
    formData.append('content', content)
    formData.append('categories', categories.join(','))

    try {
        const response = await fetch('/api/posts/create', {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('Server error:', error)
            alert('Failed to create post: ' + error)
            return
        }

        const post = await response.json()
        console.log('Post created successfully:', post)

        // Close the form
        const createPostDiv = document.querySelector('.creatPostDiv')
        if (createPostDiv) {
            createPostDiv.remove()
        }

        // Show main content again
        const main = document.querySelector('main')
        const tryt = document.querySelector('.try_ws')
        if (main) main.style.visibility = 'visible'
        if (tryt) tryt.style.visibility = 'visible'
         loadPosts()
        // Reload posts instead of full page reload
        // if (typeof loadPosts === 'function') {
            
            console.log('------------');
            
        // } else {
        //     window.location.reload()
        // }
    } catch (error) {
        console.error('Error creating post:', error)
        alert('Failed to create post: ' + error.message)
    }
}

