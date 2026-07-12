import { escapeHtml } from './format.js';

/**
 * @typedef {Object} TableColumn
 * @property {string} key
 * @property {string} label
 * @property {boolean} [sortable]
 */

/**
 * @typedef {Object} DataTableOptions
 * @property {string} id
 * @property {TableColumn[]} columns
 * @property {Record<string, unknown>[]} rows
 * @property {string} [emptyMessage]
 * @property {string} [searchPlaceholder]
 */

/**
 * @param {unknown} row
 * @param {string} key
 * @returns {string}
 */
function cellValue(row, key) {
  const record = /** @type {Record<string, unknown>} */ (
    row && typeof row === 'object' ? row : {}
  );
  const value = record[key];
  if (value == null) return '—';
  return String(value);
}

/**
 * @param {DataTableOptions} options
 * @returns {string}
 */
export function renderDataTable(options) {
  const { id, columns, rows, emptyMessage = 'Kayıt bulunamadı.', searchPlaceholder = 'Ara…' } =
    options;

  if (!rows.length) {
    return `<p class="gai-admin-empty">${escapeHtml(emptyMessage)}</p>`;
  }

  const head = columns
    .map(
      (col) =>
        `<th scope="col"${col.sortable ? ` data-sort-key="${escapeHtml(col.key)}"` : ''}>${escapeHtml(col.label)}</th>`
    )
    .join('');

  const body = rows
    .map((row, index) => {
      const record = /** @type {Record<string, unknown>} */ (row);
      const rowId = String(record.id ?? record._rowId ?? index);
      const cells = columns
        .map((col) => {
          const raw = record[col.key];
          const html =
            raw != null && typeof raw === 'object' && '__html' in raw
              ? String(/** @type {{ __html: string }} */ (raw).__html)
              : escapeHtml(cellValue(row, col.key));
          return `<td data-label="${escapeHtml(col.label)}">${html}</td>`;
        })
        .join('');
      return `<tr data-row-id="${escapeHtml(rowId)}">${cells}</tr>`;
    })
    .join('');

  return `
    <div class="gai-admin-table-shell" data-table-id="${escapeHtml(id)}">
      <div class="gai-admin-table-toolbar">
        <label class="gai-admin-search">
          <span class="visually-hidden">Tabloda ara</span>
          <input type="search" class="gai-admin-search__input" data-table-search="${escapeHtml(id)}" placeholder="${escapeHtml(searchPlaceholder)}" autocomplete="off">
        </label>
      </div>
      <div class="gai-admin-table-wrap">
        <table class="gai-admin-table" id="${escapeHtml(id)}">
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {string} tableId
 */
export function bindTableSearch(root, tableId) {
  const input = root.querySelector(`[data-table-search="${tableId}"]`);
  const table = root.querySelector(`#${tableId}`);
  if (!(input instanceof HTMLInputElement) || !(table instanceof HTMLTableElement)) return;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLocaleLowerCase('tr-TR');
    table.querySelectorAll('tbody tr').forEach((row) => {
      const text = row.textContent?.toLocaleLowerCase('tr-TR') || '';
      row.hidden = query.length > 0 && !text.includes(query);
    });
  });
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string} key
 * @param {'asc'|'desc'} direction
 * @returns {Record<string, unknown>[]}
 */
export function sortTableRows(rows, key, direction = 'asc') {
  const factor = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av ?? '').localeCompare(String(bv ?? ''), 'tr-TR') * factor;
  });
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string} query
 * @param {string[]} keys
 * @returns {Record<string, unknown>[]}
 */
export function filterTableRows(rows, query, keys) {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  if (!q) return rows;
  return rows.filter((row) =>
    keys.some((key) => String(row[key] ?? '').toLocaleLowerCase('tr-TR').includes(q))
  );
}
