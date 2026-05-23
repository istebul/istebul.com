document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#partner-application-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fd = new FormData(form);
    const anonKey = window.__env?.SUPABASE_ANON_KEY || '';
    const baseUrl = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
    const endpoint = baseUrl ? `${baseUrl}/functions/v1/partner-application` : '';

    if (!endpoint || !anonKey) {
      alert('Başvuru servisi yapılandırılmamış.');
      return;
    }

    const payload = {
      company_name: fd.get('company_name'),
      contact_name: fd.get('contact_name'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      city: fd.get('city'),
      category: fd.get('category'),
      lead_capacity: fd.get('lead_capacity'),
      webhook_ready: fd.get('webhook_ready') === 'on',
      notes: fd.get('notes') || '',
      website: fd.get('website') || ''
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'request_failed');

      form.innerHTML = '<p><strong>Başvurunuz alındı.</strong> Ekibimiz webhook kurulumu ve test lead akışı için sizinle iletişime geçecek.</p>';
    } catch {
      alert('Başvuru gönderilemedi. Lütfen tekrar deneyin veya WhatsApp ile ulaşın.');
    }
  });
});
