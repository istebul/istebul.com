/**
 * İSTEBUL Business Import Engine — ReaderResolver (PR-101B).
 *
 * Metadata ile reader seçer. Reader kendini seçmez.
 */

import type { ReaderDescriptor } from './ReaderDescriptor';
import type { ReaderRegistration } from './ReaderRegistration';
import type { ImportTarget } from './ImportTarget';
import { normalizeExtension, normalizeMimeType } from './normalize';
import type {
  ReaderLookupTelemetry,
  ReaderSelectionReason
} from './telemetry';
import { endStageTimer, nowMs, startStageTimer } from '../../pipeline/runtime/timing';

export interface ReaderResolveResult {
  registration: ReaderRegistration | undefined;
  /** Eşleşme bulundu mu — telemetry.found ile aynı */
  found: boolean;
  telemetry: ReaderLookupTelemetry;
}

function tenantAllows(
  descriptor: ReaderDescriptor,
  tenantId: string | undefined
): boolean {
  if (!descriptor.tenantId) {
    return true;
  }
  if (!tenantId) {
    return false;
  }
  return descriptor.tenantId === tenantId;
}

function matchesSourceType(
  descriptor: ReaderDescriptor,
  sourceType: ImportTarget['sourceType']
): boolean {
  if (!sourceType) {
    return true;
  }
  return descriptor.sourceTypes.includes(sourceType);
}

function matchesMime(
  descriptor: ReaderDescriptor,
  mimeType: string | undefined
): boolean {
  if (!mimeType) {
    return true;
  }
  const list = descriptor.mimeTypes;
  if (!list || list.length === 0) {
    return false;
  }
  const normalized = normalizeMimeType(mimeType);
  return list.some((m) => normalizeMimeType(m) === normalized);
}

function matchesExtension(
  descriptor: ReaderDescriptor,
  extension: string | undefined
): boolean {
  if (!extension) {
    return true;
  }
  const list = descriptor.extensions;
  if (!list || list.length === 0) {
    return false;
  }
  const normalized = normalizeExtension(extension);
  return list.some((e) => normalizeExtension(e) === normalized);
}

function hasAnyConstraint(target: ImportTarget): boolean {
  return Boolean(
    target.sourceType || target.mimeType || target.extension || target.tenantId
  );
}

function buildReason(
  _target: ImportTarget,
  found: boolean,
  matchedFields: string[]
): ReaderSelectionReason {
  if (!found) {
    return {
      code: 'none',
      message: 'Uygun reader bulunamadı.',
      matchedFields: []
    };
  }
  if (matchedFields.length > 1) {
    return {
      code: 'combined-metadata',
      message: `Reader birleşik metadata ile seçildi: ${matchedFields.join(', ')}.`,
      matchedFields
    };
  }
  if (matchedFields[0] === 'sourceType') {
    return {
      code: 'exact-source-type',
      message: 'Reader kaynak tipine göre seçildi.',
      matchedFields
    };
  }
  if (matchedFields[0] === 'mimeType') {
    return {
      code: 'mime-type',
      message: 'Reader MIME türüne göre seçildi.',
      matchedFields
    };
  }
  if (matchedFields[0] === 'extension') {
    return {
      code: 'extension',
      message: 'Reader dosya uzantısına göre seçildi.',
      matchedFields
    };
  }
  if (matchedFields[0] === 'tenantId') {
    return {
      code: 'tenant-scope',
      message: 'Reader kiracı kapsamına göre seçildi.',
      matchedFields
    };
  }
  return {
    code: 'priority',
    message: 'Reader önceliğe göre seçildi.',
    matchedFields: matchedFields.length ? matchedFields : ['priority']
  };
}

/**
 * Kayıt listesinden metadata ile en iyi adayı seçer.
 */
export function resolveFromRegistrations(
  registrations: readonly ReaderRegistration[],
  target: ImportTarget
): ReaderResolveResult {
  const timer = startStageTimer();
  const startMark = nowMs();

  const matchedFields: string[] = [];
  if (target.sourceType) matchedFields.push('sourceType');
  if (target.mimeType) matchedFields.push('mimeType');
  if (target.extension) matchedFields.push('extension');
  if (target.tenantId) matchedFields.push('tenantId');

  let candidates = registrations.filter((reg) =>
    tenantAllows(reg.descriptor, target.tenantId)
  );

  if (target.sourceType) {
    candidates = candidates.filter((reg) =>
      matchesSourceType(reg.descriptor, target.sourceType)
    );
  }
  if (target.mimeType) {
    candidates = candidates.filter((reg) =>
      matchesMime(reg.descriptor, target.mimeType)
    );
  }
  if (target.extension) {
    candidates = candidates.filter((reg) =>
      matchesExtension(reg.descriptor, target.extension)
    );
  }

  // Hiç kısıt yoksa veya yalnızca tenant varsa ve aday çoksa: sourceTypes boş olmamalı —
  // kısıt yokken "supports everything" okumamak için en az bir alan zorunlu sayılır.
  if (!hasAnyConstraint(target)) {
    const { endedAt, durationMs } = endStageTimer(timer);
    return {
      registration: undefined,
      found: false,
      telemetry: {
        durationMs:
          durationMs || Math.max(0, Math.round(nowMs() - startMark)),
        startedAt: timer.startedAt,
        endedAt,
        target,
        reason: {
          code: 'none',
          message: 'Resolve için sourceType, mimeType veya extension gerekli.',
          matchedFields: []
        },
        candidateCount: 0,
        found: false
      }
    };
  }

  candidates = [...candidates].sort((a, b) => {
    const pa = a.descriptor.priority ?? 0;
    const pb = b.descriptor.priority ?? 0;
    if (pb !== pa) {
      return pb - pa;
    }
    // Tenant-specific önce
    const ta = a.descriptor.tenantId ? 1 : 0;
    const tb = b.descriptor.tenantId ? 1 : 0;
    if (tb !== ta) {
      return tb - ta;
    }
    return a.descriptor.id.localeCompare(b.descriptor.id);
  });

  const selected = candidates[0];
  const found = Boolean(selected);
  if (found && (selected.descriptor.priority ?? 0) > 0) {
    if (!matchedFields.includes('priority')) {
      matchedFields.push('priority');
    }
  }

  const { endedAt, durationMs } = endStageTimer(timer);
  return {
    registration: selected,
    found,
    telemetry: {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      target,
      selectedReaderId: selected?.descriptor.id,
      reason: buildReason(target, found, matchedFields),
      candidateCount: candidates.length,
      found
    }
  };
}

/**
 * ReaderResolver — registry üzerinden metadata resolve.
 */
export class ReaderResolver {
  private readonly getRegistrations: () => readonly ReaderRegistration[];

  constructor(getRegistrations: () => readonly ReaderRegistration[]) {
    this.getRegistrations = getRegistrations;
  }

  resolve(target: ImportTarget): ReaderResolveResult {
    return resolveFromRegistrations(this.getRegistrations(), target);
  }

  supports(target: ImportTarget): boolean {
    return this.resolve(target).found;
  }
}
