import test from 'node:test';
import assert from 'node:assert/strict';

const {
  mapUserListingRowToListing,
  createUserListingsRepository
} = await import('../../src/ai-listings/repository/adapters/user-listings-repository.js');

test('mapUserListingRowToListing maps legacy listings row to AI listing model', () => {
  const listing = mapUserListingRowToListing({
    id: 'legacy-1',
    title: '2020 Toyota Corolla',
    description: 'Temiz araç',
    price: 950000,
    currency: 'TRY',
    category: 'vehicle',
    location: 'İstanbul/Kadıköy',
    images: ['https://cdn.example/car.jpg'],
    tags: ['otomatik'],
    metadata: { year: 2020 },
    external_url: 'https://example.com/listing/1',
    status: 'active',
    user_id: 'user-1',
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-02T10:00:00.000Z'
  });

  assert.equal(listing.id, 'legacy-1');
  assert.equal(listing.category, 'vehicle');
  assert.equal(listing.title, '2020 Toyota Corolla');
  assert.equal(listing.location, 'İstanbul/Kadıköy');
  assert.equal(listing.price, 950000);
  assert.deepEqual(listing.images, ['https://cdn.example/car.jpg']);
  assert.equal(listing.attributes.year, 2020);
  assert.equal(listing.attributes.user_id, 'user-1');
});

test('createUserListingsRepository reads legacy listings via Supabase client', async () => {
  const rows = [
    {
      id: 'legacy-2',
      title: 'Daire',
      description: 'Merkezi konum',
      price: 4500000,
      currency: 'TRY',
      category: 'housing',
      location: 'Ankara',
      images: [],
      created_at: '2026-06-03T10:00:00.000Z',
      updated_at: '2026-06-03T10:00:00.000Z'
    }
  ];

  const client = {
    from(table) {
      assert.equal(table, 'listings');
      return {
        select() {
          return {
            eq(_col, _val) {
              return {
                async maybeSingle() {
                  return { data: rows[0], error: null };
                }
              };
            },
            order() {
              return {
                range() {
                  return Promise.resolve({ data: rows, error: null });
                }
              };
            }
          };
        }
      };
    }
  };

  const repo = createUserListingsRepository(client);
  const byId = await repo.findById('legacy-2');
  assert.equal(byId?.title, 'Daire');

  const many = await repo.findMany({ limit: 10 });
  assert.equal(many.length, 1);
  assert.equal(many[0].category, 'housing');
});
