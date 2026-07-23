/**
 * Karar Mahkemesi Beta — auto results detail mount wiring (feature-flagged).
 */
import { isKararMahkemesiEnabled } from '../features/karar-mahkemesi/karar-mahkemesi-flags.js';
import { mountKararMahkemesiBeta } from '../features/karar-mahkemesi/karar-mahkemesi-card.js';

export function mountKararMahkemesiInResultsDetail(
  root,
  { intel, formData, topResult, searchParams, storage } = {}
) {
  if (!isKararMahkemesiEnabled(searchParams, storage)) return;
  if (!root || !intel || !topResult) return;

  try {
    const detailNode = root.querySelector('#ib-results-detail');
    if (!detailNode) return;
    if (detailNode.querySelector('[data-karar-mahkemesi-beta]')) return;

    mountKararMahkemesiBeta({ mountNode: detailNode, intel, formData, topResult });
  } catch {
    // Karar Mahkemesi mount must not break the primary results render.
  }
}
