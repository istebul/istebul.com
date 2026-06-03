'use strict';

/** Shared favicon / PWA icon tags for static HTML heads. */
const FAVICON_HEAD = `  <meta name="theme-color" content="#2563eb">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/svg+xml" href="/assets/brand/istebul-icon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/icons/favicon-16.png">
  <link rel="apple-touch-icon" sizes="192x192" href="/assets/icons/favicon-192.png">`;

module.exports = { FAVICON_HEAD };
