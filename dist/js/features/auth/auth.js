import{supabase as m}from"../../core/supabase.js";import{state as n}from"../../core/state.js";import l from"../../core/api.js";import d from"../../core/config.js";import{monitoring as u}from"../../core/monitoring.js";export class AuthManager{constructor(){this.currentUser=null,this.init()}init(){m.auth.onAuthStateChange(async(e,t)=>{if(e==="SIGNED_IN"&&t){this.currentUser=t.user,n.setUser(t.user);try{const o=await l.getProfile(t.user.id);this.currentUser.profile=o,n.set("user.profile",o)}catch(o){console.error("Failed to load profile:",o)}document.dispatchEvent(new CustomEvent("userLoggedIn",{detail:t.user})),this.hideAuthModal()}else e==="SIGNED_OUT"&&(this.currentUser=null,n.setUser(null),document.dispatchEvent(new CustomEvent("userLoggedOut")),this.hideAuthModal())})}showLoginModal(){this.showAuthModal("login")}showRegisterModal(){this.showAuthModal("register")}showAuthModal(e){const t=document.getElementById("auth-modal"),o=t.querySelector(".modal-body");o.innerHTML=e==="login"?this.getLoginForm():this.getRegisterForm(),t.classList.add("show"),n.setModal("auth"),this.setupAuthForm(e)}hideAuthModal(){document.getElementById("auth-modal").classList.remove("show"),n.setModal(null)}getLoginForm(){return`
            <form id="login-form">
                <div class="form-group">
                    <label for="email">E-posta</label>
                    <input type="email" id="email" name="email" autocomplete="email" required>
                </div>
                <div class="form-group">
                    <label for="password">\u015Eifre</label>
                    <input type="password" id="password" name="password" autocomplete="current-password" required>
                </div>
                <button type="submit" class="btn btn-primary full-width">Giri\u015F Yap</button>
            </form>
            <div class="modal-footer">
                <p>\u015Eifrenizi mi unuttunuz? <a href="#" id="forgot-password">S\u0131f\u0131rlay\u0131n</a></p>
                <p>Hesab\u0131n\u0131z yok mu? <a href="#" id="switch-to-register">\xDCye olun</a></p>
            </div>
        `}getRegisterForm(){return`
            <form id="register-form">
                <div class="form-group">
                    <label for="full-name">Ad Soyad</label>
                    <input type="text" id="full-name" name="full-name" autocomplete="name" required>
                </div>
                <div class="form-group">
                    <label for="email">E-posta</label>
                    <input type="email" id="email" name="email" autocomplete="email" required>
                </div>
                <div class="form-group">
                    <label for="password">\u015Eifre</label>
                    <input type="password" id="password" name="password" autocomplete="new-password" required minlength="8">
                </div>
                <div class="form-group">
                    <label for="confirm-password">\u015Eifre Tekrar</label>
                    <input type="password" id="confirm-password" name="confirm-password" autocomplete="new-password" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="terms" name="terms" required>
                        <span>Kullan\u0131m ko\u015Fullar\u0131n\u0131 kabul ediyorum</span>
                    </label>
                </div>
                <button type="submit" class="btn btn-primary full-width">\xDCye Ol</button>
            </form>
            <div class="modal-footer">
                <p>Zaten hesab\u0131n\u0131z var m\u0131? <a href="#" id="switch-to-login">Giri\u015F yap\u0131n</a></p>
            </div>
        `}setupAuthForm(e){const t=document.getElementById(`${e}-form`),o=document.getElementById("auth-modal");o.dataset.authCloseBound||(o.dataset.authCloseBound="true",o.querySelector(".modal-close").addEventListener("click",()=>{this.hideAuthModal()}),o.addEventListener("click",a=>{a.target===o&&this.hideAuthModal()})),t.addEventListener("submit",async a=>{a.preventDefault(),e==="login"?await this.handleLogin(t):await this.handleRegister(t)});const r=document.getElementById("switch-to-register"),s=document.getElementById("switch-to-login"),i=document.getElementById("forgot-password");r&&r.addEventListener("click",a=>{a.preventDefault(),this.showRegisterModal()}),s&&s.addEventListener("click",a=>{a.preventDefault(),this.showLoginModal()}),i&&i.addEventListener("click",a=>{a.preventDefault(),this.showForgotPasswordForm()})}async handleLogin(e){const t=e.querySelector('button[type="submit"]'),o=t.textContent;try{t.disabled=!0,t.textContent="Giri\u015F yap\u0131l\u0131yor...";const r=e.email.value,s=e.password.value;await l.signIn(r,s)}catch(r){console.error("Login failed:",r),this.showAuthError(r.message||d.messages.error.login)}finally{t.disabled=!1,t.textContent=o}}async handleRegister(e){const t=e.querySelector('button[type="submit"]'),o=t.textContent;try{t.disabled=!0,t.textContent="Hesap olu\u015Fturuluyor...";const r=e["full-name"].value,s=e.email.value,i=e.password.value,a=e["confirm-password"].value;if(i!==a)throw new Error("\u015Eifreler e\u015Fle\u015Fmiyor");if(i.length<d.validation.password.minLength)throw new Error(`\u015Eifre en az ${d.validation.password.minLength} karakter olmal\u0131d\u0131r`);await l.signUp(s,i,{full_name:r}),this.showAuthSuccess("Hesab\u0131n\u0131z olu\u015Fturuldu! L\xFCtfen e-posta adresinizi do\u011Frulay\u0131n."),setTimeout(()=>this.showLoginModal(),2e3)}catch(r){console.error("Registration failed:",r),this.showAuthError(r.message||d.messages.error.register)}finally{t.disabled=!1,t.textContent=o}}showForgotPasswordForm(){const t=document.getElementById("auth-modal").querySelector(".modal-body");t.innerHTML=this.getForgotPasswordForm(),this.setupForgotPasswordForm()}getForgotPasswordForm(){return`
            <form id="forgot-password-form">
                <div class="form-group">
                    <label for="reset-email">E-posta</label>
                    <input type="email" id="reset-email" name="email" autocomplete="email" required>
                </div>
                <button type="submit" class="btn btn-primary full-width">S\u0131f\u0131rlama Ba\u011Flant\u0131s\u0131 G\xF6nder</button>
            </form>
            <div class="modal-footer">
                <p>\u015Eifrenizi hat\u0131rlad\u0131n\u0131z m\u0131? <a href="#" id="switch-to-login">Giri\u015F yap\u0131n</a></p>
            </div>
        `}setupForgotPasswordForm(){const e=document.getElementById("forgot-password-form"),t=document.getElementById("switch-to-login");e&&e.addEventListener("submit",o=>this.handleForgotPassword(o)),t&&t.addEventListener("click",o=>{o.preventDefault(),this.showLoginModal()})}async handleForgotPassword(e){e.preventDefault();const t=e.currentTarget,o=t.querySelector('button[type="submit"]'),r=o.textContent,s=t.email.value.trim();if(s)try{o.disabled=!0,o.textContent="G\xF6nderiliyor...",await l.resetPassword(s),this.showAuthSuccess("\u015Eifre s\u0131f\u0131rlama ba\u011Flant\u0131s\u0131 e-posta adresinize g\xF6nderildi.")}catch(i){console.error("Password reset failed:",i),this.showAuthError(i.message||"\u015Eifre s\u0131f\u0131rlama s\u0131ras\u0131nda bir hata olu\u015Ftu.")}finally{o.disabled=!1,o.textContent=r}}async logout(){try{await l.signOut(),u.clearUser()}catch(e){throw console.error("Logout failed:",e),u.captureException(e,{context:"logout"}),e}}showAuthError(e){this.showAuthMessage(e,"error")}showAuthSuccess(e){this.showAuthMessage(e,"success")}showAuthMessage(e,t){const o=document.querySelector("#auth-modal .modal-body"),r=o.querySelector(".auth-message");r&&r.remove();const s=document.createElement("div");s.className=`auth-message ${t}`,s.textContent=e,o.insertBefore(s,o.firstChild),setTimeout(()=>{s.parentNode&&s.remove()},5e3)}isAuthenticated(){return!!this.currentUser}getCurrentUser(){return this.currentUser}requireAuth(){return this.isAuthenticated()?!0:(this.showLoginModal(),!1)}}export default AuthManager;
