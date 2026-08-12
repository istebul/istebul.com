import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";


const repositoryPath =
  "src/warehouse/services/SupabaseQualityInspectionRepository.ts";

const indexPath =
  "src/warehouse/index.ts";


async function repositorySource() {
  return readFile(
    repositoryPath,
    "utf8",
  );
}


test(
  "Supabase Quality repository altı persistence tablosunu kullanır",
  async () => {
    const source =
      await repositorySource();

    for (const table of [
      "warehouse_quality_inspections",
      "warehouse_quality_inspection_items",
      "warehouse_quality_samples",
      "warehouse_quality_documents",
      "warehouse_quality_tasks",
      "warehouse_quality_exceptions",
    ]) {
      assert.match(
        source,
        new RegExp(
          `"${table}"`,
        ),
      );
    }
  },
);


test(
  "Supabase Quality repository domain repository sözleşmesini uygular",
  async () => {
    const source =
      await repositorySource();

    assert.match(
      source,
      /implements QualityInspectionRepository/,
    );

    for (const method of [
      "findById",
      "findByNumber",
      "findByReceivingId",
      "list",
      "save",
      "saveItem",
      "saveSample",
      "saveDocument",
      "saveTask",
      "saveException",
      "listExceptions",
      "listDocuments",
      "listTasks",
    ]) {
      assert.match(
        source,
        new RegExp(
          `\\b${method}\\s*\\(`,
        ),
      );
    }
  },
);


test(
  "Quality read sorguları account_id ile tenant kapsamındadır",
  async () => {
    const source =
      await repositorySource();

    assert.match(
      source,
      /\.eq\(\s*"account_id"\s*,\s*filter\.tenantId\s*,?\s*\)/,
    );

    assert.match(
      source,
      /\.eq\(\s*"account_id"\s*,\s*tenantId\s*,?\s*\)/,
    );

    assert.match(
      source,
      /\.eq\(\s*"inspection_id"\s*,\s*inspectionId\s*,?\s*\)/,
    );
  },
);


test(
  "Quality inspection hydration items samples ve exceptions yükler",
  async () => {
    const source =
      await repositorySource();

    const start =
      source.indexOf(
        "private async hydrate(",
      );

    assert.ok(
      start >= 0,
    );

    const block =
      source.slice(
        start,
      );

    assert.match(
      block,
      /this\.listItems\(/,
    );

    assert.match(
      block,
      /this\.listSamples\(/,
    );

    assert.match(
      block,
      /this\.listExceptions\(/,
    );

    assert.match(
      block,
      /mapInspectionRow\(/,
    );
  },
);


test(
  "Quality repository numeric satır alanlarını Number ile normalize eder",
  async () => {
    const source =
      await repositorySource();

    for (const field of [
      "row.inspected_quantity",
      "row.accepted_quantity",
      "row.rejected_quantity",
      "row.conditional_quantity",
      "row.hold_quantity",
      "row.quantity",
    ]) {
      assert.match(
        source,
        new RegExp(
          `Number\\(\\s*${field.replace(".", "\\.")}`,
        ),
      );
    }
  },
);


test(
  "Supabase Quality repository doğrudan write yapmaz",
  async () => {
    const source =
      await repositorySource();

    for (const pattern of [
      /\.insert\s*\(/i,
      /\.update\s*\(/i,
      /\.upsert\s*\(/i,
      /\.delete\s*\(/i,
      /\.rpc\s*\(/i,
    ]) {
      assert.doesNotMatch(
        source,
        pattern,
      );
    }

    assert.match(
      source,
      /private async rejectDirectWrite/,
    );

    assert.match(
      source,
      /Güvenli yazma RPC'si kullanılmalıdır/,
    );
  },
);


test(
  "tüm save metodları direct write reddine gider",
  async () => {
    const source =
      await repositorySource();

    for (const method of [
      "save",
      "saveItem",
      "saveSample",
      "saveDocument",
      "saveTask",
      "saveException",
    ]) {
      const start =
        source.search(
          new RegExp(
            `async ${method}\\s*\\(`,
          ),
        );

      assert.ok(
        start >= 0,
        `${method} bulunamadı.`,
      );

      const next =
        source.indexOf(
          "\n\n  async ",
          start + 1,
        );

      const block =
        source.slice(
          start,
          next >= 0
            ? next
            : undefined,
        );

      assert.match(
        block,
        /return this\.rejectDirectWrite\(\)/,
        `${method} doğrudan yazmayı reddetmeli.`,
      );
    }
  },
);


test(
  "QualityRule QC-P1 runtime repository kapsamına alınmamıştır",
  async () => {
    const source =
      await repositorySource();

    assert.doesNotMatch(
      source,
      /warehouse_quality_rules/,
    );

    assert.doesNotMatch(
      source,
      /QualityRule/,
    );
  },
);


test(
  "Supabase Quality repository warehouse indexinden dışa aktarılır",
  async () => {
    const index =
      await readFile(
        indexPath,
        "utf8",
      );

    assert.match(
      index,
      /export \{ SupabaseQualityInspectionRepository \} from "\.\/services\/SupabaseQualityInspectionRepository";/,
    );
  },
);
