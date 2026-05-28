import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSchemaMissingError,
  PARTNER_APPLICATIONS_BASE_SELECT
} from '../../js/admin/admin-query.js';
import fs from 'node:fs';
import path from 'node:path';

describe('admin-query', () => {
  it('detects missing column errors', () => {
    assert.equal(
      isSchemaMissingError({
        message: 'column partner_applications.partner_endpoint_id does not exist'
      }),
      true
    );
  });

  it('detects permission denied as schema-adjacent for messaging', () => {
    assert.equal(
      isSchemaMissingError({ message: 'permission denied for table finance_leads' }),
      false
    );
  });

  it('fetchAdminTable always attempts admin-action after direct failure', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'js/admin/admin-query.js'),
      'utf8'
    );
    assert.equal(
      source.includes('if (!isSchemaMissingError(res.error))'),
      false,
      'must not skip admin-action fallback on permission errors'
    );
    assert.ok(source.includes('withAdminFetchTimeout'));
  });

  it('base partner applications select excludes partner_endpoint_id', () => {
    assert.equal(PARTNER_APPLICATIONS_BASE_SELECT.includes('partner_endpoint_id'), false);
    assert.equal(PARTNER_APPLICATIONS_BASE_SELECT.includes('company_name'), true);
  });
});
