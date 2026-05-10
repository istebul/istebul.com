const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = ['js'];
const violations = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const source = fs.readFileSync(fullPath, 'utf8');
      source.split('\n').forEach((line, index) => {
        if (/\bconsole\.log\s*\(/.test(line)) {
          violations.push(`${path.relative(root, fullPath)}:${index + 1}`);
        }
      });
    }
  }
};

targets.forEach((target) => walk(path.join(root, target)));

if (violations.length) {
  console.error('Production console.log statements found:\n' + violations.join('\n'));
  process.exit(1);
}

console.log('No production console.log statements found.');
