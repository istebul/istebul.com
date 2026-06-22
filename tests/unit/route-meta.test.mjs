import test from 'node:test';
import assert from 'node:assert/strict';

const {
    resolveRouteSurface,
    ROUTE_DOCUMENT_META,
    SITE_ORIGIN
} = await import('../../js/runtime/route-surface.js');

test('resolveRouteSurface maps premium and app paths', () => {
    assert.equal(resolveRouteSurface('/planlar'), 'page-planlar');
    assert.equal(resolveRouteSurface('/profil'), 'profil');
    assert.equal(resolveRouteSurface('/karsilastir'), 'compare');
    assert.equal(resolveRouteSurface('/karar-asistani'), 'page-karar-analizi');
});

test('resolveRouteSurface maps decision-options surface paths to ilanlar', () => {
    assert.equal(resolveRouteSurface('/secenekler'), 'ilanlar');
    assert.equal(resolveRouteSurface('/ilanlar'), 'ilanlar');
    assert.equal(resolveRouteSurface('/decision-options'), 'ilanlar');
    assert.notEqual(resolveRouteSurface('/decision-options'), 'decision-options');
});

test('ROUTE_DOCUMENT_META has canonical paths per surface', () => {
    assert.equal(ROUTE_DOCUMENT_META['page-planlar'].path, '/planlar');
    assert.equal(ROUTE_DOCUMENT_META.profil.path, '/profil');
    assert.equal(ROUTE_DOCUMENT_META.ilanlar.path, '/secenekler');
    assert.ok(ROUTE_DOCUMENT_META.home.title.includes('isteBul'));
    assert.equal(SITE_ORIGIN, 'https://www.istebul.com');
});
