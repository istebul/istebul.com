export class ErrorBoundary {
    constructor() {
        this.initialized = false;
    }

    init() {
        if (this.initialized || typeof window === 'undefined') return;
        this.initialized = true;
    }

    render(container, error, retryHandler) {
        if (!container) return;

        container.innerHTML = `
            <div class="error-boundary" role="alert">
                <div class="error-boundary-content">
                    <h3>Bir şeyler ters gitti</h3>
                    <p>Bu bölüm yüklenirken beklenmeyen bir hata oluştu.</p>
                    <button type="button" class="btn btn-primary" data-error-retry>Tekrar dene</button>
                </div>
            </div>
        `;

        const retryButton = container.querySelector('[data-error-retry]');
        if (retryButton && typeof retryHandler === 'function') {
            retryButton.addEventListener('click', retryHandler);
        }

        if (error) {
            console.error('Error boundary rendered:', error);
        }
    }
}

export const errorBoundary = new ErrorBoundary();
export default errorBoundary;
