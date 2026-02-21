import { HandleRouting } from "../../router.js"
import { handleChatFront } from "../../services/websocket.js"
import { checkAuth } from "../../utils/utils.js"
import { handleLogoutFront } from "../auth/logout.js"
import { creatPost } from "./postCreate.js"

let main = null
let tryt = null
let isLoading = false
let currentOffset = 0
let postsPerPage = 20
let allPosts = []
let currentCategory = ''
let observer = null
let sentinel = null

function throttle(fn, delay) {
    let lastCall = 0
    return function (...args) {
        const now = Date.now()
        if (now - lastCall >= delay) {
            lastCall = now
            fn.apply(this, args)
        }
    }
}


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
                <textarea id="chat-textarea" rows="1" placeholder="Type something…" maxlength="2000"></textarea>
                <button id="send-btn">📨</button>
            </div>
            
        </div>
    `}

const createHeader = (auth) => {
    return `
        <header class="forum-header">
            <h1 class="forum-title">
                <a href="/posts" class="link">Forum</a>
            </h1>
            <div class="forum-header-actions">
                <button id="create-post-btn" class="create-post-btn">Create Post</button>
                <div class="user-profile-container">
                    <div class="user-profile-avatar" id="user-profile-avatar">
                        <img src="./statics/assets/user.png" alt="User">
                        <div class="online-marker"></div>
                    </div>
                    <div class="user-profile-menu" id="user-profile-menu">
                        <div class="user-profile-name">${escapeHtml(auth.nickname)}</div>
                        <button id="logout-btn-nav" class="logout-menu-btn">Logout</button>
                    </div>
                </div>
            </div>
        </header>
    `
}

export const initPost = async () => {
    const user = await checkAuth()

    if (!user.loggedIn) {
        window.history.pushState({}, "", "/login")
        HandleRouting()
    } else {
        document.getElementById('nav-bar').innerHTML = createHeader(user)
        document.getElementById('main-container').innerHTML = postsTemplate()

        initializePage()
        handleChatFront()

        // Setup logout button
        const logoutBtn = document.getElementById('logout-btn-nav')
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await handleLogoutFront()
                window.history.pushState({}, "", "/")
                HandleRouting()
            })
        }
    }
}

// Initialize page when DOM is ready
export function initializePage() {
    main = document.querySelector('main')
    tryt = document.querySelector('.try_ws')

    if (!main) {
        console.error('Main element not found!')
        return
    }

    displaCategories()
    loadPosts()
    setupInfiniteScroll()
}

// Setup infinite scroll listener
function setupInfiniteScroll() {
    if (!main) return

    // Supprimer ancien observer si existe
    if (observer) observer.disconnect()

    // Supprimer ancien sentinel s'il existe dans le DOM
    const existingSentinel = document.getElementById('scroll-sentinel')
    if (existingSentinel) existingSentinel.remove()

    // Créer le sentinel
    sentinel = document.createElement('div')
    sentinel.id = 'scroll-sentinel'
    sentinel.style.height = '1px'
    main.appendChild(sentinel)

    // Créer observer
    observer = new IntersectionObserver(
        throttle((entries) => {
            const entry = entries[0]

            if (entry.isIntersecting && !isLoading) {
                loadMorePosts()
            }
        }, 500), // throttle 500ms
        {
            root: null, // viewport
            rootMargin: '200px', // précharge avant bas
            threshold: 0
        }
    )

    observer.observe(sentinel)
}


// Load more posts (pagination)
async function loadMorePosts() {
    if (isLoading) return
    isLoading = true

    try {
        const response = await fetch(`/api/posts?offset=${currentOffset}&limit=${postsPerPage}`, {
            credentials: 'include'
        })

        if (!response.ok) {
            throw new Error(`Failed to load posts: ${response.status}`)
        }

        const posts = await response.json()

        if (!posts || posts.length === 0) {
            isLoading = false
            return
        }

        // Filter by category if needed
        let filteredPosts = posts
        if (currentCategory) {
            filteredPosts = posts.filter(post =>
                post.categories && post.categories.includes(currentCategory)
            )
        }

        // Append new posts to existing list (skip duplicates)
        filteredPosts.forEach(post => {
            if (allPosts.some(p => p.postId === post.postId)) return
            if (document.getElementById(`post-${post.postId}`)) return
            displayPost(post)
            allPosts.push(post)
        })

        currentOffset += postsPerPage
    } catch (error) {
        console.error('Error loading more posts:', error)
    } finally {
        isLoading = false
    }
    // sentinel est géré par setupInfiniteScroll; pas besoin de le ré-appender ici

}

// Display posts in the feed
function displayPosts(posts) {
    const main = document.querySelector('main')
    if (!main) {
        console.error('Main element not found in displayPosts')
        return
    }

    main.innerHTML = '' // Clear existing posts
    allPosts = [] // Reset all posts
    currentOffset = 0 // Reset offset

    if (!posts || posts.length === 0) {
        main.innerHTML = '<p>No posts yet. Be the first to create one!</p>'
        if (observer) observer.disconnect()
        if (sentinel) sentinel = null
        return
    }

    posts.forEach(post => {
        displayPost(post)
        allPosts.push(post)
    })

    // Update offset for next load
    currentOffset = posts.length
    setupInfiniteScroll()

}

// Display a single post
function displayPost(post) {
    // Eviter d'ajouter un post déjà présent dans le DOM
    if (document.getElementById(`post-${post.postId}`)) return

    let container = document.createElement('div')
    container.className = 'postContainer'
    container.id = `post-${post.postId}`

    let info = document.createElement('div')
    info.className = 'postInfo'
    info.innerHTML = `
        <h4>${escapeHtml(post.username)}</h4>
        <p>${escapeHtml(post.createdAt)}</p>
    `
    container.appendChild(info)

    let title = document.createElement('h3')
    title.className = 'postTitle'
    title.textContent = post.title
    container.appendChild(title)

    let body = document.createElement('div')
    body.className = 'postBody'
    body.innerHTML = `<p>${escapeHtml(post.content)}</p>`
    container.appendChild(body)

    // Categories
    if (post.categories && post.categories.length > 0) {
        let categoriesDiv = document.createElement('div')
        categoriesDiv.className = 'postCategories'
        categoriesDiv.innerHTML = `<strong>Categories:</strong> ${post.categories.map(c => escapeHtml(c)).join(', ')}`
        container.appendChild(categoriesDiv)
    }

    // Comments section
    let commentsSection = document.createElement('div')
    commentsSection.className = 'commentsSection'

    let commentsHeader = document.createElement('div')
    commentsHeader.className = 'commentsHeader'
    commentsHeader.innerHTML = `
        <button class="toggleComments" data-post-id="${post.postId}">
            ${post.commentCount || 0} Comments
        </button>
    `
    commentsSection.appendChild(commentsHeader)

    let commentsContainer = document.createElement('div')
    commentsContainer.className = 'commentsContainer'
    commentsContainer.id = `comments-${post.postId}`
    commentsContainer.style.display = 'none'
    commentsSection.appendChild(commentsContainer)

    // Comment form
    let commentForm = document.createElement('form')
    commentForm.className = 'commentForm'
    commentForm.innerHTML = `
        <textarea name="content" placeholder="Write a comment..." required maxlength="200"></textarea>
        <button type="submit">Add Comment</button>
    `
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        // Pass the form itself
        await addComment(post.postId, commentForm)
    })

    commentsContainer.appendChild(commentForm)

    container.appendChild(commentsSection)
    main.appendChild(container)

    // Toggle comments on click
    commentsHeader.querySelector('.toggleComments').addEventListener('click', async () => {
        const commentsContainer = document.getElementById(`comments-${post.postId}`)
        if (commentsContainer.style.display === 'none') {
            await loadComments(post.postId)
            commentsContainer.style.display = 'block'
        } else {
            commentsContainer.style.display = 'none'
        }
    })
}

// Load comments for a post
async function loadComments(postId) {
    try {
        const response = await fetch(`/api/post?id=${postId}`)
        if (!response.ok) {
            throw new Error('Failed to load comments')
        }
        const post = await response.json()
        displayComments(postId, post.comments || [])
    } catch (error) {
        console.error('Error loading comments:', error)
    }
}

// Display comments for a post
function displayComments(postId, comments) {
    const commentsContainer = document.getElementById(`comments-${postId}`)
    const existingComments = commentsContainer.querySelector('.commentsList')

    if (existingComments) {
        existingComments.remove()
    }

    if (comments.length === 0) {
        let exisrNoComment = document.querySelector('.noComments')
        if (!exisrNoComment) {
            const noComments = document.createElement('p')
            noComments.textContent = 'No comments yet. Be the first to comment!'
            noComments.className = 'noComments'
            commentsContainer.insertBefore(noComments, commentsContainer.querySelector('.commentForm'))
            return
        }
    }

    const commentsList = document.createElement('div')
    commentsList.className = 'commentsList'

    comments.forEach(comment => {
        const commentDiv = document.createElement('div')
        commentDiv.className = 'comment'
        commentDiv.innerHTML = `
            <div class="commentHeader">
                <strong>${escapeHtml(comment.username)}</strong>
                <span>${escapeHtml(comment.createdAt)}</span>
            </div>
            <div class="commentContent">${escapeHtml(comment.content)}</div>
        `
        commentsList.appendChild(commentDiv)
    })

    const commentForm = commentsContainer.querySelector('.commentForm')
    commentsContainer.insertBefore(commentsList, commentForm)
}

// Add a comment using JSON
async function addComment(postId, form) {

    const textarea = form.querySelector('textarea[name="content"]')
    if (!textarea) {
        alert('Comment field not found')
        return
    }

    const content = textarea.value.trim()
    if (!content) {
        alert('Please enter a comment')
        return
    }

    const payload = {
        post_id: postId,
        content
    }

    try {
        const response = await fetch('/api/comments/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(error)
        }

        const post = await response.json()
        displayComments(postId, post.comments || [])

        // commentCount
        const toggleBtn = document.querySelector(`.toggleComments[data-post-id="${postId}"]`)
        if (toggleBtn) toggleBtn.textContent = `${post.commentCount || 0} Comments`

        // delete form
        form.reset()
        document.querySelector('.noComments')?.remove()
    } catch (error) {
        console.error('Error adding comment:', error)
        alert('Failed to add comment. Please try again.')
    }
}



// Create post button handler - will be set up in router
export function setupCreatePostButton() {
    const postCreat = document.querySelector('.createPost')
    if (postCreat) {
        postCreat.addEventListener('click', () => {
            const main = document.querySelector('main')
            if (main) main.style.visibility = 'hidden'
            const tryt = document.querySelector('.try_ws')
            if (tryt) tryt.style.visibility = 'hidden'
            creatPost()
        })
    }
}

// Close create post handler
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('closePosrCreat')) {
        e.target.closest('.creatPostDiv').remove()
        main.style.visibility = 'visible'
        if (tryt) tryt.style.visibility = 'visible'
    }
})

// Display categories
function displaCategories() {
    let divCat = document.querySelector('.categorienews')
    if (!divCat) return

    let categori = document.createElement('div')
    categori.className = 'categories'
    categori.innerHTML = `
        <select class="categorit" id="categoryFilter">
            <option value="">All Categories</option>
            <option value="Music">Music</option>
            <option value="Movies">Movies</option>
            <option value="Art">Art</option>
            <option value="Gaming">Gaming</option>
            <option value="Technology">Technology</option>
            <option value="Sports">Sports</option>
        </select>
    `
    divCat.appendChild(categori)

    // Category filter handler
    const categoryFilter = document.getElementById('categoryFilter')
    categoryFilter.addEventListener('change', async (e) => {
        const selectedCategory = e.target.value
        currentCategory = selectedCategory
        await loadPosts(selectedCategory)
    })
}

// Load posts from API with optional category filter
export async function loadPosts(category = '') {
    try {
        currentCategory = category
        const response = await fetch(`/api/posts?offset=0&limit=${postsPerPage}`, {
            credentials: 'include'
        })

        if (!response.ok) {
            if (response.status === 401) {
                // Not authenticated, redirect to home
                window.history.pushState({}, "", "/")
                const { HandleRouting } = await import('./router.js')
                HandleRouting()
                return
            }
            const errorText = await response.text()
            console.error('Failed to load posts:', response.status, errorText)
            throw new Error(`Failed to load posts: ${response.status} ${errorText}`)
        }

        const posts = await response.json()

        // Filter by category if specified
        let filteredPosts = posts
        if (category && filteredPosts) {
            filteredPosts = posts.filter(post =>
                post.categories && post.categories.includes(category)
            )
        }
        if (filteredPosts) {
            displayPosts(filteredPosts)
        }

    } catch (error) {
        console.error('Error loading posts:', error)
        const main = document.querySelector('main')
        if (main) {
            main.innerHTML = `<p>Error loading posts: ${error.message}. Please try again later.</p>`
        }
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

async function headerCheck() {
    try {
        const response = await fetch('/api/header-check')

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const text = await response.text()
        if (!text) {
            throw new Error('Empty response body')
        }

        const data = await JSON.parse(text)
        return data
    } catch (error) {
        console.error('Error during header check:', error)
    }
}


headerCheck().then(data => {

    const creatpst = document.querySelector('.createPost')
    const lgn = document.querySelector('.LoginH')
    const rgst = document.querySelector('.Registerh')
    const lgout = document.querySelector('.LogoutH')


})


const lgtButton = document.querySelector('.LogoutH')
lgtButton?.addEventListener('click', logOut)

async function logOut() {

    try {
        const resp = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include', //  for cookies
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`)
        }


        const data = await resp.json()

        if (data.loggedIn === false) {
            document.querySelector('.contentWrapper')?.remove()
        }
    } catch (err) {
        console.error('Failed to logout:', err)
    }
}
