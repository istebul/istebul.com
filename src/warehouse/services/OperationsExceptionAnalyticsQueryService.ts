import type {
  OperationsExceptionAnalyticsReport,
  OperationsExceptionFilter,
} from "../types/OperationsExceptionAnalytics";
import type {
  OperationsExceptionAnalyticsService,
} from "./OperationsExceptionAnalyticsService";
import type {
  OperationsProcessVolumeRepository,
} from "./OperationsProcessVolumeRepository";

export interface OperationsExceptionAnalyticsQueryServiceDependencies {
  readonly analyticsService:
    OperationsExceptionAnalyticsService;
  readonly processVolumeRepository:
    OperationsProcessVolumeRepository;
}

/**
 * İstisna analizi ile kalıcı süreç hacmi verisini birleştirir.
 *
 * API katmanının süreç hacimlerini ayrıca toplamasına gerek bırakmaz.
 */
export class OperationsExceptionAnalyticsQueryService {
  private readonly analyticsService:
    OperationsExceptionAnalyticsService;

  private readonly processVolumeRepository:
    OperationsProcessVolumeRepository;

  constructor(
    dependencies:
      OperationsExceptionAnalyticsQueryServiceDependencies,
  ) {
    this.analyticsService =
      dependencies.analyticsService;

    this.processVolumeRepository =
      dependencies.processVolumeRepository;
  }

  async analyze(
    filter: OperationsExceptionFilter,
  ): Promise<OperationsExceptionAnalyticsReport> {
    const volumes =
      await this.processVolumeRepository.list(
        filter,
      );

    return this.analyticsService.analyze(
      filter,
      volumes,
    );
  }
}
