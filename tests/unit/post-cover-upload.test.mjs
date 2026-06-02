import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

describe('posts content admin', () => {
  it('migration adds content_type and storage bucket', () => {
    const sql = fs.readFileSync(
      path.join(root, 'supabase/migrations/20260624_posts_content_type_and_covers_storage.sql'),
      'utf8'
    );
    assert.match(sql, /content_type/);
    assert.match(sql, /content-covers/);
  });

  it('admin panel has separate home-news and blog pages', () => {
    const html = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
    assert.match(html, /data-page-target="home-news"/);
    assert.match(html, /id="page-home-news"/);
    assert.match(html, /id="page-blog"/);
    assert.match(html, /news-post-cover-file/);
    assert.match(html, /blog-post-cover-file/);
  });

  it('posts-admin module is wired in admin-panel.js', () => {
    const panel = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
    assert.match(panel, /posts-admin\.js/);
    assert.match(panel, /home-news/);
    assert.match(panel, /loadNewsPostsAdmin/);
  });
});
