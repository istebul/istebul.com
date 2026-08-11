const MOBILE_QUERY = "(max-width: 800px)";

const toggle = document.getElementById("warehouse-menu-toggle");
const nav = document.getElementById("warehouse-nav");
const backdrop = document.getElementById("warehouse-nav-backdrop");
const mobileLinks = [
  ...document.querySelectorAll("[data-mobile-nav]")
];

let previousFocus = null;

function isMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function navIsOpen() {
  return document.body.classList.contains("warehouse-nav-open");
}

function setToggleState(open) {
  if (!toggle) return;

  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute(
    "aria-label",
    open ? "Operasyon menüsünü kapat" : "Operasyon menüsünü aç"
  );
}

function setBackdropState(open) {
  if (!backdrop) return;
  backdrop.hidden = !open;
}

function syncNavAccessibility(open = navIsOpen()) {
  if (!nav) return;

  if (isMobile()) {
    nav.setAttribute("aria-hidden", String(!open));
  } else {
    nav.removeAttribute("aria-hidden");
  }
}

function openNav() {
  if (!toggle || !nav || !isMobile() || navIsOpen()) {
    return;
  }

  previousFocus = document.activeElement;
  document.body.classList.add("warehouse-nav-open");
  setToggleState(true);
  setBackdropState(true);
  syncNavAccessibility(true);

  const firstLink = nav.querySelector("a[href^='#']");
  firstLink?.focus();
}

function closeNav({ restoreFocus = true } = {}) {
  if (!navIsOpen()) {
    setToggleState(false);
    setBackdropState(false);
    syncNavAccessibility(false);
    return;
  }

  document.body.classList.remove("warehouse-nav-open");
  setToggleState(false);
  setBackdropState(false);
  syncNavAccessibility(false);

  if (
    restoreFocus &&
    previousFocus instanceof HTMLElement
  ) {
    previousFocus.focus();
  }

  previousFocus = null;
}

function toggleNav() {
  if (navIsOpen()) {
    closeNav();
  } else {
    openNav();
  }
}

function normalizeHash(hash) {
  const value = String(hash || "").replace(/^#/, "");
  return value || "genel";
}

function syncActiveNavigation() {
  const activeId = normalizeHash(window.location.hash);

  nav?.querySelectorAll("a[href^='#']").forEach((link) => {
    const targetId = normalizeHash(link.getAttribute("href"));
    const active = targetId === activeId;

    link.classList.toggle("active", active);

    if (active) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  mobileLinks.forEach((link) => {
    const targetId = link.dataset.mobileNav || "";
    const active = targetId === activeId;

    link.classList.toggle("active", active);

    if (active) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

toggle?.addEventListener("click", toggleNav);

backdrop?.addEventListener("click", () => {
  closeNav();
});

nav?.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='#']");

  if (!link) return;

  if (isMobile()) {
    closeNav({ restoreFocus: false });
  }
});

mobileLinks.forEach((link) => {
  link.addEventListener("click", () => {
    closeNav({ restoreFocus: false });
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navIsOpen()) {
    event.preventDefault();
    closeNav();
  }
});

window.addEventListener("hashchange", syncActiveNavigation);

const mobileMedia = window.matchMedia(MOBILE_QUERY);

mobileMedia.addEventListener?.("change", (event) => {
  if (!event.matches) {
    closeNav({ restoreFocus: false });
  }

  syncNavAccessibility();
});

syncNavAccessibility();
syncActiveNavigation();
