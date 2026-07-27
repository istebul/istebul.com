export function createBusinessOnboardingPage(): HTMLElement {

  const root = document.createElement("section");

  root.innerHTML = `
    <h2>İşletmenizi Oluşturun</h2>

    <p>
      İSTEBUL Business kullanmaya başlamak için ilk işletmenizi oluşturun.
    </p>

    <button id="business-create-button">
      İşletme Oluştur
    </button>
  `;

  return root;
}
