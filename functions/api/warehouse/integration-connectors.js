function text(value) {
  return String(value ?? "").trim();
}

function buildCommonHeaders({ outboxId, eventType }) {
  return {
    "Content-Type": "application/json",
    "Idempotency-Key": text(outboxId),
    "X-Warehouse-Event": text(eventType)
  };
}

function buildCustomRestRequest({
  runtime,
  outboxId,
  eventType
}) {
  const baseUrl = text(runtime?.baseUrl);

  if (!baseUrl) {
    throw new Error(
      "custom_rest entegrasyonu için baseUrl tanımlı değil."
    );
  }

  const authType =
    text(runtime?.authType) || "none";

  const credential =
    text(runtime?.credential);

  const headers =
    buildCommonHeaders({
      outboxId,
      eventType
    });

  if (authType === "none") {
    return {
      url: baseUrl,
      headers
    };
  }

  if (authType === "bearer") {
    if (!credential) {
      throw new Error(
        "custom_rest bearer entegrasyonu için Vault credential değeri bulunamadı."
      );
    }

    return {
      url: baseUrl,
      headers: {
        ...headers,
        Authorization: `Bearer ${credential}`
      }
    };
  }

  if (authType === "api_key") {
    if (!credential) {
      throw new Error(
        "custom_rest api_key entegrasyonu için Vault credential değeri bulunamadı."
      );
    }

    const headerName =
      text(runtime?.config?.auth?.headerName) ||
      "X-API-Key";

    return {
      url: baseUrl,
      headers: {
        ...headers,
        [headerName]: credential
      }
    };
  }

  throw new Error(
    `custom_rest auth tipi henüz desteklenmiyor: ${authType}`
  );
}

export function getIntegrationConnector(
  connectorKey
) {
  const key = text(connectorKey);

  if (key === "custom_rest") {
    return {
      key,
      name: "Özel REST",
      buildRequest:
        buildCustomRestRequest
    };
  }

  if (
    key === "netsis" ||
    key === "sap" ||
    key === "nebim" ||
    key === "oracle"
  ) {
    return {
      key,
      name: key.toUpperCase(),
      buildRequest() {
        throw new Error(
          `${key} connector henüz implementation aşamasında. Integration Hub sözleşmesi hazır, ERP özgü adapter bekleniyor.`
        );
      }
    };
  }

  if (key === "integration_agent") {
    return {
      key,
      name: "WarehouseIQ Integration Agent",
      buildRequest() {
        throw new Error(
          "WarehouseIQ Integration Agent connector henüz implementation aşamasında."
        );
      }
    };
  }

  if (key === "custom_soap") {
    return {
      key,
      name: "Özel SOAP",
      buildRequest() {
        throw new Error(
          "custom_soap connector henüz implementation aşamasında."
        );
      }
    };
  }

  throw new Error(
    `Desteklenmeyen WarehouseIQ connector: ${key || "(boş)"}`
  );
}
