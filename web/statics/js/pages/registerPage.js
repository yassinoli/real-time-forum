export const generateRegisterPage = () => {
  document.body.innerHTML = `
    <div id="register-container">
      <h2>Register</h2>

      <div class="form-row">
        <label for="first-name">First name:</label>
        <input type="text" id="firstName" name="first-name">
      </div>
      
      <div class="form-row">
        <label for="last-name">Last name:</label>
        <input type="text" id="lastName" name="last-name">
      </div>
      
      <div class="form-row">
        <label for="nickname">Nickname:</label>
        <input type="text" id="nickName" name="nickname">
      </div>
      
      <div class="form-row">
        <label for="age">Age:</label>
        <input type="number" id="age" name="age">
      </div>
      
      <div id="gender-container">
        <label>Gender:</label>
        <label for="male">
          <input type="radio" id="male" name="gender" value="male">
          Male
        </label>
        <label for="female">
          <input type="radio" id="female" name="gender" value="female">
          Female
        </label>
      </div>
      
      <div class="form-row">
        <label for="email">E-mail:</label>
        <input type="email" id="email" name="email">
      </div>
      
      <div class="form-row">
        <label for="password">Password:</label>
        <input type="password" id="password" name="password">
      </div>
      
      <button id="submit-btn" type="submit">Sign up</button>
    </div>
  `
}
