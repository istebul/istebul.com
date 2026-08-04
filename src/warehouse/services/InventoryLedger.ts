export interface InventoryLedgerDependencies {
  now?: () => string;
  sequence?: () => number;
}

export class InventoryLedger {
  private readonly now: () => string;
  private readonly sequence: () => number;

  constructor(dependencies: InventoryLedgerDependencies = {}) {
    let internalSequence = 0;

    this.now =
      dependencies.now ?? (() => new Date().toISOString());

    this.sequence =
      dependencies.sequence ?? (() => ++internalSequence);
  }

  generateMovementNumber(): string {
    const date = this.now().slice(0, 10).replaceAll("-", "");
    const sequence = String(this.sequence()).padStart(6, "0");

    return `HRK-${date}-${sequence}`;
  }

  generateTransactionGroupId(): string {
    const date = this.now()
      .replaceAll("-", "")
      .replaceAll(":", "")
      .replaceAll(".", "");

    const sequence = String(this.sequence()).padStart(6, "0");

    return `ISL-${date}-${sequence}`;
  }
}
