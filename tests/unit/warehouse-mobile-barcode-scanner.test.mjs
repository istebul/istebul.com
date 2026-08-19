import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("WarehouseIQ barkod tarayıcı yüzeyi kamera ve manuel fallback içerir", async () => {
  const html = await readFile("warehouse/index.html", "utf8");

  assert.match(html, /id="barkod-tarayici-ac"/);
  assert.match(html, /aria-controls="barkod-tarayici"/);
  assert.match(html, /id="barkod-video"/);
  assert.match(html, /playsinline/);
  assert.match(html, /id="barkod-kamera-baslat"/);
  assert.match(html, /id="barkod-manuel-form"/);
  assert.match(html, /Manuel barkod girişi/);
  assert.match(html, /veri tabanına otomatik olarak yazılmaz/);
});

test("Kamera yalnız açık kullanıcı aksiyonuyla başlatılır", async () => {
  const source = await readFile(
    "js/warehouse/barcode-scanner.js",
    "utf8"
  );

  assert.match(source, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(source, /facingMode:\s*\{\s*ideal:\s*"environment"\s*\}/);
  assert.match(source, /cameraStartButton\?\.addEventListener\("click"/);
  assert.match(source, /startCamera\(\)/);
  assert.doesNotMatch(source, /DOMContentLoaded[\s\S]*?startCamera\(/);
});

test("Tarayıcı BarcodeDetector desteğini çalışma anında algılar", async () => {
  const source = await readFile(
    "js/warehouse/barcode-scanner.js",
    "utf8"
  );

  assert.match(source, /window\.BarcodeDetector/);
  assert.match(source, /getSupportedFormats/);

  for (const format of [
    "ean_13",
    "ean_8",
    "upc_a",
    "upc_e",
    "code_128",
    "code_39",
    "itf",
    "qr_code"
  ]) {
    assert.match(source, new RegExp(format));
  }
});

test("Tarayıcı domain barkod tiplerine deterministik format eşlemesi yapar", async () => {
  const source = await readFile(
    "js/warehouse/barcode-scanner.js",
    "utf8"
  );

  for (const type of [
    "ean13",
    "ean8",
    "upca",
    "upce",
    "code128",
    "code39",
    "itf14",
    "qr",
    "internal"
  ]) {
    assert.match(source, new RegExp(type));
  }
});

test("Tekil tarama sözleşmesi tekrar okumayı kısa süreli engeller", async () => {
  const source = await readFile(
    "js/warehouse/barcode-scanner.js",
    "utf8"
  );

  assert.match(source, /DUPLICATE_WINDOW_MS/);
  assert.match(source, /isDuplicateScan/);
  assert.match(source, /Aynı barkod kısa süre önce okutuldu/);
  assert.match(source, /stopCamera\(\{ keepStatus: true \}\)/);
});

test("Başarılı tarama yalnız tarayıcı içi tüketici olayı yayınlar", async () => {
  const source = await readFile(
    "js/warehouse/barcode-scanner.js",
    "utf8"
  );

  assert.match(source, /new CustomEvent\("warehouse:barcode-scan"/);
  assert.match(source, /detail:\s*result/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /XMLHttpRequest/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /\/api\/warehouse/);
});

test("Kamera yaşam döngüsünde medya izleri güvenli biçimde kapatılır", async () => {
  const source = await readFile(
    "js/warehouse/barcode-scanner.js",
    "utf8"
  );

  assert.match(source, /stream\.getTracks\(\)/);
  assert.match(source, /track\.stop\(\)/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /pagehide/);
  assert.match(source, /video\.srcObject = null/);
});

test("Kamera hataları kullanıcıya Türkçe fallback mesajı verir", async () => {
  const source = await readFile(
    "js/warehouse/barcode-scanner.js",
    "utf8"
  );

  assert.match(source, /NotAllowedError/);
  assert.match(source, /Kamera izni verilmedi/);
  assert.match(source, /NotFoundError/);
  assert.match(source, /Kullanılabilir kamera bulunamadı/);
  assert.match(source, /Barkodu elle girebilirsiniz/);
});

test("Barkod tarayıcı mobil dokunma alanı ve dar ekran düzenini korur", async () => {
  const css = await readFile(
    "css/warehouse/barcode-scanner.css",
    "utf8"
  );

  assert.match(css, /min-height:44px/);
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /grid-template-columns:1fr/);
  assert.match(css, /overflow-wrap:anywhere/);
});

test("Production build barkod tarayıcı kaynaklarını yayınlar", async () => {
  const source = await readFile(
    "scripts/production-build.cjs",
    "utf8"
  );

  assert.match(source, /css\/warehouse\/barcode-scanner\.css/);
  assert.match(source, /js\/warehouse\/barcode-scanner\.js/);
});

test(
  "Native BarcodeDetector olmayan tarayıcı uyumlu ZXing kamera fallback kullanır",
  async () => {
    const source = await readFile(
      "js/warehouse/barcode-scanner.js",
      "utf8"
    );

    assert.match(
      source,
      /@zxing\/browser@0\.1\.5\/\+esm/
    );

    assert.match(
      source,
      /BrowserMultiFormatReader/
    );

    assert.match(
      source,
      /decodeFromConstraints/
    );

    assert.match(
      source,
      /startFallbackDecoder/
    );

    assert.match(
      source,
      /Safari ve diğer tarayıcılar için uyumlu okuyucu/
    );

    assert.doesNotMatch(
      source,
      /typeof\s+window\.BarcodeDetector\s*!==\s*"function"\s*\|\|/
    );
  }
);

test(
  "Fallback decoder ve kamera yaşam döngüsü birlikte güvenli kapanır",
  async () => {
    const source = await readFile(
      "js/warehouse/barcode-scanner.js",
      "utf8"
    );

    assert.match(
      source,
      /fallbackControls\.stop\(\)/
    );

    assert.match(
      source,
      /fallbackReader = null/
    );

    assert.match(
      source,
      /stream\.getTracks\(\)/
    );

    assert.match(
      source,
      /track\.stop\(\)/
    );

    assert.match(
      source,
      /video\.srcObject = null/
    );
  }
);
