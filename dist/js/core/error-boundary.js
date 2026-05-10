export class ErrorBoundary{constructor(){this.initialized=!1}init(){this.initialized||typeof window>"u"||(this.initialized=!0)}render(r,e,t){if(!r)return;r.innerHTML=`
            <div class="error-boundary" role="alert">
                <div class="error-boundary-content">
                    <h3>Bir \u015Feyler ters gitti</h3>
                    <p>Bu b\xF6l\xFCm y\xFCklenirken beklenmeyen bir hata olu\u015Ftu.</p>
                    <button type="button" class="btn btn-primary" data-error-retry>Tekrar dene</button>
                </div>
            </div>
        `;const i=r.querySelector("[data-error-retry]");i&&typeof t=="function"&&i.addEventListener("click",t),e&&console.error("Error boundary rendered:",e)}}export const errorBoundary=new ErrorBoundary;export default errorBoundary;
