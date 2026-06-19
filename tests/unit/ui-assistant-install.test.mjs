import test from 'node:test';
import assert from 'node:assert/strict';
import { UIManager } from '../../js/ui/ui.js';
import { installAssistantUI } from '../../js/ui/assistant-ui.js';

test('UIManager module load exposes assistant helpers without manual install', () => {
  const ui = new UIManager();
  assert.equal(typeof ui.setActiveCategory, 'function');
  assert.equal(typeof ui.renderDecisionHistory, 'function');
  assert.equal(typeof ui.renderDecisionResults, 'function');
  assert.equal(typeof ui.getCategoryCardMarkup, 'function');
});

test('installAssistantUI exposes decision history and category helpers', () => {
  installAssistantUI(UIManager);
  const ui = new UIManager();
  assert.equal(typeof ui.setActiveCategory, 'function');
  assert.equal(typeof ui.renderDecisionHistory, 'function');
  assert.equal(typeof ui.renderDecisionResults, 'function');
  assert.equal(typeof ui.renderHistoryAuthGate, 'function');
  assert.equal(typeof ui.getCategoryCardMarkup, 'function');
});

test('renderDecisionHistory and setActiveCategory tolerate missing DOM nodes', () => {
  installAssistantUI(UIManager);
  const ui = new UIManager();
  assert.doesNotThrow(() => ui.setActiveCategory('arac', [{ id: 'arac', name: 'Araç' }]));
  assert.doesNotThrow(() => ui.renderDecisionHistory([]));
});
