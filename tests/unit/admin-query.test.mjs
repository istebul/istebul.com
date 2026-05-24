import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSchemaMissingError,
  PARTNER_APPLICATIONS_BASE_SELECT
} from '../../js/admin/admin-query.js';

describe('admin-query', () => {
  it('detects missing column errors', () => {
    assert.equal(
      isSchemaMissingError({
        message: 'column partner_applications.partner_endpoint_id does not exist'
      }),
      true
    );
  });

  it('base partner applications select excludes partner_endpoint_id', () => {
    assert.equal(PARTNER_APPLICATIONS_BASE_SELECT.includes('partner_endpoint_id'), false);
    assert.equal(PARTNER_APPLICATIONS_BASE_SELECT.includes('company_name'), true);
  });
});
