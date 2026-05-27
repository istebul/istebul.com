'use strict';

/**
 * Node 20 does not provide a native WebSocket constructor in all runners.
 * Supabase realtime client expects one to exist at client initialization.
 */
if (typeof globalThis.WebSocket === 'undefined') {
  const ws = require('ws');
  globalThis.WebSocket = ws.WebSocket || ws;
}
