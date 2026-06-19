#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveBlogPostsForBuild, postToSeoPage } = require('./lib/build-blog-pages.cjs');
const { loadJson, renderContentPage } = require('./lib/seo.cjs');

const root = path.join(__dirname, '..');
const distDir = path.resolve(process.argv[2] || path.join(root, 'dist'));

async function main() {
  const site = loadJson('data/seo/site.json');
  const posts = await resolveBlogPostsForBuild(process.env);
  const slugs = [];

  for (const post of posts) {
    const page = postToSeoPage(post);
    const pagePath = `/blog/${page.slug}/`;
    const breadcrumbs = [
      { name: 'Ana sayfa', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: page.h1, path: pagePath }
    ];
    const relatedLinks = [
      { href: '/auto/', label: 'Ücretsiz analiz' },
      { href: '/rehber/tco-rehberi/', label: 'TCO rehberi' },
      { href: '/blog', label: 'Tüm blog yazıları' }
    ];

    const coverHtml = page.cover_image_url
      ? `<p class="seo-cover"><img src="${page.cover_image_url.replace(/"/g, '&quot;')}" alt="" loading="lazy" decoding="async" width="960" height="540"></p>`
      : '';

    const html = renderContentPage({
      site,
      page,
      path: pagePath,
      breadcrumbs,
      relatedLinks,
      cta: { href: '/auto/', label: 'Karar analizini başlat' },
      kicker: page.kicker || 'Blog · Karar rehberi',
      extraHtml: coverHtml
    });

    const outDir = path.join(distDir, 'blog', page.slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    slugs.push({ slug: page.slug, path: pagePath });
  }

  const manifestPath = path.join(distDir, 'blog-posts-manifest.json');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), count: slugs.length, posts: slugs }, null, 2)
  );

  console.log(`build-blog-post-pages: ${slugs.length} post(s) → ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
