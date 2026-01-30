export const homeTemplate = () => {
    return `
        <div class="home-content">
            <h1>Welcome to the Forum</h1>
            <p>Please login or register to access the forum</p>
            <br>
            <nav class="home-nav">
                <a href="/register" class="link" style="padding: 0.75rem 1.5rem; background-color: var(--primary-color); color: white; text-decoration: none; border-radius: var(--radius-sm); font-weight: 600; transition: all 0.2s;">Register</a>
                <a href="/login" class="link" style="padding: 0.75rem 1.5rem; background-color: var(--surface); color: var(--primary-color); text-decoration: none; border: 1px solid var(--primary-color); border-radius: var(--radius-sm); font-weight: 600; transition: all 0.2s;">Login</a>
            </nav>
        </div>
    `
}

export const postsTemplate = () => {
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

export const registerTemplate = () => {
    return `
        <div class="auth-page">
            <div class="auth-card">
                <h1>Register</h1>

                <div class="form-container register">
                    <div class="input-error"></div>

                    <div class="form-row">
                        <label for="firstName">First name:</label>
                        <input type="text" id="firstName" name="first-name" required maxlength="15">
                    </div>

                    <div class="form-row">
                        <label for="lastName">Last name:</label>
                        <input type="text" id="lastName" name="last-name" required maxlength="30">
                    </div>

                    <div class="form-row">
                        <label for="nickName">Nickname:</label>
                        <input type="text" id="nickName" name="nickname" required maxlength="20">
                    </div>

                    <div class="form-row">
                        <label for="age">Age:</label>
                        <input type="number" id="age" name="age" required>
                    </div>

                    <div id="gender-container">
                        <label>Gender:</label>
                        <div class="gender-input">
                            <label>
                                <input type="radio" id="male" name="gender" value="male">
                                Male
                            </label>
                            <label>
                                <input type="radio" id="female" name="gender" value="female">
                                Female
                            </label>
                        </div>
                    </div>

                    <div class="form-row">
                        <label for="email">E-mail:</label>
                        <input type="email" id="email" name="email" required maxlength="50">
                    </div>

                    <div class="form-row">
                        <label for="password">Password:</label>
                        <input type="password" id="password" name="password" required maxlength="20" minlength="6">
                    </div>

                    <button id="register-submit-btn">Sign Up</button>

                    <p>You already have an account?
                        <a href="/login" class="link">Sign in</a>
                    </p>
                </div>
            </div>
        </div>
    `
}
export const loginTemplate = () => {
    return `
        <div class="auth-page">
            <div class="auth-card">
                <h1>Login</h1>

                <form class="form-container login" novalidate>
                    <div class="input-error" role="alert"></div>

                    <div class="form-row">
                        <label for="identifier">Email/Nickname:</label>
                        <input 
                            type="text" 
                            id="identifier" 
                            name="identifier" 
                            required 
                            maxlength="50" 
                            autocomplete="username"
                            placeholder="email or nickname">
                    </div>

                    <div class="form-row">
                        <label for="password">Password:</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            required 
                            minlength="6" 
                            maxlength="20"
                            autocomplete="current-password" 
                            placeholder="password">
                    </div>

                    <button type="submit" id="login-submit-btn">Sign in</button>

                    <p>
                        Don't have an account?
                        <a href="/register" class="link">Sign up</a>
                    </p>
                </form>
            </div>
        </div>
    `
}
