const path = require("node:path");
const { mkdirSync } = require("node:fs");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
const outfile = path.join(
  root,
  "functions/_shared/warehouse-copilot-runtime.js"
);

mkdirSync(path.dirname(outfile), {
  recursive: true
});

esbuild.buildSync({
  entryPoints: [
    path.join(
      root,
      "src/warehouse/runtime/OperationsCopilotRuntime.ts"
    )
  ],
  outfile,
  bundle: true,
  platform: "neutral",
  format: "esm",
  target: "es2022",
  treeShaking: true,
  legalComments: "none",
  sourcemap: false,
  minify: false,
  banner: {
    js:
      "/* eslint-disable */\n" +
      "// Bu dosya WarehouseIQ Copilot TypeScript kaynağından otomatik üretilir."
  }
});

console.log(
  "warehouse-copilot-runtime: OK"
);
