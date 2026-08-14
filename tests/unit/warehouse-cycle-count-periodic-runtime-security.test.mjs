import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "supabase/migrations/20260814015000_warehouse_cycle_count_periodic_runtime.sql",
  "utf8"
);

test(
  "periodic runtime SECURITY DEFINER dar RPC oluşturur",
  () => {
    assert.match(
      source,
      /warehouse_cycle_count_process_due_schedules/i
    );

    assert.match(
      source,
      /security definer/i
    );

    assert.match(
      source,
      /set search_path = public, pg_temp/i
    );
  }
);

test(
  "periodic runtime yalnız service_role execute sınırındadır",
  () => {
    for (
      const role of [
        "public",
        "anon",
        "authenticated",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `revoke all[\\s\\S]*warehouse_cycle_count_process_due_schedules[\\s\\S]*from ${role}`,
          "i"
        )
      );
    }

    assert.match(
      source,
      /grant execute[\s\S]*warehouse_cycle_count_process_due_schedules[\s\S]*to service_role/i
    );
  }
);

test(
  "due schedule concurrency FOR UPDATE SKIP LOCKED ile korunur",
  () => {
    assert.match(
      source,
      /next_run_at <= p_now/i
    );

    assert.match(
      source,
      /for update of s[\s\S]*skip locked/i
    );
  }
);

test(
  "runtime batch limiti bounded 1-100 contract taşır",
  () => {
    assert.match(
      source,
      /p_limit < 1[\s\S]*p_limit > 100/i
    );
  }
);

test(
  "runtime gerçek PostgreSQL timezone registry doğrulaması yapar",
  () => {
    assert.match(
      source,
      /pg_timezone_names/i
    );

    assert.match(
      source,
      /at time zone[\s\S]*v_schedule\.timezone/i
    );
  }
);

test(
  "monthly next run yerel ay ve day_of_month üzerinden hesaplanır",
  () => {
    assert.match(
      source,
      /cadence = 'monthly'/i
    );

    assert.match(
      source,
      /date_trunc\([\s\S]*'month'[\s\S]*interval '1 month'/i
    );

    assert.match(
      source,
      /day_of_month - 1/i
    );
  }
);

test(
  "annual next run month_of_year ve day_of_month kullanır",
  () => {
    assert.match(
      source,
      /cadence = 'annual'/i
    );

    assert.match(
      source,
      /make_date\([\s\S]*month_of_year[\s\S]*day_of_month/i
    );
  }
);

test(
  "runtime dönem idempotency kaydını yeniden kullanır",
  () => {
    assert.match(
      source,
      /account_id[\s\S]*schedule_id[\s\S]*period_key[\s\S]*for update/i
    );

    assert.match(
      source,
      /already_processed/i
    );
  }
);

test(
  "runtime yalnız full_inventory ve blind_count stratejilerini production olarak kabul eder",
  () => {
    assert.match(
      source,
      /strategy not in\s*\(\s*'full_inventory',\s*'blind_count'\s*\)/i
    );
  }
);

test(
  "selection engine uygulanmadan selection_config sessizce yok sayılmaz",
  () => {
    assert.match(
      source,
      /selection_config[\s\S]*<> '\{\}'::jsonb/i
    );

    assert.match(
      source,
      /Selection config içeren periyodik sayım kuralı/i
    );
  }
);

test(
  "freeze enforcement yokken freeze_inventory rule fail-safe durur",
  () => {
    assert.match(
      source,
      /freeze_inventory = true/i
    );

    assert.match(
      source,
      /gerçek stok hareketi kilitleme altyapısı etkin olmadan/i
    );
  }
);

test(
  "runtime yalnız gerçek pozitif inventory balance snapshotı kullanır",
  () => {
    assert.match(
      source,
      /from public\.warehouse_inventory_balances b[\s\S]*b\.quantity > 0/i
    );
  }
);

test(
  "runtime inventory balance veya movement mutation yapmaz",
  () => {
    assert.doesNotMatch(
      source,
      /update\s+public\.warehouse_inventory_balances/i
    );

    assert.doesNotMatch(
      source,
      /insert\s+into\s+public\.warehouse_inventory_movements/i
    );

    assert.doesNotMatch(
      source,
      /delete\s+from\s+public\.warehouse_inventory/i
    );
  }
);

test(
  "periodic Cycle Count planned veya released olur ama sahte in_progress olmaz",
  () => {
    assert.match(
      source,
      /when v_schedule\.auto_release[\s\S]*then 'released'[\s\S]*else 'planned'/i
    );

    assert.doesNotMatch(
      source,
      /v_count_status[\s\S]{0,120}['"]in_progress['"]/i
    );
  }
);

test(
  "snapshot itemleri pending ve beklenen miktarı balance quantityden alır",
  () => {
    assert.match(
      source,
      /insert into[\s\S]*warehouse_cycle_count_items/i
    );

    assert.match(
      source,
      /s\.unit,[\s\S]*'pending',[\s\S]*v_blind,[\s\S]*s\.quantity/i
    );
  }
);

test(
  "runtime maliyet ve para birimi uydurmaz",
  () => {
    assert.match(
      source,
      /damaged_quantity,[\s\S]*unit_cost,[\s\S]*currency/i
    );

    assert.match(
      source,
      /s\.quantity,[\s\S]*0,[\s\S]*null,[\s\S]*null/i
    );
  }
);

test(
  "lot ve seri tracking canonical JSON anahtarlarına snapshot edilir",
  () => {
    assert.match(
      source,
      /'lotNumber'[\s\S]*s\.lot_number/i
    );

    assert.match(
      source,
      /'serialNumber'[\s\S]*s\.serial_number/i
    );
  }
);

test(
  "runtime her item için pending task üretir ve kullanıcı uydurmaz",
  () => {
    assert.match(
      source,
      /insert into[\s\S]*warehouse_cycle_count_tasks/i
    );

    assert.match(
      source,
      /'pending',[\s\S]*v_schedule\.priority,[\s\S]*i\.line_number,[\s\S]*null/i
    );
  }
);

test(
  "task tipi blind serial lot product sırasıyla belirlenir",
  () => {
    for (
      const taskType of [
        "blind_count",
        "count_serial",
        "count_lot",
        "count_product",
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          `'${taskType}'`
        )
      );
    }
  }
);

test(
  "item ve task sayısı farklıysa lifecycle fail-fast olur",
  () => {
    assert.match(
      source,
      /v_task_count <>[\s\S]*v_item_count/i
    );

    assert.match(
      source,
      /item ve task sayıları uyuşmuyor/i
    );
  }
);

test(
  "Cycle Count numarası server sequence ile üretilir",
  () => {
    assert.match(
      source,
      /warehouse_cycle_count_number_seq/i
    );

    assert.match(
      source,
      /nextval\(/i
    );
  }
);

test(
  "run generated veya released olarak Cycle Count kimliğine bağlanır",
  () => {
    assert.match(
      source,
      /cycle_count_id =[\s\S]*v_cycle_count_id/i
    );

    assert.match(
      source,
      /when v_schedule\.auto_release[\s\S]*then 'released'[\s\S]*else 'generated'/i
    );
  }
);

test(
  "boş pozitif stok snapshotında phantom Cycle Count üretmeden run skipped olur",
  () => {
    assert.match(
      source,
      /if v_item_count = 0/i
    );

    assert.match(
      source,
      /status = 'skipped'/i
    );

    assert.match(
      source,
      /no_positive_inventory/i
    );
  }
);

test(
  "schedule başarılı dönemden sonra last ve next run cursorlarını ilerletir",
  () => {
    assert.match(
      source,
      /last_run_at =[\s\S]*v_schedule\.next_run_at[\s\S]*next_run_at =[\s\S]*v_next_run_at/i
    );
  }
);

test(
  "schedule runtime hata retry sayısını tutar ve beş hatada pause eder",
  () => {
    assert.match(
      source,
      /attempt_count/i
    );

    assert.match(
      source,
      /attempt_count >= 5/i
    );

    assert.match(
      source,
      /status = 'paused'/i
    );
  }
);

test(
  "her schedule subtransaction ile batch izolasyonu taşır",
  () => {
    assert.match(
      source,
      /exception[\s\S]*when others/i
    );

    assert.match(
      source,
      /v_failure[\s\S]*sqlerrm/i
    );
  }
);
