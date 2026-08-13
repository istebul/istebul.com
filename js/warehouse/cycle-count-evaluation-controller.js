const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let evaluationRunning =
  false;

const retryRequestIds =
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

export function buildCycleCountEvaluationRequest(
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

function requestFingerprint({
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

function requestIdForEvaluation(
  scope
) {
  const fingerprint =
    requestFingerprint(
      scope
    );

  const existing =
    retryRequestIds.get(
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

  retryRequestIds.set(
    fingerprint,
    requestId
  );

  return {
    fingerprint,
    requestId
  };
}

async function loadDefaultDependencies() {
  const [
    operationsModule,
    clientModule
  ] =
    await Promise.all([
      import(
        "./operations-center.js"
      ),
      import(
        "./cycle-count-evaluation-client.js"
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
        .evaluateCycleCountFirstCount
  };
}

export async function persistCycleCountEvaluation(
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
      await loadDefaultDependencies();
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
    buildCycleCountEvaluationRequest(
      input
    );

  const {
    fingerprint,
    requestId
  } =
    requestIdForEvaluation({
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

  retryRequestIds.delete(
    fingerprint
  );

  return result;
}

function dispatchEvaluationEvent(
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

async function runEvaluation(
  detail
) {
  if (evaluationRunning) {
    return;
  }

  evaluationRunning =
    true;

  let evaluation;

  try {
    evaluation =
      buildCycleCountEvaluationRequest(
        detail
      );

    dispatchEvaluationEvent(
      "warehouse:cycle-count-evaluation-start",
      {
        evaluation
      }
    );

    const result =
      await persistCycleCountEvaluation(
        evaluation
      );

    dispatchEvaluationEvent(
      "warehouse:cycle-count-evaluation-success",
      {
        evaluation,

        requestId:
          result.requestId,

        data:
          result.data
      }
    );
  } catch (error) {
    dispatchEvaluationEvent(
      "warehouse:cycle-count-evaluation-error",
      {
        evaluation:
          evaluation ||
          detail ||
          {},

        message:
          error instanceof Error
            ? error.message
            : "Sayım değerlendirmesi tamamlanamadı."
      }
    );
  } finally {
    evaluationRunning =
      false;
  }
}

if (
  typeof document !==
  "undefined"
) {
  document.addEventListener(
    "warehouse:cycle-count-evaluation-request",
    (event) => {
      void runEvaluation(
        event?.detail || {}
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-evaluation-retry",
    (event) => {
      void runEvaluation(
        event?.detail || {}
      );
    }
  );
}
