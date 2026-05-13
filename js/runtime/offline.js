const retry = () => window.location.reload();

document.getElementById('retry-button')?.addEventListener('click', retry);

window.addEventListener('online', () => {
  setTimeout(retry, 500);
});
