/**
 * Decision History category normalization for multi-category history UX.
 * Read-only mapping layer — no engine calls or persistence changes.
 */

export const DECISION_CATEGORY_UNKNOWN_ID = 'unknown';
export const DECISION_CATEGORY_UNKNOWN_LABEL = 'Bilinmeyen kategori';

const AUTO_IDS = new Set(['auto', 'arac', 'araba', 'vehicle']);
const KONUT_IDS = new Set(['konut', 'ev', 'home', 'housing']);

const CATEGORY_LABELS = Object.freeze({
    auto: 'Araba',
    konut: 'Konut',
    tatil: 'Tatil',
    finansman: 'Finansman',
    sigorta: 'Sigorta',
    kasko: 'Kasko',
    [DECISION_CATEGORY_UNKNOWN_ID]: DECISION_CATEGORY_UNKNOWN_LABEL
});

const NAME_ALIASES = Object.freeze({
    auto: new Set(['auto', 'arac', 'araba', 'araç', 'vehicle', 'araba kararı', 'araç']),
    konut: new Set(['konut', 'ev', 'home', 'housing', 'konut kararı']),
    tatil: new Set(['tatil', 'vacation', 'seyahat']),
    finansman: new Set(['finansman', 'finans', 'finance']),
    sigorta: new Set(['sigorta', 'insurance']),
    kasko: new Set(['kasko', 'casco'])
});

const SOURCE_BY_CATEGORY = Object.freeze({
    auto: 'auto',
    konut: 'konut'
});

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeToken(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
}

/**
 * @param {string} rawId
 * @param {string} rawName
 * @returns {string}
 */
function resolveCanonicalCategoryId(rawId, rawName) {
    const id = normalizeToken(rawId);
    const name = normalizeToken(rawName);

    if (AUTO_IDS.has(id) || NAME_ALIASES.auto.has(name)) return 'auto';
    if (KONUT_IDS.has(id) || NAME_ALIASES.konut.has(name)) return 'konut';
    if (id === 'tatil' || NAME_ALIASES.tatil.has(name)) return 'tatil';
    if (id === 'finansman' || id === 'finans' || NAME_ALIASES.finansman.has(name)) return 'finansman';
    if (id === 'sigorta' || NAME_ALIASES.sigorta.has(name)) return 'sigorta';
    if (id === 'kasko' || NAME_ALIASES.kasko.has(name)) return 'kasko';

    return DECISION_CATEGORY_UNKNOWN_ID;
}

/**
 * @param {string | undefined} categoryId
 * @returns {string}
 */
export function resolveDecisionCategoryLabel(categoryId) {
    const normalized = normalizeDecisionCategory({ categoryId });
    return normalized.label;
}

/**
 * @param {string | undefined} categoryId
 * @returns {'assistant' | 'auto' | 'konut' | 'bridge'}
 */
export function resolveDecisionCategorySource(categoryId) {
    const normalized = normalizeDecisionCategory({ categoryId });
    return SOURCE_BY_CATEGORY[normalized.categoryId] || 'assistant';
}

/**
 * @param {{ categoryId?: string, categoryName?: string, id?: string, name?: string } | string | null | undefined} input
 * @returns {{
 *   categoryId: string,
 *   label: string,
 *   source: 'assistant' | 'auto' | 'konut' | 'bridge',
 *   originalCategoryId: string | null,
 *   originalCategoryName: string | null
 * }}
 */
export function normalizeDecisionCategory(input) {
    const source = typeof input === 'string'
        ? { categoryId: input }
        : (input && typeof input === 'object' ? input : {});

    const originalCategoryId = String(source.categoryId || source.id || '').trim() || null;
    const originalCategoryName = String(source.categoryName || source.name || '').trim() || null;
    const categoryId = resolveCanonicalCategoryId(originalCategoryId, originalCategoryName);

    return {
        categoryId,
        label: CATEGORY_LABELS[categoryId] || DECISION_CATEGORY_UNKNOWN_LABEL,
        source: SOURCE_BY_CATEGORY[categoryId] || 'assistant',
        originalCategoryId,
        originalCategoryName
    };
}

/**
 * @param {object | null | undefined} entry
 * @returns {{
 *   categoryId: string,
 *   categoryName: string,
 *   source: 'assistant' | 'auto' | 'konut' | 'bridge',
 *   isAuto: boolean,
 *   isKonut: boolean
 * }}
 */
export function normalizeHistoryEntryCategory(entry) {
    const normalized = normalizeDecisionCategory({
        categoryId: entry?.categoryId,
        categoryName: entry?.categoryName
    });

    return {
        categoryId: normalized.categoryId,
        categoryName: normalized.label,
        source: normalized.source,
        isAuto: normalized.categoryId === 'auto',
        isKonut: normalized.categoryId === 'konut'
    };
}
