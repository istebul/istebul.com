const fs = require('fs');
const path = require('path');

const metaPath = path.join(__dirname, '../../data/route-document-meta.json');

function loadRouteMeta() {
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
}

/**
 * Inline head bootstrap: route surface + document meta (keep in sync with js/runtime/route-surface.js).
 */
function buildRouteBootstrapScript() {
  const { siteOrigin, surfaces } = loadRouteMeta();
  const metaJson = JSON.stringify(surfaces);
  const originJson = JSON.stringify(siteOrigin);

  return `(function(){var O=${originJson},M=${metaJson},p=(location.pathname||'/').replace(/\\/$/,'')||'/',m=p.match(/^\\/(en|de)(\\/|$)/);if(m)p=p.slice(m[1].length+1)||'/';p=p.replace(/\\/$/,'')||'/';if(p==='/admin'||p==='/partner'){location.replace(p==='/admin'?'/admin-panel.html':'/partner-olun.html');return}var prem={'/karar-analizi':'page-karar-analizi','/metodoloji':'page-metodoloji','/planlar':'page-planlar','/karar-asistani':'page-karar-analizi'};var app={'/ilanlar':'ilanlar','/karsilastir':'compare','/favoriler':'favoriler','/gecmis':'history','/quiz':'quiz','/profil':'profil','/hesap':'profil','/messages':'messages','/ilan-ekle':'add-listing'};var r=prem[p]||app[p]||(p.indexOf('/ilan/')===0?'listing-detail':'home');var d=document.documentElement;d.setAttribute('data-ib-route',r);d.classList.remove('ib-route-pending');var meta=M[r]||M.home;var path=meta.path||'/';var url=O+(path==='/'?'/':path);document.title=meta.title;var desc=document.getElementById('meta-description');if(desc)desc.setAttribute('content',meta.description);var can=document.getElementById('meta-canonical');if(can)can.setAttribute('href',url);var ogt=document.getElementById('meta-og-title');if(ogt)ogt.setAttribute('content',meta.title);var ogd=document.getElementById('meta-og-description');if(ogd)ogd.setAttribute('content',meta.description);var ogu=document.getElementById('meta-og-url');if(ogu)ogu.setAttribute('content',url);var twt=document.getElementById('meta-twitter-title');if(twt)twt.setAttribute('content',meta.title);var twd=document.getElementById('meta-twitter-description');if(twd)twd.setAttribute('content',meta.description);})();`;
}

function injectRouteBootstrap(html) {
  const script = buildRouteBootstrapScript();
  const pattern = /\/\* ROUTE_BOOTSTRAP_START \*\/[\s\S]*?\/\* ROUTE_BOOTSTRAP_END \*\//;

  if (!pattern.test(html)) {
    throw new Error('index.html missing ROUTE_BOOTSTRAP markers');
  }

  return html.replace(pattern, `/* ROUTE_BOOTSTRAP_START */\n${script}\n/* ROUTE_BOOTSTRAP_END */`);
}

module.exports = { loadRouteMeta, buildRouteBootstrapScript, injectRouteBootstrap };
