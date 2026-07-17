/**
 * İSTEBUL Business Import Engine — doğrulama portu.
 *
 * Normalize edilmiş dataset üzerinde import bağlamına duyarlı doğrulama.
 * Bu PR’da implementasyon yoktur.
 */

import type { BusinessDataset } from '../../dataset/models/BusinessDataset';
import type { BusinessValidationResult } from '../../dataset/models/BusinessValidationResult';
import type { ImportContext } from '../types/ImportContext';

export interface IImportValidator {
  validate(
    context: ImportContext,
    dataset: BusinessDataset
  ): Promise<BusinessValidationResult>;
}
