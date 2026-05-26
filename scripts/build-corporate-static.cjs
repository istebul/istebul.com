'use strict';

const fs = require('fs');
const path = require('path');
const { loadJson } = require('./lib/seo.cjs');
const {
  renderAboutPage,
  renderMethodologyPage,
  renderVerticalPage,
  renderKvkkPage
} = require('./lib/render-corporate-html.cjs');

const root = process.cwd();

function writePage(relativePath, html) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html, 'utf8');
  console.log(`[corporate] ${relativePath}`);
}

const site = loadJson('data/seo/site.json');
const pages = loadJson('data/seo/corporate-pages.json');
const controller = loadJson('data/compliance/data-controller.json');
const retention = loadJson('data/compliance/retention-schedule.json');
const email = controller.controller.email;

writePage('hakkimizda.html', renderAboutPage(site, pages.about, controller));
writePage('kvkk.html', renderKvkkPage(site, controller, retention));
writePage('metodoloji/index.html', renderMethodologyPage(site, pages.methodology));

Object.values(pages.verticals).forEach((vertical) => {
  writePage(`${vertical.slug}/index.html`, renderVerticalPage(site, vertical, email));
});

console.log('[corporate] static pages built');
