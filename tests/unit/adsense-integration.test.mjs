import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ADSENSE_CLIENT_ID,
  adsenseHeadSnippet,
  injectAdSenseHead,
  hasAdSenseHead
} from '../../scripts/lib/inject-adsense-head.cjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('inject-adsense-head', () => {
  const sampleHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Test</title></head><body></body></html>';

  it('snippet includes client id and crossorigin', () => {
    const snippet = adsenseHeadSnippet();
    assert.match(snippet, /client=ca-pub-6412697542113702/);
    assert.match(snippet, /crossorigin="anonymous"/);
    assert.match(snippet, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
  });

  it('injects script once into head', () => {
    const injected = injectAdSenseHead(sampleHtml);
    const matches = injected.match(/adsbygoogle\.js\?client=ca-pub-6412697542113702/g) || [];
    assert.equal(matches.length, 1);
    assert.match(injected, /crossorigin="anonymous"/);
    assert.ok(hasAdSenseHead(injected));
  });

  it('is idempotent when script already present', () => {
    const once = injectAdSenseHead(sampleHtml);
    const twice = injectAdSenseHead(once);
    assert.equal(twice, once);
    const matches = twice.match(/adsbygoogle\.js\?client=ca-pub-6412697542113702/g) || [];
    assert.equal(matches.length, 1);
  });
});

describe('ads.txt publisher authorization', () => {
  it('declares pub-6412697542113702 at repo root', () => {
    const adsTxt = fs.readFileSync(path.join(root, 'ads.txt'), 'utf8');
    assert.match(adsTxt, /pub-6412697542113702/);
    assert.match(adsTxt, /google\.com,\s*pub-6412697542113702,\s*DIRECT/);
  });
});

describe('production build AdSense integration', () => {
  it('production-build wires inject-adsense-head helper', () => {
    const buildScript = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
    assert.match(buildScript, /inject-adsense-head\.cjs/);
    assert.match(buildScript, /applyAdSenseHeadToHtmlFiles/);
  });

  it('dist HTML files contain a single AdSense script when dist exists', () => {
    const distDir = path.join(root, 'dist');
    if (!fs.existsSync(distDir)) return;

    const htmlFiles = [];
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir)) {
        const file = path.join(dir, name);
        if (fs.statSync(file).isDirectory()) {
          walk(file);
        } else if (name.endsWith('.html')) {
          htmlFiles.push(file);
        }
      }
    };
    walk(distDir);
    assert.ok(htmlFiles.length > 0, 'dist should contain HTML files after build');

    for (const file of htmlFiles) {
      const html = fs.readFileSync(file, 'utf8');
      const matches = html.match(/adsbygoogle\.js\?client=ca-pub-6412697542113702/g) || [];
      assert.equal(matches.length, 1, `${path.relative(root, file)} must contain AdSense script exactly once`);
      assert.match(html, /crossorigin="anonymous"/, `${path.relative(root, file)} missing crossorigin`);
    }
  });

  it('dist/ads.txt exists with publisher id when dist exists', () => {
    const distAdsTxt = path.join(root, 'dist/ads.txt');
    if (!fs.existsSync(distAdsTxt)) return;

    const content = fs.readFileSync(distAdsTxt, 'utf8');
    assert.match(content, /pub-6412697542113702/);
  });
});
