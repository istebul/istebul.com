const WORKER_URL = "/warehouse/sw.js";
const WORKER_SCOPE = "/warehouse/";

const actionButton =
  document.getElementById("pwa-eylem");

let deferredInstallPrompt = null;
let waitingWorker = null;
let reloadForUpdate = false;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function hideAction() {
  if (!actionButton) return;

  actionButton.hidden = true;
  actionButton.removeAttribute("data-mode");
}

function showInstallAction() {
  if (
    !actionButton ||
    deferredInstallPrompt === null ||
    isStandalone()
  ) {
    return;
  }

  actionButton.textContent =
    "Uygulamayı yükle";
  actionButton.dataset.mode =
    "install";
  actionButton.hidden = false;
}

function showUpdateAction(worker) {
  if (!actionButton || !worker) {
    return;
  }

  waitingWorker = worker;
  actionButton.textContent =
    "Güncellemeyi uygula";
  actionButton.dataset.mode =
    "update";
  actionButton.hidden = false;
}

async function handleAction() {
  if (!actionButton) return;

  if (
    actionButton.dataset.mode === "update" &&
    waitingWorker
  ) {
    reloadForUpdate = true;
    waitingWorker.postMessage({
      type: "SKIP_WAITING"
    });
    actionButton.disabled = true;
    actionButton.textContent =
      "Güncelleniyor…";
    return;
  }

  if (
    actionButton.dataset.mode !== "install" ||
    deferredInstallPrompt === null
  ) {
    return;
  }

  const promptEvent =
    deferredInstallPrompt;

  deferredInstallPrompt = null;
  actionButton.disabled = true;

  try {
    await promptEvent.prompt();
    await promptEvent.userChoice;
  } finally {
    actionButton.disabled = false;
    hideAction();
  }
}

function watchRegistration(registration) {
  if (
    registration.waiting &&
    navigator.serviceWorker.controller
  ) {
    showUpdateAction(
      registration.waiting
    );
  }

  registration.addEventListener(
    "updatefound",
    () => {
      const worker =
        registration.installing;

      if (!worker) return;

      worker.addEventListener(
        "statechange",
        () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateAction(worker);
          }
        }
      );
    }
  );
}

async function registerWarehousePwa() {
  if (
    !("serviceWorker" in navigator) ||
    !window.isSecureContext
  ) {
    return;
  }

  try {
    const registration =
      await navigator.serviceWorker.register(
        WORKER_URL,
        {
          scope: WORKER_SCOPE
        }
      );

    watchRegistration(registration);

    registration
      .update()
      .catch(() => undefined);
  } catch {
    hideAction();
  }
}

window.addEventListener(
  "beforeinstallprompt",
  (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallAction();
  }
);

window.addEventListener(
  "appinstalled",
  () => {
    deferredInstallPrompt = null;
    hideAction();
  }
);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      if (!reloadForUpdate) return;

      reloadForUpdate = false;
      window.location.reload();
    }
  );
}

actionButton?.addEventListener(
  "click",
  handleAction
);

window.addEventListener(
  "load",
  registerWarehousePwa,
  {
    once: true
  }
);
