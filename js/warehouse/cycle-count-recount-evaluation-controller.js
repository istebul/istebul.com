const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let recountEvaluationRunning =
  false;

const recountRetryRequestIds =
  new Map();

function requireUuid(
  value,
  label
) {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  if (
    !UUID_PATTERN.test(
      normalized
    )
  ) {
    throw new Error(
      `${label} geçerli bir UUID olmalıdır.`
    );
  }

  return normalized;
}

function createRequestId() {
  if (
    typeof globalThis.crypto
      ?.randomUUID !==
    "function"
  ) {
    throw new Error(
      "Güvenli değerlendirme istek kimliği üretilemiyor."
    );
  }

  return globalThis.crypto
    .randomUUID();
}

export function buildCycleCountRecountEvaluationRequest(
  input
) {
  return Object.freeze({
    cycleCountId:
      requireUuid(
        input?.cycleCountId,
        "Sayım kimliği"
      ),

    cycleCountItemId:
      requireUuid(
        input?.cycleCountItemId,
        "Sayım satırı kimliği"
      ),

    taskId:
      requireUuid(
        input?.taskId,
        "Sayım görevi kimliği"
      )
  });
}

function recountEvaluationFingerprint({
  accountId,
  warehouseId,
  payload
}) {
  return JSON.stringify({
    accountId,
    warehouseId,
    cycleCountId:
      payload.cycleCountId,
    cycleCountItemId:
      payload.cycleCountItemId,
    taskId:
      payload.taskId
  });
}

function requestIdForRecountEvaluation(
  scope
) {
  const fingerprint =
    recountEvaluationFingerprint(
      scope
    );

  const existing =
    recountRetryRequestIds.get(
      fingerprint
    );

  if (existing) {
    return {
      fingerprint,
      requestId:
        existing
    };
  }

  const requestId =
    createRequestId();

  recountRetryRequestIds.set(
    fingerprint,
    requestId
  );

  return {
    fingerprint,
    requestId
  };
}

async function loadRecountEvaluationDependencies() {
  const [
    operationsModule,
    clientModule
  ] =
    await Promise.all([
      import(
        "./operations-center.js"
      ),
      import(
        "./cycle-count-recount-evaluation-client.js"
      )
    ]);

  return {
    getContext:
      operationsModule
        .getWarehouseOperationsContext,

    getSession:
      operationsModule
        .getWarehouseSession,

    evaluate:
      clientModule
        .evaluateCycleCountRecount
  };
}

export async function persistCycleCountRecountEvaluation(
  input,
  dependencies = {}
) {
  let defaults = null;

  if (
    !dependencies.getContext ||
    !dependencies.getSession ||
    !dependencies.evaluate
  ) {
    defaults =
      await loadRecountEvaluationDependencies();
  }

  const getContext =
    dependencies.getContext ||
    defaults.getContext;

  const getSession =
    dependencies.getSession ||
    defaults.getSession;

  const evaluate =
    dependencies.evaluate ||
    defaults.evaluate;

  const context =
    getContext();

  const accountId =
    requireUuid(
      context?.accountId,
      "Firma kimliği"
    );

  const warehouseId =
    requireUuid(
      context?.warehouseId,
      "Depo kimliği"
    );

  const session =
    await getSession();

  if (
    !session?.access_token
  ) {
    throw new Error(
      "WarehouseIQ oturumu geçersiz veya süresi dolmuş."
    );
  }

  const payload =
    buildCycleCountRecountEvaluationRequest(
      input
    );

  const {
    fingerprint,
    requestId
  } =
    requestIdForRecountEvaluation({
      accountId,
      warehouseId,
      payload
    });

  const result =
    await evaluate({
      accessToken:
        session.access_token,

      accountId,
      warehouseId,

      ...payload,

      requestId
    });

  recountRetryRequestIds.delete(
    fingerprint
  );

  return result;
}

function dispatchRecountEvaluationEvent(
  name,
  detail
) {
  document.dispatchEvent(
    new CustomEvent(
      name,
      {
        detail:
          Object.freeze(
            detail
          )
      }
    )
  );
}

async function runRecountEvaluation(
  detail
) {
  if (recountEvaluationRunning) {
    return;
  }

  recountEvaluationRunning =
    true;

  let evaluation;

  try {
    evaluation =
      buildCycleCountRecountEvaluationRequest(
        detail
      );

    dispatchRecountEvaluationEvent(
      "warehouse:cycle-count-recount-evaluation-start",
      {
        evaluation
      }
    );

    const result =
      await persistCycleCountRecountEvaluation(
        evaluation
      );

    dispatchRecountEvaluationEvent(
      "warehouse:cycle-count-recount-evaluation-success",
      {
        evaluation,

        requestId:
          result.requestId,

        data:
          result.data
      }
    );
  } catch (error) {
    dispatchRecountEvaluationEvent(
      "warehouse:cycle-count-recount-evaluation-error",
      {
        evaluation:
          evaluation ||
          detail ||
          {},

        message:
          error instanceof Error
            ? error.message
            : "Yeniden yeniden sayım değerlendirmesi tamamlanamadı."
      }
    );
  } finally {
    recountEvaluationRunning =
      false;
  }
}

if (
  typeof document !==
  "undefined"
) {
  document.addEventListener(
    "warehouse:cycle-count-recount-evaluation-request",
    (event) => {
      void runRecountEvaluation(
        event?.detail || {}
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-recount-evaluation-retry",
    (event) => {
      void runRecountEvaluation(
        event?.detail || {}
      );
    }
  );
}
