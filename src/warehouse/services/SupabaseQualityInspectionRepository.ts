import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  QualityInspection,
  QualityInspectionListFilter,
} from "../types/QualityInspection";

import type {
  QualityInspectionItem,
} from "../types/QualityInspectionItem";

import type {
  QualitySample,
} from "../types/QualitySample";

import type {
  QualityDocument,
} from "../types/QualityDocument";

import type {
  QualityTask,
} from "../types/QualityTask";

import type {
  QualityException,
} from "../types/QualityException";

import type {
  QualityInspectionRepository,
} from "./QualityInspectionRepository";


const INSPECTION_TABLE =
  "warehouse_quality_inspections";

const ITEM_TABLE =
  "warehouse_quality_inspection_items";

const SAMPLE_TABLE =
  "warehouse_quality_samples";

const DOCUMENT_TABLE =
  "warehouse_quality_documents";

const TASK_TABLE =
  "warehouse_quality_tasks";

const EXCEPTION_TABLE =
  "warehouse_quality_exceptions";


const INSPECTION_SELECT = [
  "id",
  "account_id",
  "inspection_number",
  "warehouse_id",
  "location_id",
  "receiving_id",
  "reference_type",
  "reference_id",
  "reference_number",
  "status",
  "final_decision",
  "planned_at",
  "started_at",
  "completed_at",
  "cancelled_at",
  "cancellation_reason",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");


const ITEM_SELECT = [
  "id",
  "account_id",
  "inspection_id",
  "line_number",
  "product_id",
  "sku_id",
  "receiving_id",
  "receiving_item_id",
  "warehouse_id",
  "location_id",
  "control_type",
  "inspected_quantity",
  "accepted_quantity",
  "rejected_quantity",
  "conditional_quantity",
  "hold_quantity",
  "unit",
  "decision",
  "tracking",
  "measured_value",
  "expected_value",
  "notes",
  "inspected_by",
  "inspected_at",
  "created_by",
  "created_at",
  "updated_at",
].join(",");


const SAMPLE_SELECT = [
  "id",
  "account_id",
  "inspection_id",
  "inspection_item_id",
  "sample_number",
  "quantity",
  "unit",
  "status",
  "lot_number",
  "serial_number",
  "collected_by",
  "collected_at",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");


const DOCUMENT_SELECT = [
  "id",
  "account_id",
  "inspection_id",
  "inspection_item_id",
  "type",
  "document_number",
  "document_date",
  "file_name",
  "file_url",
  "notes",
  "created_by",
  "created_at",
].join(",");


const TASK_SELECT = [
  "id",
  "account_id",
  "inspection_id",
  "inspection_item_id",
  "type",
  "status",
  "assigned_user_id",
  "priority",
  "planned_at",
  "started_at",
  "completed_at",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");


const EXCEPTION_SELECT = [
  "id",
  "account_id",
  "inspection_id",
  "inspection_item_id",
  "type",
  "message",
  "rule_id",
  "sample_id",
  "expected_value",
  "actual_value",
  "resolved",
  "resolved_by",
  "resolved_at",
  "resolution_notes",
  "created_at",
].join(",");


interface InspectionRow {
  id: string;
  account_id: string;
  inspection_number: string;
  warehouse_id: string;
  location_id: string;
  receiving_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  status: QualityInspection["status"];
  final_decision: QualityInspection["finalDecision"];
  planned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}


interface ItemRow {
  id: string;
  account_id: string;
  inspection_id: string;
  line_number: number;

  product_id: string;
  sku_id: string | null;

  receiving_id: string | null;
  receiving_item_id: string | null;

  warehouse_id: string;
  location_id: string;

  control_type:
    QualityInspectionItem["controlType"];

  inspected_quantity:
    number | string;

  accepted_quantity:
    number | string;

  rejected_quantity:
    number | string;

  conditional_quantity:
    number | string;

  hold_quantity:
    number | string;

  unit: string;

  decision:
    QualityInspectionItem["decision"];

  tracking:
    QualityInspectionItem["tracking"] | null;

  measured_value:
    unknown;

  expected_value:
    unknown;

  notes: string | null;

  inspected_by:
    string | null;

  inspected_at:
    string | null;

  created_by: string;
  created_at: string;
  updated_at: string;
}


interface SampleRow {
  id: string;
  account_id: string;
  inspection_id: string;
  inspection_item_id: string | null;
  sample_number: string;
  quantity: number | string;
  unit: string;
  status: QualitySample["status"];
  lot_number: string | null;
  serial_number: string | null;
  collected_by: string | null;
  collected_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}


interface DocumentRow {
  id: string;
  account_id: string;
  inspection_id: string;
  inspection_item_id: string | null;
  type: QualityDocument["type"];
  document_number: string | null;
  document_date: string | null;
  file_name: string | null;
  file_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}


interface TaskRow {
  id: string;
  account_id: string;
  inspection_id: string;
  inspection_item_id: string | null;
  type: QualityTask["type"];
  status: QualityTask["status"];
  assigned_user_id: string | null;
  priority: number;
  planned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}


interface ExceptionRow {
  id: string;
  account_id: string;
  inspection_id: string;
  inspection_item_id: string | null;
  type: QualityException["type"];
  message: string;
  rule_id: string | null;
  sample_id: string | null;
  expected_value: string | null;
  actual_value: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}


function optionalScalar(
  value: unknown,
): string | number | boolean | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return undefined;
}


function mapItemRow(
  row: ItemRow,
): QualityInspectionItem {
  const measuredValue =
    optionalScalar(
      row.measured_value,
    );

  const expectedValue =
    optionalScalar(
      row.expected_value,
    );

  return {
    id: row.id,
    tenantId: row.account_id,
    inspectionId: row.inspection_id,
    lineNumber: row.line_number,
    productId: row.product_id,
    warehouseId: row.warehouse_id,
    locationId: row.location_id,
    controlType: row.control_type,
    inspectedQuantity:
      Number(
        row.inspected_quantity,
      ),
    acceptedQuantity:
      Number(
        row.accepted_quantity,
      ),
    rejectedQuantity:
      Number(
        row.rejected_quantity,
      ),
    conditionalQuantity:
      Number(
        row.conditional_quantity,
      ),
    holdQuantity:
      Number(
        row.hold_quantity,
      ),
    unit: row.unit,
    decision: row.decision,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    ...(row.sku_id !== null
      ? {
          skuId:
            row.sku_id,
        }
      : {}),

    ...(row.receiving_id !== null
      ? {
          receivingId:
            row.receiving_id,
        }
      : {}),

    ...(row.receiving_item_id !== null
      ? {
          receivingItemId:
            row.receiving_item_id,
        }
      : {}),

    ...(row.tracking !== null
      ? {
          tracking:
            row.tracking,
        }
      : {}),

    ...(measuredValue !== undefined
      ? {
          measuredValue,
        }
      : {}),

    ...(expectedValue !== undefined
      ? {
          expectedValue,
        }
      : {}),

    ...(row.notes !== null
      ? {
          notes:
            row.notes,
        }
      : {}),

    ...(row.inspected_by !== null
      ? {
          inspectedBy:
            row.inspected_by,
        }
      : {}),

    ...(row.inspected_at !== null
      ? {
          inspectedAt:
            row.inspected_at,
        }
      : {}),
  };
}


function mapSampleRow(
  row: SampleRow,
): QualitySample {
  return {
    id: row.id,
    tenantId: row.account_id,
    inspectionId: row.inspection_id,
    sampleNumber: row.sample_number,
    quantity:
      Number(
        row.quantity,
      ),
    unit: row.unit,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    ...(row.inspection_item_id !== null
      ? {
          inspectionItemId:
            row.inspection_item_id,
        }
      : {}),

    ...(row.lot_number !== null
      ? {
          lotNumber:
            row.lot_number,
        }
      : {}),

    ...(row.serial_number !== null
      ? {
          serialNumber:
            row.serial_number,
        }
      : {}),

    ...(row.collected_by !== null
      ? {
          collectedBy:
            row.collected_by,
        }
      : {}),

    ...(row.collected_at !== null
      ? {
          collectedAt:
            row.collected_at,
        }
      : {}),

    ...(row.notes !== null
      ? {
          notes:
            row.notes,
        }
      : {}),
  };
}


function mapDocumentRow(
  row: DocumentRow,
): QualityDocument {
  return {
    id: row.id,
    tenantId: row.account_id,
    inspectionId: row.inspection_id,
    type: row.type,
    createdBy: row.created_by,
    createdAt: row.created_at,

    ...(row.inspection_item_id !== null
      ? {
          inspectionItemId:
            row.inspection_item_id,
        }
      : {}),

    ...(row.document_number !== null
      ? {
          documentNumber:
            row.document_number,
        }
      : {}),

    ...(row.document_date !== null
      ? {
          documentDate:
            row.document_date,
        }
      : {}),

    ...(row.file_name !== null
      ? {
          fileName:
            row.file_name,
        }
      : {}),

    ...(row.file_url !== null
      ? {
          fileUrl:
            row.file_url,
        }
      : {}),

    ...(row.notes !== null
      ? {
          notes:
            row.notes,
        }
      : {}),
  };
}


function mapTaskRow(
  row: TaskRow,
): QualityTask {
  return {
    id: row.id,
    tenantId: row.account_id,
    inspectionId: row.inspection_id,
    type: row.type,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    ...(row.inspection_item_id !== null
      ? {
          inspectionItemId:
            row.inspection_item_id,
        }
      : {}),

    ...(row.assigned_user_id !== null
      ? {
          assignedUserId:
            row.assigned_user_id,
        }
      : {}),

    ...(row.planned_at !== null
      ? {
          plannedAt:
            row.planned_at,
        }
      : {}),

    ...(row.started_at !== null
      ? {
          startedAt:
            row.started_at,
        }
      : {}),

    ...(row.completed_at !== null
      ? {
          completedAt:
            row.completed_at,
        }
      : {}),

    ...(row.notes !== null
      ? {
          notes:
            row.notes,
        }
      : {}),
  };
}


function mapExceptionRow(
  row: ExceptionRow,
): QualityException {
  return {
    id: row.id,
    tenantId: row.account_id,
    inspectionId: row.inspection_id,
    type: row.type,
    message: row.message,
    resolved: row.resolved,
    createdAt: row.created_at,

    ...(row.inspection_item_id !== null
      ? {
          inspectionItemId:
            row.inspection_item_id,
        }
      : {}),

    ...(row.rule_id !== null
      ? {
          ruleId:
            row.rule_id,
        }
      : {}),

    ...(row.sample_id !== null
      ? {
          sampleId:
            row.sample_id,
        }
      : {}),

    ...(row.expected_value !== null
      ? {
          expectedValue:
            row.expected_value,
        }
      : {}),

    ...(row.actual_value !== null
      ? {
          actualValue:
            row.actual_value,
        }
      : {}),

    ...(row.resolved_by !== null
      ? {
          resolvedBy:
            row.resolved_by,
        }
      : {}),

    ...(row.resolved_at !== null
      ? {
          resolvedAt:
            row.resolved_at,
        }
      : {}),

    ...(row.resolution_notes !== null
      ? {
          resolutionNotes:
            row.resolution_notes,
        }
      : {}),
  };
}


function mapInspectionRow(
  row: InspectionRow,
  items: readonly QualityInspectionItem[],
  samples: readonly QualitySample[],
  exceptions: readonly QualityException[],
): QualityInspection {
  return {
    id: row.id,
    tenantId: row.account_id,
    inspectionNumber:
      row.inspection_number,
    warehouseId:
      row.warehouse_id,
    locationId:
      row.location_id,
    status:
      row.status,
    finalDecision:
      row.final_decision,
    items,
    samples,
    exceptions,
    createdBy:
      row.created_by,
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,

    ...(row.receiving_id !== null
      ? {
          receivingId:
            row.receiving_id,
        }
      : {}),

    ...(row.reference_type !== null
      ? {
          referenceType:
            row.reference_type,
        }
      : {}),

    ...(row.reference_id !== null
      ? {
          referenceId:
            row.reference_id,
        }
      : {}),

    ...(row.reference_number !== null
      ? {
          referenceNumber:
            row.reference_number,
        }
      : {}),

    ...(row.planned_at !== null
      ? {
          plannedAt:
            row.planned_at,
        }
      : {}),

    ...(row.started_at !== null
      ? {
          startedAt:
            row.started_at,
        }
      : {}),

    ...(row.completed_at !== null
      ? {
          completedAt:
            row.completed_at,
        }
      : {}),

    ...(row.cancelled_at !== null
      ? {
          cancelledAt:
            row.cancelled_at,
        }
      : {}),

    ...(row.cancellation_reason !== null
      ? {
          cancellationReason:
            row.cancellation_reason,
        }
      : {}),

    ...(row.notes !== null
      ? {
          notes:
            row.notes,
        }
      : {}),
  };
}


export class SupabaseQualityInspectionRepository
  implements QualityInspectionRepository
{
  constructor(
    private readonly client:
      SupabaseClient,
  ) {}


  async findById(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityInspection | null> {
    return this.findOne(
      tenantId,
      "id",
      inspectionId,
    );
  }


  async findByNumber(
    tenantId: string,
    inspectionNumber: string,
  ): Promise<QualityInspection | null> {
    return this.findOne(
      tenantId,
      "inspection_number",
      inspectionNumber,
    );
  }


  async findByReceivingId(
    tenantId: string,
    receivingId: string,
  ): Promise<QualityInspection | null> {
    return this.findOne(
      tenantId,
      "receiving_id",
      receivingId,
    );
  }


  async list(
    filter:
      QualityInspectionListFilter,
  ): Promise<QualityInspection[]> {
    let query =
      this.client
        .from(
          INSPECTION_TABLE,
        )
        .select(
          INSPECTION_SELECT,
        )
        .eq(
          "account_id",
          filter.tenantId,
        );

    if (
      filter.warehouseId !==
      undefined
    ) {
      query =
        query.eq(
          "warehouse_id",
          filter.warehouseId,
        );
    }

    if (
      filter.locationId !==
      undefined
    ) {
      query =
        query.eq(
          "location_id",
          filter.locationId,
        );
    }

    if (
      filter.receivingId !==
      undefined
    ) {
      query =
        query.eq(
          "receiving_id",
          filter.receivingId,
        );
    }

    if (
      filter.status !==
      undefined
    ) {
      query =
        query.eq(
          "status",
          filter.status,
        );
    }

    if (
      filter.finalDecision !==
      undefined
    ) {
      query =
        query.eq(
          "final_decision",
          filter.finalDecision,
        );
    }

    if (
      filter.referenceType !==
      undefined
    ) {
      query =
        query.eq(
          "reference_type",
          filter.referenceType,
        );
    }

    if (
      filter.referenceId !==
      undefined
    ) {
      query =
        query.eq(
          "reference_id",
          filter.referenceId,
        );
    }

    const {
      data,
      error,
    } =
      await query.order(
        "created_at",
        {
          ascending:
            false,
        },
      );

    if (error) {
      this.throwError(
        error,
      );
    }

    const hydrated =
      await Promise.all(
        (
          data ??
          []
        ).map(
          (row) =>
            this.hydrate(
              row as InspectionRow,
            ),
        ),
      );

    const search =
      filter.search
        ?.trim()
        .toLocaleLowerCase(
          "tr-TR",
        );

    if (!search) {
      return hydrated;
    }

    return hydrated.filter(
      (inspection) =>
        inspection
          .inspectionNumber
          .toLocaleLowerCase(
            "tr-TR",
          )
          .includes(
            search,
          ) ||
        inspection
          .referenceNumber
          ?.toLocaleLowerCase(
            "tr-TR",
          )
          .includes(
            search,
          ) === true,
    );
  }


  async save(
    _inspection:
      QualityInspection,
  ): Promise<QualityInspection> {
    return this.rejectDirectWrite();
  }


  async saveItem(
    _item:
      QualityInspectionItem,
  ): Promise<QualityInspectionItem> {
    return this.rejectDirectWrite();
  }


  async saveSample(
    _sample:
      QualitySample,
  ): Promise<QualitySample> {
    return this.rejectDirectWrite();
  }


  async saveDocument(
    _document:
      QualityDocument,
  ): Promise<QualityDocument> {
    return this.rejectDirectWrite();
  }


  async saveTask(
    _task:
      QualityTask,
  ): Promise<QualityTask> {
    return this.rejectDirectWrite();
  }


  async saveException(
    _exception:
      QualityException,
  ): Promise<QualityException> {
    return this.rejectDirectWrite();
  }


  async listExceptions(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityException[]> {
    const {
      data,
      error,
    } =
      await this.client
        .from(
          EXCEPTION_TABLE,
        )
        .select(
          EXCEPTION_SELECT,
        )
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          "inspection_id",
          inspectionId,
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        );

    if (error) {
      this.throwError(
        error,
      );
    }

    return (
      data ??
      []
    ).map(
      (row) =>
        mapExceptionRow(
          row as ExceptionRow,
        ),
    );
  }


  async listDocuments(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityDocument[]> {
    const {
      data,
      error,
    } =
      await this.client
        .from(
          DOCUMENT_TABLE,
        )
        .select(
          DOCUMENT_SELECT,
        )
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          "inspection_id",
          inspectionId,
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        );

    if (error) {
      this.throwError(
        error,
      );
    }

    return (
      data ??
      []
    ).map(
      (row) =>
        mapDocumentRow(
          row as DocumentRow,
        ),
    );
  }


  async listTasks(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityTask[]> {
    const {
      data,
      error,
    } =
      await this.client
        .from(
          TASK_TABLE,
        )
        .select(
          TASK_SELECT,
        )
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          "inspection_id",
          inspectionId,
        )
        .order(
          "priority",
          {
            ascending:
              true,
          },
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        );

    if (error) {
      this.throwError(
        error,
      );
    }

    return (
      data ??
      []
    ).map(
      (row) =>
        mapTaskRow(
          row as TaskRow,
        ),
    );
  }


  private async findOne(
    tenantId: string,
    column: string,
    value: string,
  ): Promise<QualityInspection | null> {
    const {
      data,
      error,
    } =
      await this.client
        .from(
          INSPECTION_TABLE,
        )
        .select(
          INSPECTION_SELECT,
        )
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          column,
          value,
        )
        .maybeSingle();

    if (error) {
      this.throwError(
        error,
      );
    }

    if (!data) {
      return null;
    }

    return this.hydrate(
      data as InspectionRow,
    );
  }


  private async hydrate(
    row: InspectionRow,
  ): Promise<QualityInspection> {
    const [
      items,
      samples,
      exceptions,
    ] =
      await Promise.all([
        this.listItems(
          row.account_id,
          row.id,
        ),

        this.listSamples(
          row.account_id,
          row.id,
        ),

        this.listExceptions(
          row.account_id,
          row.id,
        ),
      ]);

    return mapInspectionRow(
      row,
      items,
      samples,
      exceptions,
    );
  }


  private async listItems(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityInspectionItem[]> {
    const {
      data,
      error,
    } =
      await this.client
        .from(
          ITEM_TABLE,
        )
        .select(
          ITEM_SELECT,
        )
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          "inspection_id",
          inspectionId,
        )
        .order(
          "line_number",
          {
            ascending:
              true,
          },
        );

    if (error) {
      this.throwError(
        error,
      );
    }

    return (
      data ??
      []
    ).map(
      (row) =>
        mapItemRow(
          row as ItemRow,
        ),
    );
  }


  private async listSamples(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualitySample[]> {
    const {
      data,
      error,
    } =
      await this.client
        .from(
          SAMPLE_TABLE,
        )
        .select(
          SAMPLE_SELECT,
        )
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          "inspection_id",
          inspectionId,
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        );

    if (error) {
      this.throwError(
        error,
      );
    }

    return (
      data ??
      []
    ).map(
      (row) =>
        mapSampleRow(
          row as SampleRow,
        ),
    );
  }


  private async rejectDirectWrite<
    T,
  >(): Promise<T> {
    throw new Error(
      "Kalite kontrol yazma işlemleri doğrudan tablo üzerinden yapılamaz. Güvenli yazma RPC'si kullanılmalıdır.",
    );
  }


  private throwError(
    error: unknown,
  ): never {
    if (
      error instanceof Error
    ) {
      throw error;
    }

    throw new Error(
      "Kalite kontrol kalıcılık işlemi başarısız oldu.",
    );
  }
}
