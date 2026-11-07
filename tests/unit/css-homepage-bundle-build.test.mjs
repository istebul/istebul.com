import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  CSS_BUNDLE_ENTRIES,
  rewriteBundledCssAssetUrls
} from '../../scripts/lib/css-build.cjs';

test('homepage bundle is configured for single-file CSS output', () => {
  assert.equal(
    CSS_BUNDLE_ENTRIES.has('css/bundles/homepage.bundle.css'),
    true
  );
});

test('homepage bundle rebases relative assets without changing absolute or remote URLs', () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'istebul-home-css-')
  );

  try {
    const asset = path.join(
      root,
      'assets/images/demo/kadikoy-daire.svg'
    );

    fs.mkdirSync(path.dirname(asset), { recursive: true });
    fs.writeFileSync(asset, '<svg></svg>');

    const input = [
      '.relative{background-image:url("../assets/images/demo/kadikoy-daire.svg?v=2")}',
      '.absolute{background-image:url("/assets/images/demo/kadikoy-daire.svg")}',
      '.remote{background-image:url("https://cdn.example.com/image.svg")}',
      '.data{background-image:url("data:image/svg+xml,%3Csvg%3E")}'
    ].join('');

    const output = rewriteBundledCssAssetUrls(input, root, 'css');

    assert.match(
      output,
      /url\("\/assets\/images\/demo\/kadikoy-daire\.svg\?v=2"\)/
    );
    assert.match(
      output,
      /url\("\/assets\/images\/demo\/kadikoy-daire\.svg"\)/
    );
    assert.match(output, /https:\/\/cdn\.example\.com\/image\.svg/);
    assert.match(output, /data:image\/svg\+xml/);
    assert.doesNotMatch(output, /url\("\.\.\/assets\//);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('homepage bundle URL rebasing rejects missing relative assets', () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'istebul-home-css-missing-')
  );

  try {
    assert.throws(
      () => rewriteBundledCssAssetUrls(
        '.missing{background:url("../assets/missing.svg")}',
        root,
        'css'
      ),
      /CSS asset does not exist/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
