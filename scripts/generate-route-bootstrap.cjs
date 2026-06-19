#!/usr/bin/env node
const { writeRouteBootstrapFile } = require('./lib/route-bootstrap.cjs');

writeRouteBootstrapFile();
console.log('route-bootstrap-head.js generated');
