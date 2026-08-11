const MAX_BARCODE_LENGTH = 256;
const DUPLICATE_WINDOW_MS = 1800;

const DETECTOR_FORMAT_MAP = Object.freeze({
  ean_13: "ean13",
  ean_8: "ean8",
  upc_a: "upca",
  upc_e: "upce",
  code_128: "code128",
  code_39: "code39",
  qr_code: "qr"
});

const openButton = document.getElementById("barkod-tarayici-ac");
const scanner = document.getElementById("barkod-tarayici");
const closeButton = document.getElementById("barkod-tarayici-kapat");
const cameraStartButton = document.getElementById("barkod-kamera-baslat");
const video = document.getElementById("barkod-video");
const status = document.getElementById("barkod-durum");
const cameraState = document.getElementById("barkod-kamera-durumu");
const manualForm = document.getElementById("barkod-manuel-form");
const manualInput = document.getElementById("barkod-manuel-deger");
const resultBox = document.getElementById("barkod-sonuc");
const resultValue = document.getElementById("barkod-sonuc-deger");
const resultMeta = document.getElementById("barkod-sonuc-meta");

let stream = null;
let detector = null;
let animationFrameId = 0;
let detectionPending = false;
let lastAcceptedScan = null;

function setStatus(message) {
  if (status) status.textContent = message;
}

function setCameraState(message) {
  if (cameraState) cameraState.textContent = message;
}

function normalizeBarcodeValue(value) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return { ok: false, message: "Barkod değeri boş olamaz." };
  }

  if (normalized.length > MAX_BARCODE_LENGTH) {
    return {
      ok: false,
      message: `Barkod değeri ${MAX_BARCODE_LENGTH} karakterden uzun olamaz.`
    };
  }

  return { ok: true, value: normalized };
}

function normalizeDetectedFormat(format, value) {
  if (format === "itf") {
    return /^\d{14}$/.test(value) ? "itf14" : "internal";
  }

  return DETECTOR_FORMAT_MAP[format] ?? "internal";
}

function isDuplicateScan(value, now) {
  if (!lastAcceptedScan) return false;

  return (
    lastAcceptedScan.value === value &&
    now - lastAcceptedScan.acceptedAt < DUPLICATE_WINDOW_MS
  );
}

function stopCamera({ keepStatus = true } = {}) {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }

  detectionPending = false;

  if (stream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  stream = null;
  detector = null;

  if (video) {
    video.pause();
    video.srcObject = null;
  }

  setCameraState("Kamera kapalı");

  if (cameraStartButton) {
    cameraStartButton.disabled = false;
    cameraStartButton.textContent = "Kamerayı Aç";
  }

  if (!keepStatus) {
    setStatus("Kamera durduruldu. Yeni bir tarama başlatabilir veya barkodu elle girebilirsiniz.");
  }
}

function renderResult(result) {
  if (!resultBox || !resultValue || !resultMeta) return;

  resultValue.textContent = result.value;

  const sourceLabel =
    result.source === "camera" ? "Kamera" : "Manuel giriş";
  const formatLabel = result.format
    ? ` · ${result.format}`
    : "";

  resultMeta.textContent = `${sourceLabel}${formatLabel} · ${new Date(
    result.scannedAt
  ).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })}`;

  resultBox.hidden = false;
}

function emitScan(rawValue, source, detectedFormat = null) {
  const normalized = normalizeBarcodeValue(rawValue);

  if (!normalized.ok) {
    setStatus(normalized.message);
    return false;
  }

  const now = Date.now();

  if (isDuplicateScan(normalized.value, now)) {
    setStatus("Aynı barkod kısa süre önce okutuldu. Tekrar denemek için bir an bekleyin.");
    return false;
  }

  const format =
    source === "camera"
      ? normalizeDetectedFormat(detectedFormat, normalized.value)
      : null;

  const result = Object.freeze({
    value: normalized.value,
    format,
    source,
    scannedAt: new Date(now).toISOString()
  });

  lastAcceptedScan = {
    value: normalized.value,
    acceptedAt: now
  };

  renderResult(result);
  stopCamera({ keepStatus: true });
  setStatus("Barkod okundu. Sonuç henüz herhangi bir depo işlemine kaydedilmedi.");

  document.dispatchEvent(
    new CustomEvent("warehouse:barcode-scan", {
      detail: result
    })
  );

  return true;
}

async function createDetector() {
  const Detector = window.BarcodeDetector;

  if (typeof Detector !== "function") {
    return null;
  }

  if (typeof Detector.getSupportedFormats !== "function") {
    return new Detector();
  }

  const supported = await Detector.getSupportedFormats();
  const preferred = [
    "ean_13",
    "ean_8",
    "upc_a",
    "upc_e",
    "code_128",
    "code_39",
    "itf",
    "qr_code"
  ].filter((format) => supported.includes(format));

  return preferred.length > 0
    ? new Detector({ formats: preferred })
    : new Detector();
}

function getCameraErrorMessage(error) {
  switch (error?.name) {
    case "NotAllowedError":
      return "Kamera izni verilmedi. Tarayıcı ayarlarından izin verebilir veya barkodu elle girebilirsiniz.";
    case "NotFoundError":
      return "Kullanılabilir kamera bulunamadı. Barkodu elle girebilirsiniz.";
    case "NotReadableError":
      return "Kamera başka bir uygulama tarafından kullanılıyor veya şu anda açılamıyor.";
    case "SecurityError":
      return "Kamera güvenli bağlantı gerektiriyor. Barkodu elle girebilirsiniz.";
    default:
      return "Kamera başlatılamadı. Barkodu elle girebilir veya kamera iznini kontrol edebilirsiniz.";
  }
}

async function detectFrame() {
  if (!stream || !detector || !video) return;

  if (detectionPending || video.readyState < 2) {
    animationFrameId = requestAnimationFrame(detectFrame);
    return;
  }

  detectionPending = true;

  try {
    const barcodes = await detector.detect(video);
    const first = barcodes?.[0];

    if (first?.rawValue) {
      emitScan(first.rawValue, "camera", first.format ?? null);
    }
  } catch {
    stopCamera({ keepStatus: true });
    setStatus("Kamera görüntüsü okunamadı. Yeniden deneyebilir veya barkodu elle girebilirsiniz.");
  } finally {
    detectionPending = false;

    if (stream) {
      animationFrameId = requestAnimationFrame(detectFrame);
    }
  }
}

async function startCamera() {
  if (!scanner || scanner.hidden || stream) return;

  if (
    typeof window.BarcodeDetector !== "function" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    setCameraState("Kamera ile tarama desteklenmiyor");
    setStatus("Bu tarayıcıda kamera ile barkod okuma kullanılamıyor. Barkodu elle girebilirsiniz.");
    manualInput?.focus();
    return;
  }

  if (cameraStartButton) {
    cameraStartButton.disabled = true;
    cameraStartButton.textContent = "Kamera Açılıyor…";
  }

  setCameraState("Kamera hazırlanıyor");
  setStatus("Kamera izni bekleniyor…");

  try {
    detector = await createDetector();

    if (!detector) {
      throw new Error("barcode_detector_unavailable");
    }

    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" }
      }
    });

    if (!video) {
      throw new Error("video_element_missing");
    }

    video.srcObject = stream;
    await video.play();

    if (cameraStartButton) {
      cameraStartButton.disabled = false;
      cameraStartButton.textContent = "Kamerayı Durdur";
    }

    setCameraState("Kamera açık");
    setStatus("Barkodu çerçevenin ortasında sabit tutun. İlk geçerli okuma sonrası kamera otomatik kapanır.");
    animationFrameId = requestAnimationFrame(detectFrame);
  } catch (error) {
    stopCamera({ keepStatus: true });
    setStatus(getCameraErrorMessage(error));
  }
}

function openScanner() {
  if (!scanner) return;

  scanner.hidden = false;
  openButton?.setAttribute("aria-expanded", "true");
  scanner.scrollIntoView({ behavior: "smooth", block: "start" });
  setStatus("Kamerayı yalnız siz başlattığınızda açarız. Kamera kullanılamıyorsa barkodu elle girebilirsiniz.");
  cameraStartButton?.focus();
}

function closeScanner() {
  if (!scanner) return;

  stopCamera({ keepStatus: true });
  scanner.hidden = true;
  openButton?.setAttribute("aria-expanded", "false");
  openButton?.focus();
}

openButton?.addEventListener("click", () => {
  if (scanner?.hidden) {
    openScanner();
  } else {
    closeScanner();
  }
});

closeButton?.addEventListener("click", closeScanner);

cameraStartButton?.addEventListener("click", () => {
  if (stream) {
    stopCamera({ keepStatus: false });
  } else {
    startCamera();
  }
});

manualForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (emitScan(manualInput?.value, "manual")) {
    if (manualInput) manualInput.value = "";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && scanner && !scanner.hidden) {
    event.preventDefault();
    closeScanner();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && stream) {
    stopCamera({ keepStatus: false });
  }
});

window.addEventListener("pagehide", () => {
  stopCamera({ keepStatus: true });
});
