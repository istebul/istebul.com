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

  it('repair migration adds content_type with default news and backfill', () => {
    const sql = fs.readFileSync(
      path.join(root, 'supabase/migrations/20260625_posts_content_type_repair.sql'),
      'utf8'
    );
    assert.match(sql, /ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'news'/i);
    assert.match(sql, /SET content_type = 'news'/);
    assert.match(sql, /NOTIFY pgrst, 'reload schema'/);
  });

  it('full schema repair migration adds cover_image_url and related columns', () => {
    const sql = fs.readFileSync(
      path.join(root, 'supabase/migrations/20260626_posts_full_schema_repair.sql'),
      'utf8'
    );
    assert.match(sql, /ADD COLUMN IF NOT EXISTS cover_image_url text/i);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'news'/i);
    assert.match(sql, /NOTIFY pgrst, 'reload schema'/);
  });

  it('apply-posts-schema-migration-api script exists', () => {
    assert.ok(fs.existsSync(path.join(root, 'scripts/apply-posts-schema-migration-api.sh')));
  });

  it('blog build includes news and blog content types', () => {
    const buildLib = fs.readFileSync(path.join(root, 'scripts/lib/build-blog-pages.cjs'), 'utf8');
    assert.match(buildLib, /content_type=in\.\(news,blog\)/);
  });

  it('blog build merges guide seed slugs for static post pages', () => {
    const buildLib = fs.readFileSync(path.join(root, 'scripts/lib/build-blog-pages.cjs'), 'utf8');
    assert.match(buildLib, /konut-guide-seed-headlines/);
    assert.match(buildLib, /mergePostsForBuild/);
    const konutSeed = JSON.parse(
      fs.readFileSync(path.join(root, 'data/content/konut-guide-seed-headlines.json'), 'utf8')
    );
    assert.ok(konutSeed.headlines.some((h) => h.slug === '2026-konut-kredisi-aylik-taksit'));
  });

  it('router keeps /blog/:slug in SPA instead of full static navigation', () => {
    const router = fs.readFileSync(path.join(root, 'js/core/router.js'), 'utf8');
    assert.match(router, /blogSlugFromPath\(path\)/);
    assert.match(router, /data-native-route/);
  });

  it('app fallback hydrates blog post surface when SPA loads /blog/:slug', () => {
    const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
    assert.match(app, /hydrateBlogPostSurface/);
    assert.match(app, /page-blog-post.*hydrateBlogPostSurface/s);
  });

  it('homepage news cards use full-page post links with trailing slash', () => {
    const guides = fs.readFileSync(path.join(root, 'js/features/content/category-guides-ui.js'), 'utf8');
    const paths = fs.readFileSync(path.join(root, 'js/features/content/public-content.js'), 'utf8');
    const router = fs.readFileSync(path.join(root, 'js/core/router.js'), 'utf8');
    assert.match(guides, /data-full-page="1"/);
    assert.match(guides, /data-guides-all-href/);
    assert.match(paths, /return `\/blog\/\$\{safe\}\/`/);
    assert.match(router, /data-full-page/);
  });

  it('verify-posts-content-type-schema script exists', () => {
    assert.ok(
      fs.existsSync(path.join(root, 'scripts/verify-posts-content-type-schema.cjs'))
    );
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
    assert.match(panel, /getAdminSupabaseClient/);
    assert.match(panel, /initPostsAdmin\(sb,\s*\{[\s\S]*adminAction/);
  });

  it('savePost always sends content_type for news and blog', () => {
    const mod = fs.readFileSync(path.join(root, 'js/admin/posts-admin.js'), 'utf8');
    assert.match(mod, /content_type: conf\.contentType/);
    assert.match(mod, /contentType: 'news'/);
    assert.match(mod, /persistViaAdminAction/);
    assert.match(mod, /table: 'posts'/);
  });

  it('posts-admin tolerates missing posts.category column', () => {
    const mod = fs.readFileSync(path.join(root, 'js/admin/posts-admin.js'), 'utf8');
    assert.match(mod, /hasPostsCategoryColumn/);
    assert.match(mod, /isMissingColumnError\(error, 'category'\)/);
    assert.match(mod, /const \{ category: _ignored, \.\.\.withoutCategory \} = values/);
  });

  it('cover upload uses admin-action edge upload', () => {
    const mod = fs.readFileSync(path.join(root, 'js/admin/post-cover-upload.js'), 'utf8');
    assert.match(mod, /invokeAdminFunction/);
    assert.match(mod, /upload_post_cover/);
  });

  it('admin-panel news/blog forms avoid inline event handlers', () => {
    const html = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
    const newsBlock = html.slice(html.indexOf('id="page-home-news"'), html.indexOf('id="page-blog"'));
    const blogBlock = html.slice(html.indexOf('id="page-blog"'), html.indexOf('id="page-listings"'));
    assert.doesNotMatch(newsBlock, /oninput=|onchange=.*loadNewsPosts/);
    assert.doesNotMatch(blogBlock, /oninput=|onchange=.*loadBlogPosts/);
  });
});
