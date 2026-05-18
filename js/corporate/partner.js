document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#partner-application-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fd = new FormData(form);

    const payload = {
      company_name: fd.get('company_name'),
      contact_name: fd.get('contact_name'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      city: fd.get('city'),
      category: fd.get('category'),
      lead_capacity: fd.get('lead_capacity'),
      notes: fd.get('notes'),
      webhook_ready: fd.get('webhook_ready') === 'on'
    };

    try {
      const anonKey = window.__env?.SUPABASE_ANON_KEY || '';

      const res = await fetch(
        'https://hjfrcdstbyonmgatgwcc.supabase.co/functions/v1/partner-application',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`
          },
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) throw new Error();

      form.innerHTML = '<p><strong>Başvurunuz alındı. Ekibimiz sizinle iletişime geçecek.</strong></p>';
    } catch {
      alert('Başvuru gönderilemedi.');
    }
  });
});
