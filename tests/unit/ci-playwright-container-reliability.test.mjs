import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow =
  fs.readFileSync(
    new URL(
      "../../.github/workflows/ci.yml",
      import.meta.url,
    ),
    "utf8",
  );

const lock =
  JSON.parse(
    fs.readFileSync(
      new URL(
        "../../package-lock.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

const lockedVersion =
  lock.packages?.[
    "node_modules/@playwright/test"
  ]?.version;

function jobBlock(name) {
  const marker =
    `  ${name}:\n`;

  const start =
    workflow.indexOf(
      marker,
    );

  assert.notEqual(
    start,
    -1,
    `CI job bulunamadı: ${name}`,
  );

  const bodyStart =
    start + marker.length;

  const remainder =
    workflow.slice(
      bodyStart,
    );

  const nextJob =
    remainder.match(
      /^  [A-Za-z0-9_-]+:\n/m,
    );

  const end =
    nextJob?.index === undefined
      ? workflow.length
      : bodyStart + nextJob.index;

  return workflow.slice(
    start,
    end,
  );
}
test(
  "CI Playwright container sürümü package-lock ile birebir eşleşir",
  () => {
    assert.equal(
      lockedVersion,
      "1.61.1",
    );

    const image =
      `mcr.microsoft.com/playwright:v${lockedVersion}-noble`;

    assert.equal(
      workflow.split(image).length - 1,
      2,
    );
  },
);

test(
  "e2e-site-health pinned Playwright container kullanır",
  () => {
    const block =
      jobBlock(
        "e2e-site-health",
      );

    assert.match(
      block,
      /timeout-minutes:\s*20/,
    );

    assert.match(
      block,
      /container:\s*\n\s+image:\s*mcr\.microsoft\.com\/playwright:v1\.61\.1-noble/,
    );

    assert.match(
      block,
      /options:\s*--ipc=host/,
    );

    assert.match(
      block,
      /- run:\s*npm ci/,
    );

    assert.match(
      block,
      /npm run test:e2e:ci/,
    );
  },
);

test(
  "e2e-release pinned Playwright container kullanır",
  () => {
    const block =
      jobBlock(
        "e2e-release",
      );

    assert.match(
      block,
      /timeout-minutes:\s*30/,
    );

    assert.match(
      block,
      /container:\s*\n\s+image:\s*mcr\.microsoft\.com\/playwright:v1\.61\.1-noble/,
    );

    assert.match(
      block,
      /options:\s*--ipc=host/,
    );

    assert.match(
      block,
      /- run:\s*npm ci/,
    );

    assert.match(
      block,
      /npm run test:e2e:release/,
    );
  },
);

test(
  "CI runtime apt tabanlı Playwright dependency install çalıştırmaz",
  () => {
    assert.doesNotMatch(
      workflow,
      /playwright\s+install\s+--with-deps/,
    );
  },
);

test(
  "release Supabase secret contract korunur",
  () => {
    const block =
      jobBlock(
        "e2e-release",
      );

    assert.match(
      block,
      /SUPABASE_URL:\s*\${{\s*secrets\.SUPABASE_URL\s*}}/,
    );

    assert.match(
      block,
      /SUPABASE_ANON_KEY:\s*\${{\s*secrets\.SUPABASE_ANON_KEY\s*}}/,
    );
  },
);
