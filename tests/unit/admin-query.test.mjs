import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSchemaMissingError,
  PARTNER_APPLICATIONS_BASE_SELECT,
  collectAdminWarnings,
  collectAdminFallbackNotes
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

  it('fetchAdminTable prefers admin-action before direct fallback', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'js/admin/admin-query.js'),
      'utf8'
    );
    assert.equal(
      source.includes('if (!isSchemaMissingError(res.error))'),
      false,
      'must not skip admin-action fallback on permission errors'
    );
    assert.ok(source.includes('if (!preferDirect)'));
    assert.ok(source.includes('withAdminFetchTimeout'));
  });

  it('treats direct fallback after admin-action miss as info note', () => {
    const batch = [
      {
        table: 'subscriptions',
        source: 'direct',
        adminError: 'Invalid action or table',
        data: [{ status: 'active' }]
      }
    ];
    assert.equal(collectAdminWarnings(batch).length, 0);
    assert.equal(collectAdminFallbackNotes(batch).length, 1);
    assert.match(collectAdminFallbackNotes(batch)[0], /doğrudan Supabase/);
  });

  it('base partner applications select excludes partner_endpoint_id', () => {
    assert.equal(PARTNER_APPLICATIONS_BASE_SELECT.includes('partner_endpoint_id'), false);
    assert.equal(PARTNER_APPLICATIONS_BASE_SELECT.includes('company_name'), true);
  });

  it('treats admin-action fallback as info note, not critical warning', () => {
    const batch = [
      {
        table: 'subscriptions',
        source: 'admin-action',
        data: [{ status: 'active' }]
      }
    ];
    assert.equal(collectAdminWarnings(batch).length, 0);
    assert.equal(collectAdminFallbackNotes(batch).length, 0);
  });

  it('warns when lifecycle tables missing and no rows loaded', () => {
    const batch = [
      {
        table: 'lifecycle_enrollments',
        source: 'admin-action',
        schemaMissing: true,
        directError: 'Could not find the table in schema cache',
        data: []
      }
    ];
    assert.equal(collectAdminWarnings(batch).length, 1);
    assert.equal(collectAdminFallbackNotes(batch).length, 0);
  });
});
