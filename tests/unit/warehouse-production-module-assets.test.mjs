import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const BUILD_PATH =
  "scripts/production-build.cjs";

const NARRATION_PATH =
  "js/warehouse/operations-copilot-narration.js";

const AI_PROXY_PATH =
  "js/core/ai-proxy-client.js";

test(
  "WarehouseIQ production build publishes the Copilot AI proxy module dependency",
  async () => {
    const [
      build,
      narration,
      aiProxy
    ] = await Promise.all([
      readFile(BUILD_PATH, "utf8"),
      readFile(NARRATION_PATH, "utf8"),
      readFile(AI_PROXY_PATH, "utf8")
    ]);

    const staticFilesMatch =
      build.match(
        /const\s+staticFiles\s*=\s*\[([\s\S]*?)\];/
      );

    assert.ok(
      staticFilesMatch,
      "production-build staticFiles list must exist"
    );

    const staticFiles =
      staticFilesMatch[1];

    assert.match(
      staticFiles,
      /['"]js\/warehouse\/operations-copilot-narration\.js['"]/,
      "WarehouseIQ Copilot narration module must be published"
    );

    assert.match(
      staticFiles,
      /['"]js\/core\/ai-proxy-client\.js['"]/,
      "AI proxy dependency must be published with WarehouseIQ modules"
    );

    assert.match(
      narration,
      /from\s+['"]\.\.\/core\/ai-proxy-client\.js['"]/,
      "Copilot narration must resolve the published AI proxy dependency"
    );

    assert.match(
      aiProxy,
      /export\s+async\s+function\s+postAiProxy\s*\(/,
      "published dependency must expose postAiProxy"
    );
  }
);
