import { test } from "node:test";
import assert from "node:assert/strict";
import { injectGa4ConsentHead } from "../../scripts/lib/ga4-consent-head.cjs";
import { injectAdSenseHead } from "../../scripts/lib/inject-adsense-head.cjs";

test("GA4 and AdSense scripts are injected after CSS preloads", () => {
  const html = '<html><head><meta charset="utf-8">' +
    '<link rel="preload" href="/css/style.hash.css" as="style">' +
    '<link rel="preload" href="/css/home.hash.css" as="style">' +
    '<link rel="stylesheet" href="/css/style.hash.css"></head></html>';

  const result = injectAdSenseHead(injectGa4ConsentHead(html, "G-TEST12345"));
  const lastPreload = result.lastIndexOf('as="style"');
  const ga4 = result.indexOf("googletagmanager.com/gtag/js");
  const adsense = result.indexOf("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js");
  const stylesheet = result.indexOf('rel="stylesheet"');

  assert.ok(ga4 > lastPreload && ga4 < stylesheet);
  assert.ok(adsense > lastPreload && adsense < stylesheet);
});
