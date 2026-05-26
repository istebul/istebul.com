import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractYouTubeId,
  resolveListingVideo,
  resolveListingImages
} from '../../js/features/listings/listing-media.js';

describe('listing-media', () => {
  it('extracts youtube id', () => {
    assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  });

  it('resolves video from external url', () => {
    const v = resolveListingVideo({ external_url: 'https://youtu.be/abc123XYZ12' });
    assert.equal(v?.type, 'youtube');
    assert.ok(v?.embedUrl.includes('abc123XYZ12'));
  });

  it('dedupes images with fallback', () => {
    const imgs = resolveListingImages({ images: [] }, '/placeholder.svg');
    assert.deepEqual(imgs, ['/placeholder.svg']);
  });
});
