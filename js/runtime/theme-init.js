try {
  const savedTheme = localStorage.getItem('istebu_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
} catch (error) {
  document.documentElement.dataset.theme = 'light';
  document.documentElement.style.colorScheme = 'light';
}
