const params = new URLSearchParams(window.location.search || '');
const token = params.get('token');
if (!token) {
  window.location.replace('/partner-basvuru.html');
} else {
  const step = params.get('step') || '2';
  const next = new URLSearchParams({ token, step });
  window.location.replace(`/partner-basvuru.html?${next.toString()}`);
}
