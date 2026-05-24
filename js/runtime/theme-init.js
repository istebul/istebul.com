import './locale-bootstrap.js';
import { readStorageRaw, STORAGE_KEYS } from '../core/storage-keys.js';

try {
  const savedTheme = readStorageRaw(STORAGE_KEYS.THEME);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
} catch (error) {
  document.documentElement.dataset.theme = 'light';
  document.documentElement.style.colorScheme = 'light';
}
