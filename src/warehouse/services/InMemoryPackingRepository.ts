import type {
  Packing,
  PackingListFilter,
} from "../types/Packing";
import type {
  PackingContainer,
} from "../types/PackingContainer";
import type {
  PackingException,
} from "../types/PackingException";
import type {
  PackingItem,
} from "../types/PackingItem";
import type {
  PackingLabel,
} from "../types/PackingLabel";
import type {
  PackingPackage,
} from "../types/PackingPackage";
import type {
  PackingSuggestion,
} from "../types/PackingSuggestion";
import type {
  PackingTask,
} from "../types/PackingTask";
import type {
  PackingRepository,
} from "./PackingRepository";

export class InMemoryPackingRepository
  implements PackingRepository
{
  private readonly packings =
    new Map<string, Packing>();

  private readonly packages =
    new Map<string, PackingPackage>();

  private readonly labels =
    new Map<string, PackingLabel>();

  private readonly suggestions =
    new Map<string, PackingSuggestion>();

  private readonly tasks =
    new Map<string, PackingTask>();

  private readonly exceptions =
    new Map<string, PackingException>();

  private readonly containers =
    new Map<string, PackingContainer>();

  async findById(
    tenantId: string,
    packingId: string,
  ): Promise<Packing | null> {
    const packing =
      this.packings.get(packingId);

    if (
      !packing ||
      packing.tenantId !== tenantId
    ) {
      return null;
    }

    return structuredClone(packing);
  }

  async findByNumber(
    tenantId: string,
    packingNumber: string,
  ): Promise<Packing | null> {
    for (
      const packing
      of this.packings.values()
    ) {
      if (
        packing.tenantId === tenantId &&
        packing.packingNumber ===
          packingNumber
      ) {
        return structuredClone(packing);
      }
    }

    return null;
  }

  async findByPickingId(
    tenantId: string,
    pickingId: string,
  ): Promise<Packing | null> {
    for (
      const packing
      of this.packings.values()
    ) {
      if (
        packing.tenantId === tenantId &&
        packing.pickingId === pickingId
      ) {
        return structuredClone(packing);
      }
    }

    return null;
  }

  async findByOrderId(
    tenantId: string,
    orderId: string,
  ): Promise<Packing | null> {
    for (
      const packing
      of this.packings.values()
    ) {
      if (
        packing.tenantId === tenantId &&
        packing.orderId === orderId
      ) {
        return structuredClone(packing);
      }
    }

    return null;
  }

  async findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Packing | null> {
    for (
      const packing
      of this.packings.values()
    ) {
      if (
        packing.tenantId === tenantId &&
        packing.referenceType ===
          referenceType &&
        packing.referenceId ===
          referenceId
      ) {
        return structuredClone(packing);
      }
    }

    return null;
  }

  async list(
    filter: PackingListFilter,
  ): Promise<Packing[]> {
    const search = filter.search
      ?.trim()
      .toLocaleLowerCase("tr-TR");

    return [...this.packings.values()]
      .filter(
        (packing) =>
          packing.tenantId ===
          filter.tenantId,
      )
      .filter(
        (packing) =>
          filter.warehouseId ===
            undefined ||
          packing.warehouseId ===
            filter.warehouseId,
      )
      .filter(
        (packing) =>
          filter.packingLocationId ===
            undefined ||
          packing.packingLocationId ===
            filter.packingLocationId,
      )
      .filter(
        (packing) =>
          filter.shippingLocationId ===
            undefined ||
          packing.shippingLocationId ===
            filter.shippingLocationId,
      )
      .filter(
        (packing) =>
          filter.strategy === undefined ||
          packing.strategy ===
            filter.strategy,
      )
      .filter(
        (packing) =>
          filter.status === undefined ||
          packing.status ===
            filter.status,
      )
      .filter(
        (packing) =>
          filter.pickingId === undefined ||
          packing.pickingId ===
            filter.pickingId,
      )
      .filter(
        (packing) =>
          filter.orderId === undefined ||
          packing.orderId ===
            filter.orderId,
      )
      .filter(
        (packing) =>
          filter.referenceType ===
            undefined ||
          packing.referenceType ===
            filter.referenceType,
      )
      .filter(
        (packing) =>
          filter.referenceId ===
            undefined ||
          packing.referenceId ===
            filter.referenceId,
      )
      .filter((packing) => {
        if (!search) {
          return true;
        }

        return (
          packing.packingNumber
            .toLocaleLowerCase("tr-TR")
            .includes(search) ||
          packing.orderNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true ||
          packing.referenceNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true
        );
      })
      .sort((left, right) =>
        right.createdAt.localeCompare(
          left.createdAt,
        ),
      )
      .map((packing) =>
        structuredClone(packing),
      );
  }

  async save(
    packing: Packing,
  ): Promise<Packing> {
    const stored =
      structuredClone(packing);

    this.packings.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveItem(
    item: PackingItem,
  ): Promise<PackingItem> {
    const packing =
      this.packings.get(item.packingId);

    if (
      !packing ||
      packing.tenantId !== item.tenantId
    ) {
      throw new Error(
        "Paketleme kaydı bulunamadı.",
      );
    }

    const items = packing.items.filter(
      (current) =>
        current.id !== item.id,
    );

    items.push(structuredClone(item));

    items.sort(
      (left, right) =>
        left.lineNumber -
        right.lineNumber,
    );

    this.packings.set(
      packing.id,
      {
        ...packing,
        items,
        updatedAt: item.updatedAt,
      },
    );

    return structuredClone(item);
  }

  async savePackage(
    packingPackage: PackingPackage,
  ): Promise<PackingPackage> {
    const packing =
      this.packings.get(
        packingPackage.packingId,
      );

    if (
      !packing ||
      packing.tenantId !==
        packingPackage.tenantId
    ) {
      throw new Error(
        "Paketleme kaydı bulunamadı.",
      );
    }

    const stored =
      structuredClone(packingPackage);

    this.packages.set(
      stored.id,
      stored,
    );

    const packages =
      packing.packages.filter(
        (current) =>
          current.id !== stored.id,
      );

    packages.push(
      structuredClone(stored),
    );

    packages.sort(
      (left, right) =>
        left.packageNumber.localeCompare(
          right.packageNumber,
          "tr",
          { numeric: true },
        ),
    );

    this.packings.set(
      packing.id,
      {
        ...packing,
        packages,
        updatedAt: stored.updatedAt,
      },
    );

    return structuredClone(stored);
  }

  async saveLabel(
    label: PackingLabel,
  ): Promise<PackingLabel> {
    const packing =
      this.packings.get(label.packingId);

    if (
      !packing ||
      packing.tenantId !== label.tenantId
    ) {
      throw new Error(
        "Paketleme kaydı bulunamadı.",
      );
    }

    const stored =
      structuredClone(label);

    this.labels.set(
      stored.id,
      stored,
    );

    const labels =
      packing.labels.filter(
        (current) =>
          current.id !== stored.id,
      );

    labels.push(
      structuredClone(stored),
    );

    labels.sort(
      (left, right) =>
        left.createdAt.localeCompare(
          right.createdAt,
        ),
    );

    this.packings.set(
      packing.id,
      {
        ...packing,
        labels,
        updatedAt: stored.updatedAt,
      },
    );

    return structuredClone(stored);
  }

  async saveSuggestion(
    suggestion: PackingSuggestion,
  ): Promise<PackingSuggestion> {
    const packing =
      this.packings.get(
        suggestion.packingId,
      );

    if (
      !packing ||
      packing.tenantId !==
        suggestion.tenantId
    ) {
      throw new Error(
        "Paketleme kaydı bulunamadı.",
      );
    }

    const stored =
      structuredClone(suggestion);

    this.suggestions.set(
      stored.id,
      stored,
    );

    const suggestions =
      packing.suggestions.filter(
        (current) =>
          current.id !== stored.id,
      );

    suggestions.push(
      structuredClone(stored),
    );

    suggestions.sort(
      (left, right) =>
        right.score.totalScore -
        left.score.totalScore,
    );

    this.packings.set(
      packing.id,
      {
        ...packing,
        suggestions,
      },
    );

    return structuredClone(stored);
  }

  async saveTask(
    task: PackingTask,
  ): Promise<PackingTask> {
    const packing =
      this.packings.get(task.packingId);

    if (
      !packing ||
      packing.tenantId !== task.tenantId
    ) {
      throw new Error(
        "Paketleme kaydı bulunamadı.",
      );
    }

    const stored =
      structuredClone(task);

    this.tasks.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveException(
    exception: PackingException,
  ): Promise<PackingException> {
    const packing =
      this.packings.get(
        exception.packingId,
      );

    if (
      !packing ||
      packing.tenantId !==
        exception.tenantId
    ) {
      throw new Error(
        "Paketleme kaydı bulunamadı.",
      );
    }

    const stored =
      structuredClone(exception);

    this.exceptions.set(
      stored.id,
      stored,
    );

    const exceptions =
      packing.exceptions.filter(
        (current) =>
          current.id !== stored.id,
      );

    exceptions.push(
      structuredClone(stored),
    );

    exceptions.sort(
      (left, right) =>
        left.createdAt.localeCompare(
          right.createdAt,
        ),
    );

    this.packings.set(
      packing.id,
      {
        ...packing,
        exceptions,
      },
    );

    return structuredClone(stored);
  }

  async saveContainer(
    container: PackingContainer,
  ): Promise<PackingContainer> {
    const stored =
      structuredClone(container);

    this.containers.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async findContainerById(
    tenantId: string,
    containerId: string,
  ): Promise<PackingContainer | null> {
    const container =
      this.containers.get(containerId);

    if (
      !container ||
      container.tenantId !== tenantId
    ) {
      return null;
    }

    return structuredClone(container);
  }

  async findContainerByCode(
    tenantId: string,
    code: string,
  ): Promise<PackingContainer | null> {
    for (
      const container
      of this.containers.values()
    ) {
      if (
        container.tenantId === tenantId &&
        container.code === code
      ) {
        return structuredClone(container);
      }
    }

    return null;
  }

  async listContainers(
    tenantId: string,
    activeOnly = false,
  ): Promise<PackingContainer[]> {
    return [...this.containers.values()]
      .filter(
        (container) =>
          container.tenantId === tenantId,
      )
      .filter(
        (container) =>
          !activeOnly ||
          container.active,
      )
      .sort((left, right) =>
        left.code.localeCompare(
          right.code,
          "tr",
          { numeric: true },
        ),
      )
      .map((container) =>
        structuredClone(container),
      );
  }

  async listPackages(
    tenantId: string,
    packingId: string,
  ): Promise<PackingPackage[]> {
    return [...this.packages.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.packingId === packingId,
      )
      .sort((left, right) =>
        left.packageNumber.localeCompare(
          right.packageNumber,
          "tr",
          { numeric: true },
        ),
      )
      .map((item) =>
        structuredClone(item),
      );
  }

  async listLabels(
    tenantId: string,
    packingId: string,
  ): Promise<PackingLabel[]> {
    return [...this.labels.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.packingId === packingId,
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(
          right.createdAt,
        ),
      )
      .map((item) =>
        structuredClone(item),
      );
  }

  async listSuggestions(
    tenantId: string,
    packingId: string,
  ): Promise<PackingSuggestion[]> {
    return [...this.suggestions.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.packingId === packingId,
      )
      .sort(
        (left, right) =>
          right.score.totalScore -
          left.score.totalScore,
      )
      .map((item) =>
        structuredClone(item),
      );
  }

  async listTasks(
    tenantId: string,
    packingId: string,
  ): Promise<PackingTask[]> {
    return [...this.tasks.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.packingId === packingId,
      )
      .sort(
        (left, right) =>
          left.sequence -
            right.sequence ||
          left.priority -
            right.priority,
      )
      .map((item) =>
        structuredClone(item),
      );
  }

  async listExceptions(
    tenantId: string,
    packingId: string,
  ): Promise<PackingException[]> {
    return [...this.exceptions.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.packingId === packingId,
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(
          right.createdAt,
        ),
      )
      .map((item) =>
        structuredClone(item),
      );
  }
}
